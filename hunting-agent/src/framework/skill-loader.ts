import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";

export interface SkillMetadata {
  readonly name: string;
  readonly version?: string;
  readonly layer?: string;
  readonly description?: string;
  readonly invocationTriggerCandidate?: string;
  readonly mitreTechniques?: readonly string[];
  readonly [key: string]: unknown;
}

export interface SkillDocument {
  readonly path: string;
  readonly metadata: SkillMetadata;
  readonly frontmatter: string;
  readonly body: string;
}

function splitFrontmatter(content: string): { metadata: SkillMetadata; frontmatter: string; body: string } {
  // Normalize CRLF/CR -> LF first. On Windows checkouts the skill .md files often have
  // \r\n line endings; the frontmatter delimiter regex below matches \n only, so without
  // this the match silently fails and every skill loads as "unnamed-skill". Normalizing
  // also strips stray \r from the captured frontmatter/body so YAML parsing stays clean.
  const normalized = content.replace(/\r\n?/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { metadata: { name: "unnamed-skill" }, frontmatter: "", body: normalized };
  }
  return {
    metadata: parse(match[1]) as SkillMetadata,
    frontmatter: match[1].trim(),
    body: match[2].trim(),
  };
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    if (entry.isFile() && entry.name.endsWith(".md")) files.push(full);
  }
  return files;
}

export async function loadSkill(filePath: string): Promise<SkillDocument> {
  const fullPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
  const content = await readFile(fullPath, "utf8");
  const { metadata, frontmatter, body } = splitFrontmatter(content);
  return {
    path: path.relative(process.cwd(), fullPath),
    metadata,
    frontmatter,
    body,
  };
}

export async function listSkills(root = "skills"): Promise<SkillDocument[]> {
  const fullRoot = path.join(process.cwd(), root);
  const files = await walk(fullRoot);
  const skills = await Promise.all(files.map(loadSkill));
  return skills.sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));
}

export async function findSkillsForCandidate(type: string): Promise<SkillDocument[]> {
  const skills = await listSkills();
  return skills.filter((skill) => skill.metadata.invocationTriggerCandidate === type);
}
