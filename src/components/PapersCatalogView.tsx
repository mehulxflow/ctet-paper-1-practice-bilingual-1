import { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, PlayCircle, Search, X } from 'lucide-react';
import type { LanguageMode, PaperMeta, TestResult } from '../types/ctet';
import { UI_STRINGS } from '../data/uiStrings';
import { filterPapers, groupPapersByYear } from '../utils/examLogic';
import { BilingualBlock } from './BilingualBlock';

interface PapersCatalogViewProps {
  papers: PaperMeta[];
  langMode: LanguageMode;
  history: TestResult[];
  draftProgress: Record<string, number>;
  onStartPaper: (paper: PaperMeta) => void;
}

type YearFilterValue = number | 'all' | 'older';

export function PapersCatalogView({
  papers,
  langMode,
  history,
  draftProgress,
  onStartPaper,
}: PapersCatalogViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<YearFilterValue>('all');

  const latestScoreByPaper = useMemo(() => {
    const map = new Map<string, TestResult>();
    for (const attempt of history) {
      if (!map.has(attempt.paperId)) {
        map.set(attempt.paperId, attempt);
      }
    }
    return map;
  }, [history]);

  const resumeCandidate = useMemo(() => {
    for (const paper of papers) {
      if ((draftProgress[paper.slug] ?? 0) > 0) {
        return { paper, count: draftProgress[paper.slug] };
      }
    }
    return null;
  }, [papers, draftProgress]);

  const filtered = useMemo(
    () => filterPapers(papers, yearFilter, searchQuery),
    [papers, yearFilter, searchQuery]
  );

  const groupedByYear = useMemo(() => groupPapersByYear(filtered), [filtered]);

  const yearButtons: Array<{ value: YearFilterValue; label: string }> = [
    { value: 'all', label: langMode === 'hi' ? UI_STRINGS.allYears.hi : UI_STRINGS.allYears.en },
    { value: 2026, label: '2026' },
    { value: 2024, label: '2024' },
    { value: 2023, label: '2023' },
    { value: 2022, label: '2022' },
    { value: 2021, label: '2021' },
    {
      value: 'older',
      label: langMode === 'hi' ? UI_STRINGS.olderYears.hi : UI_STRINGS.olderYears.en,
    },
  ];

  const activeModeNotice =
    langMode === 'bilingual'
      ? 'Bilingual Mode Active: Questions, options, and solutions appear in both English & हिन्दी together.'
      : langMode === 'hi'
        ? 'हिन्दी माध्यम सक्रिय: सभी प्रश्न, विकल्प और व्याख्याएँ हिन्दी में प्रदर्शित हैं।'
        : 'English Medium Active: All questions, options, and explanations are displayed in English.';

  return (
    <div className="mx-auto max-w-6xl px-3.5 py-4 sm:px-6 sm:py-8">
      {/* Clean Academic Banner */}
      <section className="rounded-2xl bg-[#0F294A] px-4 py-5 text-white sm:rounded-xl sm:px-8 sm:py-9">
        <div className="max-w-3xl">
          <p className="text-[11px] font-medium tracking-wide text-blue-200 sm:text-xs">
            Classes I to V · Solved Question Archive (2012–2026)
          </p>
          <h1 className="mt-1.5 text-xl font-bold tracking-tight text-balance sm:mt-2 sm:text-3xl">
            <BilingualBlock
              text={UI_STRINGS.heroTitle}
              langMode={langMode}
              hiClassName="text-blue-100 font-semibold text-base sm:text-2xl mt-1"
            />
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-200 sm:mt-3 sm:text-base">
            <BilingualBlock
              text={UI_STRINGS.heroSubtitle}
              langMode={langMode}
              hiClassName="text-blue-100/90 text-xs sm:text-sm mt-1"
            />
          </p>
          <div className="mt-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-blue-200 tabular-nums sm:mt-5 sm:gap-x-3 sm:text-xs">
            <span>{papers.length} Solved Papers</span>
            <span aria-hidden="true">·</span>
            <span>5 Subjects</span>
            <span aria-hidden="true">·</span>
            <span>Free Practice</span>
          </div>
        </div>
      </section>

      {/* Continue Practicing Card when user has saved progress */}
      {resumeCandidate && (
        <div className="mt-3.5 flex flex-col justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 sm:mt-4 sm:flex-row sm:items-center sm:rounded-xl">
          <div className="flex items-start gap-3">
            <PlayCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-900" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold text-blue-900">
                {langMode === 'hi'
                  ? `अधूरा अभ्यास जारी रखें (${resumeCandidate.count}/${resumeCandidate.paper.officialTotalQuestions} प्रश्न पूर्ण)`
                  : `Continue Where You Left Off (${resumeCandidate.count}/${resumeCandidate.paper.officialTotalQuestions} answered)`}
              </p>
              <p className="mt-0.5 text-sm font-bold text-slate-900">
                <BilingualBlock text={resumeCandidate.paper.title} langMode={langMode} />
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onStartPaper(resumeCandidate.paper)}
            className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-blue-900 px-4 py-2.5 text-xs font-semibold text-white transition-transform active:scale-[0.98] hover:bg-blue-800 sm:min-h-0 sm:w-auto sm:rounded-lg sm:py-2"
          >
            <span>{langMode === 'hi' ? 'अभ्यास जारी रखें' : 'Resume Practice'}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Active Language Indicator Line */}
      <div className="mt-4 flex items-center justify-between border-b border-slate-200 pb-3 text-xs text-slate-600 sm:text-sm">
        <span lang={langMode === 'hi' ? 'hi' : undefined}>{activeModeNotice}</span>
        <span className="hidden whitespace-nowrap font-medium text-slate-800 tabular-nums sm:inline">
          {filtered.length} / {papers.length} Papers
        </span>
      </div>

      {/* Search & Year Filter Controls */}
      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-xl">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search solved papers"
            placeholder={
              langMode === 'hi'
                ? UI_STRINGS.searchPlaceholder.hi
                : UI_STRINGS.searchPlaceholder.en
            }
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pr-9 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded p-1 text-slate-400 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div
          role="group"
          aria-label="Filter papers by year"
          className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:pb-0"
        >
          {yearButtons.map((btn) => {
            const active = yearFilter === btn.value;
            return (
              <button
                key={String(btn.value)}
                type="button"
                aria-pressed={active}
                onClick={() => setYearFilter(btn.value)}
                className={`min-h-[40px] cursor-pointer whitespace-nowrap shrink-0 rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-colors tabular-nums active:scale-[0.97] sm:min-h-0 sm:px-3 ${
                  active
                    ? 'border-blue-900 bg-blue-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {btn.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Papers List Grouped by Year */}
      {groupedByYear.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            <BilingualBlock text={UI_STRINGS.noPapersFound} langMode={langMode} />
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setYearFilter('all');
            }}
            className="mt-4 cursor-pointer rounded-lg bg-blue-900 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
          >
            {langMode === 'hi' ? UI_STRINGS.resetFilters.hi : UI_STRINGS.resetFilters.en}
          </button>
        </div>
      ) : (
        <div className="mt-7 space-y-8">
          {groupedByYear.map((group) => (
            <section key={group.year} aria-labelledby={`year-heading-${group.year}`}>
              <div className="mb-3 flex items-baseline justify-between border-b border-slate-200 pb-2">
                <h2
                  id={`year-heading-${group.year}`}
                  className="text-lg font-bold text-slate-900 sm:text-xl"
                >
                  {langMode === 'hi'
                    ? `CTET पेपर I (कक्षा I से V) ${group.year} हल प्रश्न-पत्र`
                    : langMode === 'bilingual'
                      ? `CTET Paper I (Classes I to V) ${group.year} Solved Papers / ${group.year} हल प्रश्न-पत्र`
                      : `CTET Paper I (Classes I to V) ${group.year} Solved Papers`}
                </h2>
                <span className="text-xs font-medium text-slate-500 tabular-nums">
                  {group.papers.length} {group.papers.length === 1 ? 'Paper' : 'Papers'}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {group.papers.map((paper) => {
                  const previousAttempt = latestScoreByPaper.get(paper.id);
                  const savedCount = draftProgress[paper.slug] ?? 0;

                  return (
                    <article
                      key={paper.id}
                      className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-blue-300 sm:p-5"
                    >
                      <div>
                        <h3 className="text-sm font-semibold leading-snug text-slate-900 sm:text-base">
                          <BilingualBlock
                            text={paper.title}
                            langMode={langMode}
                            hiClassName="text-slate-600 text-[0.9em] font-medium mt-1"
                          />
                        </h3>

                        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 tabular-nums">
                          <span>{paper.officialTotalQuestions} Questions</span>
                          <span aria-hidden="true">·</span>
                          <span>5 Sections</span>
                          <span aria-hidden="true">·</span>
                          <span>English · हिन्दी · Bilingual</span>
                          {savedCount > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-blue-800">
                                {langMode === 'hi'
                                  ? `सहेजा गया: ${savedCount}/${paper.officialTotalQuestions}`
                                  : `In Progress: ${savedCount}/${paper.officialTotalQuestions}`}
                              </span>
                            </>
                          )}
                          {previousAttempt && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-emerald-700">
                                Last Accuracy:{' '}
                                {previousAttempt.accuracyPercentage ?? previousAttempt.scorePercentage}% (
                                {previousAttempt.correctCount}/{previousAttempt.attemptedCount || previousAttempt.totalQuestions})
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => onStartPaper(paper)}
                          aria-label={`Practice ${paper.title.en}`}
                          className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-blue-900 px-4 py-2.5 text-xs font-semibold text-white transition-all active:scale-[0.98] hover:bg-blue-800 sm:min-h-0 sm:w-auto sm:rounded-lg sm:py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                        >
                          <span>
                            {savedCount > 0
                              ? langMode === 'hi'
                                ? 'जारी रखें'
                                : 'Resume'
                              : previousAttempt
                                ? langMode === 'hi'
                                  ? UI_STRINGS.practiceAgain.hi
                                  : UI_STRINGS.practiceAgain.en
                                : langMode === 'hi'
                                  ? UI_STRINGS.startPractice.hi
                                  : UI_STRINGS.startPractice.en}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
