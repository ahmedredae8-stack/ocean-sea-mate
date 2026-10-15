import { useEffect, useRef, useState } from "react";

import introArt from "@/assets/intro-legend.jpg";
import { hulls } from "@/lib/fleetCatalog";
import { themes } from "@/lib/themes";
import { playSfx } from "@/lib/sound";

/** The four calls of the bosun before the ship leaves the golden bay. */
const CALLS = ["فكّ الحبال", "نشر الأشرعة", "قراءة النجوم", "إلى الخليج الذهبي"];
const MIN_MS = 1800;
const GUARD_MS = 8000;

function warm(src: string) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = img.onerror = () => resolve();
    img.src = src;
  });
}

export function IntroLoader({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    let alive = true;
    const urls = [...new Set([...themes.flatMap((t) => [t.day.poster, t.night.poster]), ...hulls].filter(Boolean))];
    let done = 0;
    urls.forEach((u) => void warm(u).then(() => { done++; }));
    const guard = window.setTimeout(() => { done = urls.length; }, GUARD_MS);
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      const real = urls.length ? done / urls.length : 1;
      const time = Math.min(1, (performance.now() - t0) / MIN_MS);
      setProgress(Math.min(real, time) * 100);
      if (real >= 1 && time >= 1) {
        playSfx("click", 0.7);
        setLeaving(true);
        window.setTimeout(() => alive && onDone(), 650);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); window.clearTimeout(guard); };
  }, [onDone]);

  // Browsers block audio before a gesture: play the sting on the first interaction.
  useEffect(() => {
    const fire = () => {
      if (started.current) return;
      started.current = true;
      playSfx("intro", 0.9);
    };
    fire();
    window.addEventListener("pointerdown", fire, { once: true });
    window.addEventListener("keydown", fire, { once: true });
    return () => {
      window.removeEventListener("pointerdown", fire);
      window.removeEventListener("keydown", fire);
    };
  }, []);

  const call = Math.min(CALLS.length - 1, Math.floor((progress / 100) * CALLS.length));

  return (
    <div className={`legend-intro ${leaving ? "is-leaving" : ""}`} role="status" aria-live="polite" aria-label="جاري تحميل اللعبة">
      <img src={introArt} alt="سفينة ذهبية تعبر بوابة الأسد إلى الخليج الذهبي" width={1088} height={1920} className="legend-art" />
      <div className="legend-mist" aria-hidden="true" />
      <div className="legend-veil" aria-hidden="true" />

      <header className="legend-crest" dir="rtl">
        <span className="legend-kicker">حكاية من الخليج الذهبي</span>
        <h1>خليج <em>القراصنة</em></h1>
        <p>البحر لا يعطي كنوزه إلا للجريء</p>
      </header>

      <footer className="legend-helm" dir="rtl">
        <svg className="legend-wheel" viewBox="0 0 100 100" aria-hidden="true" style={{ transform: `rotate(${progress * 3.6}deg)` }}>
          <circle cx="50" cy="50" r="30" className="w-rim" />
          <circle cx="50" cy="50" r="9" className="w-hub" />
          {Array.from({ length: 8 }, (_, i) => (
            <g key={i} transform={`rotate(${i * 45} 50 50)`}>
              <line x1="50" y1="41" x2="50" y2="8" className="w-spoke" />
              <circle cx="50" cy="7" r="4" className="w-knob" />
            </g>
          ))}
        </svg>
        <div className="legend-log">
          <strong>{CALLS[call]}</strong>
          <div className="legend-rope"><span style={{ width: `${progress}%` }} /></div>
          <small>{Math.round(progress)}٪ من الطريق</small>
        </div>
      </footer>
    </div>
  );
}
