import * as cheerio from 'cheerio';
import type { BilingualText, PaperMeta, Question, SubjectId } from '../src/types/ctet.ts';

const EXAMSNET_ORIGIN = 'https://www.examsnet.com';

const MONTH_HI_MAP: Record<string, string> = {
  jan: 'जनवरी',
  january: 'जनवरी',
  feb: 'फरवरी',
  february: 'फरवरी',
  mar: 'मार्च',
  march: 'मार्च',
  apr: 'अप्रैल',
  april: 'अप्रैल',
  may: 'मई',
  jun: 'जून',
  june: 'जून',
  jul: 'जुलाई',
  july: 'जुलाई',
  aug: 'अगस्त',
  august: 'अगस्त',
  sep: 'सितंबर',
  september: 'सितंबर',
  oct: 'अक्टूबर',
  october: 'अक्टूबर',
  nov: 'नवंबर',
  november: 'नवंबर',
  dec: 'दिसंबर',
  december: 'दिसंबर',
};

export function subjectFromQuestionNumber(qNum: number): SubjectId {
  if (qNum <= 30) return 'cdp';
  if (qNum <= 60) return 'math';
  if (qNum <= 90) return 'evs';
  if (qNum <= 120) return 'lang1';
  return 'lang2';
}

export function subjectTopicLabel(subject: SubjectId): BilingualText {
  switch (subject) {
    case 'cdp':
      return { en: 'Child Development & Pedagogy', hi: 'बाल विकास एवं शिक्षाशास्त्र' };
    case 'math':
      return { en: 'Mathematics', hi: 'गणित' };
    case 'evs':
      return { en: 'Environmental Studies', hi: 'पर्यावरण अध्ययन' };
    case 'lang1':
      return { en: 'Language I (English)', hi: 'भाषा I (अंग्रेजी)' };
    case 'lang2':
      return { en: 'Language II (Hindi)', hi: 'भाषा II (हिन्दी)' };
  }
}

export function isValidExamsnetSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/i.test(slug) && slug.length >= 4 && slug.length <= 140;
}

function translateDateToHindi(enDate: string): string {
  return enDate.replace(
    /\b(Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|September|Oct|October|Nov|November|Dec|December)\b/gi,
    (m) => MONTH_HI_MAP[m.toLowerCase()] ?? m
  );
}

export function parseExamsnetCatalogHtml(html: string): PaperMeta[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const papers: PaperMeta[] = [];
  const perYearCount = new Map<number, number>();

  $('a[href^="/test/ctet-"]').each((_, el) => {
    const href = ($(el).attr('href') || '').trim();
    const slug = href.replace(/^\/test\//, '').split('/')[0]?.trim() || '';
    if (!slug || !isValidExamsnetSlug(slug) || slug.endsWith('-hi') || seen.has(slug)) {
      return;
    }
    seen.add(slug);

    const card = $(el).closest('.card, .exam-test-item, .shadow-sm, .border');
    const rawHeading = card
      .find('h2, h3, h4, h5, .card-title, .exam-test-title')
      .first()
      .text()
      .replace(/\s+/g, ' ')
      .trim();

    const yearMatch = (rawHeading || slug).match(/\b(20\d{2})\b/);
    const year = yearMatch ? Number(yearMatch[1]) : 2024;

    const numMatch = rawHeading.match(/^(\d+)\.\s*(.+)$/);
    const numberInYear = numMatch
      ? Number(numMatch[1])
      : (perYearCount.get(year) ?? 0) + 1;
    perYearCount.set(year, numberInYear);

    const baseEnTitle = numMatch
      ? `${numberInYear}. ${numMatch[2]}`
      : rawHeading || `${numberInYear}. ${slug.replace(/-/g, ' ')}`;

    const dateMatch = baseEnTitle.match(
      /(?:\d{1,2}\s+)?(?:Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|September|Oct|October|Nov|November|Dec|December)\s+20\d{2}/i
    );
    const enDate = dateMatch ? dateMatch[0] : String(year);
    const hiDate = translateDateToHindi(enDate);

    const shiftMatch = baseEnTitle.match(/Shift\s+(\d+)/i);
    const enShift = shiftMatch ? `Shift ${shiftMatch[1]}` : undefined;
    const hiShift = shiftMatch ? `शिफ्ट ${shiftMatch[1]}` : undefined;

    const hiTitle = `${numberInYear}. CTET पेपर I (कक्षा I से V) ${hiDate}${hiShift ? ` ${hiShift}` : ''} हल प्रश्न-पत्र`;

    papers.push({
      id: slug,
      slug,
      numberInYear,
      year,
      title: {
        en: baseEnTitle,
        hi: hiTitle,
      },
      dateLabel: {
        en: enDate,
        hi: hiDate,
      },
      shiftLabel: enShift && hiShift ? { en: enShift, hi: hiShift } : undefined,
      officialDurationMinutes: 150,
      officialTotalQuestions: 150,
    });
  });

  return papers;
}

function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url, EXAMSNET_ORIGIN);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function sanitizeExamsnetFragment(rawHtml: string): string {
  if (!rawHtml || !rawHtml.trim()) return '';

  const $ = cheerio.load(`<div id="__root__">${rawHtml}</div>`, null, false);
  const root = $('#__root__');

  // Remove dangerous or non-content nodes
  root
    .find(
      'script, style, iframe, object, embed, form, input, button, textarea, select, noscript, ins, .watermark, [class*="watermark"], .in-content-ad'
    )
    .remove();

  // Remove watermark text blocks injected by examsnet
  root.find('div, span, p').each((_, el) => {
    const txt = $(el).text().trim();
    if (txt === '© examsnet.com' || txt === 'Advertisements') {
      $(el).remove();
    }
  });

  // Replace examsnet custom-break spacers with clean line breaks
  root.find('div.custom-break').each((_, el) => {
    $(el).replaceWith('<br />');
  });

  // Unwrap internal question self-links (<a href="/test/...">Question text</a>)
  root.find('a').each((_, el) => {
    const href = ($(el).attr('href') || '').trim();
    if (!href || href.startsWith('/test/') || href.startsWith('#') || !isSafeHttpUrl(href)) {
      $(el).replaceWith($(el).html() || $(el).text());
    } else {
      $(el).attr('target', '_blank');
      $(el).attr('rel', 'noopener noreferrer');
    }
  });

  // Rewrite relative image URLs and drop ad/store images
  root.find('img').each((_, el) => {
    const src = ($(el).attr('src') || '').trim();
    if (
      !src ||
      src.includes('ad_tower') ||
      src.includes('ad_mobile') ||
      src.includes('appstore') ||
      src.includes('playstore')
    ) {
      $(el).remove();
      return;
    }

    if (src.startsWith('/')) {
      $(el).attr('src', `${EXAMSNET_ORIGIN}${src}`);
    } else if (!isSafeHttpUrl(src)) {
      $(el).remove();
      return;
    }

    if (!$(el).attr('alt')) {
      $(el).attr('alt', 'Question figure');
    }
  });

  // Strip event handlers and non-KaTeX inline styles
  root.find('*').each((_, el) => {
    const attribs = (el as unknown as { attribs?: Record<string, string> }).attribs;
    if (!attribs) return;

    const inKatex = $(el).closest('.katex').length > 0;
    for (const attrName of Object.keys(attribs)) {
      const lower = attrName.toLowerCase();
      if (lower.startsWith('on')) {
        $(el).removeAttr(attrName);
      } else if (lower === 'style') {
        const val = attribs[attrName] || '';
        if (!inKatex || /url\s*\(|expression\s*\(|javascript:/i.test(val)) {
          $(el).removeAttr(attrName);
        }
      }
    }
  });

  // Collapse duplicate leading/trailing <br> tags
  let cleaned = (root.html() || '').trim();
  cleaned = cleaned.replace(/^(?:\s*<br\s*\/?>\s*)+/i, '').replace(/(?:\s*<br\s*\/?>\s*)+$/i, '');
  return cleaned.trim();
}

export interface ParsedExamsnetQuestionSide {
  totalQuestions: number;
  passageHtml?: string;
  questionHtml: string;
  optionsHtml: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  solutionHtml: string;
}

export function parseExamsnetQuestionHtml(html: string): ParsedExamsnetQuestionSide {
  const $ = cheerio.load(html);

  const goOptionsCount = $('select[aria-label="Go to Question"] option').length;
  const totalQuestions = goOptionsCount > 0 ? goOptionsCount : 150;

  // Passage (#showpara)
  let passageHtml: string | undefined;
  const showParaEl = $('#showpara');
  if (showParaEl.length > 0) {
    const cleanedPara = sanitizeExamsnetFragment(showParaEl.html() || '');
    const textOnly = cheerio.load(`<div>${cleanedPara}</div>`).text().trim();
    const hasImg = /<img\b/i.test(cleanedPara);
    if (textOnly.length > 0 || hasImg) {
      passageHtml = cleanedPara;
    }
  }

  // Question stem (#imagewrap)
  const rawQuestionHtml = $('#imagewrap').html() || '';
  const questionHtml = sanitizeExamsnetFragment(rawQuestionHtml);

  // Options (#answers > li)
  const extractedOptions: string[] = [];
  $('#answers > li').each((_, li) => {
    const label = $(li).find('label').first();
    const directSpan = label.children('span').first();
    let rawOpt = '';
    if (directSpan.length > 0) {
      rawOpt = directSpan.html() || '';
    } else {
      const clone = label.clone();
      clone.find('input').remove();
      rawOpt = clone.html() || clone.text();
    }
    extractedOptions.push(sanitizeExamsnetFragment(rawOpt));
  });

  while (extractedOptions.length < 4) {
    extractedOptions.push('');
  }

  // Correct answer index from validation script: function v(){var at="R";var c=["2"];...}
  let correctIndex: 0 | 1 | 2 | 3 = 0;
  let foundAnswer = false;
  $('script').each((_, sc) => {
    if (foundAnswer) return;
    const text = $(sc).html() || '';
    const match = text.match(/var\s+c\s*=\s*\[\s*["']([0-3])["']\s*\]/);
    if (match) {
      correctIndex = Number(match[1]) as 0 | 1 | 2 | 3;
      foundAnswer = true;
    }
  });

  // Solution HTML (#answerstatus)
  let solutionHtml = '';
  const answerStatus = $('#answerstatus');
  if (answerStatus.length > 0) {
    const clone = answerStatus.clone();
    clone.find('.border-bottom').first().remove();
    solutionHtml = sanitizeExamsnetFragment(clone.html() || '');
  }

  if (!foundAnswer && solutionHtml) {
    const letterMatch = solutionHtml.match(/(?:Option|विकल्प)\s*([A-D])\b/i);
    if (letterMatch) {
      const map: Record<string, 0 | 1 | 2 | 3> = { A: 0, B: 1, C: 2, D: 3 };
      const idx = map[letterMatch[1].toUpperCase()];
      if (idx !== undefined) {
        correctIndex = idx;
      }
    }
  }

  return {
    totalQuestions,
    passageHtml,
    questionHtml,
    optionsHtml: [
      extractedOptions[0],
      extractedOptions[1],
      extractedOptions[2],
      extractedOptions[3],
    ],
    correctIndex,
    solutionHtml,
  };
}

export function buildBilingualQuestion(params: {
  slug: string;
  qNum: number;
  en: ParsedExamsnetQuestionSide;
  hi: ParsedExamsnetQuestionSide | null;
}): Question {
  const { slug, qNum, en, hi } = params;
  const subject = subjectFromQuestionNumber(qNum);
  const topic = subjectTopicLabel(subject);

  const hiSide = hi && hi.questionHtml ? hi : en;

  const passage =
    en.passageHtml || hiSide.passageHtml
      ? {
          en: en.passageHtml || hiSide.passageHtml || '',
          hi: hiSide.passageHtml || en.passageHtml || '',
        }
      : undefined;

  const makePair = (enVal: string, hiVal: string): BilingualText => ({
    en: enVal || hiVal,
    hi: hiVal || enVal,
  });

  return {
    id: `${slug}-q${qNum}`,
    paperSlug: slug,
    number: qNum,
    subject,
    topic,
    passage,
    question: makePair(en.questionHtml, hiSide.questionHtml),
    options: [
      makePair(en.optionsHtml[0], hiSide.optionsHtml[0]),
      makePair(en.optionsHtml[1], hiSide.optionsHtml[1]),
      makePair(en.optionsHtml[2], hiSide.optionsHtml[2]),
      makePair(en.optionsHtml[3], hiSide.optionsHtml[3]),
    ],
    correctIndex: en.correctIndex,
    explanation: makePair(en.solutionHtml, hiSide.solutionHtml),
  };
}
