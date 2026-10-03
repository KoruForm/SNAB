import Link from "next/link";

const steps = [
  { number: "01", title: "Show us the sale", detail: "Take a few wide photos of tables, shelves and boxes." },
  { number: "02", title: "SNAB finds the good bits", detail: "AI groups what it spots so you do less typing." },
  { number: "03", title: "Hunters know where to go", detail: "People search nearby sales for the things they’re after." },
];

export default function Home() {
  return (
    <main className="site-shell">
      <nav className="topbar" aria-label="Main navigation">
        <Link className="wordmark" href="/" aria-label="SNAB home">SNAB<span className="wordmark-dot">.</span></Link>
        <span className="topbar-note">Good stuff finds new people.</span>
        <Link className="nav-link" href="/scan">Try the test bench <span aria-hidden="true">↗</span></Link>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span className="sticker-dot" /> A new way to find a good find</p>
          <h1>There’s good stuff<br />hiding <span className="highlight">everywhere.</span></h1>
          <p className="hero-lede">Garage sales are full of things someone’s been looking for. SNAB helps the right people find them.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/scan">Try the photo test <span aria-hidden="true">→</span></Link>
            <a className="button button-quiet" href="#how-it-works">How SNAB works</a>
          </div>
          <p className="small-note">A little less clutter for one person. A very good find for another.</p>
        </div>
        <div className="hero-art" aria-label="SNAB is being prepared">
          <div className="paper-card card-back"><span className="handwritten">make room</span></div>
          <div className="paper-card card-front">
            <span className="price-sticker">WORTH<br />A SNAB</span>
            <div className="object-shape" aria-hidden="true"><span /></div>
            <div className="card-caption"><span className="caption-label">FOUND NEARBY</span><strong>Something good.</strong><span className="caption-meta">The next great find could be close.</span></div>
          </div>
          <span className="orbit-note">GOOD STUFF<br />FINDS NEW PEOPLE</span>
          <span className="tiny-spark" aria-hidden="true">✳</span>
        </div>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="section-heading">
          <p className="eyebrow">A simple little loop</p>
          <h2>From “I’ve got stuff”<br />to “I found it.”</h2>
        </div>
        <div className="step-list">
          {steps.map((step) => (
            <article className="step-card" key={step.number}>
              <span className="step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="footer">
        <Link className="wordmark wordmark-small" href="/">SNAB<span className="wordmark-dot">.</span></Link>
        <span>Not unwanted. Unfound.</span>
        <span className="footer-status"><span className="status-light" /> Early build</span>
      </footer>
    </main>
  );
}
