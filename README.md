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
| `mini-distillation/` | A bonus take-home CLI. |

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

**3. Run the lab server:**

```bash
npm run dev
```

Open the URL it prints (usually **http://localhost:5173**) and start at Lab 01.

---

## MCP lab prerequisites (Lab 05 only)

Lab 05 makes a **real** call to Google Threat Intelligence over MCP. For that one lab you
also need:

1. **`uv`** (installs Python automatically — it's a single binary):
   - macOS / Linux: `curl -LsSf https://astral.sh/uv/install.sh | sh`
   - Windows: `powershell -c "irm https://astral.sh/uv/install.ps1 | iex"`
2. A free **VirusTotal API key** in your `.env` (`VT_APIKEY=…`).

Every other lab works without these. The first MCP run may pause a few seconds while `uv`
fetches the server's Python dependencies — that's expected, and only happens once.

---

Happy hunting!
