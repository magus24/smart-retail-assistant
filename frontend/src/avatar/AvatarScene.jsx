/**
 * AvatarScene.jsx
 * Three.js Canvas scene: lighting, environment, shadows, camera, suspense.
 */
import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Html } from '@react-three/drei';
import { AvatarModel } from './AvatarModel';
import { useAvatarManager } from './AvatarManager';

function LoadingFallback() {
  return (
    <Html center>
      <div className="avatar-loading">
        <div className="avatar-loading-spinner" />
        <p>Yuklanmoqda...</p>
      </div>
    </Html>
  );
}

export function AvatarScene({
  animation,
  animationNonce,
  emotion,
  isSpeaking,
  behaviorCommands,
  lipSyncLevel,
  lipSyncEnabled,
}) {
  const { currentAvatar } = useAvatarManager();
  const [debugInfo, setDebugInfo] = useState({});

  return (
    <Canvas
      camera={{
        position: currentAvatar.cameraPosition,
        fov: 42,
      }}
      shadows
      gl={{ antialias: true }}
      dpr={[1, 1.5]}
      style={{ background: 'transparent' }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[3, 5, 3]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-2, 3, 2]} intensity={0.5} color="#c4b5fd" />
      <pointLight position={[2, 1, -1]} intensity={0.3} color="#bae6fd" />

      {/* Environment for reflections */}
      <Environment preset="city" />

      {/* Avatar model with Suspense */}
      <Suspense fallback={<LoadingFallback />}>
        <AvatarModel
          avatarConfig={currentAvatar}
          animationName={animation}
          animationNonce={animationNonce}
          isSpeaking={isSpeaking}
          behaviorCommands={behaviorCommands}
          lipSyncLevel={lipSyncLevel}
          lipSyncEnabled={lipSyncEnabled}
          onDebugInfo={setDebugInfo}
        />
      </Suspense>

      {import.meta.env.DEV && (
        <Html position={[-1.45, 1.65, 0]} transform={false}>
          <div className="avatar-debug-overlay">
            <div>model loaded: {debugInfo.hasScene ? 'yes' : 'no'}</div>
            <div>animations: {debugInfo.clipCount ?? 0}</div>
            <div>state: {debugInfo.currentState || 'idle'}</div>
            <div>action: {debugInfo.currentAction || '-'}</div>
            <div>action running: {debugInfo.actionIsRunning ? 'yes' : 'no'}</div>
            <div>morphs: {debugInfo.morphTargets?.length ?? 0}</div>
            <div>lip sync: {lipSyncEnabled ? 'on' : 'off'}</div>
            <div>audio playing: {isSpeaking ? 'yes' : 'no'}</div>
          </div>
        </Html>
      )}

      {/* Ground shadow */}
      <ContactShadows
        position={[0, currentAvatar.position[1] - 0.01, 0]}
        opacity={0.4}
        scale={5}
        blur={2.5}
        far={3}
      />

      {/* Camera controls */}
      <OrbitControls
        target={currentAvatar.cameraTarget}
        enableZoom={false}
        enablePan={false}
        maxPolarAngle={Math.PI / 1.8}
        minPolarAngle={Math.PI / 2.8}
        autoRotate={false}
      />
    </Canvas>
  );
}
