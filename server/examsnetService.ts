import type { PaperMeta, Question } from '../src/types/ctet.ts';
import {
  buildBilingualQuestion,
  isValidExamsnetSlug,
  parseExamsnetCatalogHtml,
  parseExamsnetQuestionHtml,
  type ParsedExamsnetQuestionSide,
} from './examsnetParser.ts';

const EXAMSNET_BASE = 'https://www.examsnet.com';
const CATALOG_URL = `${EXAMSNET_BASE}/exams/ctet-1-previous-question-papers-online`;
const CATALOG_TTL_MS = 1000 * 60 * 30;

interface CachedPaperMeta {
  papers: PaperMeta[];
  fetchedAt: number;
}

let catalogCache: CachedPaperMeta | null = null;
let catalogInFlight: Promise<PaperMeta[]> | null = null;

const questionCache = new Map<string, Question>();
const questionInFlight = new Map<string, Promise<Question>>();
const paperTotalQuestions = new Map<string, number>();

async function fetchWithRetry(url: string, init: RequestInit, retries = 1): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(12000),
      });
      if (response.ok || response.status === 404) {
        return response;
      }
      lastError = new Error(`Upstream status ${response.status}`);
    } catch (err) {
      lastError = err;
    }
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Upstream request failed');
}

async function fetchQuestionSide(slug: string, qNum: number): Promise<ParsedExamsnetQuestionSide> {
  const url = `${EXAMSNET_BASE}/test/${slug}/${qNum}`;
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (compatible; CTETPracticeClient/1.0)',
      Referer: url,
    },
    body: 'answerid=0',
  });

  if (!response.ok) {
    throw new Error(`Upstream status ${response.status} for ${slug}/${qNum}`);
  }

  const html = await response.text();
  return parseExamsnetQuestionHtml(html);
}

export async function getExamsnetPapersCatalog(): Promise<PaperMeta[]> {
  if (catalogCache && Date.now() - catalogCache.fetchedAt < CATALOG_TTL_MS) {
    return catalogCache.papers;
  }

  if (catalogInFlight) {
    return catalogInFlight;
  }

  catalogInFlight = (async () => {
    try {
      const response = await fetchWithRetry(CATALOG_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CTETPracticeClient/1.0)',
        },
      });
      if (!response.ok) {
        throw new Error(`Catalog fetch failed with status ${response.status}`);
      }
      const html = await response.text();
      const papers = parseExamsnetCatalogHtml(html);
      if (papers.length > 0) {
        catalogCache = { papers, fetchedAt: Date.now() };
      }
      return papers;
    } finally {
      catalogInFlight = null;
    }
  })();

  return catalogInFlight;
}

export async function getExamsnetQuestion(
  slug: string,
  qNum: number
): Promise<{ totalQuestions: number; question: Question }> {
  if (!isValidExamsnetSlug(slug)) {
    throw new Error('Invalid paper slug');
  }
  if (!Number.isInteger(qNum) || qNum < 1 || qNum > 200) {
    throw new Error('Invalid question number');
  }

  const cacheKey = `${slug}:${qNum}`;
  const cached = questionCache.get(cacheKey);
  if (cached) {
    return {
      totalQuestions: paperTotalQuestions.get(slug) ?? 150,
      question: cached,
    };
  }

  let promise = questionInFlight.get(cacheKey);
  if (!promise) {
    promise = (async () => {
      try {
        const hiSlug = slug.endsWith('-hi') ? slug : `${slug}-hi`;
        const [enResult, hiResult] = await Promise.allSettled([
          fetchQuestionSide(slug, qNum),
          fetchQuestionSide(hiSlug, qNum),
        ]);

        if (enResult.status === 'rejected') {
          throw enResult.reason;
        }

        const enSide = enResult.value;
        const hiSide = hiResult.status === 'fulfilled' ? hiResult.value : null;

        paperTotalQuestions.set(slug, enSide.totalQuestions);
        const question = buildBilingualQuestion({
          slug,
          qNum,
          en: enSide,
          hi: hiSide,
        });
        questionCache.set(cacheKey, question);
        return question;
      } finally {
        questionInFlight.delete(cacheKey);
      }
    })();

    questionInFlight.set(cacheKey, promise);
  }

  const question = await promise;
  return {
    totalQuestions: paperTotalQuestions.get(slug) ?? 150,
    question,
  };
}

export async function getExamsnetQuestionBatch(
  slug: string,
  from: number,
  to: number
): Promise<{ totalQuestions: number; questions: Question[] }> {
  if (!isValidExamsnetSlug(slug)) {
    throw new Error('Invalid paper slug');
  }
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || to - from + 1 > 30) {
    throw new Error('Invalid batch range (max 30 questions per batch)');
  }

  const nums: number[] = [];
  for (let n = from; n <= to; n += 1) {
    nums.push(n);
  }

  const results: Question[] = [];
  const CONCURRENCY = 5;

  for (let i = 0; i < nums.length; i += CONCURRENCY) {
    const chunk = nums.slice(i, i + CONCURRENCY);
    const settled = await Promise.all(
      chunk.map((n) => getExamsnetQuestion(slug, n).then((res) => res.question))
    );
    results.push(...settled);
  }

  return {
    totalQuestions: paperTotalQuestions.get(slug) ?? 150,
    questions: results,
  };
}

export interface ApiDispatchResult {
  status: number;
  body: unknown;
  cacheControl?: string;
}

function safeDecodeSlug(raw: string): string | null {
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return null;
  }
}

/**
 * Platform-agnostic API router shared across Express (Render / local),
 * Vercel Serverless Functions, and Netlify Functions.
 */
export async function handleCtetApiRequest(
  pathname: string,
  searchParams: URLSearchParams
): Promise<ApiDispatchResult> {
  // Normalize Netlify /.netlify/functions/api prefix or /api prefix
  const normalizedPath = pathname
    .replace(/^\/\.netlify\/functions\/api/, '')
    .replace(/^\/api/, '')
    .replace(/\/+$/, '');

  if (normalizedPath === '/ctet/papers' || normalizedPath === '/health') {
    if (normalizedPath === '/health') {
      return { status: 200, body: { ok: true } };
    }
    try {
      const papers = await getExamsnetPapersCatalog();
      return {
        status: 200,
        body: { papers },
        cacheControl: 'public, s-maxage=1800, stale-while-revalidate=3600',
      };
    } catch (err) {
      return {
        status: 502,
        body: { error: err instanceof Error ? err.message : 'Failed to load papers catalog' },
      };
    }
  }

  const singleMatch = normalizedPath.match(/^\/ctet\/papers\/([^/]+)\/question\/(\d+)$/);
  if (singleMatch) {
    const slug = safeDecodeSlug(singleMatch[1]);
    const num = Number(singleMatch[2]);

    if (!slug || !isValidExamsnetSlug(slug)) {
      return { status: 400, body: { error: 'Invalid paper slug' } };
    }
    if (!Number.isInteger(num) || num < 1 || num > 200) {
      return { status: 400, body: { error: 'Invalid question number' } };
    }

    try {
      const payload = await getExamsnetQuestion(slug, num);
      return {
        status: 200,
        body: payload,
        cacheControl: 'public, s-maxage=86400, stale-while-revalidate=604800',
      };
    } catch (err) {
      return {
        status: 502,
        body: { error: err instanceof Error ? err.message : 'Failed to load question' },
      };
    }
  }

  const batchMatch = normalizedPath.match(/^\/ctet\/papers\/([^/]+)\/questions$/);
  if (batchMatch) {
    const slug = safeDecodeSlug(batchMatch[1]);
    const from = Number(searchParams.get('from') ?? 1);
    const to = Number(searchParams.get('to') ?? Math.min(from + 9, 150));

    if (!slug || !isValidExamsnetSlug(slug)) {
      return { status: 400, body: { error: 'Invalid paper slug' } };
    }
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || to - from + 1 > 30) {
      return {
        status: 400,
        body: { error: 'Invalid question range (max 30 per request)' },
      };
    }

    try {
      const payload = await getExamsnetQuestionBatch(slug, from, to);
      return {
        status: 200,
        body: payload,
        cacheControl: 'public, s-maxage=86400, stale-while-revalidate=604800',
      };
    } catch (err) {
      return {
        status: 502,
        body: { error: err instanceof Error ? err.message : 'Failed to load question batch' },
      };
    }
  }

  return { status: 404, body: { error: 'API route not found' } };
}
