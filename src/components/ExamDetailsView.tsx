import type { LanguageMode } from '../types/ctet';
import { SUBJECT_LABELS } from '../utils/examLogic';
import { BilingualBlock } from './BilingualBlock';

interface ExamDetailsViewProps {
  langMode: LanguageMode;
  onBrowsePapers: () => void;
}

export function ExamDetailsView({ langMode, onBrowsePapers }: ExamDetailsViewProps) {
  const sections = [
    { id: 'cdp' as const, questions: 30, marks: 30 },
    { id: 'math' as const, questions: 30, marks: 30 },
    { id: 'evs' as const, questions: 30, marks: 30 },
    { id: 'lang1' as const, questions: 30, marks: 30 },
    { id: 'lang2' as const, questions: 30, marks: 30 },
  ];

  const keyFacts = [
    {
      label: { en: 'Target Level', hi: 'पात्रता स्तर' },
      value: { en: 'Primary Teacher (Classes I to V)', hi: 'प्राथमिक शिक्षक (कक्षा I से V)' },
    },
    {
      label: { en: 'Total Questions & Marks', hi: 'कुल प्रश्न एवं अंक' },
      value: { en: '150 MCQs · 150 Marks', hi: '150 बहुविकल्पीय प्रश्न · 150 अंक' },
    },
    {
      label: { en: 'Exam Duration', hi: 'परीक्षा अवधि' },
      value: { en: '150 Minutes (2 Hours 30 Minutes)', hi: '150 मिनट (2 घंटे 30 मिनट)' },
    },
    {
      label: { en: 'Negative Marking', hi: 'नकारात्मक अंकन' },
      value: { en: 'No Negative Marking (0 deduction)', hi: 'कोई नकारात्मक अंकन नहीं' },
    },
    {
      label: { en: 'Qualifying Marks', hi: 'उत्तीर्ण अंक' },
      value: { en: '60% (90/150) General · 55% (82/150) Reserved', hi: '60% (90/150) सामान्य · 55% (82/150) आरक्षित वर्ग' },
    },
    {
      label: { en: 'Question Paper Medium', hi: 'प्रश्न-पत्र का माध्यम' },
      value: { en: 'Bilingual (English & Hindi)', hi: 'द्विभाषी (अंग्रेजी एवं हिन्दी)' },
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-3.5 py-4 sm:px-6 sm:py-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:rounded-xl sm:p-8">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-lg font-bold text-slate-900 sm:text-2xl">
              <BilingualBlock
                text={{
                  en: 'CTET Paper I (Classes I to V) Exam Pattern & Details',
                  hi: 'CTET पेपर I (कक्षा I से V) परीक्षा पैटर्न एवं विवरण',
                }}
                langMode={langMode}
              />
            </h1>
            <p className="mt-1.5 text-xs text-slate-600 sm:text-sm">
              <BilingualBlock
                text={{
                  en: 'Official CBSE Central Teacher Eligibility Test structure, marks distribution, and qualifying criteria.',
                  hi: 'केंद्रीय माध्यमिक शिक्षा बोर्ड (CBSE) द्वारा निर्धारित आधिकारिक परीक्षा संरचना, अंक विभाजन और पात्रता मानदंड।',
                }}
                langMode={langMode}
              />
            </p>
          </div>

          <button
            type="button"
            onClick={onBrowsePapers}
            className="min-h-[44px] w-full cursor-pointer whitespace-nowrap shrink-0 rounded-xl bg-blue-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-800 active:scale-[0.98] sm:min-h-0 sm:w-auto sm:rounded-lg"
          >
            {langMode === 'hi' ? 'प्रश्न-पत्र अभ्यास शुरू करें' : 'Start Practicing Papers'}
          </button>
        </div>

        {/* Key Highlights Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {keyFacts.map((fact) => (
            <div key={fact.label.en} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-xs font-medium text-slate-500">
                <BilingualBlock text={fact.label} langMode={langMode} inline />
              </div>
              <div className="mt-1.5 text-sm font-semibold text-slate-900">
                <BilingualBlock text={fact.value} langMode={langMode} />
              </div>
            </div>
          ))}
        </div>

        {/* Subject Distribution Table */}
        <div className="mt-8">
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">
            <BilingualBlock
              text={{
                en: 'Section-Wise Marks & Question Distribution',
                hi: 'विषय-वार प्रश्न एवं अंक वितरण',
              }}
              langMode={langMode}
              inline
            />
          </h2>

          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 sm:text-xs">
                <tr className="border-b border-slate-200">
                  <th className="px-2.5 py-2.5 sm:px-4 sm:py-3">#</th>
                  <th className="px-2.5 py-2.5 sm:px-4 sm:py-3">
                    {langMode === 'hi' ? 'विषय' : langMode === 'bilingual' ? 'Subject / विषय' : 'Subject'}
                  </th>
                  <th className="px-2.5 py-2.5 text-right sm:px-4 sm:py-3">
                    {langMode === 'hi' ? 'प्रश्न' : 'MCQs'}
                  </th>
                  <th className="px-2.5 py-2.5 text-right sm:px-4 sm:py-3">
                    {langMode === 'hi' ? 'अंक' : 'Marks'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sections.map((sec, idx) => (
                  <tr key={sec.id} className="hover:bg-slate-50/60">
                    <td className="px-2.5 py-2.5 font-mono-num text-xs text-slate-500 sm:px-4 sm:py-3">{idx + 1}</td>
                    <td className="px-2.5 py-2.5 font-medium text-slate-900 sm:px-4 sm:py-3">
                      <BilingualBlock text={SUBJECT_LABELS[sec.id]} langMode={langMode} inline />
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-mono-num text-slate-700 sm:px-4 sm:py-3">
                      {sec.questions}
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-mono-num font-semibold text-slate-900 sm:px-4 sm:py-3">
                      {sec.marks}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50 font-bold text-slate-900">
                <tr>
                  <td className="px-2.5 py-2.5 sm:px-4 sm:py-3" colSpan={2}>
                    {langMode === 'hi' ? 'कुल योग' : langMode === 'bilingual' ? 'Total / कुल योग' : 'Total'}
                  </td>
                  <td className="px-2.5 py-2.5 text-right font-mono-num sm:px-4 sm:py-3">150</td>
                  <td className="px-2.5 py-2.5 text-right font-mono-num sm:px-4 sm:py-3">150</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
