/* eslint-disable @next/next/no-img-element */
// Illustrative preview of the Find tab for the landing page. Fictional sales, not live data.
const pins = [
  { src: "/brand/map-pins/selected.svg", x: 47, y: 46, w: 34, label: "Garage Clearout" },
  { src: "/brand/map-pins/tools.svg", x: 20, y: 64, w: 26 },
  { src: "/brand/map-pins/books.svg", x: 77, y: 66, w: 26 },
  { src: "/brand/map-pins/furniture.svg", x: 66, y: 32, w: 24 },
  { src: "/brand/map-pins/closed.svg", x: 88, y: 36, w: 22 },
];

const sales = [
  { icon: "furniture", title: "Garage Clearout", meta: "Hamilton East · 3.4 km", when: "Open now", open: true, finds: ["Armchair", "Stereo", "Books"] },
  { icon: "tools", title: "Shed & Workshop Finds", meta: "Frankton · 2.2 km", when: "Sat 8am", open: false, finds: ["Circular saw", "Hand tools"] },
];

export function FindPreview() {
  return (
    <figure className="find-preview" aria-label="Example of finding a sale in SNAB">
      <div className="find-preview-card">
        <span className="find-preview-tape find-preview-tape-1">Search what you love</span>
        <div className="find-preview-search" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.8-4.8" /></svg>
          <span><mark>vintage chair</mark></span>
        </div>
        <div className="find-preview-map" aria-hidden="true">
          <svg className="find-preview-roads" viewBox="0 0 300 150" preserveAspectRatio="none" fill="none" stroke="#fffef9" strokeLinecap="round">
            <path d="M-10 108C60 96 110 120 170 98S260 60 310 70" strokeWidth="9" />
            <path d="M120 -10C128 40 112 90 140 160" strokeWidth="7" />
            <path d="M210 -10c-6 50 10 90 0 170M-10 40c70 6 120-4 320 10" strokeWidth="4" />
            <path d="M-10 108C60 96 110 120 170 98S260 60 310 70" stroke="#ffd64d" strokeWidth="3" />
          </svg>
          <span className="find-preview-river" />
          {pins.map(pin => <img key={pin.src} className="find-preview-pin" src={pin.src} alt="" style={{ left: `${pin.x}%`, top: `${pin.y}%`, width: pin.w }} />)}
          <span className="find-preview-tape find-preview-tape-2">See what’s near</span>
        </div>
        <ul className="find-preview-list">
          {sales.map(sale => (
            <li key={sale.title}>
              <img className="find-preview-icon" src={`/brand/categories/${sale.icon}.svg`} alt="" />
              <div>
                <p className="find-preview-title">{sale.title}</p>
                <p className="find-preview-meta">{sale.meta}</p>
                <p className="find-preview-finds">{sale.finds.map(find => <span key={find}>{find}</span>)}</p>
              </div>
              <span className={`find-preview-when${sale.open ? " is-open" : ""}`}>{sale.when}</span>
            </li>
          ))}
        </ul>
        <span className="find-preview-tape find-preview-tape-3">Know before you go</span>
      </div>
      <figcaption>Example sales. Your real neighbourhood shows up here.</figcaption>
    </figure>
  );
}
