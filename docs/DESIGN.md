# Blog System Design v1

Related issue: [matrixorigin/mo-website-redesign#57](https://github.com/matrixorigin/mo-website-redesign/issues/57)

## Topology

```
matrixorigin-blog (this repo)  ── single markdown source
    │
    ├─► Astro build (cn bucket) → matrixorigin.cn/blog    [defaults zh, allows en]
    ├─► Astro build (io bucket) → matrixorigin.io/blog    [defaults en, allows zh]
    └─► (unchanged) Memoria backend → thememoria.ai/blog.html  (watches memoria/)

Shared infra:  giscus · Buttondown(→Substack RSS) · Plausible
Syndication:   dev.to · X · LinkedIn · Bluesky · Substack(via Buttondown) · WeChat/Zhihu manual
```

## Key decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **Single content repo** (this one), top-level per-project directories | Permission isolation, already the established convention |
| 2 | Main-site blog lives at **path** `matrixorigin.{cn,io}/blog`, not subdomain | SEO equity accrues to each main domain |
| 3 | **Soft language separation**: each site defaults to its primary language, allows switching | Maximizes SEO, preserves UX |
| 4 | Memoria blog stays at **subdomain** `blog.thememoria.ai` (unchanged for now) | Independent product, don't disrupt working system |
| 5 | **All three SSGs: Astro Content Collections** | Full visual control, reuse main-site components |
| 6 | Substack via **Buttondown RSS import** (no write API exists) | Preserve existing Substack subscribers |
| 7 | WeChat: **manual only** | Format quirks make automation low-value |
| 8 | Baidu: **Active Push API** integration | Low cost, high return for zh SEO |
| 9 | Comments: **giscus** (GitHub Discussions on this repo) | Zero ops, content + discussion colocated |
| 10 | Newsletter: **Buttondown** (API-driven) | Mirror to Substack via RSS |
| 11 | Analytics: **Plausible**, both main sites in one workspace | Cross-domain funnel analysis |

## Frontmatter schema

Defined in [`schema/frontmatter.ts`](../schema/frontmatter.ts). Key choices:

- **Backward compatible**: existing `memoria/` articles (`title_zh`, `tag`, `status`) pass validation unchanged.
- **Bilingual metadata, single-language body**: one article directory per article; if a counterpart translation exists, link via `translations: { zh/en: <slug> }`.
- **Syndication opt-in**: every platform defaults to `false`.
- **Strict mode**: typos in field names fail CI (preventing silent drift).

## Workflow

```
Author (Obsidian / VSCode)
   │ git commit + push to feature branch
   ▼
PR → CI runs `pnpm validate` → Cloudflare Pages preview for each site
   │ Editor review, giscus threads on preview
   ▼
Merge to main
   │
   ├─► Astro build × 3 → deploy
   ├─► Memoria backend detects memoria/** changes (unchanged)
   └─► Syndication Action:
       · reads git diff, finds new matrixorigin/**/index.md
       · respects frontmatter.syndicate per platform
       · posts with canonical_url back to the origin site
       · failures → Slack, never block deploy
```

## SEO checklist (per article)

- [x] Independent HTML (SSG-rendered)
- [x] `<title>`, `<meta description>`, `<link rel="canonical">`
- [x] JSON-LD `BlogPosting`
- [x] Open Graph + Twitter Card (auto-generated 1200×630 image)
- [x] `hreflang` linking to counterpart language
- [x] Listed in `sitemap.xml`
- [x] Semantic URL `/blog/YYYY/slug`
- [x] 301 redirects for legacy URLs
- [x] Baidu Active Push API

## Phases

| Phase | Scope | Where |
|---|---|---|
| **P1** | Schema + validator + migration script; migrate 73 EN + 146 ZH from mo-website-redesign into `matrixorigin/`; authors.yml | this repo (current PR) |
| **P2** | Astro site scaffold; reads this repo as build-time source; deploy both .cn/blog and .io/blog via Cloudflare Worker rewrite | mo-website-redesign |
| **P3** | giscus + Buttondown + Plausible integration | mo-website-redesign |
| **P4** | Decide: migrate Memoria blog onto Astro pipeline too, or keep current backend | TBD |
| **P5** | Syndication v1: dev.to, X, Bluesky, Buttondown→Substack | this repo (.github/workflows/) |
| **P6** | Syndication v2: LinkedIn via Typefully, Zhihu/Juejin via Zapier drafts, weekly Plausible digest | this repo + ops |

## Cost

- Astro, giscus, this repo's Actions: free
- Cloudflare Pages hosting: free tier sufficient
- Plausible: $9/mo
- Buttondown: $9/mo
- Total: **~$20/mo**
