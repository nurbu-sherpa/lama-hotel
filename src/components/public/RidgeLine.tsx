/** Decorative mountain ridge silhouette used as a quiet section transition. */
export function RidgeLine({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1440 140" preserveAspectRatio="none" aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M0 140V96l70-22 58 16 84-46 66 30 52-14 92-50 70 40 60-12 88 34 70-26 74 30 92-58 68 42 56-10 82 30 64-20 78 24 76-36 60 26 70-12 70 22v52Z"
      />
    </svg>
  );
}
