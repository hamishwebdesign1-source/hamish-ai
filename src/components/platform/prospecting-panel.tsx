// Studio Design Audit, Tier 1 build item #3 — this file used to be the
// whole 1,920-line Prospects page implementation (19 top-level
// components/functions, no internal file boundaries — the single
// highest-traffic page's own maintainability risk, per the audit). Split
// into src/components/platform/prospecting/ along its own already-visible
// seams (ProspectCard, the sales-kit and website-mockup sections, the
// research summary/score bars, and the per-row *Control components), with
// this file kept as the stable re-export so prospects/page.tsx and
// prospecting-panel.test.tsx don't need to know it moved.
export { ProspectingPanel } from "./prospecting/prospecting-panel";
export { ContactTrackingControl } from "./prospecting/contact-tracking-control";
export { PipelineStageControl } from "./prospecting/pipeline-stage-control";
export { DealValueControl } from "./prospecting/deal-value-control";
