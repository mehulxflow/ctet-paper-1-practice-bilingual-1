import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import type { LanguageMode, Question, SubjectId, TestResult } from '../types/ctet';
import {
  SUBJECT_LABELS,
  SUBJECT_ORDER,
  SUBJECT_SHORT_LABELS,
  formatTimer,
} from '../utils/examLogic';
import { UI_STRINGS } from '../data/uiStrings';
import { BilingualBlock } from './BilingualBlock';

interface ResultsViewProps {
  result: TestResult;
  questions: Question[];
  langMode: LanguageMode;
  onRetake: () => void;
  onBackToPapers: () => void;
}

type ReviewFilter = 'all' | 'correct' | 'incorrect' | 'unattempted';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

export function ResultsView({
  result,
  questions,
  langMode,
  onRetake,
  onBackToPapers,
}: ResultsViewProps) {
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [subjectFilter, setSubjectFilter] = useState<SubjectId | 'all'>('all');

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (subjectFilter !== 'all' && q.subject !== subjectFilter) return false;
      const selected = result.answers[q.id];
      if (filter === 'all') return true;
      if (filter === 'unattempted') return selected === undefined;
      if (filter === 'correct') return selected === q.correctIndex;
      if (filter === 'incorrect') return selected !== undefined && selected !== q.correctIndex;
      return true;
    });
  }, [questions, result.answers, filter, subjectFilter]);

  const paperTotal = result.paperTotalQuestions || 150;
  const accuracy =
    result.accuracyPercentage ??
    (result.attemptedCount > 0
      ? Math.round((result.correctCount / result.attemptedCount) * 100)
      : 0);
  const paperPercentage = Math.round((result.correctCount / paperTotal) * 100);
  const qualified = paperPercentage >= 60;

  return (
    <div className="mx-auto max-w-5xl px-3.5 py-4 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={onBackToPapers}
          className="inline-flex min-h-[42px] cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] sm:min-h-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{langMode === 'hi' ? UI_STRINGS.backToPapers.hi : UI_STRINGS.backToPapers.en}</span>
        </button>

        <button
          type="button"
          onClick={onRetake}
          className="inline-flex min-h-[42px] cursor-pointer items-center gap-1.5 rounded-lg bg-blue-900 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 active:scale-[0.98] sm:min-h-0"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{langMode === 'hi' ? UI_STRINGS.practiceAgain.hi : UI_STRINGS.practiceAgain.en}</span>
        </button>
      </div>

      {/* Scorecard Summary */}
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 sm:mt-5 sm:rounded-xl sm:p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-medium text-slate-500">
              {qualified
                ? langMode === 'hi'
                  ? 'उत्तीर्ण बेंचमार्क प्राप्त (60%+)'
                  : 'Qualifying Benchmark Met (60%+)'
                : langMode === 'hi'
                  ? 'लक्ष्य बेंचमार्क: 60% (90/150 अंक)'
                  : 'Target Qualifying Benchmark: 60% (90/150 Marks)'}
            </p>
            <h1 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">
              <BilingualBlock text={result.paperTitle} langMode={langMode} />
            </h1>
          </div>

          <div className="shrink-0 text-left sm:text-right">
            <div className="font-mono-num text-3xl font-bold text-blue-900">
              {result.attemptedCount > 0 ? `${accuracy}%` : '0%'}
            </div>
            <div className="text-xs font-medium text-slate-500 tabular-nums">
              {langMode === 'hi'
                ? `सटीकता (${result.correctCount}/${result.attemptedCount}) · कुल स्कोर ${result.correctCount}/${paperTotal}`
                : `Accuracy (${result.correctCount}/${result.attemptedCount}) · Paper Score ${result.correctCount}/${paperTotal}`}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3.5">
            <div className="text-xs text-slate-500">
              {langMode === 'hi' ? UI_STRINGS.correctLabel.hi : UI_STRINGS.correctLabel.en}
            </div>
            <div className="mt-1 font-mono-num text-xl font-bold text-emerald-700">
              {result.correctCount}
            </div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3.5">
            <div className="text-xs text-slate-500">
              {langMode === 'hi' ? UI_STRINGS.incorrectLabel.hi : UI_STRINGS.incorrectLabel.en}
            </div>
            <div className="mt-1 font-mono-num text-xl font-bold text-red-700">
              {result.incorrectCount}
            </div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3.5">
            <div className="text-xs text-slate-500">
              {langMode === 'hi' ? 'प्रयास किए गए' : 'Attempted'}
            </div>
            <div className="mt-1 font-mono-num text-xl font-bold text-slate-700">
              {result.attemptedCount} / {paperTotal}
            </div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3.5">
            <div className="text-xs text-slate-500">
              {langMode === 'hi' ? 'लिया गया समय' : 'Time Taken'}
            </div>
            <div className="mt-1 font-mono-num text-xl font-bold text-slate-900">
              {formatTimer(result.elapsedSeconds)}
            </div>
          </div>
        </div>

        {/* Subject-wise Breakdown */}
        {result.subjectBreakdown.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-bold text-slate-900">
              {langMode === 'hi' ? 'विषय-वार प्रदर्शन' : 'Subject-Wise Performance'}
            </h2>
            <div className="mt-3 space-y-3">
              {result.subjectBreakdown.map((item) => {
                const subAcc =
                  item.attempted > 0 ? Math.round((item.correct / item.attempted) * 100) : 0;
                return (
                  <div key={item.subject}>
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                      <span>
                        <BilingualBlock text={SUBJECT_LABELS[item.subject]} langMode={langMode} inline />
                      </span>
                      <span className="font-mono-num text-slate-900">
                        {item.correct}/{item.attempted || item.total} ({subAcc}%)
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-800 transition-all"
                        style={{ width: `${subAcc}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Answer Key & Detailed Solutions */}
      <section className="mt-7">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-lg font-bold text-slate-900">
            <BilingualBlock text={UI_STRINGS.explanationTitle} langMode={langMode} inline />
          </h2>

          <div
            className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:pb-0"
            role="group"
            aria-label="Filter reviewed questions"
          >
            {(
              [
                { id: 'all', label: langMode === 'hi' ? 'सभी' : 'All', count: questions.length },
                {
                  id: 'correct',
                  label: langMode === 'hi' ? UI_STRINGS.correctLabel.hi : UI_STRINGS.correctLabel.en,
                  count: result.correctCount,
                },
                {
                  id: 'incorrect',
                  label: langMode === 'hi' ? UI_STRINGS.incorrectLabel.hi : UI_STRINGS.incorrectLabel.en,
                  count: result.incorrectCount,
                },
                {
                  id: 'unattempted',
                  label: langMode === 'hi' ? UI_STRINGS.unattemptedLabel.hi : UI_STRINGS.unattemptedLabel.en,
                  count: result.unattemptedCount,
                },
              ] as const
            ).map((btn) => (
              <button
                key={btn.id}
                type="button"
                aria-pressed={filter === btn.id}
                onClick={() => setFilter(btn.id)}
                className={`min-h-[38px] cursor-pointer whitespace-nowrap shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors sm:min-h-0 ${
                  filter === btn.id
                    ? 'border-blue-900 bg-blue-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {btn.label} ({btn.count})
              </button>
            ))}
          </div>
        </div>

        {/* Subject Filter Pills */}
        <div className="no-scrollbar mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSubjectFilter('all')}
            className={`min-h-[36px] cursor-pointer whitespace-nowrap shrink-0 rounded-lg border px-3 py-1 text-xs font-medium sm:min-h-0 ${
              subjectFilter === 'all'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {langMode === 'hi' ? UI_STRINGS.allSubjects.hi : UI_STRINGS.allSubjects.en}
          </button>
          {SUBJECT_ORDER.map((subId) => {
            const hasSub = questions.some((q) => q.subject === subId);
            if (!hasSub) return null;
            const active = subjectFilter === subId;
            return (
              <button
                key={subId}
                type="button"
                onClick={() => setSubjectFilter(subId)}
                className={`min-h-[36px] cursor-pointer whitespace-nowrap shrink-0 rounded-lg border px-3 py-1 text-xs font-medium sm:min-h-0 ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <BilingualBlock
                  text={SUBJECT_SHORT_LABELS[subId]}
                  langMode={langMode}
                  hiClassName={active ? 'text-slate-200' : 'text-slate-500'}
                  inline
                />
              </button>
            );
          })}
        </div>

        <div className="mt-4 space-y-4">
          {filteredQuestions.map((q) => {
            const userChoice = result.answers[q.id];
            const isCorrect = userChoice === q.correctIndex;
            const isUnattempted = userChoice === undefined;

            return (
              <article
                key={q.id}
                className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 text-xs">
                  <span className="font-medium text-slate-600 tabular-nums">
                    Q{q.number} · <BilingualBlock text={q.topic} langMode={langMode} inline />
                  </span>

                  {isUnattempted ? (
                    <span className="font-semibold text-slate-600">
                      {langMode === 'hi' ? UI_STRINGS.unattemptedLabel.hi : UI_STRINGS.unattemptedLabel.en}
                    </span>
                  ) : isCorrect ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      <span>{langMode === 'hi' ? UI_STRINGS.correctLabel.hi : UI_STRINGS.correctLabel.en}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold text-red-700">
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                      <span>{langMode === 'hi' ? UI_STRINGS.incorrectLabel.hi : UI_STRINGS.incorrectLabel.en}</span>
                    </span>
                  )}
                </div>

                {q.passage && (
                  <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
                    <BilingualBlock text={q.passage} langMode={langMode} richHtml />
                  </div>
                )}

                <div className="mt-4 text-sm font-semibold leading-relaxed text-slate-900 sm:text-base">
                  <BilingualBlock text={q.question} langMode={langMode} richHtml />
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {q.options.map((opt, idx) => {
                    const isRight = q.correctIndex === idx;
                    const isPicked = userChoice === idx;

                    let cardCls = 'border-slate-200 bg-slate-50/50 text-slate-700';
                    if (isRight) {
                      cardCls = 'border-emerald-600 bg-emerald-50 text-slate-900';
                    } else if (isPicked && !isRight) {
                      cardCls = 'border-red-400 bg-red-50 text-slate-900';
                    }

                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs sm:text-sm ${cardCls}`}
                      >
                        <span className="font-mono-num font-bold">{OPTION_LETTERS[idx]}.</span>
                        <span className="flex-1">
                          <BilingualBlock text={opt} langMode={langMode} richHtml />
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-700 sm:text-sm">
                  <span className="font-semibold text-slate-900">
                    {langMode === 'hi' ? 'व्याख्या: ' : langMode === 'bilingual' ? 'Explanation / व्याख्या: ' : 'Explanation: '}
                  </span>
                  <BilingualBlock text={q.explanation} langMode={langMode} className="mt-1" richHtml />
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
