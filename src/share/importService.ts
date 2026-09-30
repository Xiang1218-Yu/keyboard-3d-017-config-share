import type { CaseMaterial, KeyZone, LayoutType } from '@/types/keyboard';
import { DEFAULT_ZONE_COLORS } from '@/data/zones';
import {
  buildEnvelope,
  validateConfigText,
  type SanitizedConfig,
} from './validation';
import { extractConfigFromUrlLike } from './shareLink';
import type { ValidationIssue } from './schema';

/**
 * 导入 / 导出编排
 * --------------
 * UI 与 Zustand 之间的薄服务层：
 * - 不持有任何状态，只做「识别来源 → 解码 → 校验」
 * - 任何返回值里的 config 都是经过清洗的副本，可安全用于预览
 * - 真正写入 store 只能通过 store.importConfig（原子替换）
 */

export type ImportSource = 'link' | 'file' | 'clipboard' | 'manual' | 'url-onload';

export interface ConfigSnapshot {
  layout: LayoutType;
  caseMaterial: CaseMaterial;
  zoneColors: Record<KeyZone, string>;
  extensions: Record<string, unknown>;
}

export type ImportOutcome =
  | {
      ok: true;
      config: SanitizedConfig;
      issues: ValidationIssue[];
      source: ImportSource;
    }
  | {
      ok: false;
      error: ValidationIssue;
      issues: ValidationIssue[];
      source: ImportSource;
    };

export function createSnapshot(state: {
  layout: LayoutType;
  caseMaterial: CaseMaterial;
  zoneColors: Record<KeyZone, string>;
  extensions?: Record<string, unknown>;
}): ConfigSnapshot {
  return {
    layout: state.layout,
    caseMaterial: state.caseMaterial,
    // 逐键拷贝，杜绝外部对象引用进入快照
    zoneColors: { ...state.zoneColors },
    extensions: state.extensions ? { ...state.extensions } : {},
  };
}

export function snapshotEqualsStore(snapshot: ConfigSnapshot, current: ConfigSnapshot): boolean {
  if (snapshot.layout !== current.layout) return false;
  if (snapshot.caseMaterial !== current.caseMaterial) return false;
  const a = snapshot.zoneColors;
  const b = current.zoneColors;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (a[key as KeyZone] !== b[key as KeyZone]) return false;
  }
  return true;
}

/**
 * 识别并校验任意来源的导入文本：
 * 1) JSON 对象（v1 信封或 v0 裸配置）
 * 2) 分享链接 / hash / 纯载荷（z… 压缩、j… 明文）
 * 全程不写 store，结果交给预览弹窗。
 */
export async function detectAndValidate(
  rawText: string,
  source: ImportSource
): Promise<ImportOutcome> {
  const text = rawText.trim();
  if (!text) {
    return {
      ok: false,
      source,
      error: { severity: 'error', code: 'EMPTY_INPUT', message: '导入内容为空' },
      issues: [],
    };
  }

  // 明显是 JSON：直接进校验器（v0 裸配置也以 { 开头）
  if (text.startsWith('{')) {
    const result = validateConfigText(text);
    if (result.ok) {
      return { ok: true, source, config: result.config, issues: result.issues };
    }
    return { ok: false, source, error: result.error, issues: result.issues };
  }

  // 其余一律按链接 / 载荷尝试解码
  try {
    const jsonText = await extractConfigFromUrlLike(text);
    if (!jsonText) {
      return {
        ok: false,
        source,
        error: {
          severity: 'error',
          code: 'UNRECOGNIZED_CONTENT',
          message: '无法识别的内容：需要 Keyboard Studio 的分享链接或 JSON 配置',
        },
        issues: [],
      };
    }
    const result = validateConfigText(jsonText);
    if (result.ok) {
      return { ok: true, source, config: result.config, issues: result.issues };
    }
    return { ok: false, source, error: result.error, issues: result.issues };
  } catch (e) {
    const code = (e as Error)?.message ?? 'DECODE_FAILED';
    const messages: Record<string, string> = {
      SHARE_URL_TOO_LONG: '分享链接超长（超过 2048 字符），内容可能已损坏，请改用 JSON 文件导入',
      PAYLOAD_CORRUPT: '链接载荷已损坏，解压失败，请确认链接完整复制',
      PAYLOAD_NOT_BASE64URL: '链接载荷不是合法的 Base64URL 编码',
      PAYLOAD_UNKNOWN_TAG: '链接载荷格式未知（缺少 z/j 格式标签）',
      PAYLOAD_EMPTY: '链接中没有配置载荷',
      GZIP_UNSUPPORTED: '当前浏览器不支持 gzip 解压，请换用现代浏览器或让对方导出 JSON 文件',
      URL_INVALID: '分享链接不是合法 URL',
    };
    return {
      ok: false,
      source,
      error: {
        severity: 'error',
        code,
        message: messages[code] ?? `解码失败：${code}`,
      },
      issues: [],
    };
  }
}

/** 从当前配置构造标准信封（导出链接 / 文件 / 剪贴板共用） */
export function buildExportEnvelope(snapshot: ConfigSnapshot, name?: string) {
  return buildEnvelope({
    layout: snapshot.layout,
    caseMaterial: snapshot.caseMaterial,
    zoneColors: { ...snapshot.zoneColors },
    extensions: Object.keys(snapshot.extensions).length > 0
      ? snapshot.extensions
      : undefined,
    name: name?.trim() ? name.trim() : undefined,
  });
}

export function defaultSnapshot(): ConfigSnapshot {
  return {
    layout: '65%',
    caseMaterial: 'aluminum',
    zoneColors: { ...DEFAULT_ZONE_COLORS },
    extensions: {},
  };
}
