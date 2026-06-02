<script lang="ts">
  import { onMount } from "svelte";

  type Verdict = { candidateId: string; verdict: string; rationale: string; updatedAt: string };
  type SavedReport = { id: string; title: string; fileName: string; path: string; markdown: string };
  type NotificationEventPayload = { id: string; severity: string; title: string; message: string; reportPath?: string; createdAt: string };
  type NotificationResult = { channel: string; delivered: boolean; detail: string };

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
    <button onclick={finalize} disabled={busy}>{busy ? "Finalizing" : "Generate Report + Notify"}</button>
  </header>

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
</style>
