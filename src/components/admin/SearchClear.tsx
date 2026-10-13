import Link from "next/link";

const CLEAR_BTN = "absolute top-1/2 right-3 -translate-y-1/2 p-1 text-gray-700 peer-placeholder-shown:hidden";

function ClearIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/**
 * "×" inside a search input (put it right after an input with `peer pr-10`, inside a `relative` wrapper).
 * Hidden while the input is empty. With an active search, reset would restore `q`, so it links to the
 * unfiltered list instead; otherwise it just clears the typed text.
 */
export function SearchClear({ q, clearHref }: { q: string; clearHref: string }) {
  return q ? (
    <Link href={clearHref} aria-label="Clear search" className={CLEAR_BTN}>
      <ClearIcon />
    </Link>
  ) : (
    <button type="reset" aria-label="Clear search" className={CLEAR_BTN}>
      <ClearIcon />
    </button>
  );
}
