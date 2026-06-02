# AntiSyphon Workshop Reference App

This is the tested SvelteKit reference implementation for the June 2026 AntiSyphon workshop labs.

It includes:

- Lab 01 streaming state demo with a mock provider fallback
- Lab 02 distillation explorer using generated connection-pair data
- Lab 03 TAO candidate triage with a six-tool in-process surface
- Lab 04 Google Threat Intelligence MCP connection/discovery/call flow
- Lab 05 detection skill catalog loading from `skills/detection/`
- Lab 06 assessment skill execution with injected context
- Lab 07 prior-investigation RAG over the generated raw vector store
- Lab 08 fan-out/fan-in orchestration
- Lab 09 knowledge graph shared state
- Lab 10 graph-grounded narrative synthesis
- Lab 11 feedback, final report, and notification hook
- Lab 12 deterministic eval harness
- Lab 13 complete hunt capstone
- Lab 14 further learning and production extension paths

The app defaults to `LLM_PROVIDER=mock` when no `.env` file is present, so it can be checked, built, and smoke-tested without API keys.

## Setup

```bash
npm ci
npm run check
npm run build
npm run dev -- --host 127.0.0.1 --port 5174
```

Open `http://127.0.0.1:5174/` and navigate to any lab.

## Data

The app consumes the generated workshop artifacts in:

- `data/candidates_enriched.json`
- `data/events_enriched.json`
- `data/rag/chunks.json`
- `data/rag/vectors.bin`
- `skills/`
- `context/`
- `graph/`

The same client-safe candidate/chunk data is mirrored under `src/lib/data/workshop/` for Svelte pages that render static summaries.
