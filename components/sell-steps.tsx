import Image from "next/image";

function WhenWhere() {
  return (
    <div className="sell-step-visual sell-step-when" aria-hidden="true">
      <svg viewBox="0 0 80 80" fill="none" stroke="#171815" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="14" width="52" height="54" rx="5" fill="#fffef9" transform="rotate(-4 35 41)" />
        <g transform="rotate(-4 35 41)">
          <path d="M9 30h52" />
          <path d="M9 19a5 5 0 0 1 5-5h42a5 5 0 0 1 5 5v11H9z" fill="#b94c35" stroke="none" />
          <path d="M9 30h52M21 9v10M49 9v10" />
          <text x="35" y="54" textAnchor="middle" fontFamily="'Bowlby One',Impact,sans-serif" fontSize="17" fill="#171815" stroke="none">SAT</text>
          <path d="M22 60h26" stroke="#ffd64d" strokeWidth="4" />
        </g>
      </svg>
      <Image className="sell-step-pin" src="/brand/snab-pin.png" alt="" width={26} height={37} />
    </div>
  );
}

function GoodStuff() {
  return (
    <div className="sell-step-visual sell-step-photos" aria-hidden="true">
      <span className="sell-step-polaroid sell-step-polaroid-back"><span><Image src="/photos/04-photo-upload-guide.webp" alt="" fill sizes="64px" /></span></span>
      <span className="sell-step-polaroid sell-step-polaroid-front"><span><Image src="/photos/02-start-sale.webp" alt="" fill sizes="64px" /></span></span>
    </div>
  );
}

function OnceOver() {
  return (
    <div className="sell-step-visual sell-step-check" aria-hidden="true">
      <svg viewBox="0 0 80 80" fill="none" stroke="#171815" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="18" y="6" width="40" height="68" rx="7" fill="#fffef9" transform="rotate(3 38 40)" />
        <g transform="rotate(3 38 40)">
          <rect x="23" y="14" width="30" height="20" rx="2" fill="#eee8da" />
          <path d="M23 34l9-9 6 6 4-4 11 7" strokeWidth="1.8" />
          <path d="M24 42h24" stroke="#ffd64d" strokeWidth="5" />
          <path d="M24 42h18" />
          <path d="M24 50h26M24 57h20" strokeWidth="1.8" />
          <path d="M33 67h10" />
        </g>
        <circle cx="60" cy="58" r="12" fill="#b94c35" stroke="#171815" />
        <path d="M54.5 58.5l4 4 7.5-8.5" stroke="#fffef9" strokeWidth="2.6" />
      </svg>
    </div>
  );
}

const sellSteps = [
  { title: "Pick the when and where.", detail: "Add your times and choose when to reveal your address.", Visual: WhenWhere },
  { title: "Show off the good stuff.", detail: "Add a few photos and the highlights worth a look.", Visual: GoodStuff },
  { title: "Give it a once-over.", detail: "Preview your listing and check the details before you publish.", Visual: OnceOver },
];

export function SellSteps() {
  return (
    <ol className="sell-steps">
      {sellSteps.map(({ title, detail, Visual }, index) => (
        <li key={title}>
          <Visual />
          <div className="sell-step-copy">
            <span className="sell-step-tape">Step {index + 1}</span>
            <h3>{title}</h3>
            <p>{detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
