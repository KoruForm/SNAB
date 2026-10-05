import { ComingSoon } from "../components/coming-soon";
import { LandingPage } from "../components/landing-page";
import { comingSoonHome } from "../lib/launch";

export default function Home() {
  return comingSoonHome ? <ComingSoon /> : <LandingPage />;
}
