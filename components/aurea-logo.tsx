// Aurea logo mark: a one-line A that sweeps forward into an arrow.
// The A uses currentColor so it follows the active theme; the arrow stays gold.
export function AureaLogo({ size = 28, className = "aurea-logo" }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="22 18 88 88" aria-hidden="true" focusable="false">
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={8}>
        <path d="M32 100 C32 56 44 24 58 24 C72 24 84 56 84 86 C84 96 78 100 70 100 C58 100 50 92 50 80 C50 66 58 56 68 50" stroke="currentColor" />
        <path d="M68 50 C78 44 90 42 102 38 M93.1 33.5 L102 38 L97.5 46.9" stroke="#D9A441" />
      </g>
    </svg>
  );
}
