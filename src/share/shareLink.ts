import type { ShareEnvelope } from './schema';
import {
  MAX_SHARE_PAYLOAD_LENGTH,
  MAX_SHARE_URL_LENGTH,
} from './schema';
import { encodePayload, decodePayload } from './codec';

/**
 * 分享链接
 * --------
 * 载荷放在 URL hash 中（#k=<payload>）：
 * - 不随请求发送到服务端，配置不会泄露给第三方
 * - 纯静态部署即可工作，不需要服务端改写
 * - 应用路由不依赖 hash（BrowserRouter），互不干扰
 */

export const SHARE_HASH_KEY = 'k';
export const SHARE_URL_TOO_LONG = 'SHARE_URL_TOO_LONG';

export class ShareUrlError extends Error {
  constructor(code: string) {
    super(code);
    this.name = 'ShareUrlError';
  }
}

function getBaseUrl(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

/** 生成完整分享链接；超长直接抛错（由 UI 引导改用文件/剪贴板） */
export async function buildShareUrl(envelope: ShareEnvelope): Promise<string> {
  const payload = await encodePayload(envelope);
  if (payload.length > MAX_SHARE_PAYLOAD_LENGTH) {
    throw new ShareUrlError(SHARE_URL_TOO_LONG);
  }
  const url = `${getBaseUrl()}#${SHARE_HASH_KEY}=${payload}`;
  if (url.length > MAX_SHARE_URL_LENGTH) {
    throw new ShareUrlError(SHARE_URL_TOO_LONG);
  }
  return url;
}

/**
 * 从任意输入中提取并解码分享配置。
 * 支持：完整分享 URL、仅 hash（#k=...）、直接粘贴的载荷（z.../j...）。
 * @returns 解码后的 JSON 文本；输入中不含配置时返回 null
 */
export async function extractConfigFromUrlLike(input: string): Promise<string | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let payload: string | null = null;

  if (trimmed.startsWith('#')) {
    payload = readHash(trimmed);
  } else if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith(`${window.location.origin}`)) {
    let hash = '';
    try {
      hash = new URL(trimmed).hash;
    } catch {
      throw new ShareUrlError('URL_INVALID');
    }
    if (!hash) return null;
    payload = readHash(hash);
  } else if (/^[zj][A-Za-z0-9_-]+$/.test(trimmed)) {
    payload = trimmed;
  }

  if (!payload) return null;
  if (payload.length > MAX_SHARE_PAYLOAD_LENGTH) {
    throw new ShareUrlError('SHARE_URL_TOO_LONG');
  }
  return decodePayload(payload);
}

function readHash(hash: string): string | null {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const value = params.get(SHARE_HASH_KEY);
  return value && value.length > 0 ? value : null;
}

/** 读取当前地址栏中的分享配置（应用启动时调用） */
export function extractConfigFromLocation(): Promise<string | null> {
  return extractConfigFromUrlLike(window.location.hash || '');
}

/** 从生成好的分享 URL 中取出 hash 片段（形如 #k=...），供同步写入地址栏 */
export function shareHashOf(url: string): string {
  const index = url.indexOf('#');
  return index >= 0 ? url.slice(index) : '';
}

/** 应用配置后清理地址栏中的分享 hash，避免刷新重复弹预览 */
export function clearShareHash(): void {
  const url = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(window.history.state, '', url);
}
