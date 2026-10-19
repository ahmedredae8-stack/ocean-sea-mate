import { useEffect, useState } from "react";
import { Check, Compass } from "lucide-react";

import { QUESTS, claim, isDone, loadQuests, type QuestState } from "@/lib/quests";
import { playSfx } from "@/lib/sound";

const GEM = "https://project--356242e8-144f-42b3-8292-474399c324ac.lovable.app/__l5e/assets-v1/81b9318d-8399-478f-bd28-abec7665a1a6/gem.png";

/** Daily voyages logbook: one route of numbered stops, each with its own reward. */
export function QuestBoard() {
  const [state, setState] = useState<QuestState | null>(null);

  useEffect(() => {
    setState(loadQuests());
    const onStorage = () => setState(loadQuests());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!state) return null;
  const finished = QUESTS.filter((q) => state.claimed.includes(q.id)).length;

  return (
    <section className="voyage-log" dir="rtl">
      <header className="voyage-head">
        <Compass className="voyage-compass" />
        <div><h2>رحلات اليوم</h2><p>أنجز الرحلة واستلم جواهرها</p></div>
        <span className="voyage-gems"><img src={GEM} alt="" />{state.gems}</span>
      </header>
      <div className="voyage-meter"><span style={{ width: `${(finished / Math.max(1, QUESTS.length)) * 100}%` }} /><small>{finished} من {QUESTS.length}</small></div>
      <ol className="voyage-route">
        {QUESTS.map((q, i) => {
          const done = isDone(state, q);
          const taken = state.claimed.includes(q.id);
          const have = Math.min(q.goal, state.progress[q.id] ?? 0);
          const pct = Math.round((have / q.goal) * 100);
          return (
            <li key={q.id} className={`voyage-stop ${done ? "is-ready" : ""} ${taken ? "is-taken" : ""}`}>
              <span className="voyage-pin">{taken ? <Check size={14} /> : i + 1}</span>
              <img src={q.icon} alt="" className="voyage-icon" />
              <div className="voyage-copy">
                <strong>{q.title}</strong>
                <small>{q.hint}</small>
                <span className="voyage-bar"><i style={{ width: `${pct}%` }} /></span>
              </div>
              <button
                type="button"
                className="voyage-claim"
                disabled={!done || taken}
                onClick={() => { playSfx("click", 0.8); setState((s) => (s ? claim(s, q.id) : s)); }}
              >
                {taken ? "تم" : done ? <>استلم <img src={GEM} alt="" />{q.gems}</> : `${have}/${q.goal}`}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
