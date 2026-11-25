export type LanguageMode = 'en' | 'hi' | 'bilingual';

export type PracticeMode = 'practice' | 'exam';

export type SubjectId = 'cdp' | 'math' | 'evs' | 'lang1' | 'lang2';

export type FontScale = 'sm' | 'md' | 'lg';

export interface BilingualText {
  en: string;
  hi: string;
}

export interface Question {
  id: string;
  paperSlug: string;
  number: number;
  subject: SubjectId;
  topic: BilingualText;
  passage?: BilingualText;
  question: BilingualText;
  options: [BilingualText, BilingualText, BilingualText, BilingualText];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: BilingualText;
}

export interface PaperMeta {
  id: string;
  slug: string;
  numberInYear: number;
  year: number;
  title: BilingualText;
  dateLabel: BilingualText;
  shiftLabel?: BilingualText;
  officialDurationMinutes: number;
  officialTotalQuestions: number;
}

export type QuestionStatus = 'answered' | 'marked' | 'marked-answered' | 'not-answered' | 'not-visited';

export interface SubjectScore {
  subject: SubjectId;
  total: number;
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: number;
}

export interface TestResult {
  paperId: string;
  paperTitle: BilingualText;
  mode: PracticeMode;
  totalQuestions: number;
  paperTotalQuestions?: number;
  attemptedCount: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  scorePercentage: number;
  accuracyPercentage?: number;
  elapsedSeconds: number;
  completedAt: string;
  subjectBreakdown: SubjectScore[];
  answers: Record<string, number>;
}

export interface DraftAttempt {
  paperSlug: string;
  currentNumber: number;
  practiceMode: PracticeMode;
  elapsedSeconds: number;
  answers: Record<string, number>;
  markedForReview: Record<string, boolean>;
  checkedQuestions: Record<string, boolean>;
  visited: Record<string, boolean>;
  updatedAt: string;
}

export type ActiveTab = 'papers' | 'details' | 'history';
