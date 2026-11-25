import type {
  BilingualText,
  LanguageMode,
  PaperMeta,
  PracticeMode,
  Question,
  QuestionStatus,
  SubjectId,
  SubjectScore,
  TestResult,
} from '../types/ctet';

export const SUBJECT_ORDER: SubjectId[] = ['cdp', 'math', 'evs', 'lang1', 'lang2'];

export const SUBJECT_LABELS: Record<SubjectId, BilingualText> = {
  cdp: {
    en: 'Child Development & Pedagogy',
    hi: 'बाल विकास एवं शिक्षाशास्त्र',
  },
  math: {
    en: 'Mathematics',
    hi: 'गणित',
  },
  evs: {
    en: 'Environmental Studies (EVS)',
    hi: 'पर्यावरण अध्ययन',
  },
  lang1: {
    en: 'Language I (English)',
    hi: 'भाषा I (अंग्रेजी)',
  },
  lang2: {
    en: 'Language II (Hindi)',
    hi: 'भाषा II (हिन्दी)',
  },
};

export const SUBJECT_SHORT_LABELS: Record<SubjectId, BilingualText> = {
  cdp: { en: 'CDP', hi: 'बाल विकास' },
  math: { en: 'Maths', hi: 'गणित' },
  evs: { en: 'EVS', hi: 'पर्यावरण' },
  lang1: { en: 'Language I', hi: 'भाषा I' },
  lang2: { en: 'Language II', hi: 'भाषा II' },
};

export function filterPapers(
  papers: PaperMeta[],
  yearFilter: number | 'all' | 'older',
  searchQuery: string
): PaperMeta[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return papers.filter((paper) => {
    if (yearFilter === 'older') {
      if (paper.year >= 2021) return false;
    } else if (yearFilter !== 'all') {
      if (paper.year !== yearFilter) return false;
    }

    if (!normalizedQuery) return true;

    const searchable = [
      paper.title.en,
      paper.title.hi,
      paper.dateLabel.en,
      paper.dateLabel.hi,
      paper.shiftLabel?.en ?? '',
      paper.shiftLabel?.hi ?? '',
      String(paper.year),
    ]
      .join(' ')
      .toLowerCase();

    return searchable.includes(normalizedQuery);
  });
}

export function groupPapersByYear(papers: PaperMeta[]): Array<{ year: number; papers: PaperMeta[] }> {
  const map = new Map<number, PaperMeta[]>();
  for (const paper of papers) {
    const existing = map.get(paper.year);
    if (existing) {
      existing.push(paper);
    } else {
      map.set(paper.year, [paper]);
    }
  }

  return Array.from(map.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, list]) => ({
      year,
      papers: list.slice().sort((a, b) => a.numberInYear - b.numberInYear),
    }));
}

export function getQuestionStatus(
  questionId: string,
  answers: Record<string, number>,
  markedForReview: Record<string, boolean>,
  visited: Record<string, boolean>
): QuestionStatus {
  const hasAnswer = Object.prototype.hasOwnProperty.call(answers, questionId);
  const isMarked = Boolean(markedForReview[questionId]);
  const isVisited = Boolean(visited[questionId]);

  if (hasAnswer && isMarked) return 'marked-answered';
  if (isMarked) return 'marked';
  if (hasAnswer) return 'answered';
  if (isVisited) return 'not-answered';
  return 'not-visited';
}

export function calculateTestResult(params: {
  paper: PaperMeta;
  questions: Question[];
  answers: Record<string, number>;
  mode: PracticeMode;
  elapsedSeconds: number;
  completedAt?: string;
}): TestResult {
  const { paper, questions, answers, mode, elapsedSeconds, completedAt } = params;
  let correctCount = 0;
  let incorrectCount = 0;
  let attemptedCount = 0;

  const subjectMap: Record<
    SubjectId,
    { total: number; attempted: number; correct: number; incorrect: number }
  > = {
    cdp: { total: 0, attempted: 0, correct: 0, incorrect: 0 },
    math: { total: 0, attempted: 0, correct: 0, incorrect: 0 },
    evs: { total: 0, attempted: 0, correct: 0, incorrect: 0 },
    lang1: { total: 0, attempted: 0, correct: 0, incorrect: 0 },
    lang2: { total: 0, attempted: 0, correct: 0, incorrect: 0 },
  };

  for (const q of questions) {
    subjectMap[q.subject].total += 1;
    const selected = answers[q.id];
    if (typeof selected === 'number') {
      attemptedCount += 1;
      subjectMap[q.subject].attempted += 1;
      if (selected === q.correctIndex) {
        correctCount += 1;
        subjectMap[q.subject].correct += 1;
      } else {
        incorrectCount += 1;
        subjectMap[q.subject].incorrect += 1;
      }
    }
  }

  const totalQuestions = questions.length;
  const paperTotalQuestions = paper.officialTotalQuestions || totalQuestions;
  const unattemptedCount = totalQuestions - attemptedCount;
  const scorePercentage =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const accuracyPercentage =
    attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;

  const subjectBreakdown: SubjectScore[] = SUBJECT_ORDER.map((subject) => {
    const s = subjectMap[subject];
    return {
      subject,
      total: s.total,
      attempted: s.attempted,
      correct: s.correct,
      incorrect: s.incorrect,
      accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    };
  }).filter((s) => s.total > 0);

  return {
    paperId: paper.id,
    paperTitle: paper.title,
    mode,
    totalQuestions,
    paperTotalQuestions,
    attemptedCount,
    correctCount,
    incorrectCount,
    unattemptedCount,
    scorePercentage,
    accuracyPercentage,
    elapsedSeconds,
    completedAt: completedAt ?? new Date().toISOString(),
    subjectBreakdown,
    answers: { ...answers },
  };
}

export function formatTimer(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

export function getBilingualInlineText(text: BilingualText, langMode: LanguageMode): string {
  if (langMode === 'en') return text.en;
  if (langMode === 'hi') return text.hi;
  return `${text.en} / ${text.hi}`;
}
