<script lang="ts">
  import GithubLogoIcon from "phosphor-svelte/lib/GithubLogoIcon";
  import HouseIcon from "phosphor-svelte/lib/HouseIcon";
  import KeyIcon from "phosphor-svelte/lib/KeyIcon";
  import PlugsConnectedIcon from "phosphor-svelte/lib/PlugsConnectedIcon";
  import TerminalWindowIcon from "phosphor-svelte/lib/TerminalWindowIcon";
  import WarningIcon from "phosphor-svelte/lib/WarningIcon";
</script>

<svelte:head><title>Workshop Setup Instructions</title></svelte:head>

<main class="instructions-page">
  <section class="hero">
    <a class="back-link" href="/">
      <HouseIcon size={20} weight="duotone" />
      <span>Lab index</span>
    </a>
    <span class="eyebrow">Setup instructions</span>
    <h1>Before You Run the Labs</h1>
    <p>
      These notes cover the model provider setup and the VirusTotal key required for the GTI MCP lab.
      More setup notes will be added as the workshop hardens.
    </p>
  </section>

  <section class="setup-card">
    <div class="section-heading">
      <TerminalWindowIcon size={30} weight="duotone" />
      <div>
        <span class="section-kicker">1</span>
        <h2>Connect a Model Provider</h2>
      </div>
    </div>

    <p>
      Copy the example environment file to <code>.env</code>, then choose one provider with
      <code>LLM_PROVIDER</code>. The reference app reads these values from the project root.
    </p>

    <pre><code>cp .env.example .env</code></pre>

    <article>
      <h3>Claude Code CLI</h3>
      <p>
        Use this if Claude Code is installed and authenticated on the host machine. This is the
        best CLI-backed option for visible streaming in the early labs.
      </p>
      <pre><code>LLM_PROVIDER=claude-code
CLAUDE_CODE_MODEL=sonnet</code></pre>
    </article>

    <article>
      <h3>Codex CLI</h3>
      <p>
        Use this if Codex CLI is installed and authenticated on the host machine. This provider is
        supported, but it is currently treated as non-streaming in the workshop app.
      </p>
      <pre><code>LLM_PROVIDER=codex-cli
CODEX_MODEL=gpt-4.1</code></pre>
    </article>

    <article>
      <h3>API key providers</h3>
      <p>
        If you do not have a local CLI provider installed, use an API key provider instead.
        Google AI Studio is a practical workshop option because Gemini Flash has a free tier, but
        transient <code>503</code> responses are expected on the free service.
      </p>
      <pre><code>LLM_PROVIDER=gemini
GEMINI_API_KEY=paste-your-key-here
GEMINI_MODEL=gemini-2.5-flash</code></pre>
      <p>
        The same app also supports <code>openai</code> and <code>anthropic</code> through
        <code>OPENAI_API_KEY</code> or <code>ANTHROPIC_API_KEY</code>. See <code>.env.example</code>
        for the exact model variables.
      </p>
    </article>

    <div class="notice">
      <WarningIcon size={24} weight="duotone" />
      <p>
        Do not commit your <code>.env</code> file. Keep provider keys local to your workstation.
      </p>
    </div>
  </section>

  <section class="setup-card">
    <div class="section-heading">
      <PlugsConnectedIcon size={30} weight="duotone" />
      <div>
        <span class="section-kicker">2</span>
        <h2>VirusTotal Key for the GTI MCP Lab</h2>
      </div>
    </div>

    <p>
      Lab 05 connects to Google Threat Intelligence through the GTI MCP server. That server expects
      a VirusTotal API key in the environment as <code>VT_APIKEY</code>.
    </p>

    <pre><code>VT_APIKEY=paste-your-virustotal-api-key-here
GTI_MCP_COMMAND=uv
GTI_MCP_DIR=../mcp-security/server/gti/gti_mcp</code></pre>

    <p>
      A no-hit result is still a valid result. The point of the lab is to show a real MCP
      connection, tool discovery, and a live tool call, not to guarantee that every workshop
      indicator is malicious in public intelligence.
    </p>

    <a class="external-link" href="https://www.virustotal.com/gui/my-apikey" target="_blank" rel="noreferrer">
      <KeyIcon size={22} weight="duotone" />
      <span>VirusTotal API key page</span>
    </a>
  </section>

  <footer class="footer-link">
    <a href="https://github.com/faanross" target="_blank" rel="noreferrer">
      <GithubLogoIcon size={22} weight="duotone" />
      <span>github.com/faanross</span>
    </a>
  </footer>
</main>

<style>
  :global(body) {
    background: #07070a;
  }

  .instructions-page {
    --brand-bg: #07070a;
    --brand-card: #16161f;
    --brand-purple: #bd93f9;
    --brand-yellow: #f5e663;
    --brand-cyan: #8be9fd;
    --brand-text: rgba(255, 255, 255, 0.9);
    --brand-muted: rgba(255, 255, 255, 0.58);
    --brand-line: rgba(189, 147, 249, 0.22);

    position: relative;
    min-height: 100vh;
    padding: 3.5rem max(1rem, calc((100vw - 980px) / 2)) 4rem;
    background:
      linear-gradient(135deg, rgba(189, 147, 249, 0.07), transparent 34%),
      linear-gradient(180deg, rgba(245, 230, 99, 0.035), transparent 18rem),
      var(--brand-bg);
    color: var(--brand-text);
    font-family: var(--font-heading);
  }

  .instructions-page::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
    background-size: 42px 42px;
    mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.58), transparent 72%);
  }

  .hero,
  .setup-card,
  .footer-link {
    position: relative;
    z-index: 1;
    width: min(980px, 100%);
    margin-inline: auto;
  }

  .hero,
  .setup-card {
    border: 1px solid var(--brand-line);
    border-radius: 4px;
    background: rgba(22, 22, 31, 0.9);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.38);
  }

  .hero {
    padding: 1.75rem 1.9rem;
  }

  .back-link,
  .external-link,
  .footer-link a {
    display: inline-flex;
    gap: .5rem;
    align-items: center;
    color: var(--brand-muted);
    font-family: var(--font-heading);
    text-decoration: none;
    transition: color .16s ease;
  }

  .back-link:hover,
  .external-link:hover,
  .footer-link a:hover {
    color: var(--brand-yellow);
  }

  .eyebrow,
  .section-kicker {
    display: block;
    color: var(--brand-purple);
    font-size: .76rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .eyebrow {
    margin: 1.15rem 0;
  }

  h1,
  h2,
  h3,
  p {
    margin: 0;
  }

  h1 {
    max-width: 12ch;
    font-size: clamp(3.2rem, 9vw, 6.2rem);
    line-height: .95;
  }

  .hero p {
    max-width: 56rem;
    margin-top: 1.25rem;
    color: var(--brand-muted);
    font-size: .96rem;
    line-height: 1.7;
  }

  .setup-card {
    margin-top: 1rem;
    padding: 1.45rem 1.55rem;
  }

  .section-heading {
    display: flex;
    gap: .8rem;
    align-items: center;
    margin-bottom: 1rem;
    color: var(--brand-yellow);
  }

  h2 {
    color: var(--brand-text);
    font-size: 1.65rem;
    line-height: 1.15;
  }

  h3 {
    margin-top: 1.35rem;
    color: var(--brand-cyan);
    font-size: 1.05rem;
  }

  p {
    color: var(--brand-muted);
    font-size: .95rem;
    line-height: 1.7;
  }

  code {
    color: var(--brand-yellow);
    font-family: var(--font-heading);
  }

  pre {
    overflow-x: auto;
    margin: .85rem 0 0;
    border: 1px solid rgba(189, 147, 249, 0.18);
    border-radius: 4px;
    padding: 1rem;
    background: rgba(7, 7, 10, 0.72);
    color: var(--brand-text);
    font-size: .86rem;
    line-height: 1.6;
  }

  pre code {
    color: var(--brand-text);
  }

  .notice {
    display: flex;
    gap: .75rem;
    align-items: flex-start;
    margin-top: 1.3rem;
    border: 1px solid rgba(245, 230, 99, 0.24);
    border-radius: 4px;
    padding: .9rem 1rem;
    background: rgba(245, 230, 99, 0.055);
    color: var(--brand-yellow);
  }

  .external-link {
    margin-top: 1rem;
    border: 1px solid rgba(245, 230, 99, 0.24);
    border-radius: 999px;
    padding: .45rem .75rem;
    background: rgba(245, 230, 99, 0.055);
    color: var(--brand-text);
    font-size: .78rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .footer-link {
    margin-top: 1rem;
    padding: 0 .15rem;
  }

  @media (max-width: 760px) {
    .instructions-page {
      padding-top: 1rem;
    }

    .hero,
    .setup-card {
      padding: 1.2rem;
    }
  }
</style>
