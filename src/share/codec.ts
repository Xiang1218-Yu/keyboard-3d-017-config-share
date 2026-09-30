/**
 * 分享载荷编解码
 * --------------
 * JSON 文本 → UTF-8 字节 → gzip（可用时）→ base64url，
 * 首字节用标签区分 gzip(z) / 纯 JSON(j)，老环境拿到新链接也能给出明确报错。
 * 不引入第三方依赖：CompressionStream 在 Chromium / Safari 16.4+ / Node 18+ 均可用。
 */

const TAG_GZIP = 'z';
const TAG_RAW = 'j';

const gzipSupported =
  typeof CompressionStream !== 'undefined' &&
  typeof DecompressionStream !== 'undefined';

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(input: string): Uint8Array {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** 将任意 JSON 安全值编码为 URL 安全字符串 */
export async function encodePayload(value: unknown): Promise<string> {
  const json = JSON.stringify(value);
  const utf8 = new TextEncoder().encode(json);

  if (gzipSupported) {
    try {
      return TAG_GZIP + bytesToBase64Url(await gzip(utf8));
    } catch {
      // 压缩异常时退回到未压缩标签，保证仍可分享
    }
  }
  return TAG_RAW + bytesToBase64Url(utf8);
}

/** 解码 encodePayload 产物，返回 JSON 文本（不做解析，由校验层负责） */
export async function decodePayload(payload: string): Promise<string> {
  if (payload.length < 2) {
    throw new Error('PAYLOAD_EMPTY');
  }
  const tag = payload[0];
  const body = payload.slice(1);

  let bytes: Uint8Array;
  try {
    bytes = base64UrlToBytes(body);
  } catch {
    throw new Error('PAYLOAD_NOT_BASE64URL');
  }

  if (tag === TAG_RAW) {
    return new TextDecoder().decode(bytes);
  }
  if (tag === TAG_GZIP) {
    if (!gzipSupported) {
      throw new Error('GZIP_UNSUPPORTED');
    }
    try {
      return new TextDecoder().decode(await gunzip(bytes));
    } catch {
      throw new Error('PAYLOAD_CORRUPT');
    }
  }
  throw new Error('PAYLOAD_UNKNOWN_TAG');
}

export function isCodecSupported(): boolean {
  return typeof btoa === 'function' && typeof atob === 'function';
}
