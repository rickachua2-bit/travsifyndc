import logoMark from "@/assets/travsify-logo-mark.png";

export function Logo({
  className = "",
  invert = false,
  showWordmark = true,
}: {
  className?: string;
  invert?: boolean;
  showWordmark?: boolean;
}) {
  const textColor = invert ? "text-white" : "text-primary";
  const subColor = invert ? "text-white/60" : "text-muted-foreground";

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src={logoMark}
        alt="Travsify logo"
        width={36}
        height={36}
        className="h-9 w-9 shrink-0 object-contain dark:invert dark:brightness-0"
      />
      {showWordmark && (
        <div className={`leading-none ${textColor}`}>
          <div className="font-display text-lg font-extrabold tracking-tight">
            TRAVSIFY
          </div>
          <div
            className={`mt-0.5 text-[9px] font-semibold tracking-[0.25em] ${subColor}`}
          >
            ONE TRAVEL API
          </div>
        </div>
      )}
    </div>
  );
}
