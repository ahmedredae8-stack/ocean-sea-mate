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
  return <div className="dock-content">
    <label className="captain-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن لاعب بالاسم…" dir="auto" /></label>
    {!searching && <nav className="pill-tabs" aria-label="الترتيب">{boards.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={board === id ? "pill-tab on" : "pill-tab"} onClick={() => setBoard(id)}><Icon size={14} />{label}</button>)}</nav>}
    {!searching && board !== "events" ? <EmptyState icon={Trophy} title="لا يوجد ترتيب بعد" detail="سيظهر هنا بعد أول معارك ورحلات صيد حقيقية." />
      : loading ? <p className="dock-loading">جاري البحث…</p>
      : players.length ? <ol className="ranking-list radar-list">{players.map((p, i) => <li key={p.id} className={picked?.id === p.id ? "is-picked" : ""}>
          <button type="button" className="ranking-row" onClick={() => setPicked(picked?.id === p.id ? null : p)}>
            <b className="ranking-position">{searching ? "•" : i + 1}</b><CaptainAvatar seed={p.avatar_index ?? 0} className="ranking-avatar" /><strong>{p.name}{p.id === me && " (أنت)"}</strong><span>{(p.score ?? 0).toLocaleString("ar")} نقطة</span>
          </button>
          {picked?.id === p.id && p.id !== me && <div className="captain-actions">
            <button type="button" className="act-btn act-talk" onClick={() => onMessage?.(p.id)}><MessageCircle size={16} />راسله</button>
            <button type="button" className="act-btn act-hit" onClick={() => setAttack(p)}><Rocket size={16} />هاجم سفينته</button>
          </div>}
        </li>)}</ol>
      : <EmptyState icon={Users} title={searching ? "ما لقينا أحد بهذا الاسم" : "لا يوجد قباطنة بعد"} detail={searching ? "جرّب اسماً آخر." : "كن أول من يبحر."} />}
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
  return <div className="dock-content">
    <nav className="dock-tabs" aria-label="أقسام العنبر">{categories.map((item) => <Button key={item} variant="ghost" className={category === item ? "dock-tab active" : "dock-tab"} onClick={() => setCategory(item)}>{item}</Button>)}</nav>
    {category === "المرفأ" && player ? <div className="inventory-world"><img src={theme.day.poster} alt="" /><div><strong>{theme.name}</strong><span>مكان رسوّ سفنك الآن</span></div></div> : category !== "المرفأ" && mine.length ? <ul className="gear-grid">{mine.map((g) => <li key={g.id} className="gear-card"><span className="gear-art">{art[`${g.id}:idle`] ? <img src={art[`${g.id}:idle`]} alt="" /> : <GameSprite atlas={g.atlas} index={g.i} />}</span><strong>{g.name}</strong><b>x{gear[g.id]}</b></li>)}</ul> : <EmptyState icon={Shield} title={`لا تملك شيئاً في ${category}`} detail="اشترِ من المتجر وستجده هنا مباشرة." />}
  </div>;
}

function EmptyState({ icon: Icon, title, detail }: { icon: typeof Bell; title: string; detail: string }) {
  return <div className="dock-empty"><Icon size={40} strokeWidth={1.4} /><strong>{title}</strong><span>{detail}</span></div>;
}

export function AlertsWindow() {
  return <div className="dock-content"><div className="dock-section-heading"><Bell size={20} /><strong>التنبيهات</strong></div><EmptyState icon={Bell} title="لا توجد تنبيهات" detail="سنخبرك هنا إذا هاجمك أحد أو انتهت رحلة صيد." /></div>;
}

export function EnemiesWindow() {
  return <div className="dock-content"><div className="dock-section-heading"><Skull size={20} /><strong>الأعداء</strong></div><EmptyState icon={Users} title="لا يوجد أعداء" detail="من يهاجمك يظهر هنا لتردّ عليه." /></div>;
}