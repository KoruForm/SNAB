import Link from "next/link";
import { contactEmail, legalUpdated } from "../../lib/legal";

export const metadata = { title: "Privacy policy · SNAB", description: "What SNAB collects, why, where it’s kept and how to delete it." };

function Contact() {
  return contactEmail ? <a href={`mailto:${contactEmail}`}>{contactEmail}</a> : <>the SNAB team (our contact email is coming soon)</>;
}

export default function PrivacyPage() {
  return <main className="legal-page">
    <p><Link href="/">← SNAB</Link></p>
    <h1>Privacy policy</h1>
    <p className="legal-updated">Last updated {legalUpdated}</p>
    <p>SNAB helps people in New Zealand find and run garage sales. SNAB is a New Zealand business, and “we” and “us” in this policy mean SNAB. This policy explains what we collect, why, who can see it, where it’s stored, and how to see, change or delete it. We follow the Privacy Act 2020.</p>

    <h2>The short version</h2>
    <ul>
      <li>We only collect what we need to run SNAB.</li>
      <li>Your street address is private until the time you choose, and you can keep it hidden altogether.</li>
      <li>We don’t sell your information or use it for advertising.</li>
      <li>Your account data is stored with Supabase in Tokyo, Japan.</li>
      <li>You can delete your account, and everything in it, from the <Link href="/account">account page</Link> at any time.</li>
    </ul>

    <h2>What we collect</h2>
    <ul>
      <li><strong>Your email address</strong>, when you sign in (we email you a 6-digit code) or join the “keep me posted” list. Joining the list also records whether you want to buy or sell, and your suburb if you give it.</li>
      <li><strong>Your sale listing</strong>: title, description, dates and times, categories, highlights, prices you add, and photos.</li>
      <li><strong>Your sale address and map pin.</strong> These are kept separately from the listing and shown to buyers only as you choose (see below).</li>
      <li><strong>Your treasure list</strong> (the things you’re hunting for) and whether you want email alerts about them.</li>
      <li><strong>Reports</strong> you make about a listing, with any note you add.</li>
      <li><strong>View and save counts</strong> for sales. Your browser keeps a random code; we store only a scrambled version mixed with the sale and the day, so we (and sellers) see totals, never who looked.</li>
      <li><strong>Visit statistics</strong> through Umami, which doesn’t use cookies or collect personal information. It counts pages visited, the kind of device and roughly which country.</li>
    </ul>
    <p>We don’t collect your name, phone number or payment details. We remove location data (GPS) from photos before they’re uploaded.</p>
    <p>Some things stay only on your device, in your browser’s storage: sales made without signing in, saved finds, and your treasure list before you sign in. Clearing your browser’s site data removes them.</p>

    <h2>Why we collect it</h2>
    <ul>
      <li>To show your sale to buyers and help them get there.</li>
      <li>To sign you in, keep your sales on every device, and email you treasure alerts if you turn them on.</li>
      <li>To keep SNAB safe: reviewing reports, and hiding listings that break the <Link href="/terms">terms</Link>.</li>
      <li>To tell people on the “keep me posted” list when SNAB opens near them.</li>
      <li>To understand, in total, how SNAB is used so we can improve it.</li>
    </ul>

    <h2>Who can see it</h2>
    <ul>
      <li><strong>Everyone</strong> can see a published listing: its title, description, dates, photos, highlights and town or suburb.</li>
      <li><strong>Your street address</strong> is shown only as you choose when you list: on sale days only (recommended), from when you publish, or never. Until then buyers see a rough area. Once your sale has finished it no longer appears to buyers.</li>
      <li><strong>Your email address</strong> is never shown to other people.</li>
      <li><strong>Sellers</strong> see how many people viewed and saved their sale, not who.</li>
      <li><strong>We</strong> can see stored information to run and look after SNAB, for example when reviewing a report.</li>
    </ul>

    <h2>Services we use, and where your information is stored</h2>
    <p>We use these companies to run SNAB. They store or handle information only to provide their service to us:</p>
    <ul>
      <li><strong>Supabase</strong> (database, sign-in and photos). Stored in <strong>Tokyo, Japan</strong>.</li>
      <li><strong>Hostinger</strong> (website hosting).</li>
      <li><strong>Resend</strong> (sending sign-in codes and alert emails), based in the United States.</li>
      <li><strong>Umami</strong> (cookie-free visit statistics).</li>
      <li><strong>Geoapify or Photon</strong> (address suggestions when you type your address) and <strong>OpenFreeMap</strong> (map images). These see what you type or which part of the map you’re viewing, not who you are.</li>
    </ul>
    <p>Because your information is stored and handled outside New Zealand, it may not be protected by laws that give the same safeguards as the Privacy Act. We choose established providers that protect data with encryption and access controls, and we keep what we send them to a minimum.</p>

    <h2>How long we keep it</h2>
    <ul>
      <li>Your account, sales and photos stay until you delete them or your account.</li>
      <li>The “keep me posted” list is kept until SNAB opens in your area, or until you ask us to remove you.</li>
      <li>Reports are kept so we can deal with repeat problems. If you delete your account, reports you made are kept without your details.</li>
    </ul>

    <h2>Your choices and rights</h2>
    <ul>
      <li><strong>Change</strong> your listing or treasure list at any time in the app.</li>
      <li><strong>Stop alert emails</strong> with the link at the bottom of any alert, or from your treasure list.</li>
      <li><strong>Delete your account</strong> on the <Link href="/account">account page</Link>. This removes your account, sales, photos, addresses, treasure list and “keep me posted” sign-up straight away.</li>
      <li><strong>Ask for a copy</strong> of the information we hold about you, or ask us to correct it, by contacting us at <Contact />. We’ll reply within 20 working days.</li>
    </ul>
    <p>If you’re not happy with how we’ve handled your information, please tell us first. You can also complain to the <a href="https://www.privacy.org.nz" target="_blank" rel="noreferrer">Office of the Privacy Commissioner</a>.</p>

    <h2>Changes</h2>
    <p>If we change this policy we’ll update the date at the top. If a change affects how your information is used, we’ll tell you in the app or by email before it applies.</p>

    <h2>Contact</h2>
    <p>Questions or requests: <Contact />.</p>
  </main>;
}
