#!/usr/bin/env tsx
/**
 * 一次性迁移脚本：把 mo-website-redesign/public/content/blog 下的历史文章搬到
 * matrixorigin-blog/matrixorigin/<slug>/index.md 结构。
 *
 * 原始结构：
 *   public/content/blog/
 *     en/<slug>.md
 *     zh/<slug>.md
 *     manifest.json
 *
 * 目标结构：
 *   matrixorigin/
 *     <slug>/index.md              # 英文版（lang: en）
 *     <slug>-zh/index.md           # 中文版（lang: zh），slug 后缀 -zh
 *
 * 跨语言对照：若同一 slug 两语版本都存在，互相写 translations 字段。
 *
 * 用法：
 *   pnpm migrate:dry ../mo-website-redesign    # dry-run，只打印不写文件
 *   pnpm migrate     ../mo-website-redesign    # 实际执行
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import matter from "gray-matter";

const ROOT = resolve(import.meta.dirname, "..");
const TARGET_DIR = join(ROOT, "matrixorigin");

type Plan = {
  srcPath: string;
  destDir: string;
  destFile: string;
  slug: string;
  lang: "zh" | "en";
  hasCounterpart: boolean;
  counterpartSlug?: string;
};

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const websiteRoot = args.find((a) => !a.startsWith("--"));
  if (!websiteRoot) {
    console.error("Usage: tsx migrate-from-website.ts [--dry-run] <mo-website-redesign path>");
    process.exit(1);
  }
  return { dryRun, websiteRoot: resolve(websiteRoot) };
}

async function listMarkdown(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir);
  return entries.filter((f) => f.endsWith(".md")).sort();
}

function toSlug(filename: string): string {
  return basename(filename, ".md").toLowerCase();
}

function normalizeFrontmatter(
  raw: Record<string, unknown>,
  lang: "zh" | "en",
  counterpartSlug?: string,
): Record<string, unknown> {
  const fm: Record<string, unknown> = { ...raw };

  // 标准化 date：如果只有 publishTime，复制到 date
  if (!fm.date && fm.publishTime) fm.date = fm.publishTime;

  // 标准化 lang
  fm.lang = lang;

  // status：若无则默认 published
  if (!fm.status) fm.status = "published";

  // translations：填入对端语言的 slug
  if (counterpartSlug) {
    fm.translations = {
      ...(fm.translations as object | undefined),
      [lang === "zh" ? "en" : "zh"]: counterpartSlug,
    };
  }

  // 清理无用的旧字段（保守起见暂时保留，让 schema 宽容处理）
  return fm;
}

async function plan(websiteRoot: string): Promise<Plan[]> {
  const blogRoot = join(websiteRoot, "public/content/blog");
  const enFiles = await listMarkdown(join(blogRoot, "en"));
  const zhFiles = await listMarkdown(join(blogRoot, "zh"));

  const enSlugs = new Set(enFiles.map(toSlug));
  const zhSlugs = new Set(zhFiles.map(toSlug));

  const plans: Plan[] = [];

  for (const file of enFiles) {
    const slug = toSlug(file);
    const hasZh = zhSlugs.has(slug);
    plans.push({
      srcPath: join(blogRoot, "en", file),
      destDir: join(TARGET_DIR, slug),
      destFile: join(TARGET_DIR, slug, "index.md"),
      slug,
      lang: "en",
      hasCounterpart: hasZh,
      counterpartSlug: hasZh ? `${slug}-zh` : undefined,
    });
  }

  for (const file of zhFiles) {
    const slug = toSlug(file);
    const hasEn = enSlugs.has(slug);
    const destSlug = `${slug}-zh`;
    plans.push({
      srcPath: join(blogRoot, "zh", file),
      destDir: join(TARGET_DIR, destSlug),
      destFile: join(TARGET_DIR, destSlug, "index.md"),
      slug: destSlug,
      lang: "zh",
      hasCounterpart: hasEn,
      counterpartSlug: hasEn ? slug : undefined,
    });
  }

  return plans;
}

function execute(plans: Plan[], dryRun: boolean) {
  let written = 0;
  let skipped = 0;

  for (const p of plans) {
    const raw = readFileSync(p.srcPath, "utf8");
    const parsed = matter(raw);
    const fm = normalizeFrontmatter(parsed.data, p.lang, p.counterpartSlug);

    const output = matter.stringify(parsed.content, fm);

    if (dryRun) {
      console.log(`[DRY] ${p.srcPath}`);
      console.log(`      → ${p.destFile}`);
      continue;
    }

    if (existsSync(p.destFile)) {
      skipped++;
      continue;
    }

    mkdirSync(p.destDir, { recursive: true });
    writeFileSync(p.destFile, output, "utf8");
    written++;
  }

  return { written, skipped };
}

async function main() {
  const { dryRun, websiteRoot } = parseArgs();
  console.log(`Source:  ${websiteRoot}/public/content/blog`);
  console.log(`Target:  ${TARGET_DIR}`);
  console.log(`Mode:    ${dryRun ? "DRY-RUN" : "WRITE"}`);
  console.log("");

  const plans = await plan(websiteRoot);
  console.log(`Planned ${plans.length} file(s):`);
  const enCount = plans.filter((p) => p.lang === "en").length;
  const zhCount = plans.filter((p) => p.lang === "zh").length;
  const pairs = plans.filter((p) => p.hasCounterpart).length / 2;
  console.log(`  EN: ${enCount}`);
  console.log(`  ZH: ${zhCount}`);
  console.log(`  Bilingual pairs (linked via translations): ${pairs}`);
  console.log("");

  const { written, skipped } = execute(plans, dryRun);
  if (dryRun) {
    console.log("\nDry run complete. Re-run without --dry-run to write files.");
  } else {
    console.log(`\nDone. Wrote ${written} file(s), skipped ${skipped} existing.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
