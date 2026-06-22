import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './styles/globals.css'
import initUI from './utils/uiEnhancements'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '10px',
            fontSize: '14px',
          },
        }}
      />
      {/* initialize small UI enhancements (keyboard shortcuts, notifications) */}
      {typeof window !== 'undefined' && initUI()}
    </BrowserRouter>
  </React.StrictMode>
)
