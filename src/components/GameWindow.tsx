import { X } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";

import { playSfx } from "@/lib/sound";

type Props = {
  title: string;
  hint?: string;
  onClose: () => void;
  children: ReactNode;
  /** Kept for call-site compatibility; every cabin now shares one size. */
  size?: "md" | "lg" | "xl";
};

/**
 * The "captain's cabin": every destination rises from the harbour floor with
 * the same size and shape, so the upper sea and the fleet stay visible.
 */
export function GameWindow({ title, hint, onClose, children }: Props) {
  const close = () => {
    playSfx("click", 0.5);
    onClose();
  };

  // Embedded screens may still carry a "back to /" link: treat it as close.
  const interceptBack = (e: MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest("a");
    if (anchor && anchor.getAttribute("href") === "/") {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  };

  return (
    <div className="cabin-overlay" role="dialog" aria-modal="true" aria-label={title} onClick={close}>
      <section dir="rtl" className="cabin-frame" onClick={(e) => e.stopPropagation()}>
        <span className="cabin-rivets" aria-hidden="true" />
        <header className="cabin-head">
          <span className="cabin-emblem" aria-hidden="true">⚓</span>
          <div className="cabin-title">
            <h2>{title}</h2>
            {hint && <p>{hint}</p>}
          </div>
          <button type="button" className="cabin-close" aria-label="إغلاق" onClick={close}>
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="win-embed cabin-body" onClickCapture={interceptBack}>
          {children}
        </div>
      </section>
    </div>
  );
}
