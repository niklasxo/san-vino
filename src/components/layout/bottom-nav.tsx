import { House, ScanLine, Sparkles, Wine } from "lucide-react";
import { motion } from "motion/react";
import { NavLink, useLocation } from "react-router";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/", label: "Home", icon: House, match: (p: string) => p === "/" },
  { to: "/scannen", label: "Scannen", icon: ScanLine, match: (p: string) => p.startsWith("/scan") },
  { to: "/weine", label: "Meine Weine", icon: Wine, match: (p: string) => p.startsWith("/weine") },
  { to: "/geschmack", label: "Mein Geschmack", icon: Sparkles, match: (p: string) => p.startsWith("/geschmack") },
];

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Hauptnavigation" className="fixed inset-x-0 bottom-0 z-40 pb-safe">
      <div className="pointer-events-none absolute inset-0 border-t border-line/70 bg-ivory/85 backdrop-blur-xl backdrop-saturate-150" />
      <ul className="relative mx-auto flex max-w-xl items-stretch justify-around px-2">
        {ITEMS.map(({ to, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                aria-current={active ? "page" : undefined}
                className="group relative flex h-[62px] flex-col items-center justify-center gap-1 outline-none"
              >
                {active && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute top-0 h-[3px] w-8 rounded-full bg-burgundy"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
                <motion.span whileTap={{ scale: 0.86 }} className="grid place-items-center">
                  <Icon className={cn("size-[22px] transition-colors duration-200", active ? "text-burgundy" : "text-taupe group-hover:text-charcoal")} strokeWidth={active ? 2.1 : 1.7} />
                </motion.span>
                <span className={cn("text-[11px] font-medium tracking-wide transition-colors", active ? "text-burgundy" : "text-taupe")}>{label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
