<script lang="ts">
  import type { ConnectionPair } from "$lib/data/lab02/types";

  type InfoContent = {
    title: string;
    body: string;
    details: string[];
  };

  type EnrichmentCard = {
    key: string;
    label: string;
    value: string;
    detail: string;
    state?: "hot" | "benign";
    info: InfoContent;
  };

  let { pair }: { pair: ConnectionPair } = $props();
  let enrichment = $derived(pair.candidate.enrichment);
  let activeInfo = $state<InfoContent | null>(null);

  function yesNo(value: boolean): string {
    return value ? "Yes" : "No";
  }

  let cards: EnrichmentCard[] = $derived([
    {
      key: "threat-intel",
      label: "Threat Intel",
      value: enrichment.threat_intel_match ? "Match" : "No match",
      detail: enrichment.threat_intel_source ?? "No source matched this destination",
      state: enrichment.threat_intel_match ? "hot" : undefined,
      info: {
        title: "Threat Intel",
        body: "Checks whether the destination appears in local or external intelligence. A match changes analyst priority, but lack of a match is not proof of safety.",
        details: [
          "Use this as context layered on top of behavior.",
          "A brand-new destination may have no intel record yet.",
        ],
      },
    },
    {
      key: "lots",
      label: "LOTS Match",
      value: yesNo(enrichment.lots_match),
      detail: enrichment.lots_service ?? "Not a known common SaaS destination",
      state: enrichment.lots_match ? "benign" : undefined,
      info: {
        title: "LOTS Match",
        body: "Living-off-trusted-sites context identifies destinations that commonly support legitimate enterprise software.",
        details: [
          "A LOTS match can explain regular traffic from EDR, backup, or SaaS clients.",
          "It does not automatically suppress a finding; it reduces confidence when other evidence is weak.",
        ],
      },
    },
    {
      key: "rarity",
      label: "Destination Rarity",
      value: enrichment.destination_rarity.toFixed(2),
      detail: "Higher means fewer internal hosts talk to this destination.",
      state: enrichment.destination_rarity >= 0.8 ? "hot" : enrichment.destination_rarity <= 0.15 ? "benign" : undefined,
      info: {
        title: "Destination Rarity",
        body: "Measures how common this destination is inside the environment. Rare destinations deserve more scrutiny than shared enterprise services.",
        details: [
          "Rarity is environment-specific.",
          "A rare destination plus regular timing is stronger than regular timing alone.",
        ],
      },
    },
    {
      key: "geoip",
      label: "GeoIP / ASN",
      value: enrichment.geoip_country,
      detail: enrichment.geoip_asn,
      info: {
        title: "GeoIP and ASN",
        body: "Adds coarse infrastructure ownership and location context. It helps explain whether traffic points to a known cloud provider, SaaS platform, ISP, or unusual hosting.",
        details: [
          "GeoIP can be wrong or imprecise.",
          "ASN often matters more than country for infrastructure triage.",
        ],
      },
    },
    {
      key: "first-seen",
      label: "First Seen",
      value: enrichment.first_seen,
      detail: "First observation of this destination in the workshop fixture.",
      info: {
        title: "First Seen",
        body: "Shows when the environment first observed the destination. New infrastructure is often more interesting than a long-standing service.",
        details: [
          "First seen is not an internet-wide date.",
          "It is scoped to this dataset or environment.",
        ],
      },
    },
    {
      key: "sni",
      label: "Missing SNI",
      value: yesNo(enrichment.missing_sni),
      detail: "TLS without SNI can reduce destination explainability.",
      state: enrichment.missing_sni ? "hot" : undefined,
      info: {
        title: "Missing SNI",
        body: "Server Name Indication normally identifies the intended HTTPS hostname. Missing SNI on direct IP traffic can make regular HTTPS polling more suspicious.",
        details: [
          "Modern browsers usually send SNI.",
          "Some appliances and older clients may not, so use this as supporting context.",
        ],
      },
    },
    {
      key: "business-hours",
      label: "Business Hours",
      value: `${Math.round(enrichment.business_hours_proportion * 100)}%`,
      detail: "Proportion of events during normal working hours.",
      state: enrichment.business_hours_proportion >= 0.9 ? "benign" : undefined,
      info: {
        title: "Business Hours",
        body: "Compares the timing pattern with expected workday activity. Pure business-hours activity may fit user-driven or scheduled enterprise behavior.",
        details: [
          "Off-hours activity is not automatically malicious.",
          "Business-hours concentration can still be bad when the destination or process is suspicious.",
        ],
      },
    },
  ]);

  function closeDrawer() {
    activeInfo = null;
  }
</script>

<section class="panel">
  <h2>Enrichment</h2>
  <p>Context added after scoring. These fields explain why two equally regular beacons can have different analyst meaning.</p>

  <div class="cards">
    {#each cards as card}
      <article class:hot={card.state === "hot"} class:benign={card.state === "benign"}>
        <div class="card-head">
          <span>{card.label}</span>
          <button
            class="info-button"
            type="button"
            aria-label={`More about ${card.label}`}
            onclick={() => activeInfo = card.info}
          >i</button>
        </div>
        <strong>{card.value}</strong>
        <small>{card.detail}</small>
      </article>
    {/each}
  </div>
</section>

{#if activeInfo}
  <button class="drawer-backdrop" type="button" aria-label="Close information drawer" onclick={closeDrawer}></button>
  <div class="info-drawer" role="dialog" aria-modal="true" aria-labelledby="enrichment-info-title">
    <button class="close" type="button" onclick={closeDrawer}>Close</button>
    <span>Enrichment field</span>
    <h3 id="enrichment-info-title">{activeInfo.title}</h3>
    <p>{activeInfo.body}</p>
    <ul>
      {#each activeInfo.details as detail}
        <li>{detail}</li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .panel {
    border: 1px solid rgba(189, 147, 249, 0.24);
    border-radius: 8px;
    padding: 1rem;
    background: rgba(22, 22, 31, 0.9);
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.24);
  }

  h2 {
    margin: 0 0 .4rem;
    color: var(--brand-yellow);
    font-size: 1.1rem;
  }

  p {
    margin: 0 0 1rem;
    color: var(--dracula-muted);
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: .75rem;
  }

  article {
    display: grid;
    gap: .45rem;
    min-height: 8.25rem;
    padding: .85rem;
    border: 1px solid rgba(189, 147, 249, 0.18);
    border-radius: 8px;
    background: rgba(28, 29, 39, 0.7);
  }

  article.hot {
    border-color: rgba(255, 85, 85, 0.42);
    background: rgba(255, 85, 85, 0.07);
  }

  article.benign {
    border-color: rgba(245, 230, 99, 0.38);
    background: rgba(245, 230, 99, 0.06);
  }

  .card-head {
    display: flex;
    justify-content: space-between;
    gap: .5rem;
    align-items: center;
  }

  span {
    color: var(--dracula-comment);
    font-family: var(--font-heading);
    font-size: .76rem;
    font-weight: 800;
  }

  strong {
    color: var(--dracula-fg);
    font-size: 1.12rem;
  }

  small {
    color: var(--dracula-muted);
    line-height: 1.45;
  }

  .info-button {
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    border-radius: 999px;
    color: var(--brand-yellow);
    font-family: var(--font-heading);
    font-size: .75rem;
    font-weight: 800;
  }

  .drawer-backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    border: 0;
    border-radius: 0;
    background: rgba(7, 7, 10, 0.58);
  }

  .info-drawer {
    position: fixed;
    z-index: 41;
    top: 0;
    right: 0;
    width: min(26rem, calc(100vw - 2rem));
    height: 100vh;
    padding: 1.25rem;
    border-left: 1px solid rgba(189, 147, 249, 0.34);
    background: rgba(22, 22, 31, 0.98);
    box-shadow: -24px 0 70px rgba(0, 0, 0, 0.42);
  }

  .info-drawer .close {
    float: right;
    padding: .4rem .65rem;
  }

  .info-drawer h3 {
    clear: both;
    margin: 1.25rem 0 .65rem;
    color: var(--brand-yellow);
    font-size: 1.25rem;
  }

  .info-drawer ul {
    display: grid;
    gap: .6rem;
    padding-left: 1.1rem;
    color: var(--dracula-muted);
  }
</style>
