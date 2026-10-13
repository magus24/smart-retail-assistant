import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AvatarManagerProvider } from './avatar/AvatarManager'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AvatarManagerProvider>
      <App />
    </AvatarManagerProvider>
  </React.StrictMode>,
)
