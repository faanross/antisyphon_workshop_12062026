# AntiSyphon Workshop — Agentic Threat Hunting

**Workshop date: 12 June 2026**

Welcome! This is the hands-on lab environment for the workshop. It's an interactive,
browser-based course where you build up an agentic threat-hunting system one piece at
a time — from a first model-backed pipeline through to detection skills.

> **The lab instructions live inside the app.** Each lab is a page with its own
> walkthrough, plus explainer tabs (e.g. **Code**, **Targeting**, **Author**) that show
> what's happening behind the scenes. There's nothing extra to read here — just get it
> running and follow along on screen.

This 4-hour workshop covers **Labs 01–06**.

---

## What's in here

| Folder | What it is |
|---|---|
| `hunting-agent/` | The lab app (SvelteKit). **This is what you run.** |
| `mcp-security/` | Google's GTI MCP server, vendored — used by the MCP lab. No separate clone needed. |

---

## Setup

You only need **Node** to run the labs — the setup script handles it.

**1. Install dependencies** (from the `hunting-agent/` folder):

- macOS / Linux:
  ```bash
  cd hunting-agent && bash ./setup.sh
  ```
- Windows (PowerShell):
  ```powershell
  cd hunting-agent
  powershell -ExecutionPolicy Bypass -File setup.ps1
  ```

This ensures a supported Node version (via Volta if needed) and installs everything.

**2. Choose a model provider:**

```bash
cp .env.example .env     # Windows: copy .env.example .env
```

Open `.env` and pick a provider with `LLM_PROVIDER`. If you don't have an API key yet,
**Google AI Studio** gives a free one for `gemini-2.5-flash`. (CLI providers like
`claude-code` and `codex-cli` are also supported if you have them installed.)

**3. Set up the GTI lab (MCP):**

Lab 05 makes a **real** call to Google Threat Intelligence over MCP — it's part of the
course, not an extra. Set up both prerequisites now, *before* you start the server, so the
single fresh terminal in the next step picks up everything at once.

- **`uv`** (installs Python automatically — it's a single binary):
  - macOS / Linux: `curl -LsSf https://astral.sh/uv/install.sh | sh`
  - Windows (PowerShell) — run **both** lines, in order:
    ```powershell
    Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
    powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
    ```
    > On a fresh Windows box the execution policy is `Restricted`, and uv's installer
    > refuses to run under it. The first line fixes that (user-scope only, the standard
    > dev setting) — answer **Y** if prompted. No need to restart yet — the next step's
    > fresh terminal picks up both Node and uv.
- A free **VirusTotal API key** in your `.env` (`VT_APIKEY=…`) — get one at
  [virustotal.com/gui/my-apikey](https://www.virustotal.com/gui/my-apikey).

The MCP server is bundled in the repo (`mcp-security/`) — no separate download. The first
Lab 05 run pauses a few seconds while `uv` fetches its Python deps; that's normal, once only.

**4. Run the lab server:**

> **Open ONE fresh terminal first.** Setup installed Node (via Volta) and uv, and both
> updated your `PATH` — terminals you already had open won't see them, so `npm`/`uv` read
> as "not recognized." Close all terminal windows (on **Windows**, fully quit **Windows
> Terminal**, not just the tab), open a new one, and `cd` back into `hunting-agent/`. Check
> both: `npm -v` and `uv --version`. Start the server from this terminal — the labs it
> launches (including Lab 05's MCP call) inherit its `PATH`.

```bash
npm run dev
```

Open the URL it prints (usually **http://localhost:5173**) and start at Lab 01.

---

Happy hunting!
