import { normalizeAvatarBehavior } from './AvatarStateManager';

export function mapBehaviorToAvatarCommands(behavior) {
  const normalized = normalizeAvatarBehavior(behavior);
  const { state, emotion, gesture, intensity } = normalized;

  let animation = 'idle';

  if (state === 'thinking') animation = 'thinking';
  if (state === 'listening') animation = 'idle';
  if (state === 'speaking') animation = 'talking';
  if (state === 'happy') animation = 'smile';
  if (state === 'confused' || state === 'error') animation = 'confused';

  if (gesture === 'greeting') animation = 'greeting';
  if (gesture === 'explain') animation = 'explaining';
  if (gesture === 'recommend') animation = 'pointing';
  if (gesture === 'point') animation = 'pointing';
  if (gesture === 'warning') animation = 'warning';

  return {
    animation,
    state,
    emotion,
    gesture,
    intensity,
    expression: {
      smile: emotion === 'happy' || emotion === 'excited' ? intensity : 0,
      serious: emotion === 'serious' ? intensity : 0,
      confused: emotion === 'confused' ? intensity : 0,
    },
    fallbackMotion: {
      headTilt: state === 'confused' || emotion === 'confused',
      nod: gesture === 'recommend' || gesture === 'explain',
      warning: gesture === 'warning',
      speaking: state === 'speaking',
      listening: state === 'listening',
      thinking: state === 'thinking',
    },
  };
}
