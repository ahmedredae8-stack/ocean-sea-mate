import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Eye, LogOut, Music2, Settings2, ShieldCheck, Waves } from "lucide-react";

import { CaptainAvatar, nameSeed } from "@/components/GameSprite";
import { usePlayer } from "@/hooks/usePlayer";
import { signOutCaptain } from "@/lib/auth";
import { clearPlayer } from "@/lib/player";
import { isArtworkAdmin } from "@/lib/artwork";
import { isMuted, setMuted, startAmbient } from "@/lib/sound";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "إعدادات القبطان — خليج القراصنة" }, { name: "description", content: "إعدادات حساب القبطان والصوت والحركة في خليج القراصنة." }, { property: "og:title", content: "إعدادات القبطان — خليج القراصنة" }, { property: "og:description", content: "تحكم في حسابك وتجربة اللعب." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: SettingsPage,
});

export function SettingsPage() {
  const { player } = usePlayer();
  const navigate = useNavigate();
  const [sound, setSound] = useState(true);
  const [motion, setMotion] = useState(true);
  const [contrast, setContrast] = useState(false);
  const [admin, setAdmin] = useState(false);
  useEffect(() => { void isArtworkAdmin().then(setAdmin).catch(() => setAdmin(false)); }, []);
  useEffect(() => { setSound(!isMuted()); setMotion(localStorage.getItem("ib.motion") !== "off"); setContrast(localStorage.getItem("ib.contrast") === "on"); }, []);
  const toggleSound = () => { const next = !sound; setSound(next); setMuted(!next); if (next) startAmbient(); };
  const toggleMotion = () => { const next = !motion; setMotion(next); localStorage.setItem("ib.motion", next ? "on" : "off"); document.documentElement.classList.toggle("reduce-game-motion", !next); };
  const toggleContrast = () => { const next = !contrast; setContrast(next); localStorage.setItem("ib.contrast", next ? "on" : "off"); document.documentElement.classList.toggle("game-contrast", next); };
  const logout = async () => { await signOutCaptain(); clearPlayer(); void navigate({ to: "/auth", replace: true }); };

  return <main className="helm" dir="rtl">
    <section className="helm-id">
      <Link to="/" className="council-back" aria-label="رجوع"><ArrowRight size={18} /></Link>
      <CaptainAvatar seed={nameSeed(player?.name ?? "قبطان")} className="helm-face" />
      <div><h2>{player?.name ?? "قبطان الخليج"}</h2><p><ShieldCheck size={13} />{player ? "مسجّل الدخول" : "غير مسجّل"}</p></div>
    </section>
    <section className="helm-levers">
      <SettingRow icon={<Music2 />} title="الصوت" detail="الأمواج والمؤثرات" enabled={sound} onToggle={toggleSound} />
      <SettingRow icon={<Waves />} title="الحركة" detail="حركة البحر والسفن" enabled={motion} onToggle={toggleMotion} />
      <SettingRow icon={<Eye />} title="وضوح أعلى" detail="نصوص أوضح" enabled={contrast} onToggle={toggleContrast} />
    </section>
    {admin && <Link to="/admin" className="helm-admin"><Settings2 size={16} />استوديو السفن (للإدارة)</Link>}
    <button type="button" className="helm-logout" onClick={logout}><LogOut size={16} />تسجيل الخروج</button>
  </main>;
}

function SettingRow({ icon, title, detail, enabled, onToggle }: { icon: React.ReactNode; title: string; detail: string; enabled: boolean; onToggle: () => void }) {
  return <button type="button" className={`helm-lever ${enabled ? "is-on" : ""}`} onClick={onToggle} role="switch" aria-checked={enabled} aria-label={title}><span className="helm-lever-icon">{icon}</span><strong>{title}</strong><small>{detail}</small><i className="helm-lever-state">{enabled ? "مفعّل" : "متوقف"}</i></button>;
}
