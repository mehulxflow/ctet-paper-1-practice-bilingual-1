import type { PaperMeta } from '../types/ctet';

interface RawPaperSpec {
  slug: string;
  numberInYear: number;
  year: number;
  enDate: string;
  hiDate: string;
  enShift?: string;
  hiShift?: string;
}

const RAW_PAPERS: RawPaperSpec[] = [
  // 2026
  { slug: 'ctet-paper-i-classes-i-to-v-8-feb-2026-shift-2-solved-paper', numberInYear: 1, year: 2026, enDate: '8 Feb 2026', hiDate: '8 फरवरी 2026', enShift: 'Shift 2', hiShift: 'शिफ्ट 2' },
  { slug: 'ctet-paper-i-classes-i-to-v-7-feb-2026-shift-2-solved-paper', numberInYear: 2, year: 2026, enDate: '7 Feb 2026', hiDate: '7 फरवरी 2026', enShift: 'Shift 2', hiShift: 'शिफ्ट 2' },
  { slug: 'ctet-paper-i-classes-i-to-v-1-mar-2026-shift-2-solved-paper', numberInYear: 3, year: 2026, enDate: '1 Mar 2026', hiDate: '1 मार्च 2026', enShift: 'Shift 2', hiShift: 'शिफ्ट 2' },

  // 2024
  { slug: 'ctet-paper-i-classes-i-to-v-21-jan-2024-shift-2-solved-paper', numberInYear: 1, year: 2024, enDate: '21 Jan 2024', hiDate: '21 जनवरी 2024', enShift: 'Shift 2', hiShift: 'शिफ्ट 2' },
  { slug: 'ctet-paper-i-classes-i-to-v-7-jul-2024-solved-paper', numberInYear: 2, year: 2024, enDate: '7 Jul 2024', hiDate: '7 जुलाई 2024' },
  { slug: 'ctet-paper-i-classes-i-to-v-14-dec-2024-shift-2-solved-paper', numberInYear: 3, year: 2024, enDate: '14 Dec 2024', hiDate: '14 दिसंबर 2024', enShift: 'Shift 2', hiShift: 'शिफ्ट 2' },

  // 2023
  { slug: 'ctet-paper-i-classes-i-to-v-9-jan-2023-solved-paper', numberInYear: 1, year: 2023, enDate: '9 Jan 2023', hiDate: '9 जनवरी 2023' },
  { slug: 'ctet-paper-i-classes-i-to-v-10-jan-2023-solved-paper', numberInYear: 2, year: 2023, enDate: '10 Jan 2023', hiDate: '10 जनवरी 2023' },
  { slug: 'ctet-paper-i-classes-i-to-v-11-jan-2023-solved-paper', numberInYear: 3, year: 2023, enDate: '11 Jan 2023', hiDate: '11 जनवरी 2023' },
  { slug: 'ctet-paper-i-classes-i-to-v-12-jan-2023-solved-paper', numberInYear: 4, year: 2023, enDate: '12 Jan 2023', hiDate: '12 जनवरी 2023' },
  { slug: 'ctet-paper-i-classes-i-to-v-17-jan-2023-solved-paper', numberInYear: 5, year: 2023, enDate: '17 Jan 2023', hiDate: '17 जनवरी 2023' },
  { slug: 'ctet-paper-i-classes-i-to-v-19-jan-2023-solved-paper', numberInYear: 6, year: 2023, enDate: '19 Jan 2023', hiDate: '19 जनवरी 2023' },
  { slug: 'ctet-paper-i-classes-i-to-v-28-jan-2023-solved-paper', numberInYear: 7, year: 2023, enDate: '28 Jan 2023', hiDate: '28 जनवरी 2023' },
  { slug: 'ctet-paper-i-classes-i-to-v-30-jan-2023-solved-paper', numberInYear: 8, year: 2023, enDate: '30 Jan 2023', hiDate: '30 जनवरी 2023' },
  { slug: 'ctet-paper-i-classes-i-to-v-2-feb-2023-solved-paper', numberInYear: 9, year: 2023, enDate: '2 Feb 2023', hiDate: '2 फरवरी 2023' },
  { slug: 'ctet-paper-i-classes-i-to-v-6-feb-2023-solved-paper', numberInYear: 10, year: 2023, enDate: '6 Feb 2023', hiDate: '6 फरवरी 2023' },
  { slug: 'ctet-paper-i-classes-i-to-v-7-feb-2023-solved-paper', numberInYear: 11, year: 2023, enDate: '7 Feb 2023', hiDate: '7 फरवरी 2023' },
  { slug: 'ctet-paper-i-classes-i-to-v-20-aug-2023-solved-paper', numberInYear: 12, year: 2023, enDate: '20 Aug 2023', hiDate: '20 अगस्त 2023' },

  // 2022
  { slug: 'ctet-paper-i-classes-i-to-v-1-jan-2022-solved-paper', numberInYear: 1, year: 2022, enDate: '1 Jan 2022', hiDate: '1 जनवरी 2022' },
  { slug: 'ctet-paper-i-classes-i-to-v-3-jan-2022-solved-paper', numberInYear: 2, year: 2022, enDate: '3 Jan 2022', hiDate: '3 जनवरी 2022' },
  { slug: 'ctet-paper-i-classes-i-to-v-4-jan-2022-solved-paper', numberInYear: 3, year: 2022, enDate: '4 Jan 2022', hiDate: '4 जनवरी 2022' },
  { slug: 'ctet-paper-i-classes-i-to-v-5-jan-2022-solved-paper', numberInYear: 4, year: 2022, enDate: '5 Jan 2022', hiDate: '5 जनवरी 2022' },
  { slug: 'ctet-paper-i-classes-i-to-v-6-jan-2022-solved-paper', numberInYear: 5, year: 2022, enDate: '6 Jan 2022', hiDate: '6 जनवरी 2022' },
  { slug: 'ctet-paper-i-classes-i-to-v-7-jan-2022-solved-paper', numberInYear: 6, year: 2022, enDate: '7 Jan 2022', hiDate: '7 जनवरी 2022' },
  { slug: 'ctet-paper-i-classes-i-to-v-8-jan-2022-solved-paper', numberInYear: 7, year: 2022, enDate: '8 Jan 2022', hiDate: '8 जनवरी 2022' },
  { slug: 'ctet-paper-i-classes-i-to-v-11-jan-2022-solved-paper', numberInYear: 8, year: 2022, enDate: '11 Jan 2022', hiDate: '11 जनवरी 2022' },
  { slug: 'ctet-paper-i-classes-i-to-v-12-jan-2022-solved-paper', numberInYear: 9, year: 2022, enDate: '12 Jan 2022', hiDate: '12 जनवरी 2022' },
  { slug: 'ctet-paper-i-classes-i-to-v-17-jan-2022-solved-paper', numberInYear: 10, year: 2022, enDate: '17 Jan 2022', hiDate: '17 जनवरी 2022' },

  // 2021
  { slug: 'ctet-paper-i-classes-i-to-v-16-dec-2021-solved-paper', numberInYear: 1, year: 2021, enDate: '16 Dec 2021', hiDate: '16 दिसंबर 2021' },
  { slug: 'ctet-paper-i-classes-i-to-v-20-dec-2021-solved-paper', numberInYear: 2, year: 2021, enDate: '20 Dec 2021', hiDate: '20 दिसंबर 2021' },
  { slug: 'ctet-paper-i-classes-i-to-v-21-dec-2021-solved-paper', numberInYear: 3, year: 2021, enDate: '21 Dec 2021', hiDate: '21 दिसंबर 2021' },
  { slug: 'ctet-paper-i-classes-i-to-v-22-dec-2021-solved-paper', numberInYear: 4, year: 2021, enDate: '22 Dec 2021', hiDate: '22 दिसंबर 2021' },
  { slug: 'ctet-paper-i-classes-i-to-v-23-dec-2021-solved-paper', numberInYear: 5, year: 2021, enDate: '23 Dec 2021', hiDate: '23 दिसंबर 2021' },
  { slug: 'ctet-paper-i-classes-i-to-v-24-dec-2021-solved-paper', numberInYear: 6, year: 2021, enDate: '24 Dec 2021', hiDate: '24 दिसंबर 2021' },
  { slug: 'ctet-paper-i-classes-i-to-v-27-dec-2021-solved-paper', numberInYear: 7, year: 2021, enDate: '27 Dec 2021', hiDate: '27 दिसंबर 2021' },
  { slug: 'ctet-paper-i-classes-i-to-v-28-dec-2021-solved-paper', numberInYear: 8, year: 2021, enDate: '28 Dec 2021', hiDate: '28 दिसंबर 2021' },
  { slug: 'ctet-paper-i-classes-i-to-v-29-dec-2021-solved-paper', numberInYear: 9, year: 2021, enDate: '29 Dec 2021', hiDate: '29 दिसंबर 2021' },

  // 2019–2012
  { slug: 'ctet-paper-i-classes-i-to-v-july-2019-solved-paper', numberInYear: 1, year: 2019, enDate: 'July 2019', hiDate: 'जुलाई 2019' },
  { slug: 'ctet-paper-i-classes-i-to-v-dec-2019-solved-paper', numberInYear: 2, year: 2019, enDate: 'Dec 2019', hiDate: 'दिसंबर 2019' },
  { slug: 'ctet-paper-i-classes-i-to-v-dec-2018-solved-paper', numberInYear: 1, year: 2018, enDate: 'Dec 2018', hiDate: 'दिसंबर 2018' },
  { slug: 'ctet-paper-i-classes-i-to-v-may-2016-solved-paper', numberInYear: 1, year: 2016, enDate: 'May 2016', hiDate: 'मई 2016' },
  { slug: 'ctet-paper-i-classes-i-to-v-sep-2016-solved-paper', numberInYear: 2, year: 2016, enDate: 'Sep 2016', hiDate: 'सितंबर 2016' },
  { slug: 'ctet-paper-i-classes-i-to-v-feb-2016-solved-paper', numberInYear: 3, year: 2016, enDate: 'Feb 2016', hiDate: 'फरवरी 2016' },
  { slug: 'ctet-paper-i-classes-i-to-v-feb-2015-solved-paper', numberInYear: 1, year: 2015, enDate: 'Feb 2015', hiDate: 'फरवरी 2015' },
  { slug: 'ctet-paper-i-classes-i-to-v-sep-2015-solved-paper', numberInYear: 2, year: 2015, enDate: 'Sep 2015', hiDate: 'सितंबर 2015' },
  { slug: 'ctet-paper-i-classes-i-to-v-feb-2014-solved-paper', numberInYear: 1, year: 2014, enDate: 'Feb 2014', hiDate: 'फरवरी 2014' },
  { slug: 'ctet-paper-i-classes-i-to-v-sep-2014-solved-paper', numberInYear: 2, year: 2014, enDate: 'Sep 2014', hiDate: 'सितंबर 2014' },
  { slug: 'ctet-paper-i-classes-i-to-v-july-2013-solved-paper', numberInYear: 1, year: 2013, enDate: 'July 2013', hiDate: 'जुलाई 2013' },
  { slug: 'ctet-paper-i-classes-i-to-v-nov-2012-solved-paper', numberInYear: 1, year: 2012, enDate: 'Nov 2012', hiDate: 'नवंबर 2012' },
];

export const CTET_PAPERS_CATALOG: PaperMeta[] = RAW_PAPERS.map((raw) => {
  const enShiftPart = raw.enShift ? ` ${raw.enShift}` : '';
  const hiShiftPart = raw.hiShift ? ` ${raw.hiShift}` : '';

  return {
    id: raw.slug,
    slug: raw.slug,
    numberInYear: raw.numberInYear,
    year: raw.year,
    title: {
      en: `${raw.numberInYear}. CTET Paper I (Classes I to V) ${raw.enDate}${enShiftPart} Solved Paper`,
      hi: `${raw.numberInYear}. CTET पेपर I (कक्षा I से V) ${raw.hiDate}${hiShiftPart} हल प्रश्न-पत्र`,
    },
    dateLabel: {
      en: raw.enDate,
      hi: raw.hiDate,
    },
    shiftLabel:
      raw.enShift && raw.hiShift
        ? { en: raw.enShift, hi: raw.hiShift }
        : undefined,
    officialDurationMinutes: 150,
    officialTotalQuestions: 150,
  };
});
