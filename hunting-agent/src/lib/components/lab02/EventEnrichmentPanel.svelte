<script lang="ts">
  import type { ConnectionPair } from "$lib/data/lab02/types";

  let { pair }: { pair: ConnectionPair } = $props();

  let a = $derived(pair.candidate.attribution);
  let bizProp = $derived(pair.candidate.enrichment.business_hours_proportion);

  // A few well-known living-off-the-land binaries. The connecting process is
  // checked against this list — a dropped/masquerade binary will not match.
  const LOLBAS = new Set([
    "powershell.exe",
    "rundll32.exe",
    "regsvr32.exe",
    "certutil.exe",
    "mshta.exe",
    "wmic.exe",
    "cscript.exe",
    "wscript.exe",
    "bitsadmin.exe",
    "msbuild.exe",
    "installutil.exe",
  ]);
  let lolbasMatch = $derived(LOLBAS.has(a.process_name.toLowerCase()));

  let accountType = $derived(
    /SYSTEM|NT AUTHORITY/i.test(a.user) ? "service account" : "interactive user",
  );
  let pathClass = $derived(
    /\\Temp\\|\\AppData\\/i.test(a.process_path)
      ? "user-writable path (suspicious)"
      : /System32|Program Files/i.test(a.process_path)
        ? "system / trusted path"
        : a.process_path === "multiple"
          ? "various"
          : "other",
  );
</script>

<section class="panel">
  <h3>Event Enrichment</h3>
  <p class="intro">Once correlation links each event to its process, enrichment stamps cheap, scorer-relevant labels onto every event — pure lookups, no inference. These labels are what the scoring stage reads.</p>

  <div class="grid">
    <div class="label">
      <span class="k">business hours</span>
      <strong>{(bizProp * 100).toFixed(0)}% of check-ins</strong>
      <small>Timestamp vs the business-hours window. Off-hours activity is weighted differently.</small>
    </div>
    <div class="label">
      <span class="k">account type</span>
      <strong>{accountType}</strong>
      <small>{a.user} — a service account scores differently than an interactive user.</small>
    </div>
    <div class="label">
      <span class="k">process path class</span>
      <strong>{pathClass}</strong>
      <small>{a.process_path} — user-writable locations are treated differently than trusted system paths.</small>
    </div>
    <div class="label">
      <span class="k">LOLBAS check</span>
      <strong>{lolbasMatch ? "match" : "no match"}</strong>
      <small>
        {#if lolbasMatch}
          {a.process_name} is a known living-off-the-land binary.
        {:else}
          {a.process_name} is not a known LOLBAS binary. This check flags legitimate, abusable Windows binaries (powershell.exe, rundll32.exe…) — an unrecognized dropped binary won't match, so it's caught by other signals instead.
        {/if}
      </small>
    </div>
  </div>

  <p class="note">Threat intel, GeoIP and destination rarity are <strong>not</strong> stamped here — those are candidate enrichment (Step 5), run on the handful of candidates rather than on every event.</p>
</section>

<style>
  .panel {
    padding: 1.4rem 1.5rem;
    border: 1px solid rgba(189, 147, 249, 0.25);
    border-radius: 8px;
    background: rgba(22, 22, 31, 0.78);
  }
  h3 {
    margin: 0 0 0.5rem;
    color: var(--dracula-green);
    font-family: var(--font-heading);
    font-size: 1.3rem;
  }
  .intro {
    margin: 0 0 1.3rem;
    max-width: 75ch;
    color: var(--brand-muted);
    font-size: 1rem;
    line-height: 1.55;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 0.8rem;
  }
  .label {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.9rem 1rem;
    border: 1px solid rgba(189, 147, 249, 0.25);
    border-radius: 8px;
    background: rgba(28, 29, 39, 0.8);
  }
  .label .k {
    color: var(--brand-muted);
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .label strong {
    color: var(--brand-purple-light);
    font-family: var(--font-heading);
    font-size: 1.05rem;
    overflow-wrap: anywhere;
  }
  .label small {
    color: var(--brand-muted);
    font-size: 0.85rem;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  .note {
    margin: 1.3rem 0 0;
    color: var(--dracula-comment);
    font-size: 0.9rem;
    line-height: 1.55;
  }
  .note strong {
    color: var(--brand-yellow);
  }
</style>
