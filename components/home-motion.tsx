"use client";
import { LazyMotion, domAnimation, m, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export function HeroIntro({ children }: { children: React.ReactNode }) {
  return <LazyMotion features={domAnimation}>
    <m.div initial={{ y: 10 }} animate={{ y: 0 }} transition={{ duration: .48, ease: "easeOut" }} className="hero-copy">{children}</m.div>
  </LazyMotion>;
}

export function StatNumber({ value }: { value: number }) {
  const element = useRef<HTMLElement>(null);
  const visible = useInView(element, { once: true });
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (!visible || reduced || !value) return;
    let frame = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const progress = Math.min((now - start) / 680, 1);
      setShown(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [visible, value, reduced]);
  return <strong ref={element}><span aria-hidden>{shown.toLocaleString("ar-OM")}</span><span className="sr-only">{value.toLocaleString("ar-OM")}</span></strong>;
}

export function HomeCountdown({ date }: { date: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, Math.floor((new Date(date).getTime() - Date.now()) / 1000)));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [date]);
  if (remaining === 0) return <p className="countdown-ended">حان موعد الفعالية</p>;
  return (
    <div className="home-countdown" aria-label="الوقت المتبقي على الفعالية">
      {[
        ["يوم", remaining === null ? null : Math.floor(remaining / 86400)],
        ["ساعة", remaining === null ? null : Math.floor(remaining / 3600) % 24],
        ["دقيقة", remaining === null ? null : Math.floor(remaining / 60) % 60],
      ].map(([label, value]) => (
        <div key={label}><b>{value === null ? "–" : Number(value).toLocaleString("ar-OM")}</b><span>{label}</span></div>
      ))}
    </div>
  );
}
