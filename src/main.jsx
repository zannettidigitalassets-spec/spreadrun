import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Landing from './Landing.jsx'
import Privacy from './Privacy.jsx'
import Terms from './Terms.jsx'
import Guides from './Guides.jsx'
import DscrGuide from './DscrGuide.jsx'
import CashFlowGuide from './CashFlowGuide.jsx'
import SeventyPercentGuide from './SeventyPercentGuide.jsx'
import CapRateGuide from './CapRateGuide.jsx'
import HowToAnalyzeGuide from './HowToAnalyzeGuide.jsx'
import MyDeals from './MyDeals.jsx'
import Contact from './Contact.jsx'

const path = window.location.pathname

const getPage = () => {
  if (path.startsWith('/app/my-deals')) return <MyDeals />;
  if (path.startsWith('/app')) return <App />;
  if (path.startsWith('/privacy')) return <Privacy />;
  if (path.startsWith('/terms')) return <Terms />;
  if (path.startsWith('/contact')) return <Contact />;
  if (path === '/guides' || path === '/guides/') return <Guides />;
  if (path.startsWith('/guides/dscr-loan-calculator')) return <DscrGuide />;
  if (path.startsWith('/guides/rental-cash-flow-calculator')) return <CashFlowGuide />;
  if (path.startsWith('/guides/70-percent-rule-house-flipping')) return <SeventyPercentGuide />;
  if (path.startsWith('/guides/good-cap-rate-rental-property')) return <CapRateGuide />;
  if (path.startsWith('/guides/how-to-analyze-rental-property')) return <HowToAnalyzeGuide />;
  return <Landing />;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {getPage()}
  </React.StrictMode>
)
