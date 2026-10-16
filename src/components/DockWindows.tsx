import { useEffect, useState } from "react";
import { Bell, Crown, Fish, Shield, Skull, Swords, Trophy, Users } from "lucide-react";
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
  { id: "events" as const, label: "مواسم الغنائم", icon: Trophy },
  { id: "damage" as const, label: "فرسان المدفعية", icon: Swords },
  { id: "fish" as const, label: "صيادو الأعماق", icon: Fish },
  { id: "tribes" as const, label: "أعتى الأساطيل", icon: Crown },
];

export function RankingsWindow() {
  const [board, setBoard] = useState<Ranking>("events");
  const [players, setPlayers] = useState<Pick<Player, "id" | "name" | "score" | "avatar_index">[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void supabase.from("players").select("id,name,score,avatar_index").order("score", { ascending: false }).limit(25).then(({ data }) => {
      if (active) { setPlayers(data ?? []); setLoading(false); }
    });
    return () => { active = false; };
  }, []);
  return <div className="dock-content">
    <nav className="dock-tabs dock-tabs-wrap" aria-label="ميادين الديوان">{boards.map(({ id, label, icon: Icon }) => <Button key={id} variant="ghost" className={board === id ? "dock-tab active" : "dock-tab"} onClick={() => setBoard(id)}><Icon size={16} />{label}</Button>)}</nav>
    <div className="dock-section-heading"><Trophy size={20} /><strong>{boards.find((item) => item.id === board)?.label}</strong></div>
    {board !== "events" ? <EmptyState icon={Trophy} title="الديوان لم يُدوَّن بعد" detail="تُنقش الأسماء هنا حين تُحسم أول منازلة في هذا الميدان." /> : loading ? <p className="dock-loading">يُفتح ديوان الأساطير…</p> : players.length ? <ol className="ranking-list">{players.map((player, i) => <li key={player.id}><b className="ranking-position">{String(i + 1).padStart(2, "0")}</b><CaptainAvatar seed={player.avatar_index ?? 0} className="ranking-avatar" /><strong>{player.name}</strong><span>{(player.score ?? 0).toLocaleString("ar")} مجد</span></li>)}</ol> : <EmptyState icon={Trophy} title="لم يُنقش اسم أي ربّان بعد" detail="أبحر واغنم ليُخلَّد اسمك في الديوان." />}
  </div>;
}

export function InventoryWindow({ player }: { player: Player | null }) {
  const theme = getTheme(player?.theme_id ?? "");
  const [category, setCategory] = useState("المدفعية");
  const categories = ["المدفعية", "الملّاحون", "التحصين", "المرافئ"];
  const [gear, setGear] = useState<Record<string, number>>({});
  const art = useArtworkMap();
  useEffect(() => { const s = () => setGear(ownedGear()); s(); window.addEventListener(HARBOR_UPDATED, s); return () => window.removeEventListener(HARBOR_UPDATED, s); }, []);
  const pool = category === "المدفعية" ? WEAPONS.map((w, i) => ({ id: w.id, name: w.name, atlas: "weapon" as const, i })) : category === "الملّاحون" ? CREWS.map((w, i) => ({ id: w.id, name: w.name, atlas: "crew" as const, i })) : ARMORS.map((w, i) => ({ id: w.id, name: w.name, atlas: "armor" as const, i }));
  const mine = pool.filter((g) => (gear[g.id] ?? 0) > 0);
  return <div className="dock-content">
    <nav className="dock-tabs" aria-label="أقسام العنبر">{categories.map((item) => <Button key={item} variant="ghost" className={category === item ? "dock-tab active" : "dock-tab"} onClick={() => setCategory(item)}>{item}</Button>)}</nav>
    {category === "المرافئ" && player ? <div className="inventory-world"><img src={theme.day.poster} alt="" /><div><strong>{theme.name}</strong><span>المرفأ الراسي فيه أسطولك</span></div></div> : category !== "المرافئ" && mine.length ? <ul className="gear-grid">{mine.map((g) => <li key={g.id} className="gear-card"><span className="gear-art">{art[`${g.id}:idle`] ? <img src={art[`${g.id}:idle`]} alt="" /> : <GameSprite atlas={g.atlas} index={g.i} />}</span><strong>{g.name}</strong><b>x{gear[g.id]}</b></li>)}</ul> : <EmptyState icon={Shield} title={`عنبر ${category} خالٍ`} detail="ما تقتنيه من الترسانة الملكية يُرصّ في هذا العنبر لحظة شرائه." />}
  </div>;
}

function EmptyState({ icon: Icon, title, detail }: { icon: typeof Bell; title: string; detail: string }) {
  return <div className="dock-empty"><Icon size={40} strokeWidth={1.4} /><strong>{title}</strong><span>{detail}</span></div>;
}

export function AlertsWindow() {
  return <div className="dock-content"><div className="dock-section-heading"><Bell size={20} /><strong>مرصاد الخليج</strong></div><EmptyState icon={Bell} title="الأفق هادئ" detail="لم تلمح أبراج المراقبة شراعاً معادياً يقترب من شباكك." /></div>;
}

export function EnemiesWindow() {
  return <div className="dock-content"><div className="dock-section-heading"><Skull size={20} /><strong>لوح المطلوبين</strong></div><EmptyState icon={Users} title="لا رايات سوداء معلّقة" detail="كل قرصان يجرؤ على نهب صيدك تُعلَّق رايته هنا للثأر." /></div>;
}