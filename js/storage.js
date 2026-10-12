export const STORAGE_KEY = 'gero-yumeguri:plan-inputs:v1';
export const STAY_MIN = 10;
export const STAY_MAX = 180;
export const DEFAULT_PLAN_INPUTS = Object.freeze({ endTime: '17:00', goal: 'station', count: 3, stay: 45 });

function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function sanitizePlanInputs(value) {
  const input = value && typeof value === 'object' ? value : {};
  const isValidStay = Number.isInteger(input.stay) && input.stay >= STAY_MIN && input.stay <= STAY_MAX;
  return {
    endTime: /^\d{2}:\d{2}$/.test(input.endTime) ? input.endTime : DEFAULT_PLAN_INPUTS.endTime,
    goal: input.goal === 'none' ? 'none' : 'station',
    count: [1, 2, 3].includes(input.count) ? input.count : DEFAULT_PLAN_INPUTS.count,
    stay: isValidStay ? input.stay : DEFAULT_PLAN_INPUTS.stay,
  };
}

export function loadPlanInputs(storage = browserStorage()) {
  if (!storage) {
    return { ...DEFAULT_PLAN_INPUTS };
  }
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return sanitizePlanInputs(raw ? JSON.parse(raw) : {});
  } catch (error) {
    // 保存先が使えない（プライベートモードなど）・壊れているときは既定値で動かす
    console.warn('前回の入力を読み込めませんでした', error);
    return { ...DEFAULT_PLAN_INPUTS };
  }
}

export function savePlanInputs(inputs, storage = browserStorage()) {
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(sanitizePlanInputs(inputs)));
    return true;
  } catch (error) {
    console.warn('入力を保存できませんでした', error);
    return false;
  }
}
