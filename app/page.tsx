import Image from "next/image";
import Link from "next/link";

const categories = ["Furniture", "Tools", "Books", "Electronics", "Clothing", "Kitchen", "Garden", "Toys", "Free"];
const steps = [
  { number: "01", title: "Show us your stuff", detail: "A few wide photos of your tables, shelves and boxes. You don’t need to photograph every item." },
  { number: "02", title: "Check the good bits", detail: "The planned AI scan will suggest categories and highlights for you to review and correct." },
  { number: "03", title: "Help it get found", detail: "Nearby search and sale publishing are next. Right now, you can try the private photo preview." },
];

export default function Home() {
  return (
    <main className="site-shell">
      <nav className="topbar" aria-label="Main navigation">
        <Link className="brand-link" href="/" aria-label="SNAB home"><Image src="/brand/snab-highlight-final-b.svg" alt="SNAB" width={140} height={69} priority /></Link>
        <span className="topbar-note">Good stuff finds new people.</span>
        <Link className="nav-link" href="/scan">Try the preview <span aria-hidden="true">↗</span></Link>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span className="sticker-dot" /> Garage Sales Made Easy</p>
          <h1>You’ve got it.<br />Someone wants<br />to <span className="highlight">Snab it.</span></h1>
          <p className="hero-lede">Less clutter. More good finds. We’re building a simpler way to turn your sale photos into things people can find nearby.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/scan">Try the photo preview <span aria-hidden="true">→</span></Link>
            <a className="button button-quiet" href="#how-it-works">How it works</a>
          </div>
          <p className="small-note">Early build · private photo preview · AI coming next</p>
        </div>
        <div className="hero-art" aria-label="SNAB’s approved brand illustrations: furniture, tools, books and a bargain campaign">
          <div className="art-sheet">
            <div className="art-sheet-heading"><span>GOOD STUFF</span><span>SECOND CHANCES</span></div>
            <div className="find-illustrations">
              <Image className="find-chair" src="/brand/categories/furniture.svg" alt="Armchair" width={170} height={170} />
              <Image className="find-tools" src="/brand/categories/tools.svg" alt="Hammer" width={95} height={95} />
              <Image className="find-books" src="/brand/categories/books.svg" alt="Books" width={105} height={105} />
              <Image className="find-toy" src="/brand/categories/toys.svg" alt="Teddy bear" width={90} height={90} />
            </div>
            <p>Not unwanted.<br /><strong>Unfound.</strong></p>
          </div>
          <Image className="campaign-sticker" src="/brand/snag-correction-campaign.svg" alt="Snag a bargain, with the G corrected to a B: Snab a bargain." width={225} height={120} />
          <Image className="art-arrow" src="/brand/black-arrow.svg" alt="" width={95} height={60} />
          <span className="handwritten">a little room<br />for something new</span>
        </div>
      </section>

      <section className="category-section" aria-labelledby="categories-heading">
        <div className="category-heading"><h2 id="categories-heading">All sorts of good stuff.</h2><span>What’s hiding at your sale?</span></div>
        <div className="category-list">{categories.map(name => <div className="category-item" key={name}><Image src={`/brand/categories/${name.toLowerCase()}.svg`} alt="" width={55} height={55} /><span>{name}</span></div>)}</div>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="section-heading"><p className="eyebrow">The plan is simple</p><h2>Less typing.<br /><span className="highlight">More finding.</span></h2><p>Start with photos. Let the good stuff do the talking.</p></div>
        <div className="step-list">{steps.map(step => <article className="step-card" key={step.number}><span className="step-number">{step.number}</span><h3>{step.title}</h3><p>{step.detail}</p></article>)}</div>
      </section>

      <section className="preview-callout"><div><p className="eyebrow">Try the first little step</p><h2>Make room for a Snab.</h2><p>Choose a few photos and see them together. They stay in your browser.</p></div><Link className="button button-primary" href="/scan">Open the photo preview <span aria-hidden="true">↗</span></Link></section>
      <footer className="footer"><Image src="/brand/snab-wordmark-underline.svg" alt="SNAB" width={100} height={50} /><span>Good stuff finds new people.</span><span className="footer-status"><span className="status-light" /> Early build</span></footer>
    </main>
  );
}
