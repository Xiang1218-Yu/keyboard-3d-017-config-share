import type { CaseMaterial, KeyZone, LayoutType } from '@/types/keyboard';

/**
 * 配置分享 Schema
 * ----------------
 * 所有分享产物（链接 / JSON 文件 / 剪贴板）都使用同一个带版本号的信封结构：
 *
 * {
 *   "app": "keyboard-studio",      // 产品标识，拒绝其他来源数据
 *   "schemaVersion": 1,            // schema 版本号，用于旧版迁移
 *   "exportedAt": "2026-09-30T..", // 导出时间（可选但默认携带）
 *   "data": {
 *     "name": "我的配置",           // 可选，配置名称
 *     "layout": "65%",
 *     "caseMaterial": "aluminum",
 *     "zoneColors": { ... },
 *     "extensions": { ... }        // 预留扩展槽，后续新增配置放这里
 *   }
 * }
 */

export const APP_ID = 'keyboard-studio';
export const CONFIG_SCHEMA_VERSION = 1;

/** 分享链接允许的最大长度（超长 URL 直接判失败，见校验规则） */
export const MAX_SHARE_URL_LENGTH = 2048;

/** 文件 / 剪贴板导入允许的最大文本体积（512 KiB），防止超大载荷解析卡死 */
export const MAX_IMPORT_TEXT_BYTES = 512 * 1024;

/** 链接中压缩载荷允许的最大长度（base64url 字符数） */
export const MAX_SHARE_PAYLOAD_LENGTH = MAX_SHARE_URL_LENGTH - 256;

/** extensions 扩展槽的安全限制，避免不可信数据携带深层 / 巨型结构 */
export const EXTENSIONS_LIMITS = {
  maxDepth: 4,
  maxObjectKeys: 50,
  maxArrayLength: 100,
  maxStringLength: 1000,
  maxNumber: Number.MAX_SAFE_INTEGER,
} as const;

/** 颜色唯一合法格式：#RRGGBB（三位简写、rgb()、含空格等一律判非法颜色） */
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export type ShareConfigData = {
  layout: LayoutType;
  caseMaterial: CaseMaterial;
  zoneColors: Record<KeyZone, string>;
  name?: string;
  /** 扩展槽：后续新增配置一律写入此处，老版本可安全忽略 */
  extensions?: Record<string, unknown>;
};

export type ShareEnvelope = {
  app: typeof APP_ID;
  schemaVersion: number;
  exportedAt?: string;
  data: ShareConfigData;
};

export type IssueSeverity = 'error' | 'warning';

export interface ValidationIssue {
  severity: IssueSeverity;
  code: string;
  /** 问题字段路径，例如 data.zoneColors.function */
  field?: string;
  message: string;
}

export type ParseResult =
  | { ok: true; envelope: ShareEnvelope; issues: ValidationIssue[] }
  | { ok: false; error: ValidationIssue; issues: ValidationIssue[] };

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR_RE.test(value);
}

/** 估算字符串 UTF-8 字节数（Blob 在极老环境下缺失时的保守回退） */
export function estimateUtf8Bytes(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
}
