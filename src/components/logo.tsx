export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <polygon points="60,16 60,60 24,60" fill="currentColor" opacity="0.45" />
      <polygon points="60,16 96,60 60,60" fill="currentColor" opacity="0.85" />
      <polygon points="96,60 60,104 60,60" fill="currentColor" opacity="0.65" />
      <polygon points="60,60 60,104 24,60" fill="var(--gradient-violet)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span>Hamish</span>
      <span className="gradient-text">AI</span>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark className="size-6 text-primary" />
      <Wordmark className="font-heading text-xl font-semibold tracking-tight" />
    </span>
  );
}
