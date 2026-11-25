import type { ActiveTab, LanguageMode } from '../types/ctet';
import { UI_STRINGS } from '../data/uiStrings';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  langMode: LanguageMode;
  onChangeLangMode: (mode: LanguageMode) => void;
  isInTest?: boolean;
  onExitTest?: () => void;
}

const LANG_OPTIONS: Array<{ id: LanguageMode; label: string; ariaLabel: string }> = [
  { id: 'en', label: 'English', ariaLabel: 'Switch to English only' },
  { id: 'hi', label: 'हिन्दी', ariaLabel: 'Switch to Hindi only' },
  { id: 'bilingual', label: 'Bilingual', ariaLabel: 'Switch to Bilingual (English and Hindi)' },
];

export function Navbar({
  activeTab,
  onSelectTab,
  langMode,
  onChangeLangMode,
  isInTest = false,
  onExitTest,
}: NavbarProps) {
  const navLabel = (pair: { en: string; hi: string }) => {
    if (langMode === 'hi') return pair.hi;
    return pair.en;
  };

  const handleBrandClick = () => {
    if (isInTest && onExitTest) {
      onExitTest();
    } else {
      onSelectTab('papers');
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div
        className={`mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 lg:gap-8 ${
          isInTest ? 'max-w-[1400px] py-2' : 'max-w-6xl py-3'
        }`}
      >
        {/* Zone 1: Clean single-line brand wordmark */}
        <button
          type="button"
          onClick={handleBrandClick}
          className={`cursor-pointer whitespace-nowrap shrink-0 text-left font-bold tracking-tight text-slate-900 transition-colors hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
            isInTest ? 'text-base sm:text-lg' : 'text-lg'
          }`}
        >
          {langMode === 'hi' ? UI_STRINGS.brandTitle.hi : UI_STRINGS.brandTitle.en}
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        {!isInTest && (
          <nav aria-label="Main navigation" className="hidden items-center gap-6 md:flex">
            {(
              [
                { id: 'papers', label: UI_STRINGS.navPapers },
                { id: 'details', label: UI_STRINGS.navExamPattern },
                { id: 'history', label: UI_STRINGS.navHistory },
              ] as const
            ).map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`cursor-pointer whitespace-nowrap shrink-0 border-b-2 py-1 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                    isActive
                      ? 'border-blue-800 text-blue-900'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {navLabel(item.label)}
                </button>
              );
            })}
          </nav>
        )}

        {/* Zone 3: Simple 3-option Language Selector in the Navigation Bar */}
        <div
          role="group"
          aria-label="Question paper language mode"
          className="flex shrink-0 items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5"
        >
          {LANG_OPTIONS.map((option) => {
            const active = langMode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-label={option.ariaLabel}
                aria-pressed={active}
                onClick={() => onChangeLangMode(option.id)}
                className={`cursor-pointer whitespace-nowrap shrink-0 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-700 ${
                  active
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white/70 hover:text-slate-950'
                }`}
              >
                {option.id === 'bilingual' ? (
                  <>
                    <span className="sm:hidden">EN+हि</span>
                    <span className="hidden sm:inline">Bilingual (EN+हि)</span>
                  </>
                ) : (
                  option.label
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Compact mobile navigation row */}
      {!isInTest && (
        <nav
          aria-label="Mobile navigation"
          className="flex items-center justify-around border-t border-slate-100 px-2 py-1.5 md:hidden"
        >
          {(
            [
              { id: 'papers', label: UI_STRINGS.navPapers },
              { id: 'details', label: UI_STRINGS.navExamPattern },
              { id: 'history', label: UI_STRINGS.navHistory },
            ] as const
          ).map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`cursor-pointer whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {navLabel(item.label)}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
}
