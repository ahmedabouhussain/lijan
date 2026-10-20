import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// One theme source for the whole platform: the operating system's preference, unless the
// person has chosen a mode explicitly. Both modes are declared as tokens in index.css —
// no page, component or export ever decides a colour for itself.
try {
  const stored = localStorage.getItem('lijan-theme')
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  if (stored === 'dark' || (!stored && prefersDark)) {
    document.documentElement.classList.add('dark')
  }
} catch {
  // A browser that refuses storage simply stays on the light field.
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)