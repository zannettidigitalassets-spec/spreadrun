import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Landing from './Landing.jsx'
import Privacy from './Privacy.jsx'
import Terms from './Terms.jsx'
import Guides from './Guides.jsx'
import DscrGuide from './DscrGuide.jsx'

const path = window.location.pathname

const getPage = () => {
  if (path.startsWith('/app')) return <App />;
  if (path.startsWith('/privacy')) return <Privacy />;
  if (path.startsWith('/terms')) return <Terms />;
  if (path === '/guides' || path === '/guides/') return <Guides />;
  if (path.startsWith('/guides/dscr-loan-calculator')) return <DscrGuide />;
  return <Landing />;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {getPage()}
  </React.StrictMode>
)
