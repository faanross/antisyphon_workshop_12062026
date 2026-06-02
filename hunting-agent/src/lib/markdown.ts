// Minimal, dependency-free Markdown rendering for model output shown in the labs.
// Block-level parsing (headings, lists, tables, fenced code) + safe inline rendering
// (bold, italic, code spans). Everything is HTML-escaped first, so the only tags that
// reach {@html ...} are the ones this module generates.

export type MarkdownBlock =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; headers: string[]; rows: string[][] }
  | { kind: "code"; text: string };

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Render inline markdown to SAFE html. Code spans are extracted first so their
// contents are never treated as bold/italic, then bold (** / __) and italic (* / _).
export function renderInline(text: string): string {
  return text
    .split(/(`[^`]+`)/g)
    .map((part) => {
      if (part.length >= 2 && part.startsWith("`") && part.endsWith("`")) {
        return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
      }
      let segment = escapeHtml(part);
      segment = segment.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      segment = segment.replace(/__([^_]+)__/g, "<strong>$1</strong>");
      segment = segment.replace(/\*([^*]+)\*/g, "<em>$1</em>");
      return segment;
    })
    .join("");
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

export function parseMarkdown(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = markdown.split(/\r?\n/);
  let paragraph: string[] = [];
  let list: string[] = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  }

  function flushList() {
    if (!list.length) return;
    blocks.push({ kind: "list", items: list });
    list = [];
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();
    const next = lines[index + 1] ?? "";

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    // Fenced code block: ``` … ``` (multi-line) or a single line wrapped in ```.
    if (trimmed.startsWith("```")) {
      flushParagraph();
      flushList();
      const single = /^`{3,}\s*(.*?)\s*`{3,}$/.exec(trimmed);
      if (single && single[1]) {
        blocks.push({ kind: "code", text: single[1] });
        continue;
      }
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? "").trim().startsWith("```")) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }
      blocks.push({ kind: "code", text: codeLines.join("\n") });
      continue;
    }

    if (trimmed.includes("|") && isTableSeparator(next)) {
      flushParagraph();
      flushList();
      const headers = parseTableRow(trimmed);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && (lines[index] ?? "").includes("|") && (lines[index] ?? "").trim()) {
        rows.push(parseTableRow(lines[index] ?? ""));
        index += 1;
      }
      index -= 1;
      blocks.push({ kind: "table", headers, rows });
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2] });
      continue;
    }

    const listItem = /^[-*]\s+(.+)$/.exec(trimmed);
    if (listItem) {
      flushParagraph();
      list.push(listItem[1]);
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  return blocks;
}
