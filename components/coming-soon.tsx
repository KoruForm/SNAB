import Image from "next/image";
import { InterestForm } from "./interest-form";

// The pre-launch teaser. Deliberately says almost nothing: the logo, one line and the email list.
// The reveal happens on the first sale weekend, when the signs go up and the app switches on.
export function ComingSoon() {
  return (
    <div className="soon-site">
      <main className="soon-main" id="main-content">
        <Image className="soon-logo" src="/brand/snab-highlight-final-b.svg" alt="SNAB" width={1072} height={528} priority />
        <h1 className="soon-line">Coming soon to a driveway near you.</h1>
        <InterestForm />
      </main>
    </div>
  );
}
