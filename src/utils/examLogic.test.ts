import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTestResult,
  filterPapers,
  formatTimer,
  getBilingualInlineText,
  getQuestionStatus,
  groupPapersByYear,
} from './examLogic.ts';
import type { PaperMeta, Question } from '../types/ctet.ts';

const samplePapers: PaperMeta[] = [
  {
    id: 'ctet-paper-i-classes-i-to-v-8-feb-2026-shift-2-solved-paper',
    slug: 'ctet-paper-i-classes-i-to-v-8-feb-2026-shift-2-solved-paper',
    numberInYear: 1,
    year: 2026,
    title: {
      en: 'CTET Paper I (Classes I to V) 8 Feb 2026 Shift 2 Solved Paper',
      hi: 'CTET पेपर I (कक्षा I से V) 8 फरवरी 2026 शिफ्ट 2 हल प्रश्न-पत्र',
    },
    dateLabel: { en: '8 Feb 2026', hi: '8 फरवरी 2026' },
    shiftLabel: { en: 'Shift 2', hi: 'शिफ्ट 2' },
    officialDurationMinutes: 150,
    officialTotalQuestions: 150,
  },
  {
    id: 'ctet-paper-i-classes-i-to-v-21-jan-2024-shift-2-solved-paper',
    slug: 'ctet-paper-i-classes-i-to-v-21-jan-2024-shift-2-solved-paper',
    numberInYear: 1,
    year: 2024,
    title: {
      en: 'CTET Paper I (Classes I to V) 21 Jan 2024 Shift 2 Solved Paper',
      hi: 'CTET पेपर I (कक्षा I से V) 21 जनवरी 2024 शिफ्ट 2 हल प्रश्न-पत्र',
    },
    dateLabel: { en: '21 Jan 2024', hi: '21 जनवरी 2024' },
    shiftLabel: { en: 'Shift 2', hi: 'शिफ्ट 2' },
    officialDurationMinutes: 150,
    officialTotalQuestions: 150,
  },
  {
    id: 'ctet-paper-i-classes-i-to-v-july-2019-solved-paper',
    slug: 'ctet-paper-i-classes-i-to-v-july-2019-solved-paper',
    numberInYear: 1,
    year: 2019,
    title: {
      en: 'CTET Paper I (Classes I to V) July 2019 Solved Paper',
      hi: 'CTET पेपर I (कक्षा I से V) जुलाई 2019 हल प्रश्न-पत्र',
    },
    dateLabel: { en: 'July 2019', hi: 'जुलाई 2019' },
    officialDurationMinutes: 150,
    officialTotalQuestions: 150,
  },
];

const sampleQuestions: Question[] = [
  {
    id: 'q1',
    paperSlug: samplePapers[0].slug,
    number: 1,
    subject: 'cdp',
    topic: { en: 'Child Development & Pedagogy', hi: 'बाल विकास एवं शिक्षाशास्त्र' },
    question: { en: 'Q1 English', hi: 'Q1 Hindi' },
    options: [
      { en: 'A', hi: 'अ' },
      { en: 'B', hi: 'ब' },
      { en: 'C', hi: 'स' },
      { en: 'D', hi: 'द' },
    ],
    correctIndex: 1,
    explanation: { en: 'Exp 1', hi: 'व्याख्या 1' },
  },
  {
    id: 'q2',
    paperSlug: samplePapers[0].slug,
    number: 31,
    subject: 'math',
    topic: { en: 'Mathematics', hi: 'गणित' },
    question: { en: 'Q2 English', hi: 'Q2 Hindi' },
    options: [
      { en: 'A', hi: 'अ' },
      { en: 'B', hi: 'ब' },
      { en: 'C', hi: 'स' },
      { en: 'D', hi: 'द' },
    ],
    correctIndex: 2,
    explanation: { en: 'Exp 2', hi: 'व्याख्या 2' },
  },
  {
    id: 'q3',
    paperSlug: samplePapers[0].slug,
    number: 61,
    subject: 'evs',
    topic: { en: 'Environmental Studies', hi: 'पर्यावरण अध्ययन' },
    question: { en: 'Q3 English', hi: 'Q3 Hindi' },
    options: [
      { en: 'A', hi: 'अ' },
      { en: 'B', hi: 'ब' },
      { en: 'C', hi: 'स' },
      { en: 'D', hi: 'द' },
    ],
    correctIndex: 0,
    explanation: { en: 'Exp 3', hi: 'व्याख्या 3' },
  },
];

test('filterPapers filters by year, older bucket, and Hindi/English search queries', () => {
  assert.equal(filterPapers(samplePapers, 'all', '').length, 3);
  assert.equal(filterPapers(samplePapers, 2026, '').length, 1);
  assert.equal(filterPapers(samplePapers, 'older', '').length, 1);
  assert.equal(filterPapers(samplePapers, 'all', 'जनवरी').length, 1);
  assert.equal(filterPapers(samplePapers, 'all', 'Feb 2026').length, 1);
});

test('groupPapersByYear sorts descending by year', () => {
  const grouped = groupPapersByYear(samplePapers);
  assert.deepEqual(
    grouped.map((g) => g.year),
    [2026, 2024, 2019]
  );
});

test('getQuestionStatus tracks answered, marked, visited states accurately', () => {
  assert.equal(getQuestionStatus('q1', {}, {}, {}), 'not-visited');
  assert.equal(getQuestionStatus('q1', {}, {}, { q1: true }), 'not-answered');
  assert.equal(getQuestionStatus('q1', { q1: 2 }, {}, { q1: true }), 'answered');
  assert.equal(getQuestionStatus('q1', {}, { q1: true }, { q1: true }), 'marked');
  assert.equal(getQuestionStatus('q1', { q1: 2 }, { q1: true }, { q1: true }), 'marked-answered');
});

test('calculateTestResult computes total and subject breakdown accurately', () => {
  const result = calculateTestResult({
    paper: samplePapers[0],
    questions: sampleQuestions,
    answers: { q1: 1, q2: 0 },
    mode: 'practice',
    elapsedSeconds: 125,
    completedAt: '2026-11-24T00:00:00.000Z',
  });

  assert.equal(result.totalQuestions, 3);
  assert.equal(result.attemptedCount, 2);
  assert.equal(result.correctCount, 1);
  assert.equal(result.incorrectCount, 1);
  assert.equal(result.unattemptedCount, 1);
  assert.equal(result.scorePercentage, 33);
  assert.equal(result.accuracyPercentage, 50);
  assert.equal(result.paperTotalQuestions, 150);
  assert.equal(result.subjectBreakdown.length, 3);
  assert.equal(result.subjectBreakdown[0].accuracy, 100);
  assert.equal(result.subjectBreakdown[1].accuracy, 0);
});

test('formatTimer formats mm:ss and hh:mm:ss', () => {
  assert.equal(formatTimer(0), '00:00');
  assert.equal(formatTimer(65), '01:05');
  assert.equal(formatTimer(3661), '01:01:01');
});

test('getBilingualInlineText formats en, hi, and bilingual modes', () => {
  const sample = { en: 'Mathematics', hi: 'गणित' };
  assert.equal(getBilingualInlineText(sample, 'en'), 'Mathematics');
  assert.equal(getBilingualInlineText(sample, 'hi'), 'गणित');
  assert.equal(getBilingualInlineText(sample, 'bilingual'), 'Mathematics / गणित');
});
