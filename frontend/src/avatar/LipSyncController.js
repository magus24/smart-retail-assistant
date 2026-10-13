export const DEFAULT_MOUTH_TARGETS = ['mouthOpen', 'jawOpen', 'viseme_aa', 'mouth_open'];
export const DEFAULT_SMILE_TARGETS = ['smile', 'mouthSmile', 'happy'];
export const DEFAULT_BLINK_LEFT_TARGETS = ['blinkLeft', 'eyeBlinkLeft'];
export const DEFAULT_BLINK_RIGHT_TARGETS = ['blinkRight', 'eyeBlinkRight'];

export function findMorphTarget(scene, targetNames = []) {
  const targets = targetNames.map((name) => name.toLowerCase());
  let found = null;

  scene.traverse((node) => {
    if (found || !node.morphTargetDictionary || !node.morphTargetInfluences) return;
    const entries = Object.entries(node.morphTargetDictionary);
    const match = entries.find(([name]) => targets.includes(name.toLowerCase()));
    if (match) {
      found = { mesh: node, index: match[1] };
    }
  });

  return found;
}

export function setMorphTarget(target, value) {
  if (!target) return false;
  target.mesh.morphTargetInfluences[target.index] = Math.min(1, Math.max(0, value));
  return true;
}
