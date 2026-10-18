import type { WineType } from "@shared/taste-types.ts";
import { cn } from "@/lib/utils";

const FILL: Record<WineType, [string, string]> = {
  red: ["#7a2a43", "#3d1222"],
  white: ["#efe1b0", "#c9b06b"],
  rose: ["#f1b9b4", "#d9827c"],
  sparkling: ["#f3e6bf", "#c6a878"],
  sweet: ["#e8b85e", "#b9802c"],
  orange: ["#f0b27a", "#c97a3a"],
  other: ["#d6cbc0", "#a3968c"],
  unknown: ["#e4dace", "#b9ada3"],
};

/** Kleines Weinglas-Symbol in der Farbe der Weinart. */
export function WineGlyph({ type, className }: { type: WineType; className?: string }) {
  const [a, b] = FILL[type] ?? FILL.unknown;
  const gid = `g-${type}`;
  return (
    <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl bg-ivory shadow-[inset_0_0_0_1px_var(--color-line)]", className)}>
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={a} />
            <stop offset="1" stopColor={b} />
          </linearGradient>
        </defs>
        <path d="M6.5 3h11c.4 5.6-1.8 9.4-5.5 10-3.7-.6-5.9-4.4-5.5-10Z" fill="none" stroke="#887d77" strokeWidth="1.1" />
        <path d="M6.9 7.2c1.7-.6 3.4.6 5.1 0s3.4-.6 5.1 0c-.3 3.3-2.1 5.4-5.1 5.8-3-.4-4.8-2.5-5.1-5.8Z" fill={`url(#${gid})`} />
        {type === "sparkling" && (
          <>
            <circle cx="10.5" cy="9.5" r=".6" fill="#fff" />
            <circle cx="13" cy="8.6" r=".5" fill="#fff" />
            <circle cx="12" cy="11" r=".45" fill="#fff" />
          </>
        )}
        <path d="M12 13v6m-3 2h6" stroke="#887d77" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    </span>
  );
}
