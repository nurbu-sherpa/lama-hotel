import { ViewTransition } from "react";

/**
 * Templates re-mount on every navigation, so this <ViewTransition> runs its enter/exit animation
 * for each admin page change (gentle fade + rise; see globals.css). No-op in browsers without
 * View Transitions support and instant under prefers-reduced-motion.
 */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      {children}
    </ViewTransition>
  );
}
