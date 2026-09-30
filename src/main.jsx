import React from 'react'
import ReactDOM from 'react-dom/client'
import SecondRingLanding from './SecondRingLanding.jsx'
import Privacy from './Privacy.jsx'
import Terms from './Terms.jsx'
import Contact from './Contact.jsx'
import NotFound from './NotFound.jsx'

// SecondRing retool (2026-09-30): the real-estate analyzer, calculators, guides and My Deals
// routes are hidden, not deleted. Their components still live in src/ as dormant code and
// will be cleaned up post-launch. To re-expose one, import it and add its path below.
// The Oct 1 guide is a static page (public/guides/...) served by Vercel before this SPA loads.

const path = window.location.pathname

const normalize = (p) => (p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p)

const getPage = () => {
  const p = normalize(path)
  if (p === '/') return <SecondRingLanding />
  if (p === '/privacy') return <Privacy />
  if (p === '/terms') return <Terms />
  if (p === '/contact') return <Contact />
  return <NotFound />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {getPage()}
  </React.StrictMode>
)
