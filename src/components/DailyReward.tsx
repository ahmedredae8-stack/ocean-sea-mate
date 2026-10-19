import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { playSfx } from "@/lib/sound";

const KEY = "ib.daily.v1";
const COIN = "https://project--356242e8-144f-42b3-8292-474399c324ac.lovable.app/__l5e/assets-v1/906f37c0-d530-4e50-a3ce-00deaaf40a02/coin.png";
const GEM = "https://project--356242e8-144f-42b3-8292-474399c324ac.lovable.app/__l5e/assets-v1/81b9318d-8399-478f-bd28-abec7665a1a6/gem.png";
const DAYS = [
  { d: 1, icon: COIN, label: "5,000" },
  { d: 2, icon: COIN, label: "10,000" },
  { d: 3, icon: GEM, label: "15" },
  { d: 4, icon: COIN, label: "25,000" },
  { d: 5, icon: GEM, label: "40" },
  { d: 6, icon: "https://project--356242e8-144f-42b3-8292-474399c324ac.lovable.app/__l5e/assets-v1/08453a7e-1779-4eb1-9220-dfabe5462e44/chest.png", label: "صندوق" },
  { d: 7, icon: "https://project--356242e8-144f-42b3-8292-474399c324ac.lovable.app/__l5e/assets-v1/31f47bd7-8999-4049-8835-3de413357bf2/cat-ship.png", label: "سفينة" },
];

type Saved = { day: string; streak: number };
const today = () => new Date().toISOString().slice(0, 10);

/** Seven-island treasure route — opens once per day after sign-in. */
export function DailyReward() {
  const [open, setOpen] = useState(false);
  const [streak, setStreak] = useState(1);

  useEffect(() => {
    let saved: Saved | null = null;
    try { saved = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Saved | null; } catch { saved = null; }
    if (saved?.day === today()) { setStreak(saved.streak); return; }
    const next = { day: today(), streak: Math.min(7, (saved?.streak ?? 0) + 1) };
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
    setStreak(next.streak);
    setOpen(true);
  }, []);

  if (!open) return null;
  const close = () => { playSfx("click", 0.6); setOpen(false); };
  const now = DAYS[streak - 1];

  return (
    <div className="isle-overlay" role="dialog" aria-label="هدية اليوم" onClick={close}>
      <section className="isle-card" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <button type="button" aria-label="إغلاق" onClick={close} className="isle-x"><X size={16} /></button>
        <p className="isle-kicker">جزيرة {streak} من 7</p>
        <div className="isle-prize"><img src={now?.icon} alt="" /><strong>{now?.label}</strong></div>
        <ol className="isle-route">
          {DAYS.map((r) => (
            <li key={r.d} className={r.d < streak ? "is-past" : r.d === streak ? "is-now" : ""}>
              <span className="isle-dot"><img src={r.icon} alt="" /></span>
              <small>{r.d}</small>
            </li>
          ))}
        </ol>
        <p className="isle-hint">ارجع كل يوم — الجزيرة السابعة فيها سفينة</p>
        <button type="button" className="isle-claim" onClick={() => { playSfx("click", 0.9); setOpen(false); }}>خذ الهدية</button>
      </section>
    </div>
  );
}
