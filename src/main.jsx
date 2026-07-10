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
import ClevelandGuide from './ClevelandGuide.jsx'
import MyDeals from './MyDeals.jsx'
import Contact from './Contact.jsx'
import DscrCalculator from './DscrCalculator.jsx'
import FlipCalculator from './FlipCalculator.jsx'
import RentalCalculator from './RentalCalculator.jsx'
import NotFound from './NotFound.jsx'

const path = window.location.pathname

// Every valid route in the app — used to detect unmatched paths and show a proper 404
// instead of silently falling through to the homepage.
const KNOWN_PATHS = [
  '/', '/app', '/app/my-deals', '/privacy', '/terms', '/contact',
  '/dscr-calculator', '/flip-calculator', '/rental-calculator',
  '/guides', '/guides/dscr-loan-calculator', '/guides/rental-cash-flow-calculator',
  '/guides/70-percent-rule-house-flipping', '/guides/good-cap-rate-rental-property',
  '/guides/how-to-analyze-rental-property',
  '/guides/cleveland-rental-property-investing',
];

const isKnownPath = () => {
  // Strip trailing slash (except for root) so "/app/" matches "/app"
  const normalized = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  return KNOWN_PATHS.some(known => normalized === known || normalized.startsWith(known + '/'));
};

const getPage = () => {
  if (!isKnownPath()) return <NotFound />;
  if (path.startsWith('/app/my-deals')) return <MyDeals />;
  if (path.startsWith('/app')) return <App />;
  if (path.startsWith('/privacy')) return <Privacy />;
  if (path.startsWith('/terms')) return <Terms />;
  if (path.startsWith('/contact')) return <Contact />;
  if (path.startsWith('/dscr-calculator')) return <DscrCalculator />;
  if (path.startsWith('/flip-calculator')) return <FlipCalculator />;
  if (path.startsWith('/rental-calculator')) return <RentalCalculator />;
  if (path === '/guides' || path === '/guides/') return <Guides />;
  if (path.startsWith('/guides/dscr-loan-calculator')) return <DscrGuide />;
  if (path.startsWith('/guides/rental-cash-flow-calculator')) return <CashFlowGuide />;
  if (path.startsWith('/guides/70-percent-rule-house-flipping')) return <SeventyPercentGuide />;
  if (path.startsWith('/guides/good-cap-rate-rental-property')) return <CapRateGuide />;
  if (path.startsWith('/guides/how-to-analyze-rental-property')) return <HowToAnalyzeGuide />;
  if (path.startsWith('/guides/cleveland-rental-property-investing')) return <ClevelandGuide />;
  return <Landing />;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {getPage()}
  </React.StrictMode>
)
