import { bibleBooks } from './bibleBooks';

export interface DailyReading {
  day: number;
  readings: { book: string; chapter: number }[];
}

// Build all chapters in canonical order
function buildAllChapters() {
  const chapters: { book: string; chapter: number }[] = [];
  for (const b of bibleBooks) {
    for (let c = 1; c <= b.chapters; c++) chapters.push({ book: b.name, chapter: c });
  }
  return chapters;
}

const ALL_CHAPTERS = buildAllChapters();
const TOTAL_DAYS = 365;

export const readingPlan: DailyReading[] = (() => {
  const plan: DailyReading[] = [];
  const total = ALL_CHAPTERS.length; // 1189
  const base = Math.floor(total / TOTAL_DAYS);
  const extra = total % TOTAL_DAYS;
  let idx = 0;
  for (let d = 1; d <= TOTAL_DAYS; d++) {
    const count = base + (d <= extra ? 1 : 0);
    plan.push({ day: d, readings: ALL_CHAPTERS.slice(idx, idx + count) });
    idx += count;
  }
  return plan;
})();

const STORAGE_KEY = 'bible_reading_plan_v1';

interface PlanState {
  startDate: string; // ISO date
  completedDays: number[];
}

export function getPlanState(): PlanState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { startDate: '', completedDays: [] };
}

export function savePlanState(state: PlanState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function startPlan() {
  const state: PlanState = { startDate: new Date().toISOString().slice(0, 10), completedDays: [] };
  savePlanState(state);
  return state;
}

export function resetPlan() {
  localStorage.removeItem(STORAGE_KEY);
}

export function toggleDayCompleted(day: number) {
  const state = getPlanState();
  if (state.completedDays.includes(day)) {
    state.completedDays = state.completedDays.filter(d => d !== day);
  } else {
    state.completedDays = [...state.completedDays, day];
  }
  savePlanState(state);
  return state;
}

export function getCurrentDay(state: PlanState): number {
  if (!state.startDate) return 1;
  const start = new Date(state.startDate + 'T00:00:00');
  const now = new Date();
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.min(Math.max(diff + 1, 1), TOTAL_DAYS);
}
