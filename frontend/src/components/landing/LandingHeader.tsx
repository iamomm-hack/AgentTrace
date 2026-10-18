import { useEffect, useRef, useState } from "react";
import { LandingLinks, MobileMenu, type InfoTopic } from "./MobileMenu";

export function LandingHeader({ onMenuChange, onInfo }: { onMenuChange: (open: boolean) => void; onInfo: (topic: InfoTopic) => void }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const close = () => { setOpen(false); toggle.current?.focus(); };
  useEffect(() => { onMenuChange(open); return () => onMenuChange(false); }, [open, onMenuChange]);
  useEffect(() => {
    if (!open) return;
    const media = matchMedia("(min-width: 721px)");
    const resize = () => { if (media.matches) { setOpen(false); header.current?.querySelector<HTMLElement>(".landing-logo")?.focus(); } };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); }
      if (event.key === "Tab") {
        const focusable = Array.from(header.current?.querySelectorAll<HTMLElement>("button, a[href]") ?? []).filter((node) => node.getClientRects().length && !node.closest("[inert]"));
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    media.addEventListener("change", resize);
    document.addEventListener("keydown", keydown);
    return () => { media.removeEventListener("change", resize); document.removeEventListener("keydown", keydown); };
  }, [open]);
  return <header ref={header} className={`landing-header${open ? " menu-open" : ""}`} role={open ? "dialog" : undefined} aria-modal={open || undefined} aria-label={open ? "Navigation menu" : undefined}>
    <a className="landing-logo" href="#home" aria-label="AgentTrace home" inert={open}><img src="/assets/logo.webp" alt="" /></a>
    <nav className="desktop-nav" aria-label="Landing navigation"><LandingLinks onInfo={onInfo} /></nav>
    <button className="sign-in desktop-sign-in" onClick={() => onInfo("Sign In")}>Sign In</button>
    <button ref={toggle} className="menu-toggle" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} aria-controls="landing-mobile-menu" onClick={() => setOpen((current) => !current)}><span /><span /><span /></button>
    {open && <MobileMenu onClose={close} onInfo={onInfo} />}
  </header>;
}
