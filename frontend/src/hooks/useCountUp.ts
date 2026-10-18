import { useEffect, useRef, useState } from "react";

export function useCountUp(target: number, decimals: number, index: number) {
  const ref = useRef<HTMLSpanElement>(null);
  const completed = useRef(false);
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (completed.current) return;
    const element = ref.current;
    if (!element) return;
    let frame = 0;
    let timer = 0;
    let started = false;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const finish = () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      completed.current = true;
      setValue(target);
    };
    const start = () => {
      if (started || completed.current) return;
      started = true;
      timer = window.setTimeout(() => {
        const startTime = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - startTime) / (1500 + index * 80), 1);
          setValue(target * (1 - Math.pow(1 - progress, 3)));
          if (progress < 1) frame = requestAnimationFrame(tick);
          else completed.current = true;
        };
        frame = requestAnimationFrame(tick);
      }, 480 + index * 90);
    };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { start(); observer?.disconnect(); }
    }, { threshold: 0.25 });
    if (motion.matches) finish();
    else if (observer) observer.observe(element);
    else start();
    const onMotion = () => { if (motion.matches) { finish(); observer?.disconnect(); } };
    motion.addEventListener("change", onMotion);
    return () => { window.clearTimeout(timer); cancelAnimationFrame(frame); observer?.disconnect(); motion.removeEventListener("change", onMotion); };
  }, [target, index]);
  return { ref, value: value.toFixed(decimals) };
}
