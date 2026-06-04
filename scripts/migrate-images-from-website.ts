#!/usr/bin/env tsx
/**
 * 把官网 public/content 下被博客文章引用的图片复制到对应文章的 images/ 目录，
 * 并把旧的 /content/... 或 /public/content/... 引用改为 ./images/...。
 *
 * 用法：
 *   pnpm migrate:images:dry ../mo-website-redesign
 *   pnpm migrate:images     ../mo-website-redesign
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { readdir } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PROJECT_DIRS = ["matrixorigin"] as const;
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);

type Args = {
  dryRun: boolean;
  websiteRoot: string;
};

type AssetRef = {
  original: string;
  cleanPath: string;
  suffix: string;
};

type CopyResult = {
  rewritten: Map<string, string>;
  copied: number;
  reused: number;
  missing: string[];
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const websiteRoot = args.find((arg) => !arg.startsWith("--"));

  if (!websiteRoot) {
    console.error("Usage: tsx scripts/migrate-images-from-website.ts [--dry-run] <mo-website-redesign path>");
    process.exit(1);
  }

  return { dryRun, websiteRoot: resolve(websiteRoot) };
}

async function walk(dir: string, out: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path, out);
    else if (entry.isFile() && entry.name === "index.md") out.push(path);
  }
}

async function collectArticleFiles(): Promise<string[]> {
  const files: string[] = [];
  for (const project of PROJECT_DIRS) {
    const dir = join(ROOT, project);
    if (existsSync(dir)) await walk(dir, files);
  }
  return files.sort();
}

function splitSuffix(value: string): { cleanPath: string; suffix: string } {
  const match = value.match(/^([^?#]+)([?#].*)?$/);
  return {
    cleanPath: match?.[1] ?? value,
    suffix: match?.[2] ?? "",
  };
}

function decodePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

function normalizeContentPath(value: string): AssetRef | null {
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  if (!trimmed.startsWith("/content/") && !trimmed.startsWith("/public/content/")) {
    return null;
  }

  const { cleanPath, suffix } = splitSuffix(trimmed);
  const publicPath = cleanPath.startsWith("/public/")
    ? cleanPath.replace(/^\/public/, "")
    : cleanPath;
  const ext = extname(publicPath).toLowerCase();

  if (!IMAGE_EXTENSIONS.has(ext)) return null;
  if (publicPath.startsWith("/content/blog/")) return null;

  return { original: trimmed, cleanPath: publicPath, suffix };
}

function findAssetRefs(markdown: string): AssetRef[] {
  const refs = new Map<string, AssetRef>();
  const patterns = [
    /!\[[^\]]*]\(([^)\s]+)\)/g,
    /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g,
    /(?:^|[\s:[{,])["']?(\/(?:public\/)?content\/[^"'<>)\s]+)["']?/gm,
  ];

  for (const pattern of patterns) {
    for (const match of markdown.matchAll(pattern)) {
      const ref = normalizeContentPath(match[1]);
      if (ref) refs.set(ref.original, ref);
    }
  }

  return [...refs.values()].sort((a, b) => a.original.localeCompare(b.original));
}

function filesAreSame(left: string, right: string): boolean {
  const leftStat = statSync(left);
  const rightStat = statSync(right);
  return leftStat.size === rightStat.size;
}

function toAvailableName(sourcePath: string, imagesDir: string): string {
  const name = basename(sourcePath);
  const directDest = join(imagesDir, name);
  if (!existsSync(directDest) || filesAreSame(sourcePath, directDest)) return name;

  const sourceDir = basename(dirname(sourcePath)).replace(/[^a-zA-Z0-9._-]/g, "-");
  const ext = extname(name);
  const stem = basename(name, ext);
  let candidate = `${sourceDir}-${stem}${ext}`;
  let n = 2;

  while (existsSync(join(imagesDir, candidate)) && !filesAreSame(sourcePath, join(imagesDir, candidate))) {
    candidate = `${sourceDir}-${stem}-${n}${ext}`;
    n++;
  }

  return candidate;
}

function migrateArticle(file: string, websiteRoot: string, dryRun: boolean): CopyResult {
  const markdown = readFileSync(file, "utf8");
  const refs = findAssetRefs(markdown);
  const articleDir = dirname(file);
  const imagesDir = join(articleDir, "images");
  const result: CopyResult = {
    rewritten: new Map(),
    copied: 0,
    reused: 0,
    missing: [],
  };

  for (const ref of refs) {
    const sourcePath = join(websiteRoot, "public", decodePath(ref.cleanPath.replace(/^\/content\//, "content/")));
    if (!existsSync(sourcePath) || !statSync(sourcePath).isFile()) {
      result.missing.push(ref.original);
      continue;
    }

    const destName = toAvailableName(sourcePath, imagesDir);
    const destPath = join(imagesDir, destName);
    const nextRef = `./images/${destName}${ref.suffix}`;
    result.rewritten.set(ref.original, nextRef);

    if (existsSync(destPath)) {
      result.reused++;
      continue;
    }

    if (!dryRun) {
      mkdirSync(imagesDir, { recursive: true });
      copyFileSync(sourcePath, destPath);
    }
    result.copied++;
  }

  if (result.rewritten.size > 0 && !dryRun) {
    let nextMarkdown = markdown;
    for (const [before, after] of result.rewritten) {
      nextMarkdown = nextMarkdown.split(before).join(after);
    }
    writeFileSync(file, nextMarkdown, "utf8");
  }

  return result;
}

async function main() {
  const { dryRun, websiteRoot } = parseArgs();
  const contentRoot = join(websiteRoot, "public", "content");
  if (!existsSync(contentRoot)) {
    throw new Error(`Website public/content not found: ${contentRoot}`);
  }

  const files = await collectArticleFiles();
  let touched = 0;
  let copied = 0;
  let reused = 0;
  let missing = 0;

  console.log(`Source: ${contentRoot}`);
  console.log(`Target: ${join(ROOT, "matrixorigin", "<slug>", "images")}`);
  console.log(`Mode:   ${dryRun ? "DRY-RUN" : "WRITE"}`);
  console.log("");

  for (const file of files) {
    const result = migrateArticle(file, websiteRoot, dryRun);
    if (result.rewritten.size === 0 && result.missing.length === 0) continue;

    touched++;
    copied += result.copied;
    reused += result.reused;
    missing += result.missing.length;

    console.log(relative(ROOT, file));
    if (result.rewritten.size > 0) {
      console.log(`  rewrite ${result.rewritten.size}, copy ${result.copied}, reuse ${result.reused}`);
    }
    for (const ref of result.missing) {
      console.log(`  missing ${ref}`);
    }
  }

  console.log("");
  console.log(`Done. Articles touched=${touched}, copied=${copied}, reused=${reused}, missing=${missing}.`);
  if (dryRun) console.log("Dry run complete. Re-run without --dry-run to write files.");
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
