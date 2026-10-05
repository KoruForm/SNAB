import Link from "next/link";
import { contactEmail, legalUpdated } from "../../lib/legal";

export const metadata = { title: "Terms of use · SNAB", description: "The simple rules for using SNAB to list and find garage sales." };

export default function TermsPage() {
  return <main className="legal-page">
    <p><Link href="/">← SNAB</Link></p>
    <h1>Terms of use</h1>
    <p className="legal-updated">Last updated {legalUpdated}</p>
    <p>SNAB is a free service, based in New Zealand, that helps people list and find garage sales. “SNAB”, “we” and “us” mean the business that runs it. By using SNAB you agree to these terms. Please also read our <Link href="/privacy">privacy policy</Link>.</p>

    <h2>What SNAB is (and isn’t)</h2>
    <p>SNAB is a noticeboard. We show sales; we don’t sell anything, take payments or take part in any deal. Buying and selling happens between you and the other person at the sale. We don’t check items, listings or people, so look things over before you buy.</p>

    <h2>If you list a sale</h2>
    <ul>
      <li>Be honest. List a real sale at a place you’re allowed to hold it, with the right dates and times, and keep it up to date if things change.</li>
      <li>Only sell things you own and are allowed to sell. No weapons, alcohol, tobacco or vapes, medicines, stolen goods, recalled products, animals, or anything else that’s illegal to sell in New Zealand.</li>
      <li>Only post photos and words you have the right to use. Leave people (especially children), number plates and personal documents out of your photos.</li>
      <li>Follow the rules for signs. Signs on berms and footpaths may need council permission.</li>
      <li>You’re responsible for your sale and the people who visit it. If you’re in business, consumer laws such as the Consumer Guarantees Act may apply to what you sell.</li>
      <li>You keep ownership of your photos and text. You let us show them on SNAB, and in things that help your sale get found (such as your sign, QR code and share images), while your listing is up.</li>
    </ul>

    <h2>If you visit a sale</h2>
    <ul>
      <li>Respect the seller’s home, neighbours and times. Don’t turn up early or go where you’re not invited.</li>
      <li>Items at garage sales are usually sold as they are. Check things before you pay.</li>
      <li>Treasure alerts and item highlights are a guide. Items may already be gone or be different from the listing.</li>
    </ul>

    <h2>Keeping SNAB safe</h2>
    <p>Report a listing that looks wrong, unsafe or offensive with the report link on the sale. We may hide or remove a listing, or close an account, if it breaks these terms or puts people at risk. Listings reported by several people are hidden automatically until we check them.</p>

    <h2>Your account</h2>
    <p>Keep access to your email account safe, since that’s how you sign in. You can delete your SNAB account at any time on the <Link href="/account">account page</Link>.</p>

    <h2>No guarantees</h2>
    <p>We work hard to keep SNAB running and accurate, but it’s provided as it is, and it may sometimes be unavailable or wrong. As far as the law allows, we aren’t responsible for sales, items, visits or deals between users, or for any loss that comes from using SNAB. Nothing in these terms takes away rights you have under New Zealand law that can’t be excluded.</p>

    <h2>Changes</h2>
    <p>We may update these terms as SNAB grows. We’ll change the date at the top, and tell you in the app or by email about important changes. If you keep using SNAB after a change, the new terms apply.</p>

    <h2>Law and contact</h2>
    <p>These terms are governed by New Zealand law. Questions: {contactEmail ? <a href={`mailto:${contactEmail}`}>{contactEmail}</a> : "contact the SNAB team (our contact email is coming soon)"}.</p>
  </main>;
}
