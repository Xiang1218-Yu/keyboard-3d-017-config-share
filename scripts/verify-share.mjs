/**
 * 分享 / 导入能力的端到端验证脚本（不入产物，仅用于开发期自测）。
 * 运行：node scripts/verify-share.mjs
 * 覆盖：schema 校验、旧版迁移、三种通道识别、gzip 链接往返、超长 URL、
 *      非法颜色 / 未知布局 / 缺字段 / 原型污染 / 扩展槽限制。
 */
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TextEncoder, TextDecoder } from 'node:util';

// ---- 浏览器全局 polyfill（share 模块只用到这些纯函数能力） ----
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;
globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');
globalThis.CompressionStream = CompressionStream;
globalThis.DecompressionStream = DecompressionStream;
// shareLink 用 location 拼 base / 判同源，测试中给一个固定桩
globalThis.window = {
  location: { origin: 'http://localhost:5173', pathname: '/', hash: '' },
};

const entry = `
export { validateConfigText, buildEnvelope } from '@/share/validation';
export { CONFIG_SCHEMA_VERSION, MAX_SHARE_URL_LENGTH } from '@/share/schema';
export { encodePayload, decodePayload } from '@/share/codec';
export { buildShareUrl, ShareUrlError, SHARE_URL_TOO_LONG, extractConfigFromUrlLike } from '@/share/shareLink';
export { detectAndValidate, buildExportEnvelope, createSnapshot, defaultSnapshot } from '@/share/importService';
export { migrateToLatest } from '@/share/migrations';
`;
const dir = mkdtempSync(join(tmpdir(), 'share-verify-'));
const entryPath = join(dir, 'entry.ts');
writeFileSync(entryPath, entry);

const result = await build({
  entryPoints: [entryPath],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  write: false,
  alias: { '@': join(process.cwd(), 'src') },
});
const code = result.outputFiles[0].text;
const outPath = join(dir, 'bundle.mjs');
writeFileSync(outPath, code);
const mod = await import(pathToFileURL(outPath).href);

// ---- 极简断言框架 ----
let passed = 0;
let failed = 0;
function check(name, cond, extra = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name} ${extra}`);
  }
}
function asyncCheck(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then((v) => check(name, v !== false))
    .catch((e) => check(name, false, e.stack));
}

// ---- 1. 标准 v1 信封往返 ----
console.log('\n[1] 标准 v1 配置校验');
{
  const snap = { ...mod.defaultSnapshot(), layout: 'TKL', caseMaterial: 'wood' };
  const envelope = mod.buildExportEnvelope(snap, '测试配置');
  const r = mod.validateConfigText(JSON.stringify(envelope));
  check('v1 信封校验通过', r.ok);
  if (r.ok) {
    check('布局解析为 TKL', r.config.layout === 'TKL');
    check('材质解析为 wood', r.config.caseMaterial === 'wood');
    check('名称保留', r.config.name === '测试配置');
    check('六个分区颜色齐全', Object.keys(r.config.zoneColors).length === 6);
    check('版本号为 1', r.config.schemaVersion === 1);
    check('无告警', r.issues.length === 0);
  }
}

// ---- 2. 缺失字段 ----
console.log('\n[2] 缺失字段');
{
  const r1 = mod.validateConfigText(JSON.stringify({ app: 'keyboard-studio', schemaVersion: 1, data: {} }));
  check('缺 layout 报 MISSING_FIELD', !r1.ok && r1.error.code === 'MISSING_FIELD', r1.error?.code);

  const noColors = { app: 'keyboard-studio', schemaVersion: 1, data: { layout: '65%', caseMaterial: 'aluminum' } };
  const r2 = mod.validateConfigText(JSON.stringify(noColors));
  check('缺 zoneColors 直接失败', !r2.ok && r2.error.code === 'MISSING_FIELD');
}

// ---- 3. 非法颜色 ----
console.log('\n[3] 非法颜色');
{
  const envelope = mod.buildExportEnvelope(mod.defaultSnapshot());
  envelope.data.zoneColors.function = 'rgb(1,2,3)';
  envelope.data.zoneColors.modifiers = '#fff';
  envelope.data.zoneColors.navigation = 'not-a-color';
  const r = mod.validateConfigText(JSON.stringify(envelope));
  check('整体仍校验通过（颜色错误降级为告警）', r.ok);
  if (r.ok) {
    const colorIssues = r.issues.filter((i) => i.code === 'INVALID_COLOR');
    check('3 个非法颜色各产生一条告警', colorIssues.length === 3, colorIssues.length);
    check('非法颜色回退为默认色', r.config.zoneColors.function === '#e2e8f0');
    check('合法颜色保持不变', r.config.zoneColors.alphanumeric === '#f8fafc');
  }
}

// ---- 4. 未知布局 / 材质 ----
console.log('\n[4] 未知布局与材质');
{
  const e1 = mod.buildExportEnvelope(mod.defaultSnapshot());
  e1.data.layout = '180%';
  const r1 = mod.validateConfigText(JSON.stringify(e1));
  check('未知布局被拒绝', !r1.ok && r1.error.code === 'UNKNOWN_LAYOUT', r1.error?.code);

  const e2 = mod.buildExportEnvelope(mod.defaultSnapshot());
  e2.data.caseMaterial = 'unobtainium';
  const r2 = mod.validateConfigText(JSON.stringify(e2));
  check('未知材质被拒绝', !r2.ok && r2.error.code === 'UNKNOWN_MATERIAL', r2.error?.code);
}

// ---- 5. 旧版本迁移（v0 裸配置 + 旧字段名） ----
console.log('\n[5] 旧版本迁移');
{
  const legacy = {
    layout: 'Full',
    material: 'carbon',
    colors: { alphanumeric: '#111111', function: '#222222' },
  };
  const r = mod.validateConfigText(JSON.stringify(legacy));
  check('v0 裸配置可导入', r.ok);
  if (r.ok) {
    check('material 迁移到 caseMaterial=carbon', r.config.caseMaterial === 'carbon');
    check('布局 Full 保留', r.config.layout === 'Full');
    check('旧颜色迁移成功', r.config.zoneColors.alphanumeric === '#111111');
    check('缺失分区颜色用默认补齐', r.config.zoneColors.spacebar === '#64748b');
    check('产生迁移告警', r.issues.some((i) => i.code === 'MIGRATED_V0_TO_V1'));
    check('版本升级为 1', r.config.schemaVersion === 1);
  }
}

// ---- 6. 版本相关 ----
console.log('\n[6] 版本号安全');
{
  const tooNew = { app: 'keyboard-studio', schemaVersion: 999, data: mod.defaultSnapshot() };
  const r1 = mod.validateConfigText(JSON.stringify(tooNew));
  check('过新版本拒绝并提示升级', !r1.ok && r1.error.code === 'VERSION_TOO_NEW');

  const badApp = { app: 'something-else', schemaVersion: 1, data: {} };
  const r2 = mod.validateConfigText(JSON.stringify(badApp));
  check('错误 app 标识拒绝', !r2.ok && r2.error.code === 'UNKNOWN_APP');

  const badJson = '{not json';
  const r3 = mod.validateConfigText(badJson);
  check('非法 JSON 拒绝', !r3.ok && r3.error.code === 'INVALID_JSON');

  const r4 = mod.validateConfigText('[1,2,3]');
  check('顶层非对象拒绝', !r4.ok && r4.error.code === 'INVALID_SHAPE');
}

// ---- 7. 链接载荷 gzip 往返 ----
console.log('\n[7] 分享链接编解码');
await asyncCheck('gzip 编码后以 z 标签开头且可还原', async () => {
  const envelope = mod.buildExportEnvelope(mod.defaultSnapshot(), '往返');
  const payload = await mod.encodePayload(envelope);
  if (payload[0] !== 'z') throw new Error('expected gzip tag z, got ' + payload[0]);
  const json = await mod.decodePayload(payload);
  const r = mod.validateConfigText(json);
  return r.ok && r.config.name === '往返';
});

await asyncCheck('detectAndValidate 识别链接载荷', async () => {
  const envelope = mod.buildExportEnvelope({ ...mod.defaultSnapshot(), layout: '75%' });
  const payload = await mod.encodePayload(envelope);
  const r = await mod.detectAndValidate(payload, 'link');
  return r.ok && r.config.layout === '75%' && r.source === 'link';
});

await asyncCheck('detectAndValidate 识别 JSON 文本', async () => {
  const envelope = mod.buildExportEnvelope(mod.defaultSnapshot());
  const r = await mod.detectAndValidate('  ' + JSON.stringify(envelope) + '  ', 'clipboard');
  return r.ok && r.source === 'clipboard';
});

await asyncCheck('损坏载荷被拒绝', async () => {
  const r = await mod.detectAndValidate('z' + '!!!bad-base64!!!'.replace(/!/g, ''), 'link');
  return !r.ok;
});

await asyncCheck('完整分享 URL（#k=）可解析还原', async () => {
  const envelope = mod.buildExportEnvelope({ ...mod.defaultSnapshot(), layout: 'TKL' }, 'URL');
  const url = await mod.buildShareUrl(envelope);
  if (!url.includes('#k=')) throw new Error('url missing hash');
  if (url.length > mod.MAX_SHARE_URL_LENGTH) throw new Error('url over limit');
  const json = await mod.extractConfigFromUrlLike(url);
  const r = mod.validateConfigText(json);
  return r.ok && r.config.layout === 'TKL' && r.config.name === 'URL';
});

await asyncCheck('超长配置生成链接时抛 SHARE_URL_TOO_LONG', async () => {
  // 扩展槽上限 50 个键 / 1000 字符字符串；构造一个合法但很大的配置。
  // 用伪随机内容避免被 gzip 压缩到限内。
  const extensions = {};
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let seed = 123456789;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return alphabet[seed % alphabet.length];
  };
  for (let i = 0; i < 40; i++) {
    extensions[`k${i}`] = Array.from({ length: 700 }, rand).join('');
  }
  const envelope = mod.buildExportEnvelope(mod.defaultSnapshot());
  envelope.data.extensions = extensions;
  let threw = null;
  try {
    await mod.buildShareUrl(envelope);
  } catch (e) {
    threw = e;
  }
  return threw instanceof mod.ShareUrlError && threw.message === mod.SHARE_URL_TOO_LONG;
});

// ---- 8. 超长 URL ----
console.log('\n[8] 超长 URL');
{
  const longExt = { huge: 'x'.repeat(900) };
  const r = mod.validateConfigText(
    JSON.stringify({
      app: 'keyboard-studio',
      schemaVersion: 1,
      data: { ...mod.defaultSnapshot(), extensions: longExt },
    })
  );
  // 900 字符仍在扩展槽限制内（maxStringLength=1000），校验通过
  check('900 字符扩展值允许通过', r.ok);
}
await asyncCheck('超大扩展字符串被安全限制拦截', async () => {
  const envelope = mod.buildExportEnvelope(mod.defaultSnapshot());
  envelope.data.extensions = { huge: 'y'.repeat(5000) };
  const r = mod.validateConfigText(JSON.stringify(envelope));
  if (!r.ok) return false;
  return (
    Object.keys(r.config.extensions).length === 0 &&
    r.issues.some((i) => i.code === 'EXTENSIONS_REJECTED')
  );
});

// ---- 9. 原型污染防护 ----
console.log('\n[9] 原型污染与未知分区');
{
  const malicious = JSON.parse(
    JSON.stringify(mod.buildExportEnvelope(mod.defaultSnapshot()))
  );
  malicious.data.zoneColors.__proto__ = '#000000';
  malicious.data.zoneColors.ghostZone = '#ffffff';
  const r = mod.validateConfigText(JSON.stringify(malicious));
  check('含恶意键的数据不崩溃且通过', r.ok);
  if (r.ok) {
    check('__proto__ 未污染 Object.prototype', ({}).polluted === undefined);
    check('扩展/未知分区不进入干净结果', r.config.zoneColors.ghostZone === undefined);
  }
}

// ---- 10. 快照与对象引用隔离 ----
console.log('\n[10] 数据隔离');
{
  const original = mod.defaultSnapshot();
  const envelope = mod.buildExportEnvelope(original);
  const r = mod.validateConfigText(JSON.stringify(envelope));
  if (r.ok) {
    r.config.zoneColors.alphanumeric = '#000000';
    check('修改校验结果不影响原快照', original.zoneColors.alphanumeric === '#f8fafc');
  }
  const snap = mod.createSnapshot({ ...original, zoneColors: original.zoneColors });
  snap.zoneColors.alphanumeric = '#123456';
  check('快照与源对象解耦', original.zoneColors.alphanumeric === '#f8fafc');
}

// ---- 汇总 ----
console.log(`\n========== 结果：${passed} 通过 / ${failed} 失败 ==========`);
process.exit(failed > 0 ? 1 : 0);
