import type { ValidationIssue } from './schema';
import { CONFIG_SCHEMA_VERSION } from './schema';

/**
 * 旧版本迁移
 * ----------
 * 迁移函数只处理「结构差异」（改名、补字段、搬位置），不做语义校验——
 * 校验统一交给 validation 层，保证每个迁移步骤保持简单、可串联。
 *
 * 约定：
 * - 版本号 N 的迁移函数负责「从 N 迁移到 N+1」
 * - 数据被实际改动时写入一条 warning，便于在导入预览里告知用户
 * - 永不抛异常；迁移后仍然缺失/非法的字段交给校验层处理
 *
 * 新增版本时：
 * 1. 在 schema.ts 提升 CONFIG_SCHEMA_VERSION
 * 2. 在 migrators 中补一个 `旧版本号: 迁移函数`
 * 3. 新配置优先放入 data.extensions，稳定后再提升为一等字段
 */

export type RawRecord = Record<string, unknown>;

interface MigratorContext {
  data: RawRecord;
  issues: ValidationIssue[];
}

type Migrator = (ctx: MigratorContext) => RawRecord;

export function isRecord(value: unknown): value is RawRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const migrators: Record<number, Migrator> = {
  /**
   * v0 = 版本化之前流传的早期裸配置，没有 app/schemaVersion 信封，
   * 字段名也与 v1 不同：material（现 caseMaterial）、colors（现 zoneColors）。
   * 这条路径真实可达：任何人粘贴/打开不带 schemaVersion 的旧 JSON 都会走到这里。
   */
  0: ({ data, issues }) => {
    const next: RawRecord = { ...data };

    if (!('caseMaterial' in next) && 'material' in next) {
      next.caseMaterial = next.material;
      delete next.material;
      issues.push({
        severity: 'warning',
        code: 'MIGRATED_V0_TO_V1',
        field: 'data.caseMaterial',
        message: '已将旧版字段 material 迁移为 caseMaterial',
      });
    }

    if (!('zoneColors' in next) && 'colors' in next) {
      next.zoneColors = next.colors;
      delete next.colors;
      issues.push({
        severity: 'warning',
        code: 'MIGRATED_V0_TO_V1',
        field: 'data.zoneColors',
        message: '已将旧版字段 colors 迁移为 zoneColors',
      });
    }

    return next;
  },
};

export interface MigrationOutput {
  data: RawRecord;
  version: number;
  /** 是否发生过至少一次迁移（导入预览中应显著提示） */
  migrated: boolean;
  issues: ValidationIssue[];
}

/**
 * 将旧版本数据迁移到最新 schema。
 * @param version 缺省（undefined）视为 v0 早期裸配置
 */
export function migrateToLatest(
  rawData: unknown,
  version: number | undefined
): MigrationOutput {
  const issues: ValidationIssue[] = [];
  const startVersion = typeof version === 'number' && Number.isFinite(version)
    ? Math.max(0, Math.floor(version))
    : 0;

  let data: RawRecord = isRecord(rawData) ? { ...rawData } : {};
  let current = startVersion;
  let migrated = false;

  if (current === 0 && version !== 0) {
    // 完全没有版本号信息的不可信数据
    issues.push({
      severity: 'warning',
      code: 'LEGACY_NO_VERSION',
      field: 'schemaVersion',
      message: '配置缺少版本号，已按最早的 v0 格式尝试迁移',
    });
  }

  let guard = 0;
  while (current < CONFIG_SCHEMA_VERSION && guard++ < 100) {
    const migrator = migrators[current];
    if (!migrator) {
      issues.push({
        severity: 'warning',
        code: 'MIGRATION_PATH_MISSING',
        field: 'schemaVersion',
        message: `schema v${current} 缺少迁移步骤，缺失字段将按默认值补齐`,
      });
      break;
    }
    data = migrator({ data, issues });
    current += 1;
    migrated = true;
  }

  return { data, version: current, migrated, issues };
}
