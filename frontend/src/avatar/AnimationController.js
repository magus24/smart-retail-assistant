export const ANIMATION_ALIASES = {
  idle: 'idle',
  listening: 'idle',
  thinking: 'thinking',
  speaking: 'talking',
  talking: 'talking',
  greeting: 'greeting',
  wave: 'greeting',
  explaining: 'explaining',
  explain: 'explaining',
  pointing: 'pointing',
  point: 'pointing',
  recommend: 'pointing',
  confused: 'confused',
  warning: 'warning',
  smile: 'idle',
  nod: 'nod',
};

export function resolveAnimationKey(animationName, availableActions = {}, isSpeaking = false) {
  const requested = ANIMATION_ALIASES[animationName] || animationName || 'idle';
  const fallbackOrder = [
    requested,
    requested === 'thinking' ? 'idle' : null,
    requested === 'confused' ? 'nod' : null,
    requested === 'warning' ? 'nod' : null,
    requested === 'greeting' ? 'wave' : null,
    requested === 'explaining' ? 'talking' : null,
    requested === 'pointing' ? 'talking' : null,
    isSpeaking ? 'talking' : null,
    'idle',
  ].filter(Boolean);

  return fallbackOrder.find((key) => availableActions[key]) || 'idle';
}

export function isOneShotGesture(animationKey) {
  return ['greeting', 'wave', 'nod', 'pointing', 'warning', 'confused'].includes(animationKey);
}
