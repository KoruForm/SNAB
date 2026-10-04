import Image from "next/image";
import Link from "next/link";
import { ComingSoon } from "../components/coming-soon";
import { comingSoonHome } from "../lib/launch";

const steps = [
  { number: "01", title: "Have a little look.", detail: "Browse sales, search for something you love and save the ones that catch your eye." },
  { number: "02", title: "Know before you go.", detail: "Check the photos, sale times and location details. A little planning leaves more time for rummaging." },
  { number: "03", title: "Find your thing.", detail: "Head along when the sale is open. That next great find might be waiting in someone’s garage." },
];

function Arrow({ plus = false }: { plus?: boolean }) {
  return <svg className="landing-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{plus ? <path d="M12 4v16M4 12h16" /> : <path d="M4 12h15m-6-6 6 6-6 6" />}</svg>;
}

export default function Home() {
  if (comingSoonHome) return <ComingSoon />;
  return (
    <div className="landing-site">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="landing-header landing-container">
        <Link className="landing-brand" href="/" aria-label="SNAB home"><Image src="/brand/snab-highlight-final-b.svg" alt="SNAB" width={140} height={69} priority /></Link>
        <nav className="landing-nav" aria-label="Main navigation">
          <a className="landing-nav-how" href="#how-it-works">How it works</a>
          <Link className="landing-signin" href="/account">Sign in <Arrow /></Link>
        </nav>
      </header>
      <main id="main-content">
        <section className="landing-hero landing-container" aria-labelledby="landing-title">
          <div className="landing-copy">
            <p className="landing-eyebrow"><Image className="landing-pin" src="/brand/snab-pin.png" alt="" width={17} height={24} /> Garage sales without the hassle.</p>
            <h1 id="landing-title">Garage sales.<br />Great finds.<br /><span className="landing-underline">That’s SNAB.</span></h1>
            <p className="landing-intro">Find garage sales, or give your<br className="landing-intro-break" /> good stuff a new home.</p>
            <div className="landing-actions">
              <Link className="button button-primary" href="/map">Find a sale <Arrow /></Link>
              <Link className="button button-quiet" href="/sell">Start a sale <Arrow plus /></Link>
            </div>
          </div>
          <figure className="landing-hero-figure">
            <div className="landing-hero-image"><Image src="/editorial/good-finds.png" alt="A secondhand wooden chair, desk lamp, records and a leafy plant in the sunshine" fill sizes="(max-width: 700px) 100vw, (max-width: 1200px) 50vw, 580px" priority /></div>
            <figcaption><span>Someone’s clear-out.<br /><strong>Your next great find.</strong></span><a href="#how-it-works" aria-label="See how SNAB works"><Arrow /></a></figcaption>
          </figure>
        </section>
        <section className="landing-how landing-container" id="how-it-works" aria-labelledby="how-heading">
          <div className="landing-section-intro">
            <p className="landing-eyebrow">A good day starts with a browse</p>
            <h2 id="how-heading">Less scrolling.<br /><span className="landing-underline">More rummaging.</span></h2>
            <p>From a chair with a bit of history to the book you didn’t know you needed. See what’s out there.</p>
          </div>
          <ol className="landing-steps">{steps.map(step => <li key={step.number}><span className="landing-step-number" aria-hidden="true">{step.number}</span><div><h3>{step.title}</h3><p>{step.detail}</p></div></li>)}</ol>
        </section>
        <section className="landing-seller" aria-labelledby="seller-heading">
          <div className="landing-seller-inner landing-container">
            <div className="landing-seller-copy">
              <p className="landing-eyebrow">Got a garage full of good stuff?</p>
              <h2 id="seller-heading">Make room.<br />Make someone’s day.</h2>
              <p>The spare chair. The outgrown toys. That box you haven’t opened in years. Give them a chance at a new home.</p>
              <Link className="button button-ink" href="/sell">Start your sale <Arrow plus /></Link>
            </div>
            <div className="landing-seller-details">
              <p className="landing-seller-kicker">Your sale, in a few simple steps</p>
              <ol>
                <li><span aria-hidden="true">1</span><div><h3>Pick the when and where.</h3><p>Add your times and choose when to reveal your address.</p></div></li>
                <li><span aria-hidden="true">2</span><div><h3>Show off the good stuff.</h3><p>Add a few photos and the highlights worth a look.</p></div></li>
                <li><span aria-hidden="true">3</span><div><h3>Give it a once-over.</h3><p>Preview your listing and check the details before you publish.</p></div></li>
              </ol>
              <p className="landing-draft-note">Just having a look? You can try creating a demo sale on this device.</p>
            </div>
          </div>
        </section>
        <section className="landing-last-word landing-container" aria-labelledby="last-word-heading">
          <p className="landing-eyebrow">A little curiosity goes a long way</p>
          <h2 id="last-word-heading">What will you <span className="landing-underline">SNAB?</span></h2>
          <Link className="button button-primary" href="/map">Find a sale <Arrow /></Link>
        </section>
      </main>
      <footer className="landing-footer landing-container">
        <div className="landing-footer-main"><Link className="landing-brand" href="/" aria-label="SNAB home"><Image src="/brand/snab-highlight-final-b.svg" alt="SNAB" width={112} height={55} /></Link><span>Good stuff finds new people.</span><a href="#main-content">Back to top ↑</a></div>
        <p className="landing-build-note">SNAB is growing. Demo sales are labelled in the app; maps and distances are illustrative.</p>
      </footer>
    </div>
  );
}
