import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Landing from './Landing.jsx'

const path = window.location.pathname

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {path.startsWith('/app') ? <App /> : <Landing />}
  </React.StrictMode>
)
