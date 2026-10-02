// FAQ items are also emitted as FAQPage JSON-LD by the route table, from the same array.
export default function Faq({ items, id = 'faq' }) {
  return (
    <div className="faq" id={id}>
      {items.map(([q, a]) => (
        <details key={q}>
          <summary>{q}</summary>
          {(Array.isArray(a) ? a : [a]).map((p, i) => <p key={i}>{p}</p>)}
        </details>
      ))}
    </div>
  );
}
