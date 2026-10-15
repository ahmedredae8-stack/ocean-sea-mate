import { useMemo, useState } from "react";
import { Anchor, Check, Crown, Gem, Minus, Plus, Shield, ShipWheel, Swords, Users, X } from "lucide-react";

import { GameSprite } from "@/components/GameSprite";
import { ARMORS, CREWS, GEM_PACKS, WEAPONS } from "@/lib/items";
import { fleetCatalog } from "@/lib/fleetCatalog";
import { fmt } from "@/lib/ships";
import { currentPhase, phaseLabel, themes } from "@/lib/themes";
import { playSfx } from "@/lib/sound";
import { useArtwork } from "@/lib/artwork";
import { buyGear, buyShip, ownedShips } from "@/lib/harbor";
import { TradingFloor } from "@/components/TradingFloor";

const COIN = "https://project--356242e8-144f-42b3-8292-474399c324ac.lovable.app/__l5e/assets-v1/906f37c0-d530-4e50-a3ce-00deaaf40a02/coin.png";
const GEM = "https://project--356242e8-144f-42b3-8292-474399c324ac.lovable.app/__l5e/assets-v1/81b9318d-8399-478f-bd28-abec7665a1a6/gem.png";

type StoreTab = "gems" | "crew" | "weapons" | "armor" | "ships" | "worlds";
type Product = {
  id: string;
  title: string;
  desc: string;
  price: number;
  currency: "coin" | "gem";
  art: React.ReactNode;
  stat: { label: string; value: number; max: number; text: string };
};

/** Four ranks of the harbour guild, from deckhand to legend of the deep. */
const RANKS = [
  { id: "r1", label: "بحّار" },
  { id: "r2", label: "ربّان" },
  { id: "r3", label: "أميرال" },
  { id: "r4", label: "أسطورة الأعماق" },
] as const;

function rankOf(value: number, max: number) {
  const r = max ? value / max : 0;
  return RANKS[r > 0.75 ? 3 : r > 0.45 ? 2 : r > 0.2 ? 1 : 0];
}

const tabs = [
  { id: "ships" as const, label: "الأسطول", icon: ShipWheel },
  { id: "weapons" as const, label: "المدفعية", icon: Swords },
  { id: "crew" as const, label: "الطاقم", icon: Users },
  { id: "armor" as const, label: "التحصين", icon: Shield },
  { id: "gems" as const, label: "الكنوز", icon: Gem },
  { id: "worlds" as const, label: "المرافئ", icon: Crown },
];

const tabLine: Record<StoreTab, string> = {
  ships: "أحواض بناء السفن — اختر هيكلك القادم",
  weapons: "مستودع البارود — قوة نارية لكل غارة",
  crew: "حانة الميناء — رجال يعرفون البحر",
  armor: "ورشة الحدادة — صفائح تصدّ القذائف",
  gems: "خزنة الجواهر — حزم الكنوز النادرة",
  worlds: "خرائط المرافئ — بدّل عالمك مجاناً",
};

export function GameStore({ activeId, onSelect, onClose, initialTab = "ships" }: { activeId: string; onSelect: (id: string) => void; onClose: () => void; initialTab?: StoreTab }) {
  const [tab, setTab] = useState<StoreTab>(initialTab);
  const { map: art, ready } = useArtwork();

  const products = useMemo<Product[]>(() => {
    const pic = (id: string, atlas: "weapon" | "crew" | "armor", i: number) =>
      art[`${id}:idle`] ? <img src={art[`${id}:idle`]} alt="" loading="lazy" /> : <GameSprite atlas={atlas} index={i} />;
    if (tab === "weapons") {
      const max = Math.max(...WEAPONS.map((w) => w.power));
      return WEAPONS.map((w, i) => ({ id: w.id, title: w.name, desc: w.desc, price: w.price, currency: w.currency, art: pic(w.id, "weapon", i), stat: { label: "قوة الضربة", value: w.power, max, text: fmt(w.power * 1000) } }));
    }
    if (tab === "crew") {
      const max = Math.max(...CREWS.map((c) => c.hours));
      return CREWS.map((c, i) => ({ id: c.id, title: c.name, desc: c.desc, price: c.price, currency: c.currency, art: pic(c.id, "crew", i), stat: { label: "مدة الخدمة", value: c.hours, max, text: `${c.hours} ساعة` } }));
    }
    if (tab === "armor") {
      const max = Math.max(...ARMORS.map((a) => a.defense));
      return ARMORS.map((a, i) => ({ id: a.id, title: a.name, desc: a.desc, price: a.price, currency: a.currency, art: pic(a.id, "armor", i), stat: { label: "صلابة الدرع", value: a.defense, max, text: fmt(a.defense * 500) } }));
    }
    return [];
  }, [tab, art, ready]);

  return (
    <div className="cabin-overlay" role="dialog" aria-modal="true" aria-label="الترسانة الملكية" onClick={onClose}>
      <section dir="rtl" className="cabin-frame arsenal" onClick={(e) => e.stopPropagation()}>
        <span className="cabin-rivets" aria-hidden="true" />
        <header className="cabin-head">
          <span className="cabin-emblem" aria-hidden="true"><Anchor className="h-4 w-4" /></span>
          <div className="cabin-title">
            <h2>الترسانة الملكية</h2>
            <p>{tabLine[tab]}</p>
          </div>
          <button type="button" className="cabin-close" aria-label="إغلاق الترسانة" onClick={onClose}><X className="h-4 w-4" /></button>
        </header>

        <nav className="arsenal-rail" aria-label="أجنحة الترسانة">
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => { playSfx("click", 0.55); setTab(t.id); }} className={tab === t.id ? "arsenal-tab is-on" : "arsenal-tab"} aria-pressed={tab === t.id}>
              <t.icon /><span>{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="cabin-body arsenal-body win-embed">
          {tab === "ships" && <TradingFloor start="ship" locked />}
          {tab === "worlds" && (
            <>
              <p className="arsenal-note">العالم الآن في {phaseLabel(currentPhase())} ويتبدّل تلقائيًا كل ٦ ساعات</p>
              <ul className="arsenal-ports">
                {themes.map((theme) => (
                  <li key={theme.id}>
                    <button type="button" onClick={() => onSelect(theme.id)} className={theme.id === activeId ? "arsenal-port is-on" : "arsenal-port"}>
                      <span className="arsenal-port-art"><img src={theme.day.poster} alt="" loading="lazy" /><img src={theme.night.poster} alt="" loading="lazy" /></span>
                      <span className="arsenal-port-copy"><strong>{theme.name}</strong><small>{theme.id === activeId ? "مرفأك الحالي" : "مجاني"}</small></span>
                      {theme.id === activeId && <Check className="arsenal-port-check" />}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {tab === "gems" && <Treasury art={art} />}
          {products.length > 0 && <Showcase key={tab} items={products} />}
        </div>
      </section>
    </div>
  );
}

function Treasury({ art }: { art: Record<string, string> }) {
  return (
    <ul className="arsenal-vault">
      {GEM_PACKS.map((pack, index) => (
        <li key={pack.id} className={`arsenal-chest rank-${rankOf(index + 1, GEM_PACKS.length).id}`}>
          <span className="arsenal-chest-art">{art[`gem-${pack.id}:idle`] ? <img src={art[`gem-${pack.id}:idle`]} alt="" /> : <GameSprite atlas="gem" index={index} />}</span>
          <strong>{fmt(pack.gems)}<img src={GEM} alt="" /></strong>
          <small>{pack.bonus > 0 ? `+${fmt(pack.bonus)} هدية · ` : ""}VIP +{pack.vip}</small>
          <button type="button" disabled className="arsenal-chest-buy" title="الدفع غير متاح حالياً">{pack.price}</button>
        </li>
      ))}
    </ul>
  );
}

function Showcase({ items }: { items: Product[] }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pickedId, setPickedId] = useState(items[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const picked = items.find((i) => i.id === pickedId) ?? items[0];
  if (!picked) return null;
  const rank = rankOf(picked.stat.value, picked.stat.max);
  const total = picked.price * qty;

  const buy = () => {
    playSfx("click", 0.8);
    const err = buyGear(picked.id, picked.price, picked.currency, qty);
    setMsg(err ? { ok: false, text: err } : { ok: true, text: `${picked.title} ×${qty} وصل إلى مخزن العتاد` });
  };

  return (
    <div className="arsenal-show">
      <article className={`arsenal-stage rank-${rank.id}`}>
        <div className="arsenal-stage-art">
          <span className="arsenal-halo" aria-hidden="true" />
          {picked.art}
        </div>
        <div className="arsenal-stage-copy">
          <span className="arsenal-rank">{rank.label}</span>
          <h3>{picked.title}</h3>
          <p>{picked.desc}</p>
          <div className="arsenal-meter">
            <span>{picked.stat.label}</span><b>{picked.stat.text}</b>
            <i style={{ "--fill": `${Math.round((picked.stat.value / picked.stat.max) * 100)}%` } as React.CSSProperties} />
          </div>
        </div>
      </article>

      <ul className="arsenal-grid">
        {items.map((item) => {
          const r = rankOf(item.stat.value, item.stat.max);
          return (
            <li key={item.id}>
              <button type="button" onClick={() => { setPickedId(item.id); setQty(1); setMsg(null); playSfx("click", 0.5); }} className={`arsenal-card rank-${r.id} ${item.id === picked.id ? "is-on" : ""}`}>
                <span className="arsenal-card-art">{item.art}</span>
                <strong>{item.title}</strong>
                <span className="arsenal-card-price"><img src={item.currency === "coin" ? COIN : GEM} alt="" />{item.price === 0 ? "مجاني" : fmt(item.price)}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <footer className="arsenal-dock">
        <div className="arsenal-qty">
          <button type="button" aria-label="إنقاص" onClick={() => setQty((n) => Math.max(1, n - 1))}><Minus /></button>
          <b>{qty}</b>
          <button type="button" aria-label="زيادة" onClick={() => setQty((n) => Math.min(99, n + 1))}><Plus /></button>
        </div>
        <button type="button" className="arsenal-buy" onClick={buy}>
          <span>تجهيز</span>
          <em><img src={picked.currency === "coin" ? COIN : GEM} alt="" />{total === 0 ? "مجاني" : fmt(total)}</em>
        </button>
      </footer>
      {msg && <p className={msg.ok ? "arsenal-flash" : "arsenal-flash is-err"} role="status">{msg.text}</p>}
    </div>
  );
}

// Ship purchases live in TradingFloor; keep these helpers referenced for parity.
void buyShip; void ownedShips; void fleetCatalog;
