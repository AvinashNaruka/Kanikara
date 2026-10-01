const guides = [
  ['Gold Jewellery', 'Store separately in a soft-lined box to avoid scratches. Remove before swimming, showering, or applying perfume/lotion. Wipe with a soft, lint-free cloth after each wear. Get a professional polish once a year to restore shine.'],
  ['Silver Jewellery', 'Silver tarnishes with air exposure — keep it in an airtight pouch when not worn. Clean gently with a silver polishing cloth. Avoid chlorine (pools) and household chemicals.'],
  ['Diamond & Gemstone Pieces', 'Clean with a soft brush and mild soap solution, then dry thoroughly. Have prongs checked periodically by a jeweller to make sure stones stay secure. Store each piece separately — stones can scratch softer metals and each other.'],
  ['General Tips', 'Put jewellery on last when dressing and take it off first when undressing. Avoid direct sunlight for long storage periods. When in doubt, bring it in — we\'re happy to inspect and clean any Kanikara piece for free.'],
];

export default function JewelleryCarePage() {
  return (
    <>
      <div className="page-head">
        <span className="eyebrow" style={{ color: 'var(--gold-soft)' }}>Keep It Beautiful</span>
        <h1 className="h-section" style={{ marginTop: 8 }}>Jewellery Care Guide</h1>
      </div>
      <div className="wrap" style={{ padding: '48px var(--pad) 90px', maxWidth: 720 }}>
        {guides.map(([title, body]) => (
          <article className="dash-card" key={title} style={{ marginBottom: 18 }}>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 20 }}>{title}</h3>
            <p className="lede-light" style={{ marginTop: 8, maxWidth: 'none' }}>{body}</p>
          </article>
        ))}
      </div>
    </>
  );
}
