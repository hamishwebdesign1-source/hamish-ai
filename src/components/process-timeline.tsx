"use client";

import { useState } from "react";

type Step = {
  step: string;
  title: string;
  body: string;
};

export function ProcessTimeline({ steps }: { steps: Step[] }) {
  const [active, setActive] = useState(0);

  return (
    <div className="mt-10">
      <div className="flex items-start gap-2">
        {steps.map((s, i) => (
          <button
            key={s.step}
            type="button"
            onClick={() => setActive(i)}
            onMouseEnter={() => setActive(i)}
            className="group flex flex-1 flex-col items-start text-left"
            aria-current={active === i}
          >
            <span
              className={
                active === i
                  ? "flex size-9 items-center justify-center rounded-full bg-accent font-mono text-sm font-medium text-accent-foreground transition-colors"
                  : "flex size-9 items-center justify-center rounded-full border border-border font-mono text-sm text-muted-foreground transition-colors group-hover:border-accent/50"
              }
            >
              {s.step}
            </span>
            <span
              className={
                active === i
                  ? "mt-3 h-1 w-full rounded-full bg-accent transition-colors"
                  : "mt-3 h-1 w-full rounded-full bg-border transition-colors"
              }
            />
            <span
              className={
                active === i
                  ? "mt-3 font-heading text-base font-medium text-foreground"
                  : "mt-3 font-heading text-base font-medium text-muted-foreground"
              }
            >
              {s.title}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 min-h-16 rounded-xl border border-border bg-secondary/40 p-6">
        <p className="text-muted-foreground">{steps[active].body}</p>
      </div>
    </div>
  );
}
