import { TIERS } from '../catalog.js';

// One badge pair for every API card and product page: who built it, and whether it is live or beta.
export default function Badges({ api, style }) {
  return (
    <div className="badges" style={style}>
      <span className="badge tier">{TIERS[api.tier].label}</span>
      {api.status === 'beta' ? <span className="badge beta">Beta</span> : <span className="badge live">Live</span>}
    </div>
  );
}
