import { DEFAULT_ZONE_COLORS } from '@/data/zones';
import { LAYOUT_LIST } from '@/data/layouts';
import { MATERIAL_LIST } from '@/data/materials';
import type {
  CaseMaterial,
  KeyboardConfig,
  KeyboardExtensions,
  KeyZone,
  LayoutType,
} from '@/types/keyboard';

export const CONFIG_SCHEMA_NAME = 'keyboard-studio.config';
export const CONFIG_SCHEMA_VERSION = 1;
export const SUPPORTED_SCHEMA_VERSIONS = [1] as const;
export const MAX_SHARE_URL_LENGTH = 2048;
export const MAX_IMPORT_BYTES = 1024 * 1024;
export const MAX_EXTENSION_KEYS = 50;
export const MAX_EXTENSION_DEPTH = 4;
export const MAX_EXTENSION_SERIALIZED_BYTES = 10 * 1024;

export interface ShareConfigEnvelope {
  $schema: string;
  schemaVersion: number;
  exportedAt: string;
  config: unknown;
}

export interface V1KeyboardConfig {
  layout: LayoutType;
  caseMaterial: CaseMaterial;
  zoneColors: Record<KeyZone, string>;
  extensions: KeyboardExtensions;
}

export type ConfigIssueSeverity = 'error' | 'warning';

export interface ConfigIssue {
  severity: ConfigIssueSeverity;
  path: string;
  message: string;
}

export interface ParseConfigSuccess {
  ok: true;
  data: KeyboardConfig;
  warnings: ConfigIssue[];
  sourceVersion: number;
  migrated: boolean;
  envelope: ShareConfigEnvelope;
}

export interface ParseConfigFailure {
  ok: false;
  error: string;
  issues: ConfigIssue[];
  sourceVersion?: number;
}

export type ParseConfigResult = ParseConfigSuccess | ParseConfigFailure;

const LAYOUTS = new Set<string>(LAYOUT_LIST);
const MATERIALS = new Set<string>(MATERIAL_LIST);
const ZONES = Object.keys(DEFAULT_ZONE_COLORS) as KeyZone[];
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;
const SHORT_HEX_COLOR_RE = /^#[0-9a-f]{3}$/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function isJsonScalar(value: unknown): boolean {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    typeof value === 'number'
  );
}

function issuesContainError(issues: ConfigIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'error');
}

function formatIssuePath(path: string, key: string): string {
  return path ? `${path}.${key}` : key;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * 将未信任 JSON 收敛为受大小与深度限制的 JSON 兼容值。数组只允许出现在
 * extensions 中，当前核心配置不接受数组，避免外部数据携带原型或渲染对象。
 */
function sanitizeJsonValue(
  value: unknown,
  path: string,
  depth: number,
  issues: ConfigIssue[],
  options: { allowArrays: boolean } = { allowArrays: false }
): unknown {
  if (isJsonScalar(value)) {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      issues.push({ severity: 'error', path, message: '数值必须是有限数字' });
      return null;
    }
    return value;
  }

  if (Array.isArray(value)) {
    if (!options.allowArrays) {
      issues.push({ severity: 'error', path, message: '当前字段不支持数组' });
      return [];
    }
    if (depth > MAX_EXTENSION_DEPTH) {
      issues.push({ severity: 'error', path, message: `扩展嵌套深度不能超过 ${MAX_EXTENSION_DEPTH} 层` });
      return [];
    }
    return value.slice(0, 100).map((item, index) =>
      sanitizeJsonValue(item, `${path}[${index}]`, depth + 1, issues, { allowArrays: true })
    );
  }

  if (isPlainObject(value)) {
    if (depth > MAX_EXTENSION_DEPTH) {
      issues.push({ severity: 'error', path, message: `扩展嵌套深度不能超过 ${MAX_EXTENSION_DEPTH} 层` });
      return {};
    }

    const entries = Object.entries(value).slice(0, MAX_EXTENSION_KEYS);
    if (Object.keys(value).length > MAX_EXTENSION_KEYS) {
      issues.push({
        severity: 'warning',
        path,
        message: `扩展键数量超过 ${MAX_EXTENSION_KEYS} 个，多余键已忽略`,
      });
    }

    return Object.fromEntries(
      entries.map(([key, item]) => {
        const childPath = formatIssuePath(path, key);
        if (FORBIDDEN_KEYS.has(key)) {
          issues.push({ severity: 'error', path: childPath, message: '包含不安全的保留键' });
          return [key, null] as const;
        }
        return [key, sanitizeJsonValue(item, childPath, depth + 1, issues, { allowArrays: true })] as const;
      })
    );
  }

  issues.push({ severity: 'error', path, message: '包含不支持的 JSON 类型' });
  return null;
}

function sanitizeExtensions(value: unknown, issues: ConfigIssue[]): KeyboardExtensions {
  if (value === undefined) {
    return {};
  }
  if (!isPlainObject(value)) {
    issues.push({ severity: 'error', path: 'extensions', message: 'extensions 必须是对象' });
    return {};
  }

  const extensionIssues: ConfigIssue[] = [];
  const sanitized = sanitizeJsonValue(value, 'extensions', 0, extensionIssues, {
    allowArrays: true,
  }) as KeyboardExtensions;

  extensionIssues.forEach((issue) => issues.push(issue));

  try {
    const serialized = JSON.stringify(sanitized);
    if (serialized.length > MAX_EXTENSION_SERIALIZED_BYTES) {
      issues.push({
        severity: 'error',
        path: 'extensions',
        message: `扩展配置不能超过 ${MAX_EXTENSION_SERIALIZED_BYTES} 字节`,
      });
      return {};
    }
  } catch {
    issues.push({ severity: 'error', path: 'extensions', message: '扩展配置无法序列化' });
    return {};
  }

  return sanitized;
}

function requireRecord(
  value: unknown,
  path: string,
  issues: ConfigIssue[]
): Record<string, unknown> | null {
  if (!isPlainObject(value)) {
    issues.push({ severity: 'error', path, message: '必须是对象' });
    return null;
  }
  return value;
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  issues: ConfigIssue[]
): string | null {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0) {
    issues.push({ severity: 'error', path: key, message: `${key} 必须是非空字符串` });
    return null;
  }
  return value;
}

function isV1HexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR_RE.test(value);
}

function normalizeLegacyHex(value: string): string | null {
  if (HEX_COLOR_RE.test(value)) return value.toLowerCase();
  if (SHORT_HEX_COLOR_RE.test(value)) {
    return `#${value
      .slice(1)
      .split('')
      .map((char) => char + char)
      .join('')}`.toLowerCase();
  }
  return null;
}

function validateV1Config(raw: unknown, issues: ConfigIssue[], basePath = 'config'): V1KeyboardConfig | null {
  const record = requireRecord(raw, basePath, issues);
  if (!record) return null;

  const required = ['layout', 'caseMaterial', 'zoneColors'] as const;
  required.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
      issues.push({ severity: 'error', path: `${basePath}.${key}`, message: `缺少必填字段 ${key}` });
    }
  });

  const layout = requireString(record, 'layout', issues);
  if (layout !== null && !LAYOUTS.has(layout)) {
    issues.push({ severity: 'error', path: 'layout', message: `未知布局：${layout}` });
  }

  const caseMaterial = requireString(record, 'caseMaterial', issues);
  if (caseMaterial !== null && !MATERIALS.has(caseMaterial)) {
    issues.push({ severity: 'error', path: 'caseMaterial', message: `未知外壳材质：${caseMaterial}` });
  }

  const zoneColors: Record<KeyZone, string> = { ...DEFAULT_ZONE_COLORS };
  const rawZoneColors = record.zoneColors;
  const zoneRecord = requireRecord(rawZoneColors, `${basePath}.zoneColors`, issues);
  if (zoneRecord) {
    ZONES.forEach((zone) => {
      if (!Object.prototype.hasOwnProperty.call(zoneRecord, zone)) {
        issues.push({
          severity: 'error',
          path: `zoneColors.${zone}`,
          message: `缺少分区颜色：${zone}`,
        });
      }
    });

    Object.entries(zoneRecord).forEach(([zone, color]) => {
      const path = `zoneColors.${zone}`;
      if (!(ZONES as string[]).includes(zone)) {
        issues.push({ severity: 'warning', path, message: `未知分区颜色已忽略：${zone}` });
        return;
      }
      if (!isV1HexColor(color)) {
        issues.push({ severity: 'error', path, message: `颜色必须是 #RRGGBB 格式：${String(color)}` });
        return;
      }
      zoneColors[zone as KeyZone] = color.toLowerCase();
    });
  }

  const extensions = sanitizeExtensions(record.extensions, issues);

  Object.keys(record).forEach((key) => {
    if (!['layout', 'caseMaterial', 'zoneColors', 'extensions'].includes(key)) {
      issues.push({
        severity: 'warning',
        path: `${basePath}.${key}`,
        message: `未知字段已忽略：${key}`,
      });
    }
  });

  if (issuesContainError(issues)) return null;

  return {
    layout: layout as LayoutType,
    caseMaterial: caseMaterial as CaseMaterial,
    zoneColors,
    extensions,
  };
}

function migrateV0(raw: Record<string, unknown>, issues: ConfigIssue[]): V1KeyboardConfig | null {
  const legacyZoneColors = isPlainObject(raw.zoneColors) ? raw.zoneColors : {};
  const zoneColors = { ...DEFAULT_ZONE_COLORS };

  Object.entries(legacyZoneColors).forEach(([zone, value]) => {
    if (!(ZONES as string[]).includes(zone)) {
      issues.push({ severity: 'warning', path: `zoneColors.${zone}`, message: `旧配置中的未知分区已忽略：${zone}` });
      return;
    }
    if (typeof value !== 'string') {
      issues.push({ severity: 'error', path: `zoneColors.${zone}`, message: '颜色必须是字符串' });
      return;
    }
    const normalized = normalizeLegacyHex(value);
    if (!normalized) {
      issues.push({ severity: 'error', path: `zoneColors.${zone}`, message: `非法颜色：${value}` });
      return;
    }
    zoneColors[zone as KeyZone] = normalized;
  });

  ZONES.forEach((zone) => {
    if (!Object.prototype.hasOwnProperty.call(legacyZoneColors, zone)) {
      issues.push({
        severity: 'warning',
        path: `zoneColors.${zone}`,
        message: `旧配置缺少 ${zone} 颜色，已使用默认值迁移`,
      });
    }
  });

  const layout = raw.layout;
  if (typeof layout !== 'string' || !LAYOUTS.has(layout)) {
    issues.push({ severity: 'error', path: 'layout', message: `未知或缺失布局：${String(layout)}` });
  }

  const caseMaterial = raw.caseMaterial;
  if (typeof caseMaterial !== 'string' || !MATERIALS.has(caseMaterial)) {
    issues.push({
      severity: 'error',
      path: 'caseMaterial',
      message: `未知或缺失外壳材质：${String(caseMaterial)}`,
    });
  }

  const extensionIssues: ConfigIssue[] = [];
  const extensions = sanitizeExtensions(raw.extensions ?? raw.settings, extensionIssues);
  extensionIssues.forEach((issue) => issues.push(issue));

  if (issuesContainError(issues)) return null;

  return {
    layout: layout as LayoutType,
    caseMaterial: caseMaterial as CaseMaterial,
    zoneColors,
    extensions,
  };
}

function toEnvelope(data: KeyboardConfig, exportedAt = new Date().toISOString()): ShareConfigEnvelope {
  return {
    $schema: CONFIG_SCHEMA_NAME,
    schemaVersion: CONFIG_SCHEMA_VERSION,
    exportedAt,
    config: cloneJson(data),
  };
}

export function createShareEnvelope(config: KeyboardConfig): ShareConfigEnvelope {
  return toEnvelope(config);
}

export function serializeConfig(config: KeyboardConfig): string {
  return JSON.stringify(createShareEnvelope(config), null, 2);
}

function validateEnvelopeShape(value: unknown, issues: ConfigIssue[]): ShareConfigEnvelope | null {
  const root = requireRecord(value, '$', issues);
  if (!root) return null;

  const isLegacyUnversioned = !('schemaVersion' in root) && !('$schema' in root);
  if (isLegacyUnversioned) {
    return {
      $schema: CONFIG_SCHEMA_NAME,
      schemaVersion: 0,
      exportedAt: '',
      config: root as unknown as V1KeyboardConfig,
    };
  }

  if (root.$schema !== CONFIG_SCHEMA_NAME && root.schemaVersion !== 0 && !isLegacyUnversioned) {
    issues.push({ severity: 'error', path: '$schema', message: `未知配置标识：${String(root.$schema)}` });
  }

  if (typeof root.schemaVersion !== 'number' || !Number.isInteger(root.schemaVersion)) {
    issues.push({ severity: 'error', path: 'schemaVersion', message: 'schemaVersion 必须是整数' });
  } else if (root.schemaVersion > CONFIG_SCHEMA_VERSION) {
    return {
      $schema: CONFIG_SCHEMA_NAME,
      schemaVersion: root.schemaVersion,
      exportedAt: '',
      config: {},
    };
  }

  if (typeof root.exportedAt !== 'string' || root.exportedAt.length === 0) {
    issues.push({ severity: 'warning', path: 'exportedAt', message: '缺少导出时间，已使用当前时间' });
  }

  if (!Object.prototype.hasOwnProperty.call(root, 'config') && root.schemaVersion !== 0) {
    issues.push({ severity: 'error', path: 'config', message: '缺少必填字段 config' });
  }

  Object.keys(root).forEach((key) => {
    if (!['$schema', 'schemaVersion', 'exportedAt', 'config'].includes(key)) {
      issues.push({ severity: 'warning', path: key, message: `未知顶层字段已忽略：${key}` });
    }
  });

  if (issuesContainError(issues)) return null;

  return root as unknown as ShareConfigEnvelope;
}

/** 供 Zustand 在 apply/restore 边界复用的严格校验，不接受包装 envelope。 */
export function validateKeyboardConfig(value: unknown): ParseConfigResult {
  const issues: ConfigIssue[] = [];
  const config = validateV1Config(value, issues, '$');
  if (!config || issuesContainError(issues)) {
    return {
      ok: false,
      error: issues.find((issue) => issue.severity === 'error')?.message ?? '配置校验失败',
      issues,
      sourceVersion: CONFIG_SCHEMA_VERSION,
    };
  }

  const data = cloneJson(config);
  return {
    ok: true,
    data,
    warnings: issues,
    sourceVersion: CONFIG_SCHEMA_VERSION,
    migrated: false,
    envelope: toEnvelope(data),
  };
}

export function parseConfigJson(input: string): ParseConfigResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? `JSON 解析失败：${error.message}` : 'JSON 解析失败',
      issues: [{ severity: 'error', path: '$', message: '内容不是合法 JSON' }],
    };
  }

  if (!isPlainObject(parsed)) {
    return {
      ok: false,
      error: '配置根节点必须是对象',
      issues: [{ severity: 'error', path: '$', message: '配置根节点必须是对象' }],
    };
  }

  const shapeIssues: ConfigIssue[] = [];
  const envelope = validateEnvelopeShape(parsed, shapeIssues);
  if (!envelope) {
    return {
      ok: false,
      error: shapeIssues.find((issue) => issue.severity === 'error')?.message ?? '配置结构不合法',
      issues: shapeIssues,
      sourceVersion: typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : undefined,
    };
  }

  const sourceVersion = envelope.schemaVersion;
  if (sourceVersion > CONFIG_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `配置来自更新的应用版本（v${sourceVersion}），请先升级`,
      issues: [
        {
          severity: 'error',
          path: 'schemaVersion',
          message: `不支持高于 v${CONFIG_SCHEMA_VERSION} 的配置版本`,
        },
      ],
      sourceVersion,
    };
  }

  // 兼容没有 $schema/schemaVersion 包装，或使用 v0 envelope 的早期配置。
  if (sourceVersion === 0 || (!('schemaVersion' in parsed) && !('$schema' in parsed))) {
    const legacySourceVersion = sourceVersion || 0;
    const issues: ConfigIssue[] = legacySourceVersion === 0 ? shapeIssues : [];
    const legacyConfig = isPlainObject(envelope.config) ? envelope.config : parsed;
    const migratedConfig = migrateV0(legacyConfig, issues);
    if (!migratedConfig || issuesContainError(issues)) {
      return {
        ok: false,
        error: issues.find((issue) => issue.severity === 'error')?.message ?? '旧版本迁移失败',
        issues,
        sourceVersion: legacySourceVersion,
      };
    }

    const data = cloneJson(migratedConfig);
    return {
      ok: true,
      data,
      warnings: [
        ...issues,
        { severity: 'warning', path: 'schemaVersion', message: '已从 v0 旧格式迁移到 v1' },
      ],
      sourceVersion: legacySourceVersion,
      migrated: true,
      envelope: toEnvelope(data),
    };
  }

  if (sourceVersion !== 1) {
    return {
      ok: false,
      error: `不支持的配置版本：v${sourceVersion}`,
      issues: [{ severity: 'error', path: 'schemaVersion', message: `不支持的配置版本：v${sourceVersion}` }],
      sourceVersion,
    };
  }

  const issues: ConfigIssue[] = [...shapeIssues];
  const config = validateV1Config(envelope.config, issues);
  if (!config || issuesContainError(issues)) {
    return {
      ok: false,
      error: issues.find((issue) => issue.severity === 'error')?.message ?? '配置校验失败',
      issues,
      sourceVersion,
    };
  }

  const data = cloneJson(config);
  return {
    ok: true,
    data,
    warnings: issues,
    sourceVersion,
    migrated: false,
    envelope: {
      ...envelope,
      exportedAt: envelope.exportedAt || new Date().toISOString(),
      config: data,
    },
  };
}

function encodeUtf8Base64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeUtf8Base64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeSharePayload(config: KeyboardConfig): string {
  return encodeUtf8Base64Url(serializeConfig(config));
}

export function createShareUrl(config: KeyboardConfig, baseUrl?: string): string {
  const payload = encodeSharePayload(config);
  const url = new URL(baseUrl ?? window.location.href);
  url.hash = `config=${payload}`;
  if (url.href.length > MAX_SHARE_URL_LENGTH) {
    throw new Error(`分享链接超过 ${MAX_SHARE_URL_LENGTH} 字符，请改用 JSON 文件分享扩展配置`);
  }
  return url.href;
}

const SHARE_PAYLOAD_RE = /^[A-Za-z0-9_-]+$/;

export function extractSharePayloadFromUrl(urlText: string): string | null {
  try {
    const url = new URL(urlText);
    const fromHash = url.hash.startsWith('#config=') ? url.hash.slice('#config='.length) : null;
    const fromQuery = url.searchParams.get('config');
    const payload = fromHash ?? fromQuery;
    if (!payload || !SHARE_PAYLOAD_RE.test(payload)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSharePayloadFromCurrentUrl(href = window.location.href): string | null {
  return extractSharePayloadFromUrl(href);
}

export function parseSharePayload(payload: string): ParseConfigResult {
  if (payload.length > MAX_IMPORT_BYTES) {
    return {
      ok: false,
      error: `分享数据超过 ${MAX_IMPORT_BYTES} 字节`,
      issues: [{ severity: 'error', path: '$', message: '分享数据过大' }],
    };
  }
  if (!SHARE_PAYLOAD_RE.test(payload)) {
    return {
      ok: false,
      error: '分享数据包含非法字符',
      issues: [{ severity: 'error', path: '$', message: '分享数据必须是 Base64URL 字符串' }],
    };
  }

  try {
    return parseConfigJson(decodeUtf8Base64Url(payload));
  } catch {
    return {
      ok: false,
      error: '分享数据解码失败',
      issues: [{ severity: 'error', path: '$', message: '分享数据不是有效的 Base64URL JSON' }],
    };
  }
}

export function parseImportText(input: string): ParseConfigResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: '请粘贴配置 JSON 或分享链接',
      issues: [{ severity: 'error', path: '$', message: '内容为空' }],
    };
  }
  if (trimmed.length > MAX_IMPORT_BYTES) {
    return {
      ok: false,
      error: `导入内容超过 ${MAX_IMPORT_BYTES} 字节`,
      issues: [{ severity: 'error', path: '$', message: '导入内容过大' }],
    };
  }

  const payload = extractSharePayloadFromUrl(trimmed);
  if (payload) return parseSharePayload(payload);
  if (SHARE_PAYLOAD_RE.test(trimmed)) return parseSharePayload(trimmed);

  return parseConfigJson(trimmed);
}

export function downloadConfigFile(config: KeyboardConfig): void {
  const blob = new Blob([serializeConfig(config)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `keyboard-config-v${CONFIG_SCHEMA_VERSION}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function snapshotConfig(config: KeyboardConfig): KeyboardConfig {
  return cloneJson({
    layout: config.layout,
    caseMaterial: config.caseMaterial,
    zoneColors: { ...config.zoneColors },
    extensions: config.extensions,
  });
}
