import { Bookmark, Clock, Trash2 } from 'lucide-react';
import type { LanguageMode, PaperMeta, Question, TestResult } from '../types/ctet';
import { formatTimer } from '../utils/examLogic';
import { BilingualBlock } from './BilingualBlock';

interface HistoryViewProps {
  history: TestResult[];
  bookmarkedQuestions: Question[];
  papersById: Record<string, PaperMeta>;
  langMode: LanguageMode;
  onRetakePaper: (paper: PaperMeta) => void;
  onRemoveBookmark: (questionId: string) => void;
  onClearHistory: () => void;
  onBrowsePapers: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

export function HistoryView({
  history,
  bookmarkedQuestions,
  papersById,
  langMode,
  onRetakePaper,
  onRemoveBookmark,
  onClearHistory,
  onBrowsePapers,
}: HistoryViewProps) {
  return (
    <div className="mx-auto max-w-5xl space-y-5 px-3.5 py-4 sm:space-y-8 sm:px-6 sm:py-8">
      {/* Attempt History */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:rounded-xl sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
              <BilingualBlock
                text={{ en: 'Practice Attempt History', hi: 'अभ्यास परीक्षा इतिहास' }}
                langMode={langMode}
                inline
              />
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              {langMode === 'hi'
                ? 'आपके ब्राउज़र में सहेजे गए पिछले परीक्षण परिणाम'
                : 'Recent practice results saved locally in your browser'}
            </p>
          </div>

          {history.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{langMode === 'hi' ? 'इतिहास मिटाएं' : 'Clear History'}</span>
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-600">
              <BilingualBlock
                text={{
                  en: 'You have not submitted any practice paper yet.',
                  hi: 'आपने अभी तक कोई अभ्यास प्रश्न-पत्र सबमिट नहीं किया है।',
                }}
                langMode={langMode}
              />
            </p>
            <button
              type="button"
              onClick={onBrowsePapers}
              className="mt-4 cursor-pointer rounded-lg bg-blue-900 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
            >
              {langMode === 'hi' ? 'प्रश्न-पत्र चुनें' : 'Browse Solved Papers'}
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {history.map((item, idx) => {
              const paper = papersById[item.paperId];
              return (
                <div
                  key={`${item.paperId}-${item.completedAt}-${idx}`}
                  className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      <BilingualBlock text={item.paperTitle} langMode={langMode} />
                    </h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 tabular-nums">
                      <span className="font-semibold text-emerald-700">
                        Accuracy: {item.accuracyPercentage ?? item.scorePercentage}% ({item.correctCount}/
                        {item.attemptedCount || item.totalQuestions})
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {formatTimer(item.elapsedSeconds)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{new Date(item.completedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {paper && (
                    <button
                      type="button"
                      onClick={() => onRetakePaper(paper)}
                      className="min-h-[42px] w-full cursor-pointer whitespace-nowrap shrink-0 rounded-xl border border-blue-900 px-3.5 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-50 active:scale-[0.98] sm:min-h-0 sm:w-auto sm:rounded-lg"
                    >
                      {langMode === 'hi' ? 'पुनः अभ्यास करें' : 'Practice Again'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Bookmarked Questions */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:rounded-xl sm:p-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
          <Bookmark className="h-4 w-4 text-amber-600" aria-hidden="true" />
          <h2 className="text-lg font-bold text-slate-900">
            <BilingualBlock
              text={{ en: 'Saved Questions for Revision', hi: 'पुनरीक्षण के लिए सहेजे गए प्रश्न' }}
              langMode={langMode}
              inline
            />
          </h2>
        </div>

        {bookmarkedQuestions.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            <BilingualBlock
              text={{
                en: 'Bookmark important questions during a test to revise them here anytime.',
                hi: 'अभ्यास के दौरान महत्वपूर्ण प्रश्नों को बुकमार्क करें ताकि आप उन्हें यहाँ कभी भी दोहरा सकें।',
              }}
              langMode={langMode}
            />
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {bookmarkedQuestions.map((q) => (
              <article key={q.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    <BilingualBlock text={q.topic} langMode={langMode} inline />
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveBookmark(q.id)}
                    className="cursor-pointer font-medium text-slate-500 hover:text-red-700"
                  >
                    {langMode === 'hi' ? 'हटाएं' : 'Remove'}
                  </button>
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900">
                  <BilingualBlock text={q.question} langMode={langMode} richHtml />
                </div>
                <div className="mt-3 rounded-lg bg-emerald-50/70 p-3 text-xs text-slate-800">
                  <span className="font-bold text-emerald-800">
                    {OPTION_LETTERS[q.correctIndex]}.{' '}
                  </span>
                  <BilingualBlock text={q.options[q.correctIndex]} langMode={langMode} inline richHtml />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
