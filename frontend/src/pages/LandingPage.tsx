import { useEffect, useRef, useState } from "react";
import { BackgroundVideo } from "../components/landing/BackgroundVideo";
import { LandingHeader } from "../components/landing/LandingHeader";
import { HeroSection } from "../components/landing/HeroSection";
import { StatsFooter } from "../components/landing/StatsFooter";
import type { InfoTopic } from "../components/landing/MobileMenu";
import "../styles/landing.css";

declare module "react" { interface CSSProperties { "--d"?: string } }

const infoCopy = {
  "Sign In": "This AgentTrace workspace is local-first and does not have authentication. You can open the application directly.",
  "Case Studies": "AgentTrace does not have published customer case studies yet. Explore persisted runs in the application to inspect your own agent traces.",
  "Contact": "No public contact channel is configured for this workspace. Contact the person or team who provided your AgentTrace installation.",
};

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [topic, setTopic] = useState<InfoTopic | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!topic) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => { dialog.current?.close(); if (previous?.isConnected) previous.focus(); };
  }, [topic]);
  return <div className="landing-page">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" />
    <link rel="stylesheet" href="https://db.onlinewebfonts.com/c/8cb707a9b8a73f8a7403336b861c3074?family=BubbledotICG-FinePos" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A==" crossOrigin="anonymous" referrerPolicy="no-referrer" />
    <BackgroundVideo />
    <div className="page"><LandingHeader onMenuChange={setMenuOpen} onInfo={setTopic} /><div className="landing-content" inert={menuOpen}><HeroSection /><StatsFooter /></div></div>
    <dialog ref={dialog} className="landing-info" onCancel={() => setTopic(null)} onClick={(event) => { if (event.target === event.currentTarget) setTopic(null); }} aria-labelledby="landing-info-title"><h2 id="landing-info-title">{topic}</h2><p>{topic && infoCopy[topic]}</p><div><a href={topic === "Case Studies" ? "#runs" : "#overview"} onClick={() => setTopic(null)}>Open AgentTrace</a><button onClick={() => setTopic(null)}>Close</button></div></dialog>
  </div>;
}
