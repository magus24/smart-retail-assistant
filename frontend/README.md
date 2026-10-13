# Smart Retail Assistant Frontend

This is the kiosk UI frontend for the Smart Retail Assistant, built with modern React + Vite. It provides a simple, clean interface without any unneeded complexity.

## Setup Instructions

1. Ensure Node.js is installed.
2. In this `frontend` directory, install the required dependencies:
```bash
npm install
```

3. **Ensure Backend is running and has CORS enabled!**
The frontend communicates via Axios with `http://127.0.0.1:8000/`. Make sure your backend API is running.

4. Start the frontend development server:
```bash
npm run dev
```

5. The terminal will display the URL (usually `http://localhost:5173`). Open it in your browser.

## Features
- **Clean UI**: A structured minimal layout adapted for Kiosk.
- **Quick Buttons**: 1-click interactions for common intents.
- **Responsive Products**: Grid elements projecting metadata securely onto product cards.

## Adding a New 3D Avatar

1. Put the model and animations under `frontend/public/models/<avatar-id>/`.
2. Add a new entry to `frontend/src/avatar/avatarConfig.js`.
3. Set `modelPath` to the GLB/GLTF file, for example `/models/default/avatar.glb`.
4. Add animation paths for any available states:
   - `idle`
   - `talking`
   - `thinking`
   - `greeting`
   - `explaining`
   - `pointing`
   - `confused`
   - `warning`
5. If some animations are missing, point them to `idle` or `talking`; the avatar system falls back safely.
6. If your model has face morph targets, add their names in `morphTargets`:
   - `mouthOpen`: lip-sync mouth opening
   - `smile`: happy expression
   - `blinkLeft` and `blinkRight`: idle blinking

The active avatar is selected from `avatarConfig.js` and saved in `localStorage`.
