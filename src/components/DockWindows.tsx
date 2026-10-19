import { useEffect, useState } from "react";
import { Bell, Crown, Fish, MessageCircle, Rocket, Search, Shield, Skull, Swords, Trophy, Users } from "lucide-react";
import { playSfx } from "@/lib/sound";
import { hulls } from "@/lib/fleetCatalog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CaptainAvatar } from "@/components/GameSprite";
import type { Player } from "@/lib/player";
import { getTheme } from "@/lib/themes";
import { ARMORS, CREWS, WEAPONS } from "@/lib/items";
import { HARBOR_UPDATED, ownedGear } from "@/lib/harbor";
import { useArtworkMap } from "@/lib/artwork";
import { GameSprite } from "@/components/GameSprite";

type Ranking = "events" | "damage" | "fish" | "tribes";
const boards = [
  { id: "events" as const, label: "الأكثر نقاطاً", icon: Trophy },
  { id: "damage" as const, label: "أقوى هجوم", icon: Swords },
  { id: "fish" as const, label: "أكثر صيداً", icon: Fish },
  { id: "tribes" as const, label: "أقوى مجموعة", icon: Crown },
];

type Row = Pick<Player, "id" | "name" | "score" | "avatar_index">;

export function RankingsWindow({ me = null, onMessage }: { me?: string | null; onMessage?: (id: string) => void }) {
  const [board, setBoard] = useState<Ranking>("events");
  const [players, setPlayers] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Row | null>(null);
  const [attack, setAttack] = useState<Row | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    const q = query.trim();
    const base = supabase.from("players").select("id,name,score,avatar_index");
    const req = q ? base.ilike("name", `%${q.replace(/[%_]/g, "")}%`).limit(25) : base.order("score", { ascending: false }).limit(25);
    const t = window.setTimeout(() => void req.then(({ data }) => { if (active) { setPlayers(data ?? []); setLoading(false); } }), q ? 300 : 0);
    return () => { active = false; window.clearTimeout(t); };
  }, [query]);
  const searching = query.trim().length > 0;
  return <div className="registry">
    <div className="registry-top">
      <label className="registry-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="اكتب اسم قبطان…" dir="auto" /></label>
      {!searching && <div className="registry-boards" role="tablist">{boards.map(({ id, label, icon: Icon }) => <button type="button" role="tab" aria-selected={board === id} key={id} onClick={() => setBoard(id)} title={label}><Icon size={15} /><span>{label}</span></button>)}</div>}
    </div>
    {!searching && board !== "events" ? <EmptyState icon={Trophy} title="لا يوجد ترتيب بعد" detail="يظهر بعد أول معارك ورحلات حقيقية." />
      : loading ? <p className="dock-loading">جاري البحث…</p>
      : players.length ? <>
        {!searching && players.length >= 3 && <div className="registry-podium">{[1, 0, 2].map((idx) => { const p = players[idx]; return p ? <button type="button" key={p.id} className={`podium-step place-${idx + 1}`} onClick={() => setPicked(p)}><CaptainAvatar seed={p.avatar_index ?? 0} className="podium-face" /><strong>{p.name}</strong><span>{(p.score ?? 0).toLocaleString("ar")}</span><b>{idx + 1}</b></button> : null; })}</div>}
        <ul className="registry-cards">{players.slice(!searching && players.length >= 3 ? 3 : 0).map((p, i) => <li key={p.id}>
          <button type="button" className={`captain-card ${p.id === me ? "is-me" : ""}`} onClick={() => setPicked(p)}>
            <span className="captain-card-no">{searching ? "" : i + 4}</span><CaptainAvatar seed={p.avatar_index ?? 0} className="captain-card-face" /><strong>{p.name}{p.id === me && " (أنت)"}</strong><span>{(p.score ?? 0).toLocaleString("ar")} نقطة</span>
          </button>
        </li>)}</ul>
      </>
      : <EmptyState icon={Users} title={searching ? "ما لقينا أحد بهذا الاسم" : "لا يوجد قباطنة بعد"} detail={searching ? "جرّب اسماً آخر." : "كن أول من يبحر."} />}
    {picked && <div className="captain-sheet" role="dialog" aria-label={picked.name} onClick={() => setPicked(null)}>
      <section onClick={(e) => e.stopPropagation()}>
        <CaptainAvatar seed={picked.avatar_index ?? 0} className="captain-sheet-face" />
        <h3>{picked.name}</h3>
        <p>{(picked.score ?? 0).toLocaleString("ar")} نقطة</p>
        {picked.id === me ? <p className="captain-sheet-note">هذا حسابك</p> : <div className="captain-sheet-acts">
          <button type="button" className="sheet-btn talk" onClick={() => { setPicked(null); onMessage?.(picked.id); }}><MessageCircle size={18} />راسله</button>
          <button type="button" className="sheet-btn hit" onClick={() => { setAttack(picked); setPicked(null); }}><Rocket size={18} />هاجم سفينته</button>
        </div>}
        <button type="button" className="captain-sheet-close" onClick={() => setPicked(null)}>إغلاق</button>
      </section>
    </div>}
    {attack && <AttackScene target={attack} onDone={() => setAttack(null)} />}
  </div>;
}

/** Rocket volley against a rival's hull with shield flare. Visual only until battle records exist. */
function AttackScene({ target, onDone }: { target: Row; onDone: () => void }) {
  const [stage, setStage] = useState<"fly" | "hit" | "end">("fly");
  useEffect(() => {
    playSfx("click", 0.9);
    const a = window.setTimeout(() => { setStage("hit"); playSfx("click", 1); }, 1400);
    const b = window.setTimeout(() => setStage("end"), 2600);
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
  }, []);
  return <div className={`attack-scene stage-${stage}`} role="dialog" aria-label={`هجوم على ${target.name}`}>
    <div className="attack-sky" aria-hidden="true">
      <span className="rocket r1" /><span className="rocket r2" /><span className="rocket r3" />
      <img className="attack-ship" src={hulls[0]} alt="" />
      <span className="attack-shield" /><span className="attack-blast" />
    </div>
    <div className="attack-copy">
      <strong>{stage === "fly" ? "الصواريخ في الطريق…" : stage === "hit" ? "اصطدمت بالدرع!" : `انتهى الهجوم على ${target.name}`}</strong>
      {stage === "end" && <><span>هذا عرض تجريبي — المعارك الحقيقية والغنائم تُفعَّل قريباً.</span><button type="button" className="act-btn act-talk" onClick={onDone}>رجوع</button></>}
    </div>
  </div>;
}

export function InventoryWindow({ player }: { player: Player | null }) {
  const theme = getTheme(player?.theme_id ?? "");
  const [category, setCategory] = useState("الأسلحة");
  const categories = ["الأسلحة", "الطاقم", "الدروع", "المرفأ"];
  const [gear, setGear] = useState<Record<string, number>>({});
  const art = useArtworkMap();
  useEffect(() => { const s = () => setGear(ownedGear()); s(); window.addEventListener(HARBOR_UPDATED, s); return () => window.removeEventListener(HARBOR_UPDATED, s); }, []);
  const pool = category === "الأسلحة" ? WEAPONS.map((w, i) => ({ id: w.id, name: w.name, atlas: "weapon" as const, i })) : category === "الطاقم" ? CREWS.map((w, i) => ({ id: w.id, name: w.name, atlas: "crew" as const, i })) : ARMORS.map((w, i) => ({ id: w.id, name: w.name, atlas: "armor" as const, i }));
  const mine = pool.filter((g) => (gear[g.id] ?? 0) > 0);
  const [focus, setFocus] = useState<string | null>(null);
  const picked = mine.find((g) => g.id === focus) ?? null;
  const total = Object.values(gear).reduce((s, n) => s + n, 0);
  return <div className="vault">
    <aside className="vault-rail" role="tablist">{categories.map((item) => <button type="button" role="tab" key={item} aria-selected={category === item} onClick={() => { setCategory(item); setFocus(null); }}>{item}</button>)}<small>{total} قطعة</small></aside>
    <div className="vault-main">
      {category === "المرفأ" && player ? <div className="vault-harbor"><img src={theme.day.poster} alt="" /><div><strong>{theme.name}</strong><span>هنا ترسو سفنك الآن</span></div></div>
        : mine.length ? <>
          <ul className="vault-grid">{mine.map((g) => <li key={g.id}><button type="button" className={`vault-slot ${focus === g.id ? "is-on" : ""}`} onClick={() => setFocus(focus === g.id ? null : g.id)}>{art[`${g.id}:idle`] ? <img src={art[`${g.id}:idle`]} alt="" /> : <GameSprite atlas={g.atlas} index={g.i} />}<b>{gear[g.id]}</b></button></li>)}
            {Array.from({ length: Math.max(0, 12 - mine.length) }).map((_, i) => <li key={`e${i}`}><span className="vault-slot is-empty" /></li>)}</ul>
          <div className="vault-detail">{picked ? <><strong>{picked.name}</strong><span>عندك {gear[picked.id]}</span></> : <span>اضغط على قطعة لترى تفاصيلها</span>}</div>
        </> : <EmptyState icon={Shield} title={`لا تملك شيئاً في ${category}`} detail="اشترِ من المتجر وستجده هنا مباشرة." />}
    </div>
  </div>;
}

function EmptyState({ icon: Icon, title, detail }: { icon: typeof Bell; title: string; detail: string }) {
  return <div className="dock-empty"><Icon size={40} strokeWidth={1.4} /><strong>{title}</strong><span>{detail}</span></div>;
}

export function AlertsWindow() {
  return <Chronicle mode="alerts" />;
}

export function EnemiesWindow() {
  return <Chronicle mode="enemies" />;
}

/** Bay chronicle: one timeline for news and rivals; stays empty until real records exist. */
function Chronicle({ mode }: { mode: "alerts" | "enemies" }) {
  const [tab, setTab] = useState(mode);
  return <div className="chronicle">
    <div className="chronicle-tabs" role="tablist">
      <button type="button" role="tab" aria-selected={tab === "alerts"} onClick={() => setTab("alerts")}><Bell size={15} />أخبار الخليج</button>
      <button type="button" role="tab" aria-selected={tab === "enemies"} onClick={() => setTab("enemies")}><Skull size={15} />خصومي</button>
    </div>
    <div className="chronicle-line">
      {tab === "alerts" ? <EmptyState icon={Bell} title="لا أخبار جديدة" detail="نخبرك هنا إذا هاجمك أحد أو رجع قاربك." /> : <EmptyState icon={Skull} title="ما عندك خصوم" detail="من يهاجمك يظهر هنا وتقدر ترد عليه." />}
    </div>
  </div>;
}
