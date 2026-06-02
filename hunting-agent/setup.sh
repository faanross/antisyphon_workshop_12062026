#!/usr/bin/env bash
# AntiSyphon workshop — one-shot setup for macOS / Linux.
# Ensures a supported Node (via Volta if needed), then installs dependencies.
set -euo pipefail

NODE_PIN="22.12.0"
echo "== AntiSyphon workshop setup (macOS / Linux) =="

# True if a usable Node (20.19+ / 22.12+ / 24+, not 21/23) is already on PATH.
node_ok() {
  command -v node >/dev/null 2>&1 || return 1
  node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(((a===20&&b>=19)||(a===22&&b>=12)||a>=24)?0:1)' 2>/dev/null
}

if node_ok; then
  echo "✔ Node $(node -v) is already supported — skipping version setup."
else
  echo "→ Node missing or unsupported. Setting up Volta + Node ${NODE_PIN}..."
  if ! command -v volta >/dev/null 2>&1; then
    echo "  Installing Volta (cross-platform Node version manager)..."
    curl -fsSL https://get.volta.sh | bash
  fi
  export VOLTA_HOME="${VOLTA_HOME:-$HOME/.volta}"
  export PATH="$VOLTA_HOME/bin:$PATH"
  volta install "node@${NODE_PIN}"
  hash -r 2>/dev/null || true
  echo "✔ Now using Node $(node -v)."
fi

echo "→ Installing dependencies (npm install)..."
npm install

cat <<'DONE'

== Setup complete. Next steps ==
  1) cp .env.example .env
  2) Edit .env  — set LLM_PROVIDER and add your key / pick a model
  3) npm run dev   — then open the http://localhost URL it prints
DONE
