import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Crown, Flag, Loader2, LogOut, Plus, Shield, Swords, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CaptainAvatar } from "@/components/GameSprite";
import { usePlayer } from "@/hooks/usePlayer";
import { playSfx } from "@/lib/sound";
import {
  EMBLEMS,
  TRIBE_QUESTS,
  addContribution,
  createTribe,
  emblemSrc,
  joinTribe,
  leaveTribe,
  listMembers,
  listTribes,
  myMembership,
  promoteMember,
  rankLabel,
  type MemberRow,
  type Tribe,
  type TribeMember,
} from "@/lib/tribes";

export const Route = createFileRoute("/tribes")({
  head: () => ({
    meta: [
      { title: "مجلس الأساطيل — خليج القراصنة" },
      { name: "description", content: "انضم إلى قبيلة، ارتقِ في الرتب، أنجز مهام القبيلة وتصدّر أقوى المجموعات في خليج القراصنة." },
      { property: "og:title", content: "مجلس الأساطيل — خليج القراصنة" },
      { property: "og:description", content: "قبائل القراصنة: انضمام، ترقيات، مهام يومية وقائمة متصدرين." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TribesPage,
});

export function TribesPage() {
  const { player } = usePlayer();
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [mine, setMine] = useState<TribeMember | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [motto, setMotto] = useState("");
  const [emblem, setEmblem] = useState(EMBLEMS[0]?.id ?? "skull");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listTribes();
      setTribes(list);
      if (player) {
        const m = await myMembership(player.id);
        setMine(m);
        setMembers(m ? await listMembers(m.tribe_id) : []);
      } else { setMine(null); setMembers([]); }
    } catch { setError("ما قدرنا نفتح المجموعات، حاول مرة ثانية."); }
    finally { setLoading(false); }
  }, [player]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const myTribe = mine ? tribes.find((t) => t.id === mine.tribe_id) ?? null : null;
  const isLeader = !!(player && myTribe && myTribe.owner_id === player.id);

  const doCreate = async () => {
    if (!player) return;
    setError(null);
    playSfx("click", 0.7);
    const res = await createTribe(player.id, name, emblem, motto);
    if (res.error) return setError(res.error);
    setCreating(false);
    setName("");
    setMotto("");
    void refresh();
  };

  const [tab, setTab] = useState<"fleets" | "mine">("fleets");
  const view = myTribe && tab === "mine" ? "mine" : "fleets";

  return (
    <main className="council" dir="rtl">
      <header className="council-top">
        <Link to="/" className="council-back" aria-label="رجوع"><ArrowRight size={18} /></Link>
        <div className="council-switch" role="tablist">
          <button type="button" role="tab" aria-selected={view === "fleets"} onClick={() => setTab("fleets")}><Flag size={15} />الأساطيل</button>
          <button type="button" role="tab" aria-selected={view === "mine"} disabled={!myTribe} onClick={() => setTab("mine")}><Shield size={15} />أسطولي</button>
        </div>
        {!myTribe && <button type="button" className="council-charter-btn" disabled={!player} onClick={() => setCreating(true)}><Plus size={16} />ارفع رايتك</button>}
      </header>

      {error && <div className="council-error" role="alert">{error}<button type="button" onClick={() => void refresh()}>حاول مرة ثانية</button></div>}

      {loading ? (
        <div className="council-loading"><Loader2 className="animate-spin" /></div>
      ) : view === "mine" && myTribe ? (
        <div className="council-mine">
          <section className="banner-hall">
            <img src={emblemSrc(myTribe.emblem)} alt="" />
            <div>
              <h2>{myTribe.name}</h2>
              <p>{myTribe.motto || "بدون شعار"}</p>
            </div>
            <dl>
              <div><dt>منزلتك</dt><dd>{rankLabel[mine?.rank ?? "member"] ?? mine?.rank}</dd></div>
              <div><dt>نقاطك</dt><dd>{mine?.contribution ?? 0}</dd></div>
              <div><dt>البحارة</dt><dd>{members.length}</dd></div>
            </dl>
          </section>
          <div className="council-columns">
            <section className="council-panel">
              <h3><Trophy size={15} />ساهم اليوم</h3>
              <div className="duty-grid">
                {TRIBE_QUESTS.map((q) => (
                  <button key={q.id} type="button" className="duty-tile" onClick={async () => { playSfx("click", 0.65); if (player) await addContribution(player.id, q.reward); void refresh(); }}>
                    <span>{q.label}</span><b>+{q.reward}</b>
                  </button>
                ))}
              </div>
            </section>
            <section className="council-panel">
              <h3><Swords size={15} />البحارة</h3>
              <ul className="crew-roll">
                {members.map((m) => (
                  <li key={m.id}>
                    <CaptainAvatar seed={m.players?.avatar_index ?? 0} className="crew-roll-face" />
                    <strong>{m.players?.name ?? "بحّار"}</strong>
                    <small className={`rank-chip rank-${m.rank}`}>{rankLabel[m.rank] ?? m.rank}</small>
                    <em>{m.contribution}</em>
                    {isLeader && m.rank !== "leader" && (
                      <button type="button" className="crew-roll-act" aria-label={m.rank === "member" ? "ترقية" : "تنزيل"} onClick={async () => { playSfx("click", 0.6); await promoteMember(m.id, m.rank === "member" ? "officer" : "member"); void refresh(); }}>
                        <Crown size={13} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <button type="button" className="council-leave" onClick={async () => { playSfx("click", 0.6); if (player) await leaveTribe(player.id); setTab("fleets"); void refresh(); }}><LogOut size={14} />مغادرة الأسطول</button>
        </div>
      ) : (
        <div className="banner-wall">
          {tribes.map((t, i) => (
            <article key={t.id} className={`banner-flag ${i < 3 ? `is-top top-${i + 1}` : ""} ${mine?.tribe_id === t.id ? "is-mine" : ""}`}>
              <span className="banner-place">{i + 1}</span>
              <img src={emblemSrc(t.emblem)} alt="" />
              <strong>{t.name}</strong>
              <small>{t.motto || "—"}</small>
              <b className="banner-score"><Trophy size={12} />{t.score}</b>
              {player && !mine && (
                <button type="button" className="banner-join" onClick={async () => { playSfx("click", 0.65); await joinTribe(player.id, t.id); void refresh(); }}>انضم</button>
              )}
            </article>
          ))}
          {tribes.length === 0 && <p className="council-empty">لا توجد أساطيل بعد — ارفع أول راية.</p>}
        </div>
      )}

      {creating && !myTribe && (
        <div className="charter-overlay" onClick={() => setCreating(false)}>
          <section className="charter" onClick={(e) => e.stopPropagation()}>
            <h2>ميثاق أسطول جديد</h2>
            <div className="charter-preview">
              <img src={emblemSrc(emblem)} alt="" />
              <strong>{name.trim() || "اسم أسطولك"}</strong>
              <small>{motto.trim() || "شعارك يظهر هنا"}</small>
            </div>
            <div className="charter-emblems">
              {EMBLEMS.map((e) => (
                <button key={e.id} type="button" aria-label={e.id} aria-pressed={e.id === emblem} onClick={() => setEmblem(e.id)}><img src={e.src} alt="" /></button>
              ))}
            </div>
            <input className="charter-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="اسم الأسطول" />
            <input className="charter-input" value={motto} onChange={(e) => setMotto(e.target.value)} maxLength={80} placeholder="شعار قصير (اختياري)" />
            {error && <p className="council-error">{error}</p>}
            <div className="charter-actions">
              <button type="button" className="charter-cancel" onClick={() => setCreating(false)}>إلغاء</button>
              <button type="button" className="charter-seal" disabled={name.trim().length < 2} onClick={doCreate}>اختم الميثاق</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
