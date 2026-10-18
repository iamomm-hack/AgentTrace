import { useEffect, useRef } from "react";

export type InfoTopic = "Case Studies" | "Contact" | "Sign In";
export function LandingLinks({ onNavigate, onInfo }: { onNavigate?: () => void; onInfo: (topic: InfoTopic) => void }) {
  return <><a href="#home" className="landing-link is-active" aria-current="page" onClick={onNavigate}>Home</a><a href="#overview" className="landing-link" onClick={onNavigate}>Product</a>{(["Case Studies", "Contact"] as const).map((topic) => <button className="landing-link" key={topic} onClick={() => { onNavigate?.(); onInfo(topic); }}>{topic}</button>)}</>;
}

export function MobileMenu({ onClose, onInfo }: { onClose: () => void; onInfo: (topic: InfoTopic) => void }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { ref.current?.querySelector<HTMLElement>("a")?.focus(); }, []);
  return <><div className="menu-overlay" onClick={onClose} aria-hidden="true" /><nav ref={ref} id="landing-mobile-menu" className="mobile-menu" aria-label="Mobile navigation"><LandingLinks onNavigate={onClose} onInfo={onInfo} /><button className="sign-in" onClick={() => { onClose(); onInfo("Sign In"); }}>Sign In</button></nav></>;
}
