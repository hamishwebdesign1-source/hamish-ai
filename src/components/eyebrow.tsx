export function Eyebrow({
  children,
  className = "",
  pulse = false,
}: {
  children: React.ReactNode;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 font-mono text-xs font-medium tracking-[0.15em] text-accent uppercase ${className}`}
    >
      <span className="relative flex size-1.5 shrink-0">
        {pulse && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-75" />
        )}
        <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
      </span>
      {children}
    </div>
  );
}
