import type { CaseMaterial, KeyZone, LayoutType } from '@/types/keyboard';
import { LAYOUT_LIST, LAYOUT_CONFIGS } from '@/data/layouts';
import { MATERIAL_LIST, MATERIAL_CONFIGS } from '@/data/materials';
import { ZONE_LIST, ZONE_CONFIGS, DEFAULT_ZONE_COLORS } from '@/data/zones';
import {
  APP_ID,
  CONFIG_SCHEMA_VERSION,
  EXTENSIONS_LIMITS,
  MAX_IMPORT_TEXT_BYTES,
  MAX_SHARE_URL_LENGTH,
  estimateUtf8Bytes,
  isHexColor,
  type ParseResult,
  type ShareConfigData,
  type ShareEnvelope,
  type ValidationIssue,
} from './schema';
import { isRecord, migrateToLatest } from './migrations';

/**
 * 解析 + 校验 + 清洗
 * -----------------
 * 这是不可信外部数据（链接 / 文件 / 剪贴板）进入应用的唯一入口。
 * 全程不触碰 Zustand、不触碰 3D 场景：只产出一份「干净的数据副本」
 * 与结构化问题列表，由上层决定预览 / 拒绝 / 应用 / 回退。
 */

const LAYOUTS = new Set<LayoutType>(LAYOUT_LIST);
const MATERIALS = new Set<CaseMaterial>(MATERIAL_LIST);
const ZONES = new Set<KeyZone>(ZONE_LIST);

type RawRecord = Record<string, unknown>;

export interface SanitizedConfig {
  layout: LayoutType;
  caseMaterial: CaseMaterial;
  zoneColors: Record<KeyZone, string>;
  name: string | null;
  extensions: Record<string, unknown>;
  schemaVersion: number;
  exportedAt: string | null;
  /** 迁移 / 清洗过程中产生的告警（error 永远不会出现在成功结果里） */
  warnings: ValidationIssue[];
}

const err = (
  code: string,
  message: string,
  field?: string
): ValidationIssue => ({ severity: 'error', code, message, field });

/** 深拷贝 JSON 安全值，顺带阻断原型污染键与超深结构 */
function deepCloneJsonSafe(
  value: unknown,
  depth: number,
  issues: ValidationIssue[],
  path: string
): unknown {
  if (depth > EXTENSIONS_LIMITS.maxDepth) {
    throw new Error('EXTENSION_TOO_DEEP');
  }
  if (Array.isArray(value)) {
    if (value.length > EXTENSIONS_LIMITS.maxArrayLength) {
      throw new Error('EXTENSION_ARRAY_TOO_LONG');
    }
    return value.map((item, i) =>
      deepCloneJsonSafe(item, depth + 1, issues, `${path}[${i}]`)
    );
  }
  if (isRecord(value)) {
    const entries = Object.entries(value);
    if (entries.length > EXTENSIONS_LIMITS.maxObjectKeys) {
      throw new Error('EXTENSION_TOO_MANY_KEYS');
    }
    const out: RawRecord = {};
    for (const [key, v] of entries) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        issues.push({
          severity: 'warning',
          code: 'UNSAFE_KEY_DROPPED',
          field: `${path}.${key}`,
          message: `扩展槽中的不安全键名 ${key} 已被忽略`,
        });
        continue;
      }
      out[key] = deepCloneJsonSafe(v, depth + 1, issues, `${path}.${key}`);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > EXTENSIONS_LIMITS.maxStringLength) {
    throw new Error('EXTENSION_STRING_TOO_LONG');
  }
  if (
    typeof value === 'number' &&
    (!Number.isFinite(value) || Math.abs(value) > EXTENSIONS_LIMITS.maxNumber)
  ) {
    throw new Error('EXTENSION_NUMBER_OUT_OF_RANGE');
  }
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  // undefined / function / symbol 等 JSON 不可表达值直接丢弃
  return null;
}

/** 只校验信封头，返回「需要继续走迁移/校验」的原始 data */
function parseEnvelope(jsonText: string): ParseResult {
  if (jsonText.length === 0) {
    return { ok: false, error: err('EMPTY_INPUT', '导入内容为空'), issues: [] };
  }
  if (estimateUtf8Bytes(jsonText) > MAX_IMPORT_TEXT_BYTES) {
    return {
      ok: false,
      error: err(
        'PAYLOAD_TOO_LARGE',
        `配置体积超过 ${Math.round(MAX_IMPORT_TEXT_BYTES / 1024)} KiB 上限`
      ),
      issues: [],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return {
      ok: false,
      error: err('INVALID_JSON', '不是合法的 JSON，请确认分享内容完整复制'),
      issues: [],
    };
  }

  if (!isRecord(parsed)) {
    return {
      ok: false,
      error: err('INVALID_SHAPE', '配置顶层必须是 JSON 对象'),
      issues: [],
    };
  }

  // 兼容 v0：没有信封头的早期裸配置（直接是 { layout, material, colors }）
  const hasEnvelope =
    typeof parsed.app === 'string' || typeof parsed.schemaVersion === 'number';
  if (!hasEnvelope) {
    return {
      ok: true,
      envelope: {
        app: APP_ID,
        schemaVersion: 0,
        data: parsed as unknown as ShareConfigData,
      },
      issues: [],
    };
  }

  const issues: ValidationIssue[] = [];

  if (parsed.app !== APP_ID) {
    const shownApp =
      typeof parsed.app === 'string'
        ? parsed.app
        : (JSON.stringify(parsed.app) ?? '缺失');
    return {
      ok: false,
      error: err(
        'UNKNOWN_APP',
        `不是 Keyboard Studio 的配置（app 标识为 ${shownApp}）`,
        'app'
      ),
      issues,
    };
  }

  const version = parsed.schemaVersion;
  if (version === undefined) {
    return {
      ok: false,
      error: err('MISSING_FIELD', '缺少必填字段：schemaVersion', 'schemaVersion'),
      issues,
    };
  }
  if (typeof version !== 'number' || !Number.isInteger(version)) {
    return {
      ok: false,
      error: err('INVALID_VERSION', 'schemaVersion 必须是整数版本号', 'schemaVersion'),
      issues,
    };
  }
  if (version <= 0) {
    return {
      ok: false,
      error: err('INVALID_VERSION', `不支持的 schema 版本号: ${version}`, 'schemaVersion'),
      issues,
    };
  }
  if (version > CONFIG_SCHEMA_VERSION) {
    return {
      ok: false,
      error: err(
        'VERSION_TOO_NEW',
        `配置来自更新的版本（v${version}），当前仅支持到 v${CONFIG_SCHEMA_VERSION}，请先升级应用`,
        'schemaVersion'
      ),
      issues,
    };
  }

  if ('exportedAt' in parsed && typeof parsed.exportedAt !== 'string') {
    issues.push({
      severity: 'warning',
      code: 'BAD_METADATA',
      field: 'exportedAt',
      message: 'exportedAt 不是字符串，已忽略',
    });
  }

  return {
    ok: true,
    envelope: parsed as unknown as ShareEnvelope,
    issues,
  };
}

function validateName(value: unknown): { name: string | null; warnings: ValidationIssue[] } {
  const warnings: ValidationIssue[] = [];
  if (value === undefined) return { name: null, warnings };
  if (typeof value !== 'string') {
    warnings.push({
      severity: 'warning',
      code: 'INVALID_NAME',
      field: 'data.name',
      message: '配置名称不是字符串，已忽略',
    });
    return { name: null, warnings };
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return { name: null, warnings };
  if (trimmed.length > 60) {
    warnings.push({
      severity: 'warning',
      code: 'NAME_TRUNCATED',
      field: 'data.name',
      message: '配置名称超过 60 字符，已截断',
    });
    return { name: trimmed.slice(0, 60), warnings };
  }
  return { name: trimmed, warnings };
}

function validateLayout(value: unknown):
  | { layout: LayoutType }
  | { error: ValidationIssue } {
  if (value === undefined) {
    return {
      error: err('MISSING_FIELD', '缺少必填字段：布局（layout）', 'data.layout'),
    };
  }
  if (typeof value !== 'string' || !(LAYOUTS as Set<string>).has(value)) {
    return {
      error: err(
        'UNKNOWN_LAYOUT',
        `未知布局: ${JSON.stringify(value)}，支持的布局：${LAYOUT_LIST.join('、')}`,
        'data.layout'
      ),
    };
  }
  return { layout: value as LayoutType };
}

function validateMaterial(value: unknown):
  | { caseMaterial: CaseMaterial }
  | { error: ValidationIssue } {
  if (value === undefined) {
    return {
      error: err(
        'MISSING_FIELD',
        '缺少必填字段：外壳材质（caseMaterial）',
        'data.caseMaterial'
      ),
    };
  }
  if (typeof value !== 'string' || !(MATERIALS as Set<string>).has(value)) {
    return {
      error: err(
        'UNKNOWN_MATERIAL',
        `未知外壳材质: ${JSON.stringify(value)}，支持：${MATERIAL_LIST.map((m) => MATERIAL_CONFIGS[m].name).join('、')}`,
        'data.caseMaterial'
      ),
    };
  }
  return { caseMaterial: value as CaseMaterial };
}

function validateZoneColors(value: unknown):
  | { zoneColors: Record<KeyZone, string>; warnings: ValidationIssue[] }
  | { error: ValidationIssue } {
  const warnings: ValidationIssue[] = [];

  if (value === undefined) {
    return {
      error: err(
        'MISSING_FIELD',
        '缺少必填字段：分区颜色（zoneColors）',
        'data.zoneColors'
      ),
    };
  }
  if (!isRecord(value)) {
    return {
      error: err('INVALID_TYPE', '分区颜色必须是对象', 'data.zoneColors'),
    };
  }

  // 逐个分区校验；非法 / 缺失颜色用默认色顶替并告警（颜色错误不致命，
  // 真正致命的是整段缺失——那意味着分享内容损坏）
  const out = { ...DEFAULT_ZONE_COLORS };
  const seen = new Set<string>();

  for (const [zone, color] of Object.entries(value)) {
    if (zone === '__proto__' || zone === 'constructor' || zone === 'prototype') {
      warnings.push({
        severity: 'warning',
        code: 'UNSAFE_KEY_DROPPED',
        field: `data.zoneColors.${zone}`,
        message: `不安全的分区键名 ${zone} 已忽略`,
      });
      continue;
    }
    if (!(ZONES as Set<string>).has(zone)) {
      warnings.push({
        severity: 'warning',
        code: 'UNKNOWN_ZONE',
        field: `data.zoneColors.${zone}`,
        message: `未知分区 ${zone} 的颜色已忽略（可能来自更新版本）`,
      });
      continue;
    }
    seen.add(zone);
    if (!isHexColor(color)) {
      warnings.push({
        severity: 'warning',
        code: 'INVALID_COLOR',
        field: `data.zoneColors.${zone}`,
        message: `分区「${ZONE_CONFIGS[zone as KeyZone].name}」颜色非法（${
          typeof color === 'string' ? color : typeof color
        }），已回退为默认色 ${DEFAULT_ZONE_COLORS[zone as KeyZone]}`,
      });
      continue;
    }
    out[zone as KeyZone] = color;
  }

  for (const zone of ZONE_LIST) {
    if (!seen.has(zone)) {
      warnings.push({
        severity: 'warning',
        code: 'MISSING_ZONE_COLOR',
        field: `data.zoneColors.${zone}`,
        message: `分区「${ZONE_CONFIGS[zone].name}」缺少颜色，已使用默认色 ${DEFAULT_ZONE_COLORS[zone]}`,
      });
    }
  }

  return { zoneColors: out, warnings };
}

function validateExtensions(value: unknown): {
  extensions: Record<string, unknown>;
  warnings: ValidationIssue[];
} {
  const warnings: ValidationIssue[] = [];
  if (value === undefined) return { extensions: {}, warnings };
  if (!isRecord(value)) {
    warnings.push({
      severity: 'warning',
      code: 'INVALID_EXTENSIONS',
      field: 'data.extensions',
      message: '扩展配置必须是对象，已整体忽略',
    });
    return { extensions: {}, warnings };
  }
  try {
    const cloned = deepCloneJsonSafe(value, 0, warnings, 'data.extensions');
    return { extensions: cloned as Record<string, unknown>, warnings };
  } catch (e) {
    return {
      extensions: {},
      warnings: [
        {
          severity: 'warning',
          code: 'EXTENSIONS_REJECTED',
          field: 'data.extensions',
          message: `扩展配置超出安全限制（${(e as Error).message}），已整体忽略`,
        },
      ],
    };
  }
}

/**
 * 解析并校验一段配置 JSON 文本。
 * 成功时返回完全清洗过的配置副本（可直接用于预览，确认后才可写入 store）。
 */
export function validateConfigText(jsonText: string):
  | { ok: true; config: SanitizedConfig; issues: ValidationIssue[] }
  | { ok: false; error: ValidationIssue; issues: ValidationIssue[] } {
  const parsed = parseEnvelope(jsonText);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error, issues: parsed.issues };
  }

  const envelope = parsed.envelope;
  const envelopeIssues = parsed.issues;

  const migration = migrateToLatest(envelope.data, envelope.schemaVersion);
  const data = migration.data;

  const layoutResult = validateLayout(data.layout);
  if ('error' in layoutResult) {
    return { ok: false, error: layoutResult.error, issues: [...envelopeIssues, ...migration.issues] };
  }

  const materialResult = validateMaterial(data.caseMaterial);
  if ('error' in materialResult) {
    return {
      ok: false,
      error: materialResult.error,
      issues: [...envelopeIssues, ...migration.issues],
    };
  }

  const colorsResult = validateZoneColors(data.zoneColors);
  if ('error' in colorsResult) {
    return {
      ok: false,
      error: colorsResult.error,
      issues: [...envelopeIssues, ...migration.issues],
    };
  }

  const { name, warnings: nameWarnings } = validateName(data.name);
  const { extensions, warnings: extWarnings } = validateExtensions(data.extensions);

  const exportedAt =
    typeof envelope.exportedAt === 'string' && envelope.exportedAt.trim().length > 0
      ? envelope.exportedAt
      : null;

  const warnings = [
    ...envelopeIssues,
    ...migration.issues,
    ...colorsResult.warnings,
    ...nameWarnings,
    ...extWarnings,
  ];

  const config: SanitizedConfig = {
    layout: layoutResult.layout,
    caseMaterial: materialResult.caseMaterial,
    zoneColors: colorsResult.zoneColors,
    name,
    extensions,
    schemaVersion: migration.version,
    exportedAt,
    warnings,
  };

  return { ok: true, config, issues: warnings };
}

/** 供校验通过后的配置构造标准信封（导出与链接共用） */
export function buildEnvelope(data: ShareConfigData): ShareEnvelope {
  return {
    app: APP_ID,
    schemaVersion: CONFIG_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      name: data.name,
      layout: data.layout,
      caseMaterial: data.caseMaterial,
      zoneColors: data.zoneColors,
      extensions: data.extensions,
    },
  };
}

/** 分享链接超长时给导出侧的判定依据 */
export function isShareUrlTooLong(url: string): boolean {
  return url.length > MAX_SHARE_URL_LENGTH;
}

export function describeLayout(layout: LayoutType): string {
  return `${LAYOUT_CONFIGS[layout].name}（${LAYOUT_CONFIGS[layout].keys.length} 键）`;
}

export function describeMaterial(material: CaseMaterial): string {
  return MATERIAL_CONFIGS[material].name;
}
