/**
 * AvatarModel.jsx
 * Uses useFBX and useAnimations for more reliable animation handling.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useFBX, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { resolveAnimationKey, isOneShotGesture } from './AnimationController';
import {
  DEFAULT_BLINK_LEFT_TARGETS,
  DEFAULT_BLINK_RIGHT_TARGETS,
  DEFAULT_MOUTH_TARGETS,
  DEFAULT_SMILE_TARGETS,
  findMorphTarget,
  setMorphTarget,
} from './LipSyncController';

const cloneClipAs = (clips, name) => clips.map((clip) => {
  const cloned = clip.clone();
  cloned.name = name;
  return cloned;
});

export function AvatarModel({
  avatarConfig,
  animationName,
  animationNonce,
  isSpeaking,
  behaviorCommands,
  lipSyncLevel = 0,
  lipSyncEnabled = true,
  onDebugInfo,
}) {
  const { scene, animations: modelAnimations = [] } = useGLTF(avatarConfig.modelPath);
  const bonesRef = useRef({});
  const baseRotationsRef = useRef(new Map());
  const baseGroupPositionRef = useRef(null);
  const morphTargetsRef = useRef({});
  const blinkRef = useRef({ nextBlinkAt: 2 + Math.random() * 2, blinkUntil: 0 });
  const retargetStatsRef = useRef({ matched: 0, missing: 0, missingNames: [] });
  
  const animations = avatarConfig.animations || {};
  const idleFBX = useFBX(animations.idle);
  const talkingFBX = useFBX(animations.talking || animations.idle);
  const thinkingFBX = useFBX(animations.thinking || animations.idle);
  const greetingFBX = useFBX(animations.greeting || animations.wave || animations.idle);
  const explainingFBX = useFBX(animations.explaining || animations.explain || animations.talking || animations.idle);
  const pointingFBX = useFBX(animations.pointing || animations.point || animations.talking || animations.idle);
  const confusedFBX = useFBX(animations.confused || animations.nod || animations.idle);
  const warningFBX = useFBX(animations.warning || animations.nod || animations.idle);
  const waveFBX = useFBX(animations.wave || animations.greeting || animations.idle);
  const nodFBX = useFBX(animations.nod || animations.idle);

  const clips = useMemo(() => {
    const allClips = [
      ...modelAnimations.map((clip) => clip.clone()),
      ...cloneClipAs(idleFBX.animations, 'idle'),
      ...cloneClipAs(talkingFBX.animations, 'talking'),
      ...cloneClipAs(thinkingFBX.animations, 'thinking'),
      ...cloneClipAs(greetingFBX.animations, 'greeting'),
      ...cloneClipAs(explainingFBX.animations, 'explaining'),
      ...cloneClipAs(pointingFBX.animations, 'pointing'),
      ...cloneClipAs(confusedFBX.animations, 'confused'),
      ...cloneClipAs(warningFBX.animations, 'warning'),
      ...cloneClipAs(waveFBX.animations, 'wave'),
      ...cloneClipAs(nodFBX.animations, 'nod'),
    ];

    const sceneNodes = [];
    scene.traverse(child => sceneNodes.push(child.name));
    const stats = { matched: 0, missing: 0, missingNames: [] };

    allClips.forEach(clip => {
      clip.tracks.forEach(track => {
        const parts = track.name.split('.');
        if (parts.length < 2) return;
        let nodeName = parts[0].replace(/mixamorig/gi, '')
                               .replace(/mixamo\.com_?/gi, '')
                               .replace(/^.*[|:/]/, '');
        
        let matched = sceneNodes.includes(nodeName);
        if (!sceneNodes.includes(nodeName)) {
          let match = sceneNodes.find(bn => {
            const cleanBn = bn.toLowerCase().replace(/_[0-9]+$/, '');
            return cleanBn.endsWith(nodeName.toLowerCase());
          });
          if (!match) {
            match = sceneNodes.find(bn => bn.toLowerCase().includes(nodeName.toLowerCase()));
          }
          if (match) {
            nodeName = match;
            matched = true;
          }
        }
        if (matched) {
          stats.matched += 1;
          track.name = nodeName + '.' + parts.slice(1).join('.');
        } else {
          stats.missing += 1;
          if (stats.missingNames.length < 12) stats.missingNames.push(parts[0]);
        }
      });
    });

    retargetStatsRef.current = stats;
    return allClips;
  }, [modelAnimations, idleFBX, talkingFBX, thinkingFBX, greetingFBX, explainingFBX, pointingFBX, confusedFBX, warningFBX, waveFBX, nodFBX, scene]);

  useEffect(() => {
    const bones = {};
    scene.traverse((node) => {
      if (node.isSkinnedMesh && node.skeleton) {
        node.frustumCulled = false;
      }
      if (!node.isBone) return;
      const name = node.name.toLowerCase().replace(/[^a-z]/g, '');

      if (!bones.head && name.includes('head')) bones.head = node;
      if (!bones.neck && name.includes('neck')) bones.neck = node;
      if (!bones.rightArm && (name.includes('rightarm') || name.includes('rightupperarm'))) bones.rightArm = node;
      if (!bones.rightForeArm && name.includes('rightforearm')) bones.rightForeArm = node;
      if (!bones.rightHand && name.includes('righthand')) bones.rightHand = node;
      if (!bones.leftArm && (name.includes('leftarm') || name.includes('leftupperarm'))) bones.leftArm = node;
      if (!bones.leftForeArm && name.includes('leftforearm')) bones.leftForeArm = node;
      if (!bones.leftHand && name.includes('lefthand')) bones.leftHand = node;
      if (!bones.spine && (name.endsWith('spine') || name.includes('spine2'))) bones.spine = node;

      if (!baseRotationsRef.current.has(node.uuid)) {
        baseRotationsRef.current.set(node.uuid, node.rotation.clone());
      }
    });
    bonesRef.current = bones;

    const morphConfig = avatarConfig.morphTargets || {};
    morphTargetsRef.current = {
      mouthOpen: findMorphTarget(scene, morphConfig.mouthOpen || DEFAULT_MOUTH_TARGETS),
      smile: findMorphTarget(scene, morphConfig.smile || DEFAULT_SMILE_TARGETS),
      blinkLeft: findMorphTarget(scene, morphConfig.blinkLeft || DEFAULT_BLINK_LEFT_TARGETS),
      blinkRight: findMorphTarget(scene, morphConfig.blinkRight || DEFAULT_BLINK_RIGHT_TARGETS),
    };
  }, [scene]);

  const groupRef = useRef();
  const { actions, names } = useAnimations(clips, groupRef);
  const prevActionRef = useRef(null);
  const prevKeyRef = useRef(null);
  const returnTimerRef = useRef(null);
  const debugRef = useRef({});

  useEffect(() => {
    if (!groupRef.current || baseGroupPositionRef.current) return;
    baseGroupPositionRef.current = groupRef.current.position.clone();
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const skinnedMeshes = [];
    const morphTargets = [];
    const bones = [];
    scene.traverse((node) => {
      if (node.isSkinnedMesh) skinnedMeshes.push(node.name || '(unnamed skinnedMesh)');
      if (node.isBone) bones.push(node.name || '(unnamed bone)');
      if (node.morphTargetDictionary) {
        morphTargets.push(...Object.keys(node.morphTargetDictionary));
      }
    });

    const info = {
      modelPath: avatarConfig.modelPath,
      hasScene: Boolean(scene),
      modelAnimationCount: modelAnimations.length,
      modelAnimationNames: modelAnimations.map((clip) => clip.name),
      clipCount: clips.length,
      clipNames: clips.map((clip) => clip.name),
      actionNames: names,
      skinnedMeshes,
      boneCount: bones.length,
      boneSample: bones.slice(0, 18),
      morphTargets,
      retargetStats: retargetStatsRef.current,
    };

    console.log('[Avatar diagnostics]', info);
    debugRef.current = { ...debugRef.current, ...info };
    onDebugInfo?.(debugRef.current);
  }, [avatarConfig.modelPath, clips, modelAnimations, names, onDebugInfo, scene]);

  useEffect(() => {
    const key = resolveAnimationKey(animationName, actions, isSpeaking);
    const action = actions[key] || actions['idle'];
    const state = behaviorCommands?.state || 'idle';

    console.log('[Avatar action]', {
      currentState: state,
      requestedAnimation: animationName,
      selectedClipName: key,
      actionExists: Boolean(action),
      actionIsRunning: Boolean(action?.isRunning?.()),
    });

    if (action) {
      if (returnTimerRef.current) {
        window.clearTimeout(returnTimerRef.current);
        returnTimerRef.current = null;
      }

      const isGesture = isOneShotGesture(key);
      if (prevKeyRef.current === key && action.isRunning() && !isGesture) {
        if (isGesture && !returnTimerRef.current) {
          returnTimerRef.current = window.setTimeout(() => {
            const nextKey = isSpeaking ? 'talking' : 'idle';
            const nextAction = actions[nextKey] || actions['idle'];
            if (!nextAction || prevActionRef.current === nextAction) return;
            prevActionRef.current?.fadeOut(0.25);
            nextAction.reset().setLoop(THREE.LoopRepeat).fadeIn(0.25).play();
            prevActionRef.current = nextAction;
            prevKeyRef.current = nextKey;
            returnTimerRef.current = null;
          }, 1800);
        }
        return;
      }

      action.setLoop(isGesture ? THREE.LoopOnce : THREE.LoopRepeat, isGesture ? 1 : Infinity);
      action.clampWhenFinished = false;
      action.enabled = true;

      if (prevActionRef.current && prevActionRef.current !== action) {
        prevActionRef.current.fadeOut(0.25);
        action.reset().fadeIn(0.25).play();
      } else if (!prevActionRef.current) {
        action.reset().play();
      } else {
        action.reset().fadeIn(0.15).play();
      }

      prevActionRef.current = action;
      prevKeyRef.current = key;
      debugRef.current = {
        ...debugRef.current,
        currentState: state,
        currentAction: key,
        actionExists: true,
        actionIsRunning: action.isRunning(),
      };
      onDebugInfo?.(debugRef.current);

      if (isGesture) {
        returnTimerRef.current = window.setTimeout(() => {
          const nextKey = isSpeaking ? 'talking' : 'idle';
          const nextAction = actions[nextKey] || actions['idle'];
          if (!nextAction || prevActionRef.current === nextAction) return;
          prevActionRef.current?.fadeOut(0.25);
          nextAction.reset().setLoop(THREE.LoopRepeat).fadeIn(0.25).play();
            prevActionRef.current = nextAction;
            prevKeyRef.current = nextKey;
            debugRef.current = {
              ...debugRef.current,
              currentAction: nextKey,
              actionExists: true,
              actionIsRunning: nextAction.isRunning(),
            };
            onDebugInfo?.(debugRef.current);
            returnTimerRef.current = null;
          }, 1800);
      }
    } else {
      debugRef.current = {
        ...debugRef.current,
        currentState: state,
        currentAction: key,
        actionExists: false,
        actionIsRunning: false,
      };
      onDebugInfo?.(debugRef.current);
    }

    return () => {
      if (returnTimerRef.current) {
        window.clearTimeout(returnTimerRef.current);
        returnTimerRef.current = null;
      }
    };
  }, [animationName, animationNonce, isSpeaking, actions]);

  useFrame(({ clock }) => {
    const key = resolveAnimationKey(animationName, actions, isSpeaking);
    const actionExists = Boolean(actions[key] || actions.idle);
    const time = clock.getElapsedTime();
    const bones = bonesRef.current;
    const targets = morphTargetsRef.current;
    const commands = behaviorCommands || {};
    const expression = commands.expression || {};
    const fallbackMotion = commands.fallbackMotion || {};
    const intensity = commands.intensity ?? 0.5;

    const applyBase = (bone) => {
      const base = bone && baseRotationsRef.current.get(bone.uuid);
      if (bone && base) bone.rotation.copy(base);
    };

    if (!actionExists) {
      applyBase(bones.head);
      applyBase(bones.neck);
      applyBase(bones.rightArm);
      applyBase(bones.rightForeArm);
      applyBase(bones.rightHand);
      applyBase(bones.leftArm);
      applyBase(bones.leftForeArm);
      applyBase(bones.leftHand);
      applyBase(bones.spine);
    }

    const relaxArms = () => {
      if (bones.rightArm) {
        bones.rightArm.rotation.z -= 0.65;
        bones.rightArm.rotation.x -= 0.2;
      }
      if (bones.rightForeArm) bones.rightForeArm.rotation.z -= 0.25;
      if (bones.leftArm) {
        bones.leftArm.rotation.z += 0.65;
        bones.leftArm.rotation.x -= 0.2;
      }
      if (bones.leftForeArm) bones.leftForeArm.rotation.z += 0.25;
    };

    if (!actionExists) {
      relaxArms();
    }

    if (groupRef.current) {
      const base = baseGroupPositionRef.current;
      if (base) {
        groupRef.current.position.y = base.y + Math.sin(time * 1.8) * 0.012;
      }
      groupRef.current.rotation.y = Math.sin(time * 0.8) * 0.018;
      groupRef.current.rotation.x = Math.sin(time * 1.1) * 0.006;
    }

    const blink = blinkRef.current;
    if (time >= blink.nextBlinkAt) {
      blink.blinkUntil = time + 0.14;
      blink.nextBlinkAt = time + 3 + Math.random() * 3;
    }
    const blinkValue = time < blink.blinkUntil ? 1 : 0;
    setMorphTarget(targets.blinkLeft, blinkValue);
    setMorphTarget(targets.blinkRight, blinkValue);

    setMorphTarget(targets.smile, expression.smile || 0);
    const mouthValue = lipSyncEnabled && isSpeaking ? Math.min(1, lipSyncLevel * 2.6) : 0;
    const hasMouthMorph = setMorphTarget(targets.mouthOpen, mouthValue);

    if (fallbackMotion.thinking && bones.head) {
      bones.head.rotation.y += Math.sin(time * 1.8) * 0.12;
      bones.head.rotation.x += 0.08;
    }

    if (fallbackMotion.headTilt && bones.head) {
      bones.head.rotation.z += 0.18 + Math.sin(time * 2.5) * 0.05;
    }

    if (fallbackMotion.warning && bones.head) {
      bones.head.rotation.y += Math.sin(time * 5.5) * 0.12 * intensity;
    }

    if (key === 'wave' || key === 'greeting') {
      const wave = Math.sin(time * 10) * 0.45;
      if (bones.rightArm) {
        bones.rightArm.rotation.z -= 1.15;
        bones.rightArm.rotation.x += 0.35;
      }
      if (bones.rightForeArm) {
        bones.rightForeArm.rotation.z -= 0.45 + wave;
      }
      if (bones.rightHand) {
        bones.rightHand.rotation.z += wave;
      }
      if (bones.leftArm) bones.leftArm.rotation.z -= 0.25;
      if (bones.head) bones.head.rotation.z += Math.sin(time * 4) * 0.08;
      return;
    }

    if (key === 'nod') {
      const nod = Math.sin(time * 8) * 0.22;
      if (bones.head) bones.head.rotation.x += nod;
      if (bones.neck) bones.neck.rotation.x += nod * 0.5;
      return;
    }

    if (key === 'talking' || key === 'explaining' || key === 'pointing' || key === 'warning') {
      if (bones.head) {
        bones.head.rotation.x += Math.sin(time * 5.5) * 0.09;
        bones.head.rotation.y += Math.sin(time * 3.2) * 0.08;
        if (!hasMouthMorph && lipSyncEnabled) {
          bones.head.rotation.x += mouthValue * 0.11;
        }
      }
      if (bones.spine) bones.spine.rotation.y += Math.sin(time * 2.7) * 0.07;
      if (bones.rightArm) bones.rightArm.rotation.z += Math.sin(time * 3.5) * 0.12;
      if (bones.rightForeArm) bones.rightForeArm.rotation.z += Math.sin(time * 4.2) * 0.15;
      if (bones.leftArm) bones.leftArm.rotation.z -= Math.sin(time * 3.1) * 0.1;
      if (bones.leftForeArm) bones.leftForeArm.rotation.z -= Math.sin(time * 4.0) * 0.12;

      if (key === 'pointing' && bones.rightArm) {
        bones.rightArm.rotation.z -= 0.35 * intensity;
        if (bones.rightForeArm) bones.rightForeArm.rotation.z -= 0.25 * intensity;
      }
    }
  });

  return (
    <group ref={groupRef} scale={avatarConfig.scale} position={avatarConfig.position}>
      <primitive object={scene} />
    </group>
  );
}
