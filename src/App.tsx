import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ActiveTab, DraftAttempt, LanguageMode, PaperMeta, Question, TestResult } from './types/ctet';
import { CTET_PAPERS_CATALOG } from './data/papersCatalog';
import { Navbar } from './components/Navbar';
import { PapersCatalogView } from './components/PapersCatalogView';
import { TestRunnerView, getDraftStorageKey } from './components/TestRunnerView';
import { ResultsView } from './components/ResultsView';
import { ExamDetailsView } from './components/ExamDetailsView';
import { HistoryView } from './components/HistoryView';

const STORAGE_LANG_KEY = 'ctet_p1_lang_mode';
const STORAGE_HISTORY_KEY = 'ctet_p1_attempt_history';
const STORAGE_BOOKMARK_ITEMS_KEY = 'ctet_p1_bookmarked_items';

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readAllDraftCounts(papers: PaperMeta[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const paper of papers) {
    try {
      const raw = window.localStorage.getItem(getDraftStorageKey(paper.slug));
      if (!raw) continue;
      const draft = JSON.parse(raw) as DraftAttempt;
      const answeredCount = Object.keys(draft?.answers ?? {}).length;
      if (answeredCount > 0) {
        counts[paper.slug] = answeredCount;
      }
    } catch {
      // ignore corrupted draft
    }
  }
  return counts;
}

export default function App() {
  const [langMode, setLangMode] = useState<LanguageMode>(() => {
    const saved = readStorage<string>(STORAGE_LANG_KEY, 'bilingual');
    if (saved === 'en' || saved === 'hi' || saved === 'bilingual') {
      return saved;
    }
    return 'bilingual';
  });

  const [papers, setPapers] = useState<PaperMeta[]>(CTET_PAPERS_CATALOG);
  const [activeTab, setActiveTab] = useState<ActiveTab>('papers');
  const [activePaper, setActivePaper] = useState<PaperMeta | null>(null);
  const [latestResult, setLatestResult] = useState<TestResult | null>(null);
  const [resultQuestions, setResultQuestions] = useState<Question[]>([]);

  const [history, setHistory] = useState<TestResult[]>(() =>
    readStorage<TestResult[]>(STORAGE_HISTORY_KEY, [])
  );
  const [bookmarkedItems, setBookmarkedItems] = useState<Record<string, Question>>(() =>
    readStorage<Record<string, Question>>(STORAGE_BOOKMARK_ITEMS_KEY, {})
  );
  const [draftProgress, setDraftProgress] = useState<Record<string, number>>(() =>
    readAllDraftCounts(CTET_PAPERS_CATALOG)
  );

  useEffect(() => {
    let cancelled = false;
    fetch('/api/ctet/papers')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { papers?: PaperMeta[] } | null) => {
        if (!cancelled && data?.papers && data.papers.length > 0) {
          setPapers(data.papers);
          setDraftProgress(readAllDraftCounts(data.papers));
        }
      })
      .catch(() => {
        // Keep initial synced Examsnet catalog on transient network errors
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_LANG_KEY, JSON.stringify(langMode));
    } catch {
      // Ignore storage quota errors
    }
  }, [langMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history));
    } catch {
      // Ignore storage quota errors
    }
  }, [history]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_BOOKMARK_ITEMS_KEY, JSON.stringify(bookmarkedItems));
    } catch {
      // Ignore storage quota errors
    }
  }, [bookmarkedItems]);

  const papersById = useMemo(
    () => Object.fromEntries(papers.map((p) => [p.id, p])),
    [papers]
  );

  const bookmarkedIds = useMemo(() => Object.keys(bookmarkedItems), [bookmarkedItems]);
  const bookmarkedQuestions = useMemo(() => Object.values(bookmarkedItems), [bookmarkedItems]);

  const handleStartPaper = (paper: PaperMeta) => {
    setLatestResult(null);
    setResultQuestions([]);
    setActivePaper(paper);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTestSubmit = (result: TestResult, loadedQuestions: Question[]) => {
    setLatestResult(result);
    setResultQuestions(loadedQuestions);
    setHistory((prev) => [result, ...prev].slice(0, 30));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDraftChange = useCallback((slug: string, answeredCount: number) => {
    setDraftProgress((prev) => {
      if ((prev[slug] ?? 0) === answeredCount) return prev;
      return { ...prev, [slug]: answeredCount };
    });
  }, []);

  const handleToggleBookmark = (question: Question) => {
    setBookmarkedItems((prev) => {
      const next = { ...prev };
      if (next[question.id]) {
        delete next[question.id];
      } else {
        next[question.id] = question;
      }
      return next;
    });
  };

  const handleRemoveBookmark = (questionId: string) => {
    setBookmarkedItems((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  const handleExitTest = () => {
    setActivePaper(null);
    setLatestResult(null);
    setResultQuestions([]);
    setActiveTab('papers');
  };

  const isRunnerActive = Boolean(activePaper && !latestResult);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActivePaper(null);
          setLatestResult(null);
          setResultQuestions([]);
          setActiveTab(tab);
        }}
        langMode={langMode}
        onChangeLangMode={setLangMode}
        isInTest={isRunnerActive}
        onExitTest={handleExitTest}
      />

      <main className={isRunnerActive ? 'flex-1 lg:min-h-0' : 'flex-1'}>
        {activePaper && latestResult ? (
          <ResultsView
            result={latestResult}
            questions={resultQuestions}
            langMode={langMode}
            onRetake={() => {
              setLatestResult(null);
              setResultQuestions([]);
            }}
            onBackToPapers={handleExitTest}
          />
        ) : activePaper ? (
          <TestRunnerView
            paper={activePaper}
            langMode={langMode}
            bookmarkedIds={bookmarkedIds}
            onToggleBookmark={handleToggleBookmark}
            onDraftChange={handleDraftChange}
            onExit={handleExitTest}
            onSubmit={handleTestSubmit}
          />
        ) : activeTab === 'details' ? (
          <ExamDetailsView langMode={langMode} onBrowsePapers={() => setActiveTab('papers')} />
        ) : activeTab === 'history' ? (
          <HistoryView
            history={history}
            bookmarkedQuestions={bookmarkedQuestions}
            papersById={papersById}
            langMode={langMode}
            onRetakePaper={handleStartPaper}
            onRemoveBookmark={handleRemoveBookmark}
            onClearHistory={() => setHistory([])}
            onBrowsePapers={() => setActiveTab('papers')}
          />
        ) : (
          <PapersCatalogView
            papers={papers}
            langMode={langMode}
            history={history}
            draftProgress={draftProgress}
            onStartPaper={handleStartPaper}
          />
        )}
      </main>

      {!isRunnerActive && (
        <footer className="mt-12 border-t border-slate-200 bg-white py-6">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-xs text-slate-500 sm:flex-row sm:px-6">
            <span>CTET Paper 1 (Classes I to V) · Free Online Practice Platform</span>
            <span>English · हिन्दी · Bilingual (EN + HI)</span>
          </div>
        </footer>
      )}
    </div>
  );
}
