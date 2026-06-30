import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// StrictMode intentionally omitted: the game runs real timers / rAF loops and a
// live feed subscription, and StrictMode's double-invoke in dev makes those
// harder to reason about. Cleanups are still written correctly.
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
