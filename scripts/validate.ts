#!/usr/bin/env tsx
/**
 * 校验 matrixorigin-blog 下所有 index.md 的 frontmatter。
 * 遍历所有顶级项目目录（memoria/、matrixorigin/、...），按 Zod schema 校验。
 *
 * 用法：
 *   pnpm validate                  # 校验全部
 *   pnpm validate memoria          # 只校验某个项目
 *   pnpm validate matrixorigin/foo # 只校验某篇
 */

import { readFileSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import matter from "gray-matter";
import { FrontmatterSchema } from "../schema/frontmatter.ts";

const ROOT = resolve(import.meta.dirname, "..");

const PROJECT_DIRS = ["memoria", "matrixorigin"] as const;

type Issue = { file: string; messages: string[] };

async function walk(dir: string, out: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else if (e.isFile() && e.name === "index.md") out.push(p);
  }
}

async function collectFiles(arg?: string): Promise<string[]> {
  const files: string[] = [];
  if (!arg) {
    for (const proj of PROJECT_DIRS) {
      const p = join(ROOT, proj);
      try {
        await stat(p);
        await walk(p, files);
      } catch {
        // 项目目录不存在，跳过
      }
    }
  } else {
    const p = resolve(ROOT, arg);
    const s = await stat(p).catch(() => null);
    if (!s) throw new Error(`Path not found: ${arg}`);
    if (s.isDirectory()) await walk(p, files);
    else if (s.isFile() && p.endsWith(".md")) files.push(p);
  }
  return files.sort();
}

function validate(file: string): Issue | null {
  const raw = readFileSync(file, "utf8");
  const parsed = matter(raw);
  const result = FrontmatterSchema.safeParse(parsed.data);

  if (!result.success) {
    const messages = result.error.errors.map(
      (e) => `  ${e.path.join(".") || "<root>"}: ${e.message}`,
    );
    return { file, messages };
  }

  // 额外业务规则
  const messages: string[] = [];
  const fm = result.data;

  // 正文不能为空
  if (!parsed.content.trim()) messages.push("  <content>: 正文为空");

  // 如果声明了 translations，目标 slug 应该存在（先只提示不报错）
  // TODO: 跨文件引用校验，P2 再加

  return messages.length ? { file, messages } : null;
}

async function main() {
  const arg = process.argv[2];
  const files = await collectFiles(arg);

  if (files.length === 0) {
    console.log("No index.md files found.");
    process.exit(0);
  }

  const issues: Issue[] = [];
  for (const f of files) {
    try {
      const issue = validate(f);
      if (issue) issues.push(issue);
    } catch (err) {
      issues.push({
        file: f,
        messages: [`  <parse>: ${(err as Error).message}`],
      });
    }
  }

  const ok = files.length - issues.length;
  console.log(`Checked ${files.length} file(s): ${ok} ok, ${issues.length} with issues.`);

  if (issues.length > 0) {
    console.log("");
    for (const { file, messages } of issues) {
      console.log(`✗ ${relative(ROOT, file)}`);
      for (const m of messages) console.log(m);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
