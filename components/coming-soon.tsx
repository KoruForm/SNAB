import Image from "next/image";
import { InterestForm } from "./interest-form";

const coming = [
  { number: "01", title: "Find sales near you.", detail: "Every garage sale in town on one map, with photos so you know what’s worth the trip." },
  { number: "02", title: "Hunt for your thing.", detail: "Looking for a drill, a dresser or a box of records? Search what’s out there before you go." },
  { number: "03", title: "Sell in a few snaps.", detail: "Take a few photos, pick your times and your sale is ready to share. Signs and posts included." },
];

export function ComingSoon() {
  return (
    <div className="landing-site soon-site">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="landing-header landing-container">
        <span className="landing-brand"><Image src="/brand/snab-highlight-final-b.svg" alt="SNAB" width={140} height={69} priority /></span>
        <p className="soon-badge">Coming soon</p>
      </header>
      <main id="main-content">
        <section className="landing-hero soon-hero landing-container" aria-labelledby="landing-title">
          <div className="landing-copy">
            <p className="landing-eyebrow"><span className="landing-spark" aria-hidden="true">✳</span> Starting in Hamilton</p>
            <h1 id="landing-title">Garage sales.<br />Great finds.<br /><span className="landing-underline">Coming soon.</span></h1>
            <p className="landing-intro">A new way to find garage sales, or give your good stuff a new home.</p>
            <InterestForm />
          </div>
          <figure className="landing-hero-figure">
            <div className="landing-hero-image"><Image src="/editorial/good-finds.png" alt="A secondhand wooden chair, desk lamp, records and a leafy plant in the sunshine" fill sizes="(max-width: 700px) 100vw, (max-width: 1200px) 50vw, 580px" priority /></div>
            <figcaption><span>Someone’s clear-out.<br /><strong>Your next great find.</strong></span></figcaption>
          </figure>
        </section>
        <section className="landing-seller" aria-labelledby="coming-heading">
          <div className="landing-seller-inner landing-container">
            <div className="landing-seller-copy">
              <p className="landing-eyebrow">What’s on the way</p>
              <h2 id="coming-heading">Less scrolling.<br />More rummaging.</h2>
              <p>SNAB brings your neighbourhood’s garage sales together, so a good Saturday starts with a quick look.</p>
            </div>
            <div className="landing-seller-details">
              <ol>{coming.map(item => <li key={item.number}><span aria-hidden="true">{Number(item.number)}</span><div><h3>{item.title}</h3><p>{item.detail}</p></div></li>)}</ol>
            </div>
          </div>
        </section>
        <section className="landing-last-word landing-container" aria-labelledby="last-word-heading">
          <p className="landing-eyebrow">Got a garage full of good stuff?</p>
          <h2 id="last-word-heading">Hold that <span className="landing-underline">clear-out.</span></h2>
          <p className="soon-last-note">Sign up above and you’ll be among the first to list a sale when we open.</p>
          <a className="button button-primary" href="#join">Join the list <svg className="landing-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20V5m-6 6 6-6 6 6" /></svg></a>
        </section>
      </main>
      <footer className="landing-footer landing-container">
        <div className="landing-footer-main"><span className="landing-brand"><Image src="/brand/snab-highlight-final-b.svg" alt="SNAB" width={112} height={55} /></span><span>Good stuff finds new people.</span></div>
      </footer>
    </div>
  );
}
