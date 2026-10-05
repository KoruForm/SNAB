import Image from "next/image";
import Link from "next/link";
import { FindPreview } from "./find-preview";
import { SellSteps } from "./sell-steps";
import { TreasurePromo } from "./treasure-list";
import { appHome } from "../lib/launch";

function Arrow({ plus = false }: { plus?: boolean }) {
  return <svg className="landing-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{plus ? <path d="M12 4v16M4 12h16" /> : <path d="M4 12h15m-6-6 6 6-6 6" />}</svg>;
}

export function LandingPage() {
  return (
    <div className="landing-site">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="landing-header landing-container">
        <Link className="landing-brand" href={appHome} aria-label="SNAB home"><Image src="/brand/snab-highlight-final-b.svg" alt="SNAB" width={140} height={69} priority /></Link>
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
          <FindPreview />
        </section>
        <section className="landing-treasure landing-container" aria-labelledby="treasure-heading">
          <div className="landing-section-intro">
            <p className="landing-eyebrow"><Image className="landing-pin" src="/brand/snab-pin.png" alt="" width={17} height={24} /> Hunting for something?</p>
            <h2 id="treasure-heading">Put it on your<br /><span className="landing-underline">treasure list.</span></h2>
            <p>Add the things you’re after. When a sale has one, SNAB flags it as you browse, so the good stuff finds you.</p>
            <Link className="button button-quiet" href="/saved">See your list <Arrow /></Link>
          </div>
          <TreasurePromo />
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
              <SellSteps />
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
        <div className="landing-footer-main"><Link className="landing-brand" href={appHome} aria-label="SNAB home"><Image src="/brand/snab-highlight-final-b.svg" alt="SNAB" width={112} height={55} /></Link><span>Good stuff finds new people.</span><a href="#main-content">Back to top ↑</a></div>
        <p className="landing-build-note">SNAB is growing. Demo sales are labelled in the app; maps and distances are illustrative.</p>
      </footer>
    </div>
  );
}
