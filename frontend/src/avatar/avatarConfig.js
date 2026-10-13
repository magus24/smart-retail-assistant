export const AVATAR_LIST = [
  {
    id: "reze",
    name: "Reze",
    emoji: "Reze",
    modelPath: "/models/anime/reze/reze no animation.glb",
    scale: 0.78,
    position: [0, -0.86, 0],
    cameraPosition: [0, 0.86, 3.15],
    cameraTarget: [0, 0.56, 0],
    animations: {
      idle: "/models/anime/reze/idle.fbx",
      talking: "/models/anime/reze/Talking.fbx",
      thinking: "/models/anime/reze/idle.fbx",
      greeting: "/models/anime/reze/Waving.fbx",
      explaining: "/models/anime/reze/Talking.fbx",
      pointing: "/models/anime/reze/Talking.fbx",
      confused: "/models/anime/reze/nod.fbx",
      warning: "/models/anime/reze/nod.fbx",
      wave: "/models/anime/reze/Waving.fbx",
      nod: "/models/anime/reze/nod.fbx",
      explain: "/models/anime/reze/Talking.fbx",
      smile: "/models/anime/reze/idle.fbx",
      point: "/models/anime/reze/Talking.fbx",
    },
    morphTargets: {
      mouthOpen: ["mouthOpen", "jawOpen", "viseme_aa", "mouth_open"],
      smile: ["smile", "mouthSmile", "happy"],
      blinkLeft: ["blinkLeft", "eyeBlinkLeft"],
      blinkRight: ["blinkRight", "eyeBlinkRight"],
    },
  },
];

export const DEFAULT_AVATAR_ID = "reze";
export const LS_KEY = "selected_avatar_id";

export const AI_TO_AVATAR_ANIM = {
  idle: "idle",
  wave: "wave",
  nod: "nod",
  explain: "explain",
  smile: "smile",
  point: "point",
  thinking: "thinking",
  greeting: "greeting",
  explaining: "explaining",
  pointing: "pointing",
  confused: "confused",
  warning: "warning",
};

// Add new avatars here. Put GLB/GLTF and optional animation files under
// frontend/public/models/... so Vite can serve them from /models/....
