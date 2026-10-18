import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Editoriale Bildkomposition für den Willkommens-Screen:
 * ein Rundbogen in Burgundy, ein Weinglas in feinen Goldlinien, Trauben als Kreise.
 * Reines SVG – keine externen Bilder, gestochen scharf auf jedem Display.
 */
export function HeroArt({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className={cn("relative aspect-[4/5] w-full", className)}>
      <svg viewBox="0 0 320 400" className="absolute inset-0 h-full w-full" role="img" aria-label="Ein Glas Rotwein in einem eleganten Bogen">
        <defs>
          <linearGradient id="arch" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor="#7a3a50" />
            <stop offset="0.55" stopColor="#531f32" />
            <stop offset="1" stopColor="#2a0f1b" />
          </linearGradient>
          <radialGradient id="moon" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#e3d3b5" stopOpacity="0.55" />
            <stop offset="1" stopColor="#e3d3b5" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="wine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9b3b55" />
            <stop offset="1" stopColor="#3d1222" />
          </linearGradient>
          <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#faf7f2" stopOpacity="0.32" />
            <stop offset="0.5" stopColor="#faf7f2" stopOpacity="0.04" />
            <stop offset="1" stopColor="#faf7f2" stopOpacity="0.2" />
          </linearGradient>
          <clipPath id="archClip">
            <path d="M30 400V160C30 88 88 30 160 30s130 58 130 130v240Z" />
          </clipPath>
          <clipPath id="bowl">
            <path d="M118 120h84c4 40-2 82-42 92-40-10-46-52-42-92Z" />
          </clipPath>
        </defs>

        <path d="M30 400V160C30 88 88 30 160 30s130 58 130 130v240Z" fill="url(#arch)" />
        <g clipPath="url(#archClip)">
          <circle cx="160" cy="132" r="120" fill="url(#moon)" />
          <path d="M-10 330c80-30 160-30 340 0v80H-10Z" fill="#2a0f1b" opacity="0.55" />
          <path d="M-10 350c90-22 200-18 340 6" stroke="#c6a878" strokeOpacity="0.35" fill="none" />
        </g>
        <path d="M44 400V160c0-64 52-116 116-116s116 52 116 116v240" fill="none" stroke="#c6a878" strokeOpacity="0.5" strokeWidth="1" />

        {/* Weinglas */}
        <g>
          <path d="M112 104h96c5 50-4 104-48 116-44-12-53-66-48-116Z" fill="url(#glass)" stroke="#e3d3b5" strokeOpacity="0.9" strokeWidth="1.4" />
          <g clipPath="url(#bowl)">
            <motion.path
              d="M40 158c20-8 40 8 60 0s40-8 60 0 40 8 60 0 40-8 60 0 40 8 60 0v80H40Z"
              fill="url(#wine)"
              animate={reduce ? undefined : { x: [0, -60, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            />
          </g>
          <path d="M160 220v92" stroke="#e3d3b5" strokeWidth="1.6" />
          <path d="M126 318c10-6 58-6 68 0" stroke="#e3d3b5" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M126 116c-2 30 2 62 16 80" stroke="#faf7f2" strokeOpacity="0.55" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </g>

        {/* Trauben */}
        {[
          [62, 252, 11], [80, 262, 12], [70, 280, 12], [92, 282, 11], [58, 300, 10], [82, 302, 11], [72, 322, 10],
        ].map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill={i % 2 ? "#c6a878" : "#e3d3b5"} opacity={0.18 + (i % 3) * 0.08} />
        ))}
        <path d="M76 246c4-14 14-20 26-22" stroke="#c6a878" strokeOpacity="0.6" fill="none" strokeLinecap="round" />

        {/* Sterne / Funkeln */}
        {[
          [230, 92], [252, 140], [214, 70],
        ].map(([x, y], i) => (
          <motion.circle
            key={i}
            cx={x}
            cy={y}
            r={1.6}
            fill="#e3d3b5"
            animate={reduce ? undefined : { opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.7 }}
          />
        ))}
      </svg>
    </div>
  );
}
