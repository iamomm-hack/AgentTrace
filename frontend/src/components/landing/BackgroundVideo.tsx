import { useEffect, useRef } from "react";

export function BackgroundVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      if (motion.matches) video.pause();
      else void video.play().catch(() => { /* Black background remains if autoplay is blocked. */ });
    };
    update();
    motion.addEventListener("change", update);
    return () => { motion.removeEventListener("change", update); video.pause(); };
  }, []);
  return <div className="bg" aria-hidden="true"><video ref={ref} autoPlay muted loop playsInline preload="metadata" src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260809_012548_ef22562c-c0ae-4816-ad9d-f8922af4e6a7.mp4" /></div>;
}
