export const DEFAULT_AVATAR_BEHAVIOR = {
  state: 'idle',
  emotion: 'neutral',
  gesture: 'none',
  intensity: 0.35,
};

const VALID_STATES = new Set(['idle', 'listening', 'thinking', 'speaking', 'error', 'happy', 'confused']);
const VALID_EMOTIONS = new Set(['neutral', 'happy', 'serious', 'confused', 'excited']);
const VALID_GESTURES = new Set(['none', 'explain', 'recommend', 'point', 'greeting', 'warning']);

const clampIntensity = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_AVATAR_BEHAVIOR.intensity;
  return Math.min(1, Math.max(0, parsed));
};

export function normalizeAvatarBehavior(behavior = {}) {
  return {
    state: VALID_STATES.has(behavior.state) ? behavior.state : DEFAULT_AVATAR_BEHAVIOR.state,
    emotion: VALID_EMOTIONS.has(behavior.emotion) ? behavior.emotion : DEFAULT_AVATAR_BEHAVIOR.emotion,
    gesture: VALID_GESTURES.has(behavior.gesture) ? behavior.gesture : DEFAULT_AVATAR_BEHAVIOR.gesture,
    intensity: clampIntensity(behavior.intensity),
  };
}

export function deriveAvatarBehaviorFromText(text = '') {
  const normalized = text.toLowerCase();
  const behavior = { ...DEFAULT_AVATAR_BEHAVIOR, state: 'speaking', gesture: 'explain', intensity: 0.5 };

  if (/(salom|assalomu|hello|привет|здравствуйте)/i.test(normalized)) {
    return { state: 'speaking', emotion: 'happy', gesture: 'greeting', intensity: 0.65 };
  }

  if (/(tavsiya|recommend|рекоменд|лучше выбрать|maslahat|совет)/i.test(normalized)) {
    return { state: 'speaking', emotion: 'happy', gesture: 'recommend', intensity: 0.7 };
  }

  if (/(важно|опасно|не рекомендуется|warning|xavf|ehtiyot|diqqat)/i.test(normalized)) {
    return { state: 'speaking', emotion: 'serious', gesture: 'warning', intensity: 0.75 };
  }

  if (/(потому что|это значит|причина|because|sababi|shuning uchun)/i.test(normalized)) {
    return { ...behavior, gesture: 'explain', intensity: 0.6 };
  }

  if (/(не знаю|не найдено|нет данных|unknown|topilmadi|ma.?lumot yetarli emas)/i.test(normalized)) {
    return { state: 'confused', emotion: 'confused', gesture: 'none', intensity: 0.55 };
  }

  return behavior;
}

export function getStateBehavior(state, overrides = {}) {
  const base = {
    idle: { state: 'idle', emotion: 'neutral', gesture: 'none', intensity: 0.3 },
    listening: { state: 'listening', emotion: 'neutral', gesture: 'none', intensity: 0.45 },
    thinking: { state: 'thinking', emotion: 'neutral', gesture: 'none', intensity: 0.55 },
    speaking: { state: 'speaking', emotion: 'neutral', gesture: 'explain', intensity: 0.5 },
    error: { state: 'error', emotion: 'confused', gesture: 'warning', intensity: 0.65 },
    happy: { state: 'happy', emotion: 'happy', gesture: 'none', intensity: 0.6 },
    confused: { state: 'confused', emotion: 'confused', gesture: 'none', intensity: 0.5 },
  }[state] || DEFAULT_AVATAR_BEHAVIOR;

  return normalizeAvatarBehavior({ ...base, ...overrides });
}
