// Single source of truth for the Lab 02a distillation pipeline walkthrough.
//
// Faithfulness principle (see design spec): every number here is sourced from
// the real dataset, never invented.
//   EVENT_COUNT      = length of src/lib/data/workshop/events_enriched.json
//                      (== data/pre_distillation_events.json)            -> 3904
//   CANDIDATE_COUNT  = length of src/lib/data/workshop/candidates_enriched.json
//                      (== data/post_distillation_candidates.json)        -> 11
//   POPULATION_HOST_COUNT = population_host_count from the dataset (200 monitored hosts).
//      Per-candidate host counts are derived from destination_rarity using the lesson's
//      own definition: rarity ≈ 1 − hosts/population  ⇒  hosts = (1 − rarity) × population.
//      This reproduces BEA-001's real value (rarity 1.0 → 1 of 200) without hardcoding.

export const EVENT_COUNT = 3904;
export const CANDIDATE_COUNT = 11;
export const POPULATION_HOST_COUNT = 200;

export type PipelineStepId =
  | "housekeeping"
  | "correlation"
  | "scoring"
  | "lfa"
  | "enrichment";

export interface PipelineStep {
  id: PipelineStepId;
  /** 1-based position in the spine. The walkthrough also has a step 0 = Raw. */
  index: number;
  label: string;
  /** Short label for the data-state the step produces. */
  produces: string;
  caption: string;
  /** Scoring is the event -> candidate boundary. */
  isBoundary: boolean;
  /** Which count the funnel reports at this step. */
  funnelStage: "events" | "candidates";
}

/** Caption shown at step 0, before any processing step has run. */
export const RAW_CAPTION =
  "Raw telemetry — a flood of conn.log rows, the beacon buried in the noise. Press Next to begin distillation.";

export const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: "housekeeping",
    index: 1,
    label: "Housekeeping",
    produces: "Pre-Enrichment Events",
    caption:
      "Step 1 of 5 — Housekeeping: field names normalize (id.orig_h → src_ip) and duplicates collapse. Same data, shared vocabulary. Still events.",
    isBoundary: false,
    funnelStage: "events",
  },
  {
    id: "correlation",
    index: 2,
    label: "Correlation + Event Enrichment",
    produces: "Post-Enrichment Events",
    caption:
      "Step 2 of 5 — Correlation: joins reveal the process behind the connection (conn.log → Sysmon EID3 → EID1). The chain assembles: Code.exe → powershell → svchost-health.exe. Still events.",
    isBoundary: false,
    funnelStage: "events",
  },
  {
    id: "scoring",
    index: 3,
    label: "Candidate Scoring",
    produces: "Pre-Enrichment Candidate",
    caption:
      "Step 3 of 5 — Scoring: hundreds of events grouped by (src, dst, port) collapse into ONE candidate, scored from weighted statistical features. This is the event → candidate boundary.",
    isBoundary: true,
    funnelStage: "candidates",
  },
  {
    id: "lfa",
    index: 4,
    label: "Least Frequency Analysis",
    produces: "Candidate + rarity",
    caption:
      "Step 4 of 5 — Least Frequency Analysis: how many hosts across the fleet talked to this destination? Rarer destinations are more interesting.",
    isBoundary: false,
    funnelStage: "candidates",
  },
  {
    id: "enrichment",
    index: 5,
    label: "Candidate Enrichment",
    produces: "Post-Enrichment Candidate",
    caption:
      "Step 5 of 5 — Candidate Enrichment: context the scorer never needed — threat intel, GeoIP, first-seen — looked up on a handful of candidates, not every event. The record is complete.",
    isBoundary: false,
    funnelStage: "candidates",
  },
];

export const TOTAL_STEPS = PIPELINE_STEPS.length; // 5
export const FINAL_STEP = TOTAL_STEPS; // currentStep value at the complete state
