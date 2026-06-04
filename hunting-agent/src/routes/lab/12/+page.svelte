<script lang="ts">
  import { onMount } from "svelte";
  import ClipboardTextIcon from "phosphor-svelte/lib/ClipboardTextIcon";
  import FileTextIcon from "phosphor-svelte/lib/FileTextIcon";
  import BellRingingIcon from "phosphor-svelte/lib/BellRingingIcon";
  import PlugsConnectedIcon from "phosphor-svelte/lib/PlugsConnectedIcon";
  import MonitorIcon from "phosphor-svelte/lib/MonitorIcon";
  import ChatCircleTextIcon from "phosphor-svelte/lib/ChatCircleTextIcon";
  import LinkSimpleIcon from "phosphor-svelte/lib/LinkSimpleIcon";
  import EnvelopeIcon from "phosphor-svelte/lib/EnvelopeIcon";
  import PaperPlaneTiltIcon from "phosphor-svelte/lib/PaperPlaneTiltIcon";
  import RocketLaunchIcon from "phosphor-svelte/lib/RocketLaunchIcon";
  import FlagCheckeredIcon from "phosphor-svelte/lib/FlagCheckeredIcon";
  import ArrowDownIcon from "phosphor-svelte/lib/ArrowDownIcon";

  type Verdict = { candidateId: string; verdict: string; rationale: string; updatedAt: string };
  type SavedReport = { id: string; title: string; fileName: string; path: string; markdown: string };
  type NotificationEventPayload = { id: string; severity: string; title: string; message: string; reportPath?: string; createdAt: string };
  type NotificationResult = { channel: string; delivered: boolean; detail: string };

  let activeTab = $state<"lab" | "code">("lab");
  let verdicts = $state<Verdict[]>([]);
  let report = $state<SavedReport | null>(null);
  let event = $state<NotificationEventPayload | null>(null);
  let notification = $state<NotificationResult | null>(null);
  let busy = $state(false);
  let notice = $state("");

  onMount(async () => {
    const response = await fetch("/lab/12/api/finalize");
    const data = await response.json();
    verdicts = data.verdicts;
  });

  async function showBrowserNotification(notificationEvent: NotificationEventPayload) {
    if (!("Notification" in window)) return;
    let permission = Notification.permission;
    if (permission === "default") permission = await Notification.requestPermission();
    if (permission === "granted") new Notification(notificationEvent.title, { body: notificationEvent.message, tag: notificationEvent.id });
  }

  async function finalize() {
    busy = true;
    notice = "";
    try {
      const response = await fetch("/lab/12/api/finalize", { method: "POST" });
      const data = await response.json();
      verdicts = data.verdicts;
      report = data.report;
      event = data.event;
      notification = data.notification;
      notice = data.event.message;
      await showBrowserNotification(data.event);
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head><title>Lab 12 | Feedback + Report</title></svelte:head>

{#if notice}
  <aside class="toast" role="status"><strong>{event?.title}</strong><span>{notice}</span></aside>
{/if}

<main class="lab-shell">
  <a class="back" href="/">Labs</a>

  <header class="hero">
    <span>Lab 12</span>
    <h1>Feedback, Report, and Notification</h1>
    <p>Record verdicts as structured feedback, generate the final report, and emit a notification through a swappable adapter.</p>
    {#if activeTab !== "code"}
      <button onclick={finalize} disabled={busy}>{busy ? "Finalizing" : "Generate Report + Notify"}</button>
    {/if}
  </header>

  <div class="tab-bar-top">
    <button class="tab-btn-top" class:active={activeTab === "lab"} onclick={() => (activeTab = "lab")}>Lab</button>
    <button class="tab-btn-top" class:active={activeTab === "code"} onclick={() => (activeTab = "code")}>Code</button>
  </div>

  {#if activeTab === "lab"}
  <section class="panel">
    <h2>Verdict Table</h2>
    <table>
      <thead><tr><th>Candidate</th><th>Verdict</th><th>Rationale</th></tr></thead>
      <tbody>
        {#each verdicts as row}
          <tr><td>{row.candidateId}</td><td>{row.verdict}</td><td>{row.rationale}</td></tr>
        {/each}
      </tbody>
    </table>
  </section>

  <section class="panel">
    <h2>Final Report</h2>
    {#if report}
      <p><strong>{report.fileName}</strong></p>
      <p class="path">{report.path}</p>
      <pre>{report.markdown}</pre>
    {:else}
      <p>No report generated yet.</p>
    {/if}
  </section>

  <section class="panel">
    <h2>Notification Hook</h2>
    {#if event && notification}
      <article>
        <strong>{event.title}</strong>
        <p>{event.message}</p>
        <small>{notification.channel} | {notification.delivered ? "delivered" : "not delivered"} | {notification.detail}</small>
      </article>
    {:else}
      <p>Generate the report to emit the notification event.</p>
    {/if}
  </section>
  {:else}
    <!-- ═══════════════════════════════════════════════════ -->
    <!-- CODE VIEW  (architectural reference, non-interactive)-->
    <!-- ═══════════════════════════════════════════════════ -->
    <div class="code-view">
      <div class="code-inner">
        <!-- Intro -->
        <header class="cv-hero">
          <span class="cv-eyebrow">Under the Hood</span>
          <h2>How the investigation becomes an artifact</h2>
          <p>
            Optional reading for the curious. The earlier labs <em>found</em> and <em>explained</em>
            things. This one turns the result into durable outputs: analyst verdicts recorded as
            structured feedback, a Markdown report written to disk, and a notification fired through
            a <strong>swappable adapter</strong>. It's the stage that closes the loop.
          </p>
          <div class="cv-mental-model">
            <ClipboardTextIcon size={20} weight="duotone" />
            <span>verdicts</span>
            <span class="cv-mm-sep">→</span>
            <FileTextIcon size={20} weight="duotone" />
            <span>saved report</span>
            <span class="cv-mm-sep">→</span>
            <BellRingingIcon size={20} weight="duotone" />
            <span>notify</span>
          </div>
        </header>

        <!-- A · Journey -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">A</span> The journey of finalizing<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">
            One "Generate" runs the whole investigation, then assembles three outputs from its real
            results.
          </p>

          <ol class="flow">
            <li class="flow-step" style="--d: 0ms">
              <span class="flow-rail"><RocketLaunchIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Run the real investigation</span><span class="flow-where">server · orchestrator.ts</span></div>
                <p><code>runInvestigationState()</code> produces the findings, graph, and narrative (the model calls from Labs 09–11), then evals run over the result.</p>
              </div>
            </li>
            <li class="flow-step" style="--d: 90ms">
              <span class="flow-rail"><ClipboardTextIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Collect the verdicts</span><span class="flow-where">server · feedback.ts</span></div>
                <p><code>getVerdictTable()</code> returns the analyst verdicts recorded as structured feedback — which candidate is a true/false positive, and why.</p>
              </div>
            </li>
            <li class="flow-step" style="--d: 180ms">
              <span class="flow-rail"><FileTextIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Build &amp; save the report</span><span class="flow-badge">the artifact</span><span class="flow-where">server · report.ts</span></div>
                <p><code>buildFinalReport()</code> assembles a Markdown report — metadata, the narrative as executive summary, the confirmed finding, verdicts, and eval results — and <code>saveFinalReport()</code> writes it to <code>reports/</code>.</p>
              </div>
            </li>
            <li class="flow-step" style="--d: 270ms">
              <span class="flow-rail"><EnvelopeIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Build the notification event</span><span class="flow-where">server · notifications.ts</span></div>
                <p><code>buildVerdictNotification()</code> turns the outcome into a typed event — <code>high</code> severity if a true positive was confirmed, <code>info</code> otherwise — carrying the report path.</p>
              </div>
            </li>
            <li class="flow-step" style="--d: 360ms">
              <span class="flow-rail"><PaperPlaneTiltIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Send it through the adapter</span><span class="flow-where">server · notifications.ts</span></div>
                <p><code>createNotifier(env).notify(event)</code> dispatches to whichever channel is configured — UI, Slack, or a generic webhook — without the rest of the code knowing which.</p>
              </div>
            </li>
          </ol>
        </details>

        <!-- B · The notifier adapter -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">B</span> The notifier adapter<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">
            Notifications go through one interface; the concrete channel is chosen at runtime from the
            environment. Same idea as the model provider in Lab 01 — one contract, swappable behind it.
          </p>

          <div class="adapter">
            <span class="ad-iface"><PlugsConnectedIcon size={18} weight="duotone" /> Notifier interface</span>
            <ArrowDownIcon class="ad-arrow" size={16} weight="bold" />
            <div class="ad-channels">
              <span class="ad-ch"><MonitorIcon size={16} weight="duotone" />UI<small>default</small></span>
              <span class="ad-ch"><ChatCircleTextIcon size={16} weight="duotone" />Slack<small>SLACK_WEBHOOK_URL</small></span>
              <span class="ad-ch"><LinkSimpleIcon size={16} weight="duotone" />Webhook<small>NOTIFICATION_WEBHOOK_URL</small></span>
            </div>
          </div>
          <p class="cv-note">
            <code>createNotifier()</code> picks Slack if a Slack URL is set, a generic webhook if that
            URL is set, and otherwise falls back to the in-UI notifier — so the lab works with zero
            configuration.
          </p>
        </details>

        <!-- C · Four ideas -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">C</span> Four ideas worth understanding<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <div class="cv-cards">
            <article class="cv-card">
              <div class="cv-card-head"><ClipboardTextIcon size={26} weight="duotone" /><h4>Feedback is structured, not freeform</h4></div>
              <p>Verdicts are recorded as typed records, not notes. That structure feeds the report <em>and</em> per-skill performance tracking — the system can learn which skills produce true vs false positives over time.</p>
            </article>
            <article class="cv-card">
              <div class="cv-card-head"><FileTextIcon size={26} weight="duotone" /><h4>The report is assembled, not improvised</h4></div>
              <p>Building the report is deterministic templating over real outputs — verdicts, evals, and the model's narrative as the executive summary. The same investigation always yields the same document.</p>
            </article>
            <article class="cv-card">
              <div class="cv-card-head"><PlugsConnectedIcon size={26} weight="duotone" /><h4>Notifications use a swappable adapter</h4></div>
              <p>One <code>Notifier</code> interface, several implementations, chosen by env. Going from in-UI to Slack is a config change, not a code change — exactly the provider pattern from Lab 01.</p>
            </article>
            <article class="cv-card">
              <div class="cv-card-head"><FlagCheckeredIcon size={26} weight="duotone" /><h4>This closes the loop</h4></div>
              <p>Detect → assess → connect → narrate → and now record, report, and alert. The investigation becomes a durable artifact, a human gets pulled in, and the verdicts feed back into the system.</p>
            </article>
          </div>
        </details>

        <!-- D · File tree -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">D</span> Where each piece lives<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">Three small framework files for the three outputs, plus the endpoint that wires them.</p>
          <pre class="cv-tree"><code><span class="tr-dir">hunting-agent/src/</span>
│
├─ <span class="tr-dir">routes/lab/12/api/finalize/</span>
│  └─ <span class="tr-file">+server.ts</span>             <span class="tr-cm">← run investigation · verdicts · report · notify</span>
│
└─ <span class="tr-dir">framework/</span>
   ├─ <span class="tr-file">feedback.ts</span>            <span class="tr-cm">← record/read verdicts + skill performance</span>
   ├─ <span class="tr-file">report.ts</span>              <span class="tr-cm">← buildFinalReport · saveFinalReport → reports/</span>
   └─ <span class="tr-file">notifications.ts</span>       <span class="tr-cm">← Notifier interface · UI / Slack / webhook</span></code></pre>
        </details>

        <!-- Callout -->
        <aside class="cv-callout">
          <BellRingingIcon size={22} weight="duotone" />
          <p>
            <strong>Why structured outputs?</strong> The report is the deliverable a human reads; the
            verdict feedback is how the system gets better; the notification is how the right person
            gets pulled in at the right moment. An agent that finds things but produces no durable,
            routable output isn't finished — this stage is what makes the work usable.
          </p>
        </aside>
      </div>
    </div>
  {/if}
</main>

<style>
  :global(body) { background: #07070a; }
  .lab-shell { min-height: 100vh; padding: 2.5rem max(1rem, calc((100vw - 1120px) / 2)); background: linear-gradient(135deg, rgba(189,147,249,.06), transparent 34%), #07070a; color: rgba(255,255,255,.9); font-family: var(--font-heading); }
  .back { display: inline-flex; margin-bottom: 1rem; color: #f5e663; font-size: .75rem; font-weight: 800; text-decoration: none; text-transform: uppercase; }
  .hero, .panel { border: 1px solid rgba(189,147,249,.24); border-radius: 4px; background: rgba(22,22,31,.92); padding: 1.4rem; box-shadow: 0 24px 80px rgba(0,0,0,.32); }
  .panel { margin-top: 1rem; }
  .hero { display: grid; gap: .8rem; }
  .hero span { color: #bd93f9; text-transform: uppercase; font-weight: 800; }
  h1, h2, p { margin: 0; }
  h1 { color: #f5e663; font-size: clamp(2.5rem, 7vw, 5rem); line-height: .98; }
  h2 { color: #f5e663; margin-bottom: 1rem; }
  p, small, .path { color: rgba(255,255,255,.62); line-height: 1.55; }
  button { width: fit-content; border: 1px solid rgba(245,230,99,.42); border-radius: 3px; padding: .7rem .95rem; background: rgba(245,230,99,.1); color: #f5e663; font: inherit; font-weight: 800; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border-bottom: 1px solid rgba(255,255,255,.12); padding: .65rem; text-align: left; vertical-align: top; }
  th { color: #8be9fd; }
  pre { max-height: 24rem; overflow: auto; white-space: pre-wrap; color: rgba(255,255,255,.76); }
  article { display: grid; gap: .35rem; }
  .toast { position: fixed; right: 1rem; top: 1rem; z-index: 10; display: grid; gap: .25rem; max-width: 24rem; padding: .85rem 1rem; border: 1px solid rgba(245,230,99,.35); border-radius: 4px; background: #16161f; color: rgba(255,255,255,.9); }
  /* ═══ Top tab bar ══════════════════════════════════════ */
  .tab-bar-top {
    display: flex;
    gap: 0;
    border-bottom: 1px solid #1a1a2e;
    margin-bottom: 1rem;
  }
  .tab-btn-top {
    width: auto;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    padding: 0.85rem 1.5rem;
    font-family: "JetBrains Mono", monospace;
    font-size: 1rem;
    font-weight: 600;
    color: #8a8a9a;
    cursor: pointer;
    transition: all 0.2s;
  }
  .tab-btn-top:hover { color: #c0c0d0; }
  .tab-btn-top.active { color: #f5e663; border-bottom-color: #f5e663; }

  /* ═══ CODE VIEW (architectural reference) ══════════════ */
  .code-view { padding: 0.25rem 0 0; }
  .code-inner {
    max-width: 940px;
    margin: 0 auto;
    padding: 0.5rem 0.25rem 2rem;
    font-family: "JetBrains Mono", monospace;
  }
  .code-view code {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.86em;
    color: #f1fa8c;
    background: rgba(241, 250, 140, 0.07);
    border: 1px solid rgba(241, 250, 140, 0.12);
    border-radius: 3px;
    padding: 0.05em 0.35em;
    word-break: break-word;
  }
  .code-view strong { color: #e8e8f0; font-weight: 700; }
  .code-view em { color: #bd93f9; font-style: normal; }

  .cv-hero { animation: cvRise 0.5s ease both; }
  .cv-eyebrow {
    display: inline-block;
    color: #bd93f9;
    font-size: 0.74rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin-bottom: 0.6rem;
  }
  .cv-hero h2 {
    margin: 0;
    font-size: clamp(1.7rem, 4vw, 2.5rem);
    line-height: 1.05;
    color: #f5f5fa;
    font-weight: 700;
  }
  .cv-hero p {
    max-width: 64ch;
    margin: 1rem 0 0;
    color: #b6b6c6;
    font-size: 0.98rem;
    line-height: 1.75;
  }
  .cv-mental-model {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1.4rem;
    padding: 0.7rem 1rem;
    border: 1px solid #1f1f33;
    border-radius: 8px;
    background: rgba(18, 18, 26, 0.7);
    color: #cfcfe0;
    font-size: 0.92rem;
  }
  .cv-mental-model :global(svg) { color: #8be9fd; flex-shrink: 0; }
  .cv-mm-sep { color: #50fa7b; font-size: 1.05rem; margin: 0 0.15rem; }

  .cv-section { margin-top: 1.8rem; }
  .cv-h3 {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin: 0 0 0.5rem;
    font-size: 1.25rem;
    color: #f5f5fa;
    font-weight: 700;
  }
  summary.cv-h3 {
    cursor: pointer;
    list-style: none;
    user-select: none;
    padding: 0.2rem 0;
  }
  summary.cv-h3::-webkit-details-marker { display: none; }
  .cv-chev {
    margin-left: auto;
    color: #6f6f86;
    font-size: 0.85rem;
    transition: transform 0.2s ease, color 0.2s ease;
  }
  summary.cv-h3:hover .cv-chev { color: #bd93f9; }
  details[open] > summary .cv-chev { transform: rotate(90deg); }
  details.cv-section:not([open]) > summary.cv-h3 { margin-bottom: 0; }
  .cv-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.7rem;
    height: 1.7rem;
    border-radius: 6px;
    background: rgba(189, 147, 249, 0.14);
    border: 1px solid rgba(189, 147, 249, 0.4);
    color: #bd93f9;
    font-size: 0.9rem;
    font-weight: 800;
  }
  .cv-lead {
    max-width: 64ch;
    margin: 0 0 1.4rem;
    color: #9a9aaa;
    font-size: 0.94rem;
    line-height: 1.7;
  }

  /* Vertical flow */
  .flow { list-style: none; margin: 0; padding: 0.4rem 0 0; }
  .flow-step {
    position: relative;
    display: grid;
    grid-template-columns: 44px 1fr;
    gap: 1.1rem;
    padding-bottom: 1.5rem;
    opacity: 0;
    animation: cvRise 0.55s ease forwards;
    animation-delay: var(--d, 0ms);
  }
  .flow-step:last-child { padding-bottom: 0; }
  .flow-step::before {
    content: "";
    position: absolute;
    left: 21px;
    top: 48px;
    bottom: -2px;
    width: 2px;
    background: linear-gradient(180deg, #bd93f9, #50fa7b);
    background-size: 100% 220%;
    opacity: 0.45;
    animation: cvFlow 2.4s linear infinite;
  }
  .flow-step:last-child::before { display: none; }
  .flow-rail {
    position: relative;
    z-index: 1;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #12121a;
    border: 1px solid rgba(189, 147, 249, 0.45);
    color: #bd93f9;
    box-shadow: 0 0 0 4px #07070a;
  }
  .flow-body {
    border: 1px solid #1c1c30;
    border-radius: 8px;
    background: rgba(18, 18, 26, 0.6);
    padding: 0.85rem 1.05rem;
    transition: border-color 0.2s, transform 0.2s;
  }
  .flow-body:hover { border-color: #2e2e4e; transform: translateX(2px); }
  .flow-top {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.4rem 0.7rem;
    margin-bottom: 0.35rem;
  }
  .flow-title { color: #e8e8f0; font-weight: 700; font-size: 1rem; }
  .flow-where {
    color: #6f6f86;
    font-size: 0.76rem;
    letter-spacing: 0.03em;
    margin-left: auto;
  }
  .flow-badge {
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #f5e663;
    border: 1px solid rgba(245, 230, 99, 0.5);
    border-radius: 999px;
    padding: 0.1rem 0.5rem;
  }
  .flow-body p {
    margin: 0;
    color: #aeaebe;
    font-size: 0.9rem;
    line-height: 1.65;
  }

  /* Notifier adapter diagram */
  .adapter {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
    border: 1px solid #1c1c30;
    border-radius: 10px;
    background: rgba(18, 18, 26, 0.6);
    padding: 1.2rem;
  }
  .adapter > :global(svg) { color: #6f6f86; }
  .ad-iface {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    font-weight: 700;
    color: #bd93f9;
    background: #0d0d14;
    border: 1px solid rgba(189, 147, 249, 0.45);
    border-radius: 7px;
    padding: 0.4rem 0.8rem;
  }
  .ad-iface :global(svg) { color: #bd93f9; }
  .ad-channels { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem; }
  .ad-ch {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    font-size: 0.82rem;
    color: #cfcfe0;
    background: #0d0d14;
    border: 1px solid #2a2a40;
    border-radius: 7px;
    padding: 0.55rem 0.8rem;
    min-width: 96px;
    text-align: center;
  }
  .ad-ch :global(svg) { color: #8be9fd; }
  .ad-ch small { color: #7d7d92; font-size: 0.66rem; }
  .cv-note {
    margin: 1rem 0 0;
    color: #aeaebe;
    font-size: 0.9rem;
    line-height: 1.7;
  }

  /* Concept cards (override lab12 global article: display grid) */
  .cv-cards { display: flex; flex-direction: column; gap: 1rem; }
  .cv-card {
    display: block;
    border: 1px solid #1c1c30;
    border-radius: 10px;
    background: rgba(18, 18, 26, 0.6);
    padding: 1.1rem 1.2rem 1.25rem;
    transition: border-color 0.2s, transform 0.2s;
  }
  .cv-card:hover { border-color: #33335a; transform: translateY(-2px); }
  .cv-card-head {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.6rem;
    color: #bd93f9;
  }
  .cv-card-head h4 {
    margin: 0;
    font-size: 1.02rem;
    color: #f0f0f6;
    font-weight: 700;
  }
  .cv-card p {
    margin: 0;
    color: #aeaebe;
    font-size: 0.9rem;
    line-height: 1.65;
  }

  .cv-tree {
    margin: 0;
    padding: 1rem 1.15rem;
    max-height: none;
    background: #0d0d14;
    border: 1px solid #1a1a2e;
    border-radius: 9px;
    overflow-x: auto;
    white-space: pre;
    color: #5f6075;
    font-size: 0.82rem;
    line-height: 1.7;
  }
  .cv-tree code {
    background: none;
    border: none;
    padding: 0;
    color: inherit;
    font-size: inherit;
  }
  .cv-tree .tr-dir { color: #8be9fd; }
  .cv-tree .tr-file { color: #f1fa8c; }
  .cv-tree .tr-cm { color: #6f6f86; }

  .cv-callout {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    margin-top: 1.8rem;
    padding: 1rem 1.15rem;
    border: 1px solid rgba(189, 147, 249, 0.28);
    border-left: 3px solid #bd93f9;
    border-radius: 8px;
    background: rgba(189, 147, 249, 0.06);
  }
  .cv-callout :global(svg) { color: #bd93f9; flex-shrink: 0; margin-top: 2px; }
  .cv-callout p {
    margin: 0;
    color: #c2c2d2;
    font-size: 0.92rem;
    line-height: 1.7;
  }

  @keyframes cvRise {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes cvFlow {
    from { background-position: 0 0; }
    to { background-position: 0 -220%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .flow-step,
    .cv-hero { animation: none; opacity: 1; }
    .flow-step::before { animation: none; }
  }
</style>
