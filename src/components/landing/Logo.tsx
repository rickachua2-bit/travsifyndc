export function Logo({ className = "", invert = false }: { className?: string; invert?: boolean }) {
  const color = invert ? "text-white" : "text-primary";
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 32 32" className={`h-7 w-7 ${invert ? "text-accent" : "text-accent"}`} fill="none">
        <path d="M4 20 L16 4 L28 20 L22 20 L16 12 L10 20 Z" fill="currentColor" />
        <path d="M8 26 L24 26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <div className={`leading-none ${color}`}>
        <div className="font-display text-lg font-bold tracking-tight">TRAVSIFY</div>
        <div className={`text-[10px] font-semibold tracking-[0.2em] ${invert ? "text-white/70" : "text-muted-foreground"}`}>NDC</div>
      </div>
    </div>
  );
}
