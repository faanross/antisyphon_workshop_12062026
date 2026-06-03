<script lang="ts">
  import BellRingingIcon from "phosphor-svelte/lib/BellRingingIcon";
  import BookOpenTextIcon from "phosphor-svelte/lib/BookOpenTextIcon";
  import BooksIcon from "phosphor-svelte/lib/BooksIcon";
  import BrainIcon from "phosphor-svelte/lib/BrainIcon";
  import ChartBarIcon from "phosphor-svelte/lib/ChartBarIcon";
  import ChatCircleTextIcon from "phosphor-svelte/lib/ChatCircleTextIcon";
  import CompassIcon from "phosphor-svelte/lib/CompassIcon";
  import ExamIcon from "phosphor-svelte/lib/ExamIcon";
  import GraphIcon from "phosphor-svelte/lib/GraphIcon";
  import GithubLogoIcon from "phosphor-svelte/lib/GithubLogoIcon";
  import HouseIcon from "phosphor-svelte/lib/HouseIcon";
  import LinkedinLogoIcon from "phosphor-svelte/lib/LinkedinLogoIcon";
  import PlugsConnectedIcon from "phosphor-svelte/lib/PlugsConnectedIcon";
  import RobotIcon from "phosphor-svelte/lib/RobotIcon";
  import RocketLaunchIcon from "phosphor-svelte/lib/RocketLaunchIcon";
  import TargetIcon from "phosphor-svelte/lib/TargetIcon";
  import XLogoIcon from "phosphor-svelte/lib/XLogoIcon";
  import YoutubeLogoIcon from "phosphor-svelte/lib/YoutubeLogoIcon";

  const labs = [
    {
      id: "01",
      title: "First Hunting Agent",
      description: "Build the first model-backed pipeline with streaming output and visible immutable state.",
      href: "/lab/01",
      icon: RobotIcon,
    },
    {
      id: "02",
      title: "Distillation Pipeline",
      description: "Walk one candidate through all five pipeline steps — raw telemetry, housekeeping, correlation, scoring, and enrichment — and watch it become a scored beacon candidate.",
      href: "/lab/02",
      icon: ChartBarIcon,
    },
    {
      id: "03",
      title: "Context Window",
      description: "Give the agent a memory: watch the conversation fill the context window, see compaction summarize older turns, and confirm it still recalls earlier facts.",
      href: "/lab/03",
      icon: BrainIcon,
    },
    {
      id: "04",
      title: "Interactive Triage",
      description: "Use tool-backed candidate queries with session continuity and bounded context.",
      href: "/lab/04",
      icon: ChatCircleTextIcon,
    },
    {
      id: "05",
      title: "Real GTI MCP",
      description: "Connect to Google Threat Intelligence over MCP, discover tools, select a lookup, and inspect the live result.",
      href: "/lab/05",
      icon: PlugsConnectedIcon,
    },
    {
      id: "06",
      title: "Detection Skills",
      description: "Discover detection skills, inspect YAML frontmatter and procedure body, assemble candidate evidence, and emit a DetectionFinding.",
      href: "/lab/06",
      icon: TargetIcon,
    },
    {
      id: "07",
      title: "Assessment Context",
      description: "Run an assessment skill with an upstream DetectionFinding and an explicitly injected organization context bundle.",
      href: "/lab/07",
      icon: BrainIcon,
    },
    {
      id: "08",
      title: "RAG Prior Investigations",
      description: "Retrieve prior investigations and inject relevant precedent into the agent context.",
      href: "/lab/08",
      icon: BooksIcon,
    },
    {
      id: "09",
      title: "Fan-Out / Fan-In",
      description: "Dispatch independent detection jobs, collect structured findings, and inspect orchestration trace.",
      href: "/lab/09",
      icon: PlugsConnectedIcon,
    },
    {
      id: "10",
      title: "Knowledge Graph State",
      description: "Turn findings into graph nodes and edges so entity overlap becomes explicit shared state.",
      href: "/lab/10",
      icon: GraphIcon,
    },
    {
      id: "11",
      title: "Graph Narrative",
      description: "Read bounded graph context into narrative synthesis and ground claims in explicit relationships.",
      href: "/lab/11",
      icon: BookOpenTextIcon,
    },
    {
      id: "12",
      title: "Feedback + Report",
      description: "Record analyst verdicts, generate the Markdown report, and send a notification event.",
      href: "/lab/12",
      icon: BellRingingIcon,
    },
    {
      id: "13",
      title: "Eval Harness",
      description: "Run deterministic checks over the hunting workflow so improvement is measured, not guessed.",
      href: "/lab/13",
      icon: ExamIcon,
    },
    {
      id: "14",
      title: "Complete Hunt",
      description: "Run the integrated capstone from orchestration through graph, narrative, feedback, and evals.",
      href: "/lab/14",
      icon: RocketLaunchIcon,
    },
    {
      id: "15",
      title: "Further Learning",
      description: "Map next steps after the workshop: more skills, real integrations, persistent graph state, feedback, and evals.",
      href: "/lab/15",
      icon: CompassIcon,
    },
  ];

  const socialLinks = [
    { label: "Home", url: "https://aionsec.ai", icon: HouseIcon },
    { label: "LinkedIn", url: "https://www.linkedin.com/in/faan-rossouw/", icon: LinkedinLogoIcon },
    { label: "X", url: "https://x.com/faanross", icon: XLogoIcon },
    { label: "GitHub", url: "https://github.com/faanross", icon: GithubLogoIcon },
    { label: "YouTube", url: "https://www.youtube.com/@faanross", icon: YoutubeLogoIcon },
  ];
</script>

<svelte:head><title>AntiSyphon Hunting Agent Labs</title></svelte:head>

<main class="console-index">
  <section class="hero">
    <span class="eyebrow">AntiSyphon Workshop</span>
    <h1>Interactive Lab Console</h1>
    <div class="hero-links" aria-label="Workshop links">
      <a class="repo-link" href="https://github.com/faanross/antisyphon_workshop_12062026" target="_blank" rel="noreferrer">
        <GithubLogoIcon size={20} weight="duotone" />
        <span>GitHub repository</span>
      </a>
      <a class="instructions-link" href="/instructions">
        <BookOpenTextIcon size={22} weight="duotone" />
        <span>Setup instructions</span>
      </a>
    </div>
  </section>

  <section class="grid" aria-label="Workshop labs">
    {#each labs as lab}
      {@const Icon = lab.icon}
      <a class="card" href={lab.href}>
        <div class="card-top">
          <span class="lab-id">Lab {lab.id}</span>
          <span class="card-icon" aria-hidden="true">
            <Icon size={34} weight="duotone" />
          </span>
        </div>
        <h2>{lab.title}</h2>
        <p>{lab.description}</p>
      </a>
    {/each}
  </section>

  <footer class="social-footer" aria-label="AionSec and instructor links">
    {#each socialLinks as link}
      {@const Icon = link.icon}
      <a href={link.url} target="_blank" rel="noreferrer">
        <Icon size={24} weight="duotone" />
        <span class="social-label">{link.label}</span>
        <span class="social-url">{link.url}</span>
      </a>
    {/each}
  </footer>
</main>

<style>
  :global(body) {
    background: #07070a;
  }

  .console-index {
    --brand-bg: #07070a;
    --brand-card: #16161f;
    --brand-elev: #1c1d27;
    --brand-purple: #bd93f9;
    --brand-yellow: #f5e663;
    --brand-text: rgba(255, 255, 255, 0.9);
    --brand-muted: rgba(255, 255, 255, 0.54);
    --brand-line: rgba(189, 147, 249, 0.22);

    position: relative;
    min-height: 100vh;
    width: 100%;
    margin: 0;
    padding: 3.5rem max(1rem, calc((100vw - 1120px) / 2)) 4rem;
    overflow: hidden;
    background:
      linear-gradient(135deg, rgba(189, 147, 249, 0.07), transparent 34%),
      linear-gradient(180deg, rgba(245, 230, 99, 0.035), transparent 18rem),
      var(--brand-bg);
    color: var(--brand-text);
    font-family: var(--font-heading);
  }

  .console-index::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
    background-size: 42px 42px;
    mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.62), transparent 72%);
  }

  .hero,
  .grid {
    position: relative;
    z-index: 1;
    width: min(1120px, 100%);
    margin: 0 auto;
  }

  .hero {
    margin-bottom: 1rem;
    padding: 1.75rem 1.9rem 1.9rem;
    border: 1px solid var(--brand-line);
    border-radius: 4px;
    background: color-mix(in srgb, var(--brand-card) 88%, transparent);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
  }

  .eyebrow {
    display: block;
    margin-bottom: 1.15rem;
    color: var(--brand-purple);
    font-family: var(--font-heading);
    font-size: .76rem;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    max-width: 14ch;
    color: var(--brand-text);
    font-family: var(--font-heading);
    font-size: 5.25rem;
    font-weight: 800;
    line-height: .98;
  }

  .hero-links {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    gap: .75rem;
    align-items: flex-start;
    margin: 1.3rem 0 0;
  }

  .repo-link {
    display: inline-flex;
    gap: .45rem;
    align-items: center;
    border: 1px solid rgba(189, 147, 249, 0.28);
    border-radius: 999px;
    padding: .33rem .7rem;
    background: rgba(189, 147, 249, 0.07);
    color: var(--brand-text);
    font-family: var(--font-heading);
    font-size: .74rem;
    font-weight: 800;
    text-decoration: none;
    text-transform: uppercase;
    transition: color .16s ease, border-color .16s ease, background .16s ease;
  }

  .repo-link:hover {
    border-color: rgba(245, 230, 99, 0.44);
    background: rgba(245, 230, 99, 0.08);
    color: var(--brand-yellow);
  }

  .instructions-link {
    display: inline-flex;
    gap: .45rem;
    align-items: center;
    border: 1px solid rgba(189, 147, 249, 0.28);
    border-radius: 999px;
    padding: .33rem .7rem;
    background: rgba(189, 147, 249, 0.07);
    color: var(--brand-text);
    font-family: var(--font-heading);
    font-size: .74rem;
    font-weight: 800;
    text-decoration: none;
    text-transform: uppercase;
    transition: color .16s ease, border-color .16s ease, background .16s ease;
  }

  .instructions-link:hover {
    border-color: rgba(245, 230, 99, 0.44);
    background: rgba(245, 230, 99, 0.08);
    color: var(--brand-yellow);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .card {
    display: grid;
    grid-template-rows: auto auto 1fr;
    gap: 1.15rem;
    min-height: 11.6rem;
    padding: 1.35rem 1.45rem;
    border: 1px solid rgba(189, 147, 249, 0.18);
    border-radius: 4px;
    background: rgba(22, 22, 31, 0.9);
    color: var(--brand-text);
    text-decoration: none;
    box-shadow: 0 18px 52px rgba(0, 0, 0, 0.24);
    transition: transform .16s ease, border-color .16s ease, background .16s ease, box-shadow .16s ease;
  }

  .card:hover {
    transform: translateY(-2px);
    border-color: rgba(245, 230, 99, 0.36);
    background: rgba(28, 29, 39, 0.96);
    box-shadow: 0 22px 64px rgba(0, 0, 0, 0.34);
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    gap: .75rem;
    align-items: center;
  }

  .lab-id {
    font-family: var(--font-heading);
    font-size: .72rem;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .lab-id {
    color: var(--brand-purple);
  }

  .card-icon {
    display: grid;
    place-items: center;
    width: 2.65rem;
    height: 2.65rem;
    border: 1px solid rgba(245, 230, 99, 0.22);
    border-radius: 999px;
    background: rgba(245, 230, 99, 0.055);
    color: rgba(245, 230, 99, 0.78);
    transition: color .16s ease, border-color .16s ease, background .16s ease, transform .16s ease;
  }

  .card:hover .card-icon {
    transform: translateY(-1px);
    border-color: rgba(245, 230, 99, 0.42);
    background: rgba(245, 230, 99, 0.1);
    color: var(--brand-yellow);
  }

  h2 {
    margin: 0;
    color: var(--brand-text);
    font-family: var(--font-heading);
    font-size: 1.55rem;
    font-weight: 800;
    line-height: 1.18;
  }

  .card p {
    margin: 0;
    color: var(--brand-muted);
    font-family: var(--font-heading);
    font-size: .9rem;
    line-height: 1.58;
  }

  .social-footer {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: .55rem;
    width: min(1120px, 100%);
    margin: 1rem auto 0;
    padding: 1rem 1.15rem;
    border: 1px solid rgba(189, 147, 249, 0.18);
    border-radius: 4px;
    background: rgba(22, 22, 31, 0.78);
  }

  .social-footer a {
    display: flex;
    gap: .75rem;
    align-items: center;
    color: var(--brand-muted);
    font-family: var(--font-heading);
    font-size: .82rem;
    text-decoration: none;
    transition: color .16s ease;
  }

  .social-footer a:hover {
    color: var(--brand-yellow);
  }

  .social-label {
    min-width: 5.25rem;
    color: var(--brand-text);
    font-weight: 800;
  }

  .social-url {
    overflow-wrap: anywhere;
  }

  @media (max-width: 760px) {
    .console-index {
      padding-top: 1rem;
    }

    .grid {
      grid-template-columns: 1fr;
    }

    .hero {
      padding: 1.25rem;
    }

    h1 {
      font-size: 3rem;
    }

    h2 {
      font-size: 1.28rem;
    }

    .social-footer a {
      align-items: flex-start;
    }

    .social-label {
      min-width: 4.75rem;
    }
  }
</style>
