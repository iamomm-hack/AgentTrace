import { TrustRow } from "./TrustRow";

export function HeroSection() {
  return <main className="landing-hero">
    <TrustRow />
    <h1><span>Intelligence</span><span>Designed To Evolve</span></h1>
    <p className="hero-subheading anim" style={{ "--d": "0.28s" }}>Build applications that reason, adapt and collaborate using a modular AI platform designed for production.</p>
    <a className="hero-cta anim" style={{ "--d": "0.4s" }} href="#overview">Get Started</a>
  </main>;
}
