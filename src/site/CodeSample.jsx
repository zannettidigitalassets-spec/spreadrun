import { useState } from 'react';

export default function CodeSample({ samples }) {
  const names = Object.keys(samples);
  const [tab, setTab] = useState(names[0]);
  return (
    <div>
      <div className="code-tabs" role="tablist">
        {names.map((n) => (
          <button key={n} role="tab" aria-selected={tab === n} onClick={() => setTab(n)} type="button">{n}</button>
        ))}
      </div>
      <pre className="code" tabIndex={0}><code>{samples[tab]}</code></pre>
    </div>
  );
}

export function Json({ value }) {
  return <pre className="code" tabIndex={0}><code>{JSON.stringify(value, null, 2)}</code></pre>;
}
