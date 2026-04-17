import { z } from "zod";

/**
 * 统一 frontmatter schema（v1）
 *
 * 适用范围：matrixorigin-blog 下所有顶级目录（memoria/、matrixorigin/、未来项目）。
 *
 * 设计原则：
 * 1. 向后兼容现有 memoria/ 文章，一字不改就能通过校验
 * 2. 新增字段全部 opt-in，不填走合理默认
 * 3. 严格模式（.strict）防 typo，但宽容未来扩展（用 passthrough 预留空间由调用方决定）
 * 4. 元数据可双语（title + title_zh 模式），正文单语
 */

// ===== 基础枚举 =====
export const LangSchema = z.enum(["zh", "en"]);
export type Lang = z.infer<typeof LangSchema>;

export const StatusSchema = z.enum(["draft", "published", "archived"]);
export type Status = z.infer<typeof StatusSchema>;

// ===== 分发配置 =====
const SyndicateValue = z.union([
  z.boolean(),
  z.literal("via-buttondown"),
  z.literal("draft"),
]);

export const SyndicateSchema = z
  .object({
    devto: SyndicateValue.default(false),
    x: SyndicateValue.default(false),
    linkedin: SyndicateValue.default(false),
    bluesky: SyndicateValue.default(false),
    mastodon: SyndicateValue.default(false),
    /** Substack 无写 API，只支持 via-buttondown（经 Buttondown RSS 同步） */
    substack: z
      .union([z.literal(false), z.literal("via-buttondown")])
      .default(false),
  })
  .default({});

// ===== 主 schema =====
export const FrontmatterSchema = z
  .object({
    // ----- 必填 -----
    title: z.string().min(1).max(200),
    /** 双语标题中文版，可选 */
    title_zh: z.string().min(1).max(200).optional(),

    /** 发布时间，字符串（YYYY-MM-DD）或完整 ISO，memoria 现有文章已经用字符串 */
    date: z.union([z.string().min(4), z.coerce.date()]),

    description: z
      .string()
      .min(10, "description 至少 10 字（SEO meta + 列表摘要）")
      .max(300, "description 建议 <160 字，超 300 直接报错"),
    description_zh: z.string().min(10).max(300).optional(),

    status: StatusSchema.default("published"),

    // ----- 分类与标签（兼容 memoria 的单标签 tag/tag_zh） -----
    tag: z.string().optional(),
    tag_zh: z.string().optional(),
    /** 新风格：多标签数组 */
    tags: z.array(z.string()).optional(),

    // ----- 可选元数据 -----
    slug: z
      .string()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug 只能是小写字母、数字、连字符")
      .optional(),
    updated: z.union([z.string(), z.coerce.date()]).optional(),
    authors: z.array(z.string()).optional(),
    /** 兼容现有单作者字段 */
    author: z.string().optional(),
    mail: z.string().email().optional(),

    /** 正文语言（en | zh），不填时根据 title/description 自动推断 */
    lang: LangSchema.optional(),

    /** 封面图路径（相对或绝对） */
    cover: z.string().optional(),

    /** 兼容现有 image 字段（memoria 之外的旧文章用） */
    image: z.record(z.string()).optional(),

    /** 关键字，SEO 用 */
    keywords: z.array(z.string()).optional(),

    // ----- 跨语言对照（hreflang） -----
    translations: z
      .object({
        zh: z.string().optional(),
        en: z.string().optional(),
      })
      .optional(),

    /** 兼容旧 canonical 字段 */
    canonical: z.string().optional(),

    // ----- 系列 -----
    series: z.string().optional(),

    // ----- 分发与 SEO 进阶 -----
    syndicate: SyndicateSchema.optional(),
    featured: z.boolean().default(false),
    noindex: z.boolean().default(false),

    // ----- 兼容旧字段（不做处理，仅为不 fail） -----
    publishTime: z.string().optional(),
  })
  .strict();

export type Frontmatter = z.infer<typeof FrontmatterSchema>;

// ===== Authors =====
export const AuthorSchema = z.object({
  id: z.string(),
  name: z.object({
    zh: z.string().optional(),
    en: z.string(),
  }),
  title: z
    .object({
      zh: z.string().optional(),
      en: z.string().optional(),
    })
    .optional(),
  avatar: z.string().optional(),
  bio: z
    .object({
      zh: z.string().optional(),
      en: z.string().optional(),
    })
    .optional(),
  links: z
    .object({
      twitter: z.string().optional(),
      github: z.string().optional(),
      linkedin: z.string().optional(),
      email: z.string().email().optional(),
    })
    .optional(),
});

export type Author = z.infer<typeof AuthorSchema>;

// ===== Series =====
export const SeriesSchema = z.object({
  id: z.string(),
  name: z.object({
    zh: z.string().optional(),
    en: z.string(),
  }),
  description: z
    .object({
      zh: z.string().optional(),
      en: z.string().optional(),
    })
    .optional(),
});

export type Series = z.infer<typeof SeriesSchema>;
