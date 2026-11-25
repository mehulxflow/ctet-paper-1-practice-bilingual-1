import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Flag,
  Grid2x2,
  HelpCircle,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
  RotateCcw,
  X,
  XCircle,
} from 'lucide-react';
import type {
  DraftAttempt,
  FontScale,
  LanguageMode,
  PaperMeta,
  PracticeMode,
  Question,
  SubjectId,
  TestResult,
} from '../types/ctet';
import { UI_STRINGS } from '../data/uiStrings';
import {
  SUBJECT_ORDER,
  SUBJECT_SHORT_LABELS,
  calculateTestResult,
  formatTimer,
  getQuestionStatus,
} from '../utils/examLogic';
import { BilingualBlock } from './BilingualBlock';

interface TestRunnerViewProps {
  paper: PaperMeta;
  langMode: LanguageMode;
  bookmarkedIds: string[];
  onToggleBookmark: (question: Question) => void;
  onDraftChange?: (slug: string, answeredCount: number) => void;
  onExit: () => void;
  onSubmit: (result: TestResult, loadedQuestions: Question[]) => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

const SECTION_RANGES: Record<SubjectId, { start: number; end: number }> = {
  cdp: { start: 1, end: 30 },
  math: { start: 31, end: 60 },
  evs: { start: 61, end: 90 },
  lang1: { start: 91, end: 120 },
  lang2: { start: 121, end: 150 },
};

function subjectForQuestionNumber(qNum: number): SubjectId {
  if (qNum <= 30) return 'cdp';
  if (qNum <= 60) return 'math';
  if (qNum <= 90) return 'evs';
  if (qNum <= 120) return 'lang1';
  return 'lang2';
}

export function getDraftStorageKey(slug: string): string {
  return `ctet_p1_draft_${slug}`;
}

export function readPaperDraft(slug: string): DraftAttempt | null {
  try {
    const raw = window.localStorage.getItem(getDraftStorageKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftAttempt;
    if (parsed && parsed.paperSlug === slug) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearPaperDraft(slug: string): void {
  try {
    window.localStorage.removeItem(getDraftStorageKey(slug));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Isolated timer so 1-second ticks never re-render the question card or palette.
 */
const TestTimer = memo(function TestTimer({
  initialSeconds,
  practiceMode,
  totalExamSeconds,
  elapsedRef,
}: {
  initialSeconds: number;
  practiceMode: PracticeMode;
  totalExamSeconds: number;
  elapsedRef: MutableRefObject<number>;
}) {
  const [seconds, setSeconds] = useState<number>(initialSeconds);

  useEffect(() => {
    setSeconds(initialSeconds);
    elapsedRef.current = initialSeconds;
  }, [initialSeconds, elapsedRef]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((prev) => {
        const next = prev + 1;
        elapsedRef.current = next;
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [elapsedRef]);

  const displayClock =
    practiceMode === 'exam'
      ? formatTimer(Math.max(0, totalExamSeconds - seconds))
      : formatTimer(seconds);

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono-num text-xs font-semibold text-slate-800"
      aria-label="Elapsed or remaining time"
    >
      <Clock className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
      <span>{displayClock}</span>
    </div>
  );
});

export function TestRunnerView({
  paper,
  langMode,
  bookmarkedIds,
  onToggleBookmark,
  onDraftChange,
  onExit,
  onSubmit,
}: TestRunnerViewProps) {
  const initialDraft = useMemo(() => readPaperDraft(paper.slug), [paper.slug]);

  const [practiceMode, setPracticeMode] = useState<PracticeMode>(
    initialDraft?.practiceMode ?? 'practice'
  );
  const [totalQuestions, setTotalQuestions] = useState<number>(paper.officialTotalQuestions || 150);
  const [currentNumber, setCurrentNumber] = useState<number>(initialDraft?.currentNumber ?? 1);
  const [questionsByNum, setQuestionsByNum] = useState<Record<number, Question>>({});
  const [loadingNums, setLoadingNums] = useState<Record<number, boolean>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, number>>(initialDraft?.answers ?? {});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>(
    initialDraft?.markedForReview ?? {}
  );
  const [visited, setVisited] = useState<Record<string, boolean>>(
    initialDraft?.visited ?? { [`${paper.slug}-q1`]: true }
  );
  const [checkedQuestions, setCheckedQuestions] = useState<Record<string, boolean>>(
    initialDraft?.checkedQuestions ?? {}
  );

  const [passageOpen, setPassageOpen] = useState<boolean>(true);
  const [passageExpanded, setPassageExpanded] = useState<boolean>(false);
  const [paletteScope, setPaletteScope] = useState<'section' | 'all'>('section');
  // Question Palette stays collapsed by default so Question & Options have maximum room
  const [paletteOpen, setPaletteOpen] = useState<boolean>(false);
  const [fontScale, setFontScale] = useState<FontScale>(() => {
    try {
      const saved = window.localStorage.getItem('ctet_p1_font_scale');
      if (saved === 'sm' || saved === 'md' || saved === 'lg') return saved;
    } catch {
      // ignore
    }
    return 'md';
  });

  const [timerSeed, setTimerSeed] = useState<number>(initialDraft?.elapsedSeconds ?? 0);
  const elapsedRef = useRef<number>(initialDraft?.elapsedSeconds ?? 0);

  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const questionsRef = useRef<Record<number, Question>>({});
  const inFlightBatchesRef = useRef<Set<string>>(new Set());
  const activeSlugRef = useRef<string>(paper.slug);
  const leftPanelRef = useRef<HTMLDivElement | null>(null);
  const rightPanelRef = useRef<HTMLDivElement | null>(null);
  const explanationRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    questionsRef.current = questionsByNum;
  }, [questionsByNum]);

  useEffect(() => {
    try {
      window.localStorage.setItem('ctet_p1_font_scale', fontScale);
    } catch {
      // ignore
    }
  }, [fontScale]);

  // Reset state cleanly if user switches to a different paper slug
  useEffect(() => {
    activeSlugRef.current = paper.slug;
    const draft = readPaperDraft(paper.slug);
    questionsRef.current = {};
    inFlightBatchesRef.current.clear();
    setQuestionsByNum({});
    setTotalQuestions(paper.officialTotalQuestions || 150);
    setCurrentNumber(draft?.currentNumber ?? 1);
    setPracticeMode(draft?.practiceMode ?? 'practice');
    setAnswers(draft?.answers ?? {});
    setMarkedForReview(draft?.markedForReview ?? {});
    setCheckedQuestions(draft?.checkedQuestions ?? {});
    setVisited(draft?.visited ?? { [`${paper.slug}-q1`]: true });
    setTimerSeed(draft?.elapsedSeconds ?? 0);
    elapsedRef.current = draft?.elapsedSeconds ?? 0;
    setLoadError(null);
    setPaletteOpen(false);
  }, [paper.slug, paper.officialTotalQuestions]);

  // Save draft progress automatically on state updates
  useEffect(() => {
    const answeredCount = Object.keys(answers).length;
    const markedCount = Object.keys(markedForReview).filter((k) => markedForReview[k]).length;
    if (answeredCount === 0 && markedCount === 0 && currentNumber === 1) {
      return;
    }
    const draft: DraftAttempt = {
      paperSlug: paper.slug,
      currentNumber,
      practiceMode,
      elapsedSeconds: elapsedRef.current,
      answers,
      markedForReview,
      checkedQuestions,
      visited,
      updatedAt: new Date().toISOString(),
    };
    try {
      window.localStorage.setItem(getDraftStorageKey(paper.slug), JSON.stringify(draft));
    } catch {
      // ignore quota errors
    }
    onDraftChange?.(paper.slug, answeredCount);
  }, [paper.slug, currentNumber, practiceMode, answers, markedForReview, checkedQuestions, visited, onDraftChange]);

  const fetchSingleQuestion = useCallback(
    async (qNum: number) => {
      if (questionsRef.current[qNum]) return;
      const slug = paper.slug;
      setLoadingNums((prev) => ({ ...prev, [qNum]: true }));
      setLoadError(null);

      try {
        const res = await fetch(`/api/ctet/papers/${encodeURIComponent(slug)}/question/${qNum}`);
        if (!res.ok) {
          throw new Error(`Could not load question ${qNum}`);
        }
        const data = (await res.json()) as { totalQuestions?: number; question: Question };
        if (activeSlugRef.current !== slug) return;

        if (typeof data.totalQuestions === 'number' && data.totalQuestions > 0) {
          setTotalQuestions(data.totalQuestions);
        }
        setQuestionsByNum((prev) => {
          const next = { ...prev, [qNum]: data.question };
          questionsRef.current = next;
          return next;
        });
      } catch (err) {
        if (activeSlugRef.current === slug) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load question');
        }
      } finally {
        if (activeSlugRef.current === slug) {
          setLoadingNums((prev) => {
            const next = { ...prev };
            delete next[qNum];
            return next;
          });
        }
      }
    },
    [paper.slug]
  );

  const fetchBatch = useCallback(
    async (from: number, to: number) => {
      const slug = paper.slug;
      const clampedFrom = Math.max(1, from);
      const clampedTo = Math.min(totalQuestions, to);
      if (clampedFrom > clampedTo) return;

      const missing = [];
      for (let n = clampedFrom; n <= clampedTo; n += 1) {
        if (!questionsRef.current[n]) missing.push(n);
      }
      if (missing.length === 0) return;

      const key = `${slug}:${clampedFrom}-${clampedTo}`;
      if (inFlightBatchesRef.current.has(key)) return;
      inFlightBatchesRef.current.add(key);

      try {
        const res = await fetch(
          `/api/ctet/papers/${encodeURIComponent(slug)}/questions?from=${clampedFrom}&to=${clampedTo}`
        );
        if (!res.ok) return;
        const data = (await res.json()) as { totalQuestions?: number; questions: Question[] };
        if (activeSlugRef.current !== slug) return;

        if (typeof data.totalQuestions === 'number' && data.totalQuestions > 0) {
          setTotalQuestions(data.totalQuestions);
        }
        setQuestionsByNum((prev) => {
          const next = { ...prev };
          for (const q of data.questions) {
            next[q.number] = q;
          }
          questionsRef.current = next;
          return next;
        });
      } catch {
        // Background prefetch errors are silent
      } finally {
        inFlightBatchesRef.current.delete(key);
      }
    },
    [paper.slug, totalQuestions]
  );

  // Load current question immediately + prefetch 10-question window silently
  useEffect(() => {
    const qId = `${paper.slug}-q${currentNumber}`;
    setVisited((prev) => (prev[qId] ? prev : { ...prev, [qId]: true }));

    let cancelled = false;
    (async () => {
      await fetchSingleQuestion(currentNumber);
      if (cancelled) return;
      const batchStart = Math.floor((currentNumber - 1) / 10) * 10 + 1;
      const batchEnd = Math.min(totalQuestions, batchStart + 9);
      void fetchBatch(batchStart, batchEnd);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentNumber, paper.slug, totalQuestions, fetchSingleQuestion, fetchBatch]);

  const navigateToQuestion = useCallback(
    (targetNum: number) => {
      const clamped = Math.max(1, Math.min(totalQuestions, targetNum));
      setCurrentNumber(clamped);
      setPaletteOpen(false);
      // Reset internal panel scroll positions cleanly for the new question
      leftPanelRef.current?.scrollTo({ top: 0 });
      rightPanelRef.current?.scrollTo({ top: 0 });
    },
    [totalQuestions]
  );

  const currentQuestion = questionsByNum[currentNumber];
  const currentSubject = currentQuestion?.subject ?? subjectForQuestionNumber(currentNumber);
  const isCurrentLoading = Boolean(loadingNums[currentNumber]) && !currentQuestion;

  const questionNumbers = useMemo(
    () => Array.from({ length: totalQuestions }, (_, i) => i + 1),
    [totalQuestions]
  );

  const visiblePaletteNumbers = useMemo(() => {
    if (paletteScope === 'all') return questionNumbers;
    const range = SECTION_RANGES[currentSubject];
    return questionNumbers.filter((n) => n >= range.start && n <= range.end);
  }, [paletteScope, questionNumbers, currentSubject]);

  const counts = useMemo(() => {
    let answered = 0;
    let marked = 0;
    let notVisited = 0;
    for (const num of questionNumbers) {
      const qId = `${paper.slug}-q${num}`;
      const status = getQuestionStatus(qId, answers, markedForReview, visited);
      if (status === 'answered' || status === 'marked-answered') answered += 1;
      if (status === 'marked' || status === 'marked-answered') marked += 1;
      if (status === 'not-visited') notVisited += 1;
    }
    return { answered, marked, notVisited };
  }, [questionNumbers, paper.slug, answers, markedForReview, visited]);

  const selectedOption = currentQuestion ? answers[currentQuestion.id] : undefined;
  const isChecked = Boolean(
    practiceMode === 'practice' && currentQuestion && checkedQuestions[currentQuestion.id]
  );
  const isMarked = Boolean(currentQuestion && markedForReview[currentQuestion.id]);
  const isBookmarked = Boolean(currentQuestion && bookmarkedIds.includes(currentQuestion.id));

  const handleSelectOption = useCallback(
    (optIndex: number) => {
      if (!currentQuestion) return;
      if (practiceMode === 'practice' && checkedQuestions[currentQuestion.id]) {
        return;
      }
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optIndex }));
    },
    [currentQuestion, practiceMode, checkedQuestions]
  );

  const handleClearResponse = () => {
    if (!currentQuestion) return;
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[currentQuestion.id];
      return next;
    });
    setCheckedQuestions((prev) => {
      const next = { ...prev };
      delete next[currentQuestion.id];
      return next;
    });
  };

  const handleToggleReview = () => {
    if (!currentQuestion) return;
    setMarkedForReview((prev) => ({
      ...prev,
      [currentQuestion.id]: !prev[currentQuestion.id],
    }));
  };

  const handleCheckAnswer = useCallback(() => {
    if (!currentQuestion) return;
    setCheckedQuestions((prev) => ({ ...prev, [currentQuestion.id]: true }));
    // On desktop split pane, bring explanation cleanly into left pane view without touching window scroll
    window.requestAnimationFrame(() => {
      const leftEl = leftPanelRef.current;
      const expEl = explanationRef.current;
      if (leftEl && expEl && window.innerWidth >= 1024) {
        const visibleBottom = leftEl.scrollTop + leftEl.clientHeight;
        const expTop = expEl.offsetTop;
        const expBottom = expTop + expEl.offsetHeight;
        if (expTop + 120 > visibleBottom) {
          const neededToShowAll = Math.max(0, expBottom - leftEl.clientHeight + 16);
          const maxKeepHeaderVisible = Math.max(0, expTop - 16);
          leftEl.scrollTo({
            top: Math.min(neededToShowAll, maxKeepHeaderVisible),
            behavior: 'smooth',
          });
        }
      }
    });
  }, [currentQuestion]);

  // Keyboard shortcuts: Esc closes palette drawer; 1-4 / A-D picks option; arrows navigate; Enter checks answer
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && paletteOpen) {
        e.preventDefault();
        setPaletteOpen(false);
        return;
      }
      if (confirmSubmitOpen || confirmResetOpen || paletteOpen) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateToQuestion(currentNumber - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateToQuestion(currentNumber + 1);
      } else if (e.key === '1' || e.key === 'a' || e.key === 'A') {
        handleSelectOption(0);
      } else if (e.key === '2' || e.key === 'b' || e.key === 'B') {
        handleSelectOption(1);
      } else if (e.key === '3' || e.key === 'c' || e.key === 'C') {
        handleSelectOption(2);
      } else if (e.key === '4' || e.key === 'd' || e.key === 'D') {
        handleSelectOption(3);
      } else if (
        e.key === 'Enter' &&
        practiceMode === 'practice' &&
        selectedOption !== undefined &&
        !isChecked
      ) {
        e.preventDefault();
        handleCheckAnswer();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    paletteOpen,
    confirmSubmitOpen,
    confirmResetOpen,
    currentNumber,
    navigateToQuestion,
    handleSelectOption,
    practiceMode,
    selectedOption,
    isChecked,
    handleCheckAnswer,
  ]);

  const handleConfirmReset = () => {
    clearPaperDraft(paper.slug);
    onDraftChange?.(paper.slug, 0);
    setAnswers({});
    setMarkedForReview({});
    setCheckedQuestions({});
    setVisited({ [`${paper.slug}-q1`]: true });
    setCurrentNumber(1);
    setTimerSeed(0);
    elapsedRef.current = 0;
    setConfirmResetOpen(false);
    leftPanelRef.current?.scrollTo({ top: 0 });
    rightPanelRef.current?.scrollTo({ top: 0 });
  };

  const handleFinalizeSubmit = () => {
    clearPaperDraft(paper.slug);
    onDraftChange?.(paper.slug, 0);
    const loadedQuestions = Object.values(questionsByNum).sort((a, b) => a.number - b.number);
    const result = calculateTestResult({
      paper,
      questions: loadedQuestions,
      answers,
      mode: practiceMode,
      elapsedSeconds: elapsedRef.current,
    });
    onSubmit(result, loadedQuestions);
  };

  // Generous, readable typography at every scale (never tiny)
  const stemSizeClass =
    fontScale === 'sm'
      ? 'text-[15px] sm:text-base'
      : fontScale === 'lg'
        ? 'text-[19px] sm:text-[21px]'
        : 'text-[17px] sm:text-[18px]';
  const optionSizeClass =
    fontScale === 'sm'
      ? 'text-[14px] sm:text-[14.5px]'
      : fontScale === 'lg'
        ? 'text-[17px] sm:text-[18px]'
        : 'text-[15px] sm:text-[16px]';

  const compactPaperTitle =
    langMode === 'hi' ? paper.title.hi : paper.title.en;

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-2.5 px-3 py-2.5 sm:px-6 lg:h-[calc(100dvh-52px)] lg:overflow-hidden">
      {/* Row 1: Compact Single-Line Paper & Control Strip */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 lg:flex-nowrap">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <button
            type="button"
            onClick={onExit}
            aria-label="Back to papers list"
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{langMode === 'hi' ? 'वापस' : 'Back'}</span>
          </button>

          <div className="min-w-0 flex-1">
            <h1
              title={`${paper.title.en} — ${paper.title.hi}`}
              className="truncate text-xs font-bold text-slate-900 sm:text-sm"
            >
              {compactPaperTitle}
            </h1>
            <p className="text-[11px] text-slate-500 tabular-nums">
              {totalQuestions} Questions · {counts.answered} Answered
              {counts.marked > 0 ? ` · ${counts.marked} Marked` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Font Size Selector */}
          <div
            role="group"
            aria-label="Text size"
            className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold"
          >
            {(
              [
                { id: 'sm', label: 'A-' },
                { id: 'md', label: 'A' },
                { id: 'lg', label: 'A+' },
              ] as const
            ).map((sz) => (
              <button
                key={sz.id}
                type="button"
                aria-pressed={fontScale === sz.id}
                onClick={() => setFontScale(sz.id)}
                className={`cursor-pointer rounded px-2 py-1 transition-colors ${
                  fontScale === sz.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {sz.label}
              </button>
            ))}
          </div>

          {/* Mode Toggle */}
          <div
            role="group"
            aria-label="Test mode"
            className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5"
          >
            <button
              type="button"
              aria-pressed={practiceMode === 'practice'}
              onClick={() => setPracticeMode('practice')}
              className={`cursor-pointer whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                practiceMode === 'practice'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {langMode === 'hi' ? UI_STRINGS.practiceModeLabel.hi : UI_STRINGS.practiceModeLabel.en}
            </button>
            <button
              type="button"
              aria-pressed={practiceMode === 'exam'}
              onClick={() => setPracticeMode('exam')}
              className={`cursor-pointer whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                practiceMode === 'exam'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {langMode === 'hi' ? UI_STRINGS.examModeLabel.hi : UI_STRINGS.examModeLabel.en}
            </button>
          </div>

          <TestTimer
            initialSeconds={timerSeed}
            practiceMode={practiceMode}
            totalExamSeconds={paper.officialDurationMinutes * 60}
            elapsedRef={elapsedRef}
          />

          {/* Collapsible Question Palette Trigger (Default Closed) */}
          <button
            type="button"
            onClick={() => setPaletteOpen((o) => !o)}
            aria-expanded={paletteOpen}
            className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              paletteOpen
                ? 'border-blue-900 bg-blue-50 text-blue-900'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Grid2x2 className="h-3.5 w-3.5 text-blue-900" aria-hidden="true" />
            <span className="tabular-nums">
              {langMode === 'hi'
                ? `पैलेट (${currentNumber}/${totalQuestions})`
                : `Question Palette (${currentNumber}/${totalQuestions})`}
            </span>
          </button>

          {(counts.answered > 0 || counts.marked > 0) && (
            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              title={langMode === 'hi' ? 'अभ्यास रीसेट करें' : 'Reset attempt'}
              className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-red-700"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden xl:inline">{langMode === 'hi' ? 'रीसेट' : 'Reset'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setConfirmSubmitOpen(true)}
            className="cursor-pointer whitespace-nowrap rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            {langMode === 'hi' ? UI_STRINGS.submitTest.hi : UI_STRINGS.submitTest.en}
          </button>
        </div>
      </div>

      {/* Row 2: Compact Subject Tabs Strip + Keyboard Hint */}
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Subject sections"
          className="flex items-center gap-1.5 overflow-x-auto pb-0.5"
        >
          {SUBJECT_ORDER.map((subId) => {
            const range = SECTION_RANGES[subId];
            if (range.start > totalQuestions) return null;
            const isCurrentSubject = currentSubject === subId;
            const label = SUBJECT_SHORT_LABELS[subId];
            return (
              <button
                key={subId}
                type="button"
                role="tab"
                aria-selected={isCurrentSubject}
                onClick={() => navigateToQuestion(range.start)}
                className={`cursor-pointer whitespace-nowrap shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isCurrentSubject
                    ? 'border-blue-900 bg-blue-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <BilingualBlock
                  text={label}
                  langMode={langMode}
                  hiClassName={isCurrentSubject ? 'text-blue-100' : 'text-slate-600'}
                  inline
                />
                <span
                  className={`ml-1.5 font-mono-num text-[11px] ${
                    isCurrentSubject ? 'text-blue-200' : 'text-slate-400'
                  }`}
                >
                  {range.start}–{Math.min(range.end, totalQuestions)}
                </span>
              </button>
            );
          })}
        </div>

        <p className="hidden shrink-0 text-[11px] text-slate-400 xl:block">
          {langMode === 'hi'
            ? 'शॉर्टकट: 1–4 विकल्प · ←/→ प्रश्न · Enter उत्तर जांचें'
            : 'Shortcuts: 1–4 Option · ←/→ Navigate · Enter Check'}
        </p>
      </div>

      {/* Main Focus Workspace: Side-by-Side Split on Desktop (Zero Page Scroll) */}
      <div className="grid min-h-0 flex-1 gap-3.5 lg:grid-cols-12">
        {/* LEFT PANE: Question Stem, Passage & Practice Explanation */}
        <section
          aria-label="Question statement"
          className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white lg:col-span-6"
        >
          {/* Question Card Header */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 py-2 sm:px-5">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 text-xs font-medium text-slate-600 tabular-nums">
              <span className="shrink-0 font-bold text-slate-900">
                Question {currentNumber} of {totalQuestions}
              </span>
              <span aria-hidden="true" className="shrink-0 text-slate-400">
                ·
              </span>
              <span
                className="min-w-0 truncate text-slate-500"
                title={
                  currentQuestion
                    ? `${SUBJECT_SHORT_LABELS[currentSubject].en} / ${SUBJECT_SHORT_LABELS[currentSubject].hi} · ${currentQuestion.topic.en} / ${currentQuestion.topic.hi}`
                    : `${SUBJECT_SHORT_LABELS[currentSubject].en} / ${SUBJECT_SHORT_LABELS[currentSubject].hi}`
                }
              >
                <BilingualBlock
                  text={SUBJECT_SHORT_LABELS[currentSubject]}
                  langMode={langMode}
                  inline
                />
                {currentQuestion && (
                  <>
                    {' · '}
                    <BilingualBlock text={currentQuestion.topic} langMode={langMode} inline />
                  </>
                )}
              </span>
            </div>

            {currentQuestion && (
              <button
                type="button"
                onClick={() => onToggleBookmark(currentQuestion)}
                aria-pressed={isBookmarked}
                className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                  isBookmarked
                    ? 'border-amber-300 bg-amber-50 text-amber-900'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Bookmark
                  className={`h-3.5 w-3.5 ${isBookmarked ? 'fill-amber-500 text-amber-600' : ''}`}
                  aria-hidden="true"
                />
                <span>
                  {isBookmarked
                    ? langMode === 'hi'
                      ? UI_STRINGS.bookmarkSaved.hi
                      : UI_STRINGS.bookmarkSaved.en
                    : langMode === 'hi'
                      ? UI_STRINGS.bookmarkSave.hi
                      : UI_STRINGS.bookmarkSave.en}
                </span>
              </button>
            )}
          </div>

          {/* Left Internal Scrollable Question Body */}
          <div
            ref={leftPanelRef}
            className="relative flex-1 overflow-y-auto px-4 py-3.5 sm:px-5 sm:py-4"
          >
            {isCurrentLoading ? (
              <div className="py-16 text-center">
                <Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-800" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium text-slate-600">
                  {langMode === 'hi'
                    ? `प्रश्न ${currentNumber} लोड हो रहा है...`
                    : `Loading Question ${currentNumber}...`}
                </p>
              </div>
            ) : loadError && !currentQuestion ? (
              <div className="my-4 rounded-xl border border-red-200 bg-red-50 p-5 text-center">
                <p className="text-sm font-medium text-red-800">{loadError}</p>
                <button
                  type="button"
                  onClick={() => void fetchSingleQuestion(currentNumber)}
                  className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-900 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{langMode === 'hi' ? 'पुनः प्रयास करें' : 'Retry'}</span>
                </button>
              </div>
            ) : currentQuestion ? (
              <>
                {/* Reading Comprehension Passage */}
                {currentQuestion.passage && (
                  <div className="mb-3.5 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between px-3.5 py-2">
                      <button
                        type="button"
                        onClick={() => setPassageOpen((o) => !o)}
                        aria-expanded={passageOpen}
                        className="flex flex-1 cursor-pointer items-center gap-2 text-left text-xs font-semibold text-slate-700 hover:text-slate-950"
                      >
                        {passageOpen ? (
                          <ChevronUp className="h-4 w-4 text-slate-500" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden="true" />
                        )}
                        <span>
                          {langMode === 'hi'
                            ? 'गद्यांश / निर्देश (Passage)'
                            : 'Comprehension Passage / Directions'}
                        </span>
                      </button>

                      {passageOpen && (
                        <button
                          type="button"
                          onClick={() => setPassageExpanded((ex) => !ex)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                        >
                          {passageExpanded ? (
                            <>
                              <Minimize2 className="h-3 w-3" aria-hidden="true" />
                              <span>{langMode === 'hi' ? 'संक्षिप्त' : 'Compact'}</span>
                            </>
                          ) : (
                            <>
                              <Maximize2 className="h-3 w-3" aria-hidden="true" />
                              <span>{langMode === 'hi' ? 'पूरा पढ़ें' : 'Full View'}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    {passageOpen && (
                      <div
                        className={`${
                          passageExpanded ? '' : 'max-h-44 overflow-y-auto'
                        } border-t border-slate-200 px-3.5 py-2.5 text-sm leading-relaxed text-slate-800`}
                      >
                        <BilingualBlock
                          text={currentQuestion.passage}
                          langMode={langMode}
                          hiClassName="border-t border-slate-200/80 pt-2 mt-2 text-slate-700"
                          richHtml
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Question Stem */}
                <div className={`font-medium leading-[1.6] text-slate-900 ${stemSizeClass}`}>
                  <BilingualBlock
                    text={currentQuestion.question}
                    langMode={langMode}
                    enClassName="text-slate-950"
                    hiClassName="text-[0.95em] text-slate-800 border-t border-slate-200/80 pt-2.5 mt-2.5"
                    richHtml
                  />
                </div>

                {/* Practice Mode Instant Explanation */}
                {isChecked && (
                  <div
                    ref={explanationRef}
                    className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 sm:p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-xs font-bold tracking-wide text-slate-800">
                        <BilingualBlock text={UI_STRINGS.explanationTitle} langMode={langMode} inline />
                      </h2>
                      <span className="text-xs font-semibold text-emerald-800">
                        {langMode === 'hi'
                          ? `सही विकल्प: ${OPTION_LETTERS[currentQuestion.correctIndex]}`
                          : `Correct Option: ${OPTION_LETTERS[currentQuestion.correctIndex]}`}
                      </span>
                    </div>
                    <div className="mt-2.5 text-sm leading-relaxed text-slate-700">
                      <BilingualBlock
                        text={currentQuestion.explanation}
                        langMode={langMode}
                        hiClassName="mt-2.5 pt-2.5 border-t border-slate-200 text-slate-700"
                        richHtml
                      />
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </section>

        {/* RIGHT PANE: Answer Options + Pinned Action Footer */}
        <section
          aria-label="Answer choices and controls"
          className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white lg:col-span-6"
        >
          {/* Options Scroll Area */}
          <div
            ref={rightPanelRef}
            className="flex-1 overflow-y-auto px-4 py-3.5 sm:px-5 sm:py-4"
          >
            {isCurrentLoading ? (
              <div className="space-y-2.5 py-2">
                {[0, 1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-16 animate-pulse rounded-xl border border-slate-100 bg-slate-50"
                  />
                ))}
              </div>
            ) : currentQuestion ? (
              <div className="space-y-2.5" role="radiogroup" aria-label="Answer options">
                {currentQuestion.options.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrectOption = currentQuestion.correctIndex === idx;

                  let optionStyle =
                    'border-slate-200 bg-white text-slate-800 hover:border-blue-400 hover:bg-blue-50/40';
                  let badgeStyle = 'border-slate-300 bg-slate-50 text-slate-700';

                  if (isChecked) {
                    if (isCorrectOption) {
                      optionStyle = 'border-emerald-600 bg-emerald-50/80 text-slate-900';
                      badgeStyle = 'border-emerald-700 bg-emerald-700 text-white';
                    } else if (isSelected && !isCorrectOption) {
                      optionStyle = 'border-red-500 bg-red-50/80 text-slate-900';
                      badgeStyle = 'border-red-600 bg-red-600 text-white';
                    } else {
                      optionStyle = 'border-slate-200 bg-white/70 text-slate-600';
                    }
                  } else if (isSelected) {
                    optionStyle =
                      'border-blue-800 bg-blue-50/80 text-slate-950 ring-1 ring-blue-800/20';
                    badgeStyle = 'border-blue-900 bg-blue-900 text-white';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => handleSelectOption(idx)}
                      className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                        isChecked ? 'cursor-default' : 'cursor-pointer active:scale-[0.995]'
                      } ${optionStyle}`}
                    >
                      <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${badgeStyle}`}
                      >
                        {OPTION_LETTERS[idx]}
                      </span>

                      <span className={`flex-1 leading-snug ${optionSizeClass}`}>
                        <BilingualBlock
                          text={opt}
                          langMode={langMode}
                          enClassName="text-slate-900 font-medium"
                          hiClassName="text-[0.94em] text-slate-700 border-t border-slate-200/75 pt-1.5 mt-1.5"
                          richHtml
                        />
                      </span>

                      {isChecked && isCorrectOption && (
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-800">
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          <span>
                            {langMode === 'hi'
                              ? UI_STRINGS.correctLabel.hi
                              : UI_STRINGS.correctLabel.en}
                          </span>
                        </span>
                      )}

                      {isChecked && isSelected && !isCorrectOption && (
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-red-700">
                          <XCircle className="h-4 w-4" aria-hidden="true" />
                          <span>
                            {langMode === 'hi'
                              ? UI_STRINGS.incorrectLabel.hi
                              : UI_STRINGS.incorrectLabel.en}
                          </span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Pinned Action Footer: Always visible without scrolling */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/70 px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {practiceMode === 'practice' && !isChecked && (
                <button
                  type="button"
                  onClick={handleCheckAnswer}
                  disabled={!currentQuestion || selectedOption === undefined}
                  className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-blue-900 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {langMode === 'hi' ? UI_STRINGS.checkAnswer.hi : UI_STRINGS.checkAnswer.en}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleReview}
                disabled={!currentQuestion}
                aria-pressed={isMarked}
                className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                  isMarked
                    ? 'border-amber-500 bg-amber-50 text-amber-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {isMarked
                    ? langMode === 'hi'
                      ? UI_STRINGS.markedForReview.hi
                      : UI_STRINGS.markedForReview.en
                    : langMode === 'hi'
                      ? UI_STRINGS.markForReview.hi
                      : UI_STRINGS.markForReview.en}
                </span>
              </button>

              <button
                type="button"
                onClick={handleClearResponse}
                disabled={!currentQuestion || selectedOption === undefined}
                className="cursor-pointer whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {isChecked
                  ? langMode === 'hi'
                    ? 'पुनः प्रयास'
                    : 'Retry Q'
                  : langMode === 'hi'
                    ? UI_STRINGS.clearResponse.hi
                    : UI_STRINGS.clearResponse.en}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigateToQuestion(currentNumber - 1)}
                disabled={currentNumber === 1}
                className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                <span>
                  {langMode === 'hi'
                    ? UI_STRINGS.previousQuestion.hi
                    : UI_STRINGS.previousQuestion.en}
                </span>
              </button>

              {currentNumber < totalQuestions ? (
                <button
                  type="button"
                  onClick={() => navigateToQuestion(currentNumber + 1)}
                  className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg bg-blue-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800"
                >
                  <span>
                    {langMode === 'hi'
                      ? practiceMode === 'practice'
                        ? 'अगला प्रश्न'
                        : UI_STRINGS.nextQuestion.hi
                      : practiceMode === 'practice'
                        ? 'Next'
                        : UI_STRINGS.nextQuestion.en}
                  </span>
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmSubmitOpen(true)}
                  className="cursor-pointer whitespace-nowrap rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
                >
                  {langMode === 'hi' ? UI_STRINGS.submitTest.hi : UI_STRINGS.submitTest.en}
                </button>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Collapsible Question Palette Slide-Over Drawer (Hidden by Default) */}
      {paletteOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            onClick={() => setPaletteOpen(false)}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Question navigation palette"
            className="relative z-10 flex h-full w-full max-w-sm flex-col border-l border-slate-200 bg-white p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">
                <BilingualBlock text={UI_STRINGS.questionPalette} langMode={langMode} inline />
              </h2>

              <div className="flex items-center gap-2">
                <div
                  role="group"
                  aria-label="Palette scope"
                  className="flex items-center rounded-md border border-slate-200 bg-slate-100 p-0.5 text-[11px] font-semibold"
                >
                  <button
                    type="button"
                    onClick={() => setPaletteScope('section')}
                    className={`cursor-pointer rounded px-2 py-0.5 transition-colors ${
                      paletteScope === 'section'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {SECTION_RANGES[currentSubject].start}–{SECTION_RANGES[currentSubject].end}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaletteScope('all')}
                    className={`cursor-pointer rounded px-2 py-0.5 transition-colors ${
                      paletteScope === 'all'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {langMode === 'hi' ? 'सभी 150' : 'All 150'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setPaletteOpen(false)}
                  aria-label="Close palette"
                  className="cursor-pointer rounded-lg border border-slate-200 p-1 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 border-b border-slate-100 pb-3.5 text-xs text-slate-600 tabular-nums">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-emerald-700 bg-emerald-700 text-[10px] font-bold text-white">
                  ✓
                </span>
                <span>
                  {langMode === 'hi' ? UI_STRINGS.answeredLabel.hi : UI_STRINGS.answeredLabel.en} (
                  {counts.answered})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-amber-500 bg-amber-100 text-[10px] font-bold text-amber-900">
                  ⚑
                </span>
                <span>
                  {langMode === 'hi' ? UI_STRINGS.markedForReview.hi : UI_STRINGS.markedForReview.en} (
                  {counts.marked})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-slate-100 text-[10px] font-bold text-slate-700">
                  –
                </span>
                <span>
                  {langMode === 'hi' ? UI_STRINGS.notVisitedLabel.hi : UI_STRINGS.notVisitedLabel.en} (
                  {counts.notVisited})
                </span>
              </div>
            </div>

            <div className="mt-3.5 flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-5 gap-2">
                {visiblePaletteNumbers.map((num) => {
                  const qId = `${paper.slug}-q${num}`;
                  const status = getQuestionStatus(qId, answers, markedForReview, visited);
                  const isCurrent = num === currentNumber;

                  let btnClass = 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100';
                  if (status === 'answered') {
                    btnClass = 'border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800';
                  } else if (status === 'marked' || status === 'marked-answered') {
                    btnClass = 'border-amber-500 bg-amber-100 text-amber-900 hover:bg-amber-200';
                  } else if (status === 'not-answered') {
                    btnClass = 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100';
                  }

                  return (
                    <button
                      key={qId}
                      type="button"
                      onClick={() => navigateToQuestion(num)}
                      aria-label={`Jump to question ${num}, status ${status}`}
                      aria-current={isCurrent ? 'step' : undefined}
                      className={`cursor-pointer rounded-lg border py-2 font-mono-num text-xs font-semibold transition-colors ${btnClass} ${
                        isCurrent ? 'ring-2 ring-blue-900 ring-offset-1' : ''
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {confirmSubmitOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 id="submit-dialog-title" className="text-lg font-bold text-slate-900">
              {langMode === 'hi' ? 'क्या आप टेस्ट सबमिट करना चाहते हैं?' : 'Submit Practice Test?'}
            </h2>
            <p className="mt-2 text-sm text-slate-600 tabular-nums">
              {langMode === 'hi'
                ? `आपने ${totalQuestions} में से ${counts.answered} प्रश्नों के उत्तर दिए हैं। सबमिट करने के बाद आप स्कोरकार्ड, सटीकता (Accuracy) और व्याख्या देख सकेंगे।`
                : `You have answered ${counts.answered} out of ${totalQuestions} questions. After submitting, you can review your score, accuracy, and detailed solutions.`}
            </p>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmSubmitOpen(false)}
                className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {langMode === 'hi' ? 'अभ्यास जारी रखें' : 'Continue Test'}
              </button>
              <button
                type="button"
                onClick={handleFinalizeSubmit}
                className="cursor-pointer rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                {langMode === 'hi' ? UI_STRINGS.submitTest.hi : UI_STRINGS.submitTest.en}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {confirmResetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 id="reset-dialog-title" className="text-lg font-bold text-slate-900">
              {langMode === 'hi' ? 'अभ्यास रीसेट करें?' : 'Reset This Attempt?'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {langMode === 'hi'
                ? 'इस प्रश्न-पत्र के सभी चुने गए उत्तर और टाइमर रीसेट हो जाएंगे।'
                : 'This will clear all your selected answers and restart the timer from Question 1.'}
            </p>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {langMode === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                {langMode === 'hi' ? 'हाँ, रीसेट करें' : 'Yes, Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
