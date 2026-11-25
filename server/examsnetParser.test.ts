import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBilingualQuestion,
  isValidExamsnetSlug,
  parseExamsnetCatalogHtml,
  parseExamsnetQuestionHtml,
  sanitizeExamsnetFragment,
  subjectFromQuestionNumber,
} from './examsnetParser.ts';
import { handleCtetApiRequest } from './examsnetService.ts';

test('isValidExamsnetSlug allows clean slugs and blocks path traversal', () => {
  assert.equal(isValidExamsnetSlug('ctet-paper-i-classes-i-to-v-8-feb-2026-shift-2-solved-paper'), true);
  assert.equal(isValidExamsnetSlug('../etc/passwd'), false);
  assert.equal(isValidExamsnetSlug('slug/with/slash'), false);
  assert.equal(isValidExamsnetSlug('ab'), false);
});

test('subjectFromQuestionNumber maps 1..150 to official CTET Paper 1 sections', () => {
  assert.equal(subjectFromQuestionNumber(1), 'cdp');
  assert.equal(subjectFromQuestionNumber(30), 'cdp');
  assert.equal(subjectFromQuestionNumber(31), 'math');
  assert.equal(subjectFromQuestionNumber(60), 'math');
  assert.equal(subjectFromQuestionNumber(61), 'evs');
  assert.equal(subjectFromQuestionNumber(90), 'evs');
  assert.equal(subjectFromQuestionNumber(91), 'lang1');
  assert.equal(subjectFromQuestionNumber(120), 'lang1');
  assert.equal(subjectFromQuestionNumber(121), 'lang2');
  assert.equal(subjectFromQuestionNumber(150), 'lang2');
});

test('sanitizeExamsnetFragment strips scripts, watermarks, and unsafe handlers while keeping KaTeX and images', () => {
  const dirty = `
    <div class="watermark"><span>© examsnet.com</span></div>
    <script>alert(1)</script>
    <a href="/test/some-slug/1" onclick="evil()">Which fraction is largest?</a>
    <img src="/assets/q1.png" onerror="evil()" />
    <span class="katex"><span class="katex-html" style="height:1.1em">3/4</span></span>
  `;
  const clean = sanitizeExamsnetFragment(dirty);
  assert.equal(clean.includes('<script'), false);
  assert.equal(clean.includes('examsnet.com</span>'), false);
  assert.equal(clean.includes('onclick'), false);
  assert.equal(clean.includes('onerror'), false);
  assert.equal(clean.includes('Which fraction is largest?'), true);
  assert.equal(clean.includes('https://www.examsnet.com/assets/q1.png'), true);
  assert.equal(clean.includes('style="height:1.1em"'), true);
});

test('parseExamsnetQuestionHtml extracts passage, question, 4 options, correctIndex, and solution', () => {
  const sampleHtml = `
    <html><body>
      <select aria-label="Go to Question">
        <option value="/test/s/1">1</option>
        <option value="/test/s/2">2</option>
      </select>
      <div id="showpara"><b>Question Numbers: 91-99</b><div class="custom-break"></div>Read this passage carefully.</div>
      <div id="imagewrap"><a href="/test/s/1">Sample real question?</a></div>
      <ul id="answers">
        <li><label><input type="radio" name="answerid" value="0"><span>Opt A</span></label></li>
        <li><label><input type="radio" name="answerid" value="1"><span>Opt B</span></label></li>
        <li><label><input type="radio" name="answerid" value="2"><span>Opt C</span></label></li>
        <li><label><input type="radio" name="answerid" value="3"><span>Opt D</span></label></li>
      </ul>
      <div id="answerstatus">
        <div class="text-primary border-bottom"><strong>Solution:</strong></div>
        <div><b>Explanation:</b><div class="custom-break"></div>Option C is right.</div>
      </div>
      <script>function v(){var at="R";var c=["2"];}</script>
    </body></html>
  `;

  const parsed = parseExamsnetQuestionHtml(sampleHtml);
  assert.equal(parsed.totalQuestions, 2);
  assert.ok(parsed.passageHtml?.includes('Read this passage carefully.'));
  assert.equal(parsed.questionHtml, 'Sample real question?');
  assert.deepEqual(parsed.optionsHtml, ['Opt A', 'Opt B', 'Opt C', 'Opt D']);
  assert.equal(parsed.correctIndex, 2);
  assert.ok(parsed.solutionHtml.includes('Option C is right.'));
});

test('parseExamsnetCatalogHtml extracts unique non-hi CTET paper slugs and Hindi labels', () => {
  const html = `
    <div class="card">
      <h5>1. CTET Paper I (Classes I to V) 8 Feb 2026 Shift 2 Solved Paper</h5>
      <a href="/test/ctet-paper-i-classes-i-to-v-8-feb-2026-shift-2-solved-paper">Start Learn Test</a>
      <a href="/test/ctet-paper-i-classes-i-to-v-8-feb-2026-shift-2-solved-paper-hi">Hindi</a>
    </div>
  `;
  const papers = parseExamsnetCatalogHtml(html);
  assert.equal(papers.length, 1);
  assert.equal(papers[0].slug, 'ctet-paper-i-classes-i-to-v-8-feb-2026-shift-2-solved-paper');
  assert.equal(papers[0].year, 2026);
  assert.ok(papers[0].title.hi.includes('फरवरी 2026'));
});

test('buildBilingualQuestion combines EN and HI sides cleanly', () => {
  const q = buildBilingualQuestion({
    slug: 'ctet-paper-i-classes-i-to-v-8-feb-2026-shift-2-solved-paper',
    qNum: 35,
    en: {
      totalQuestions: 150,
      questionHtml: 'English Q',
      optionsHtml: ['A', 'B', 'C', 'D'],
      correctIndex: 1,
      solutionHtml: 'Sol EN',
    },
    hi: {
      totalQuestions: 150,
      questionHtml: 'हिन्दी प्रश्न',
      optionsHtml: ['क', 'ख', 'ग', 'घ'],
      correctIndex: 1,
      solutionHtml: 'व्याख्या HI',
    },
  });

  assert.equal(q.subject, 'math');
  assert.equal(q.question.en, 'English Q');
  assert.equal(q.question.hi, 'हिन्दी प्रश्न');
  assert.equal(q.options[1].hi, 'ख');
  assert.equal(q.correctIndex, 1);
});

test('handleCtetApiRequest normalizes Vercel/Express/Netlify prefixes and validates inputs', async () => {
  const healthApi = await handleCtetApiRequest('/api/health', new URLSearchParams());
  assert.equal(healthApi.status, 200);
  assert.deepEqual(healthApi.body, { ok: true });

  const healthNetlify = await handleCtetApiRequest('/.netlify/functions/api/health', new URLSearchParams());
  assert.equal(healthNetlify.status, 200);
  assert.deepEqual(healthNetlify.body, { ok: true });

  const badSlug = await handleCtetApiRequest('/api/ctet/papers/bad_slug!/question/1', new URLSearchParams());
  assert.equal(badSlug.status, 400);

  const badPercent = await handleCtetApiRequest('/api/ctet/papers/%E0%A4%A/question/1', new URLSearchParams());
  assert.equal(badPercent.status, 400);

  const badBatch = await handleCtetApiRequest(
    '/api/ctet/papers/ctet-paper-i-classes-i-to-v-8-feb-2026-shift-2-solved-paper/questions',
    new URLSearchParams({ from: '1', to: '99' })
  );
  assert.equal(badBatch.status, 400);

  const missing = await handleCtetApiRequest('/api/unknown-route', new URLSearchParams());
  assert.equal(missing.status, 404);
});
