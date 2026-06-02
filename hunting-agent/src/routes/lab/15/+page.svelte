<script lang="ts">
  import BookOpenTextIcon from "phosphor-svelte/lib/BookOpenTextIcon";
  import CompassIcon from "phosphor-svelte/lib/CompassIcon";
  import GraphIcon from "phosphor-svelte/lib/GraphIcon";
  import PlugsConnectedIcon from "phosphor-svelte/lib/PlugsConnectedIcon";
  import TargetIcon from "phosphor-svelte/lib/TargetIcon";

  const extensionPaths = [
    {
      title: "Detection coverage",
      icon: TargetIcon,
      items: [
        "Add narrow skills for lateral movement, persistence, credential access, cloud control-plane abuse, and data staging.",
        "Keep each skill contract explicit: trigger, evidence, procedure, output shape, and failure modes.",
      ],
    },
    {
      title: "Real integrations",
      icon: PlugsConnectedIcon,
      items: [
        "Replace static JSON with scoped tools for Splunk, Elastic, Sentinel, CrowdStrike, SentinelOne, or Velociraptor.",
        "Expose only the evidence each stage needs; do not hand the model unrestricted production access.",
      ],
    },
    {
      title: "Persistent graph state",
      icon: GraphIcon,
      items: [
        "Move from per-session graph objects to durable entity memory with provenance and timestamped relationships.",
        "Use the graph to answer operational questions, not just to draw a picture.",
      ],
    },
    {
      title: "Evals and feedback",
      icon: BookOpenTextIcon,
      items: [
        "Expand task, dataset, and scorer coverage before changing prompts, tools, or skills.",
        "Treat analyst verdicts, false positives, reports, and notifications as structured feedback data.",
      ],
    },
  ];

  const references = [
    {
      label: "Anthropic - Building Effective Agents",
      url: "https://www.anthropic.com/engineering/building-effective-agents",
      note: "Harness patterns, bounded autonomy, and practical agent design.",
    },
    {
      label: "Anthropic - Demystifying Evals for AI Agents",
      url: "https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents",
      note: "Task, dataset, scorer, and the eval improvement loop.",
    },
    {
      label: "Google MCP Security - GTI MCP Server",
      url: "https://google.github.io/mcp-security/servers/gti_mcp.html",
      note: "A real security MCP server for threat-intelligence lookups.",
    },
    {
      label: "Detection at Scale",
      url: "https://www.detectionatscale.com/",
      note: "Detection engineering, security operations, and AI-assisted SOC thinking.",
    },
    {
      label: "Omar Santos - AI Agents for Cybersecurity",
      url: "https://github.com/The-Art-of-Hacking/h4cker/tree/master/ai_research/AI-agents",
      note: "Security-agent research links and implementation references.",
    },
  ];

  const checklist = [
    "What exact task is the agent allowed to perform?",
    "What evidence can it see?",
    "Which tools can it call?",
    "Which context is injected, retrieved, or withheld?",
    "Which outputs are accepted by schema?",
    "Which human decision points remain explicit?",
    "Which evals prove the behavior is stable?",
    "Which logs let you reconstruct what happened?",
  ];
</script>

<svelte:head><title>Lab 15 - Further Learning</title></svelte:head>

<main class="lab14-shell">
  <a class="home-link" href="/">Labs</a>

  <section class="hero">
    <div class="hero-icon" aria-hidden="true">
      <CompassIcon size={44} weight="duotone" />
    </div>
    <span class="eyebrow">Lab 15</span>
    <h1>Further Learning</h1>
    <p>
      The capstone proved the full flow. This final lab is the handoff: what to extend,
      what to integrate, and what to measure before this becomes production work.
    </p>
  </section>

  <section class="panel">
    <h2>Extension Paths</h2>
    <div class="path-list">
      {#each extensionPaths as path}
        {@const Icon = path.icon}
        <article class="path-card">
          <div class="path-header">
            <Icon size={30} weight="duotone" />
            <h3>{path.title}</h3>
          </div>
          <ul>
            {#each path.items as item}
              <li>{item}</li>
            {/each}
          </ul>
        </article>
      {/each}
    </div>
  </section>

  <section class="panel">
    <h2>Production Checklist</h2>
    <div class="checklist">
      {#each checklist as item, index}
        <div class="check-row">
          <span>{String(index + 1).padStart(2, "0")}</span>
          <p>{item}</p>
        </div>
      {/each}
    </div>
  </section>

  <section class="panel">
    <h2>Recommended References</h2>
    <div class="references">
      {#each references as reference}
        <a href={reference.url} target="_blank" rel="noreferrer">
          <strong>{reference.label}</strong>
          <span>{reference.note}</span>
          <code>{reference.url}</code>
        </a>
      {/each}
    </div>
  </section>

  <section class="closing">
    <h2>Keep the primitives</h2>
    <p>
      State, tools, skills, context, orchestration, graph memory, feedback, and evals
      are the reusable design pieces. Add one piece at a time, measure the behavior,
      and keep every important output inspectable.
    </p>
  </section>
</main>

<style>
  :global(body) {
    background: #07070a;
  }

  .lab14-shell {
    --bg: #07070a;
    --panel: #15151d;
    --panel-2: #1b1b25;
    --line: rgba(189, 147, 249, 0.26);
    --line-strong: rgba(245, 230, 99, 0.42);
    --text: rgba(255, 255, 255, 0.9);
    --muted: rgba(255, 255, 255, 0.62);
    --purple: #bd93f9;
    --yellow: #f5e663;
    --cyan: #8be9fd;

    min-height: 100vh;
    padding: 3rem max(1rem, calc((100vw - 1120px) / 2)) 4rem;
    background:
      linear-gradient(135deg, rgba(189, 147, 249, 0.08), transparent 28rem),
      linear-gradient(180deg, rgba(245, 230, 99, 0.035), transparent 18rem),
      var(--bg);
    color: var(--text);
    font-family: var(--font-body);
  }

  .home-link {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
    z-index: 10;
    padding: 0.7rem 0.95rem;
    border: 1px solid var(--line);
    border-radius: 0.5rem;
    background: rgba(21, 21, 29, 0.92);
    color: var(--cyan);
    font-family: var(--font-heading);
    font-weight: 800;
    text-decoration: none;
  }

  .hero,
  .panel,
  .closing {
    width: min(1120px, 100%);
    margin: 0 auto 1rem;
    border: 1px solid var(--line);
    border-radius: 0.55rem;
    background: rgba(21, 21, 29, 0.9);
    box-shadow: 0 20px 70px rgba(0, 0, 0, 0.28);
  }

  .hero {
    position: relative;
    padding: 2rem;
    overflow: hidden;
  }

  .hero::after {
    content: "";
    position: absolute;
    inset: auto -6rem -10rem auto;
    width: 26rem;
    height: 26rem;
    border: 1px solid rgba(245, 230, 99, 0.16);
    transform: rotate(12deg);
  }

  .hero-icon {
    color: var(--yellow);
    margin-bottom: 1rem;
  }

  .eyebrow,
  h1,
  h2,
  h3,
  .check-row span,
  code {
    font-family: var(--font-heading);
  }

  .eyebrow {
    display: block;
    color: var(--purple);
    font-size: 0.92rem;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  h1,
  h2,
  h3,
  p {
    margin: 0;
  }

  h1 {
    margin-top: 0.35rem;
    color: var(--text);
    font-size: clamp(3rem, 8vw, 6.8rem);
    line-height: 0.93;
    letter-spacing: 0;
  }

  .hero p,
  .closing p {
    max-width: 64rem;
    margin-top: 1.1rem;
    color: var(--muted);
    font-size: 1.15rem;
    line-height: 1.6;
  }

  .panel,
  .closing {
    padding: 1.35rem;
  }

  h2 {
    margin-bottom: 1rem;
    color: var(--yellow);
    font-size: 1.35rem;
  }

  .path-list,
  .references {
    display: grid;
    gap: 0.85rem;
  }

  .path-card,
  .references a,
  .check-row {
    border: 1px solid rgba(189, 147, 249, 0.22);
    border-radius: 0.5rem;
    background: var(--panel-2);
  }

  .path-card {
    padding: 1.1rem;
  }

  .path-header {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    color: var(--cyan);
  }

  h3 {
    color: var(--text);
    font-size: 1.18rem;
  }

  ul {
    margin: 0.8rem 0 0;
    padding-left: 1.2rem;
    color: var(--muted);
    font-size: 1rem;
    line-height: 1.6;
  }

  li + li {
    margin-top: 0.45rem;
  }

  .checklist {
    display: grid;
    gap: 0.5rem;
  }

  .check-row {
    display: grid;
    grid-template-columns: 3.25rem 1fr;
    gap: 0.75rem;
    align-items: start;
    padding: 0.85rem 1rem;
  }

  .check-row span {
    color: var(--purple);
    font-weight: 800;
  }

  .check-row p {
    color: var(--text);
    line-height: 1.45;
  }

  .references a {
    display: grid;
    gap: 0.35rem;
    padding: 1rem;
    color: inherit;
    text-decoration: none;
  }

  .references a:hover {
    border-color: var(--line-strong);
  }

  .references strong {
    color: var(--cyan);
    font-family: var(--font-heading);
    font-size: 1.04rem;
  }

  .references span {
    color: var(--muted);
    line-height: 1.45;
  }

  code {
    color: rgba(245, 230, 99, 0.84);
    font-size: 0.82rem;
    overflow-wrap: anywhere;
  }

  @media (max-width: 720px) {
    .lab14-shell {
      padding-top: 1rem;
    }

    .hero,
    .panel,
    .closing {
      padding: 1rem;
    }
  }
</style>
