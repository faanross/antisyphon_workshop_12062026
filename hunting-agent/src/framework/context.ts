import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export interface ContextDocument {
  readonly path: string;
  readonly title: string;
  readonly content: string;
}

async function walkMarkdown(root: string): Promise<string[]> {
  const dir = path.join(process.cwd(), root);
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await walkMarkdown(entryPath)));
    if (entry.isFile() && entry.name.endsWith(".md")) files.push(entryPath);
  }
  return files;
}

export async function loadContextDocuments(root = "context/layers"): Promise<ContextDocument[]> {
  const files = await walkMarkdown(root);
  const docs: ContextDocument[] = [];
  for (const docPath of files) {
    const content = await readFile(path.join(process.cwd(), docPath), "utf8");
    const title = content.match(/^#\s+(.+)$/m)?.[1] ?? path.basename(docPath);
    docs.push({ path: docPath, title, content });
  }
  return docs.sort((a, b) => a.path.localeCompare(b.path));
}

export function renderContextBlock(documents: readonly ContextDocument[]): string {
  return documents
    .map((document) => `## ${document.title}\n${document.content.trim()}`)
    .join("\n\n---\n\n");
}
