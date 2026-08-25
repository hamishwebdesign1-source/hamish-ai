import { Check } from "lucide-react";
import { Wordmark } from "@/components/logo";

// The signup screen's brand half — deliberately not a repeat of the
// marketing site's Edinburgh drone footage (parallax-layer.tsx): a
// focused conversion screen isn't the place for a looping video pulling
// attention, and reusing the exact same hero everywhere it appears would
// dilute it rather than reinforce the brand. Built entirely from the
// Facet mark's own geometry instead (logo.tsx's four polygons, scaled up
// and thinned to an outline) — the one visual element that's actually,
// distinctly HamishAI's own, not a generic "AI" motif borrowed from
// every other AI product's marketing page.
//
// The ambient motion (very slow rotation, .motif-anim) is the brief's
// "tasteful AI-native touch" — deliberately not a chat-typing-dots or
// thinking-spinner cliché, just the brand mark itself, alive at a speed
// too slow to distract from the actual form on the other side of the
// screen. Respects prefers-reduced-motion via the same .motif-anim
// kill-switch every other animated motif on the site already uses
// (globals.css) — nothing bespoke to this page.
function AmbientFacet() {
  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden="true"
      className="motif-anim absolute -right-16 -bottom-24 size-[420px] text-white/[0.07] md:size-[520px]"
      style={{ animation: "motif-spin 90s linear infinite" }}
    >
      <polygon points="60,16 60,60 24,60" fill="none" stroke="currentColor" strokeWidth="0.5" />
      <polygon points="60,16 96,60 60,60" fill="none" stroke="currentColor" strokeWidth="0.5" />
      <polygon points="96,60 60,104 60,60" fill="none" stroke="currentColor" strokeWidth="0.5" />
      <polygon points="60,60 60,104 24,60" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

const trustPoints = ["7 days free, no card required", "Set up your agency in minutes", "Your data stays yours — export or delete any time"];

export function SignupBrandPanel() {
  return (
    <div className="relative isolate hidden overflow-hidden bg-[#0d1420] lg:flex lg:w-[44%] lg:flex-col lg:justify-between lg:p-12 xl:w-2/5">
      <AmbientFacet />
      <Wordmark className="relative font-heading text-xl font-semibold tracking-tight text-white" />

      <div className="relative">
        <h1 className="max-w-sm font-heading text-4xl font-semibold text-balance text-white">Welcome to HamishAI.</h1>
        <p className="mt-4 max-w-sm text-balance text-white/60">
          Build, sell and deliver your AI agency from one intelligent platform.
        </p>
        <ul className="mt-8 space-y-2.5">
          {trustPoints.map((point) => (
            <li key={point} className="flex items-center gap-2.5 text-sm text-white/70">
              <Check className="size-3.5 shrink-0 text-accent" />
              {point}
            </li>
          ))}
        </ul>
      </div>

      {/* Empty relative div holds the flex-justify-between spacing rhythm
          (wordmark top, copy middle-low, nothing bottom) without a third
          real element competing for attention. */}
      <div />
    </div>
  );
}

// Mobile's own treatment, not the desktop panel's leftover scraps: a
// compact dark band (logo + one line) instead of the full value-prop
// stack, which would eat most of a phone's viewport before the actual
// form even appears. The ambient Facet motif is deliberately smaller and
// cropped tighter here — full-size, it would either overwhelm this
// much less vertical space or need to shrink so much it stops reading
// as the mark at all.
export function SignupBrandPanelMobile() {
  return (
    <div className="relative isolate flex items-center justify-between overflow-hidden bg-[#0d1420] px-6 py-6 lg:hidden">
      <svg
        viewBox="0 0 120 120"
        aria-hidden="true"
        className="motif-anim absolute -top-10 -right-10 size-40 text-white/[0.08]"
        style={{ animation: "motif-spin 90s linear infinite" }}
      >
        <polygon points="60,16 60,60 24,60" fill="none" stroke="currentColor" strokeWidth="0.5" />
        <polygon points="60,16 96,60 60,60" fill="none" stroke="currentColor" strokeWidth="0.5" />
        <polygon points="96,60 60,104 60,60" fill="none" stroke="currentColor" strokeWidth="0.5" />
        <polygon points="60,60 60,104 24,60" fill="currentColor" opacity="0.5" />
      </svg>
      <div className="relative">
        <Wordmark className="font-heading text-lg font-semibold tracking-tight text-white" />
        <p className="mt-1 text-sm text-white/60">Build, sell and deliver your AI agency.</p>
      </div>
    </div>
  );
}
