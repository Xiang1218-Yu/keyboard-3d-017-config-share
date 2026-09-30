import type { ShareEnvelope } from './schema';

/**
 * JSON 文件通道：导出下载 / 导入读取
 * 读取只拿到原始文本，解析与校验一律走 validateConfigText，
 * 浏览器 File 对象不会进入状态管理。
 */

const FILE_EXTENSION = '.keyboard.json';

export function buildFileName(envelope: ShareEnvelope): string {
  const rawName = envelope.data.name?.trim();
  const base = rawName
    ? rawName.replace(/[\\/:*?"<>|\s]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
    : 'keyboard-config';
  const stamp = new Date().toISOString().slice(0, 10);
  return `${base || 'keyboard-config'}-v${envelope.schemaVersion}-${stamp}${FILE_EXTENSION}`;
}

export function downloadConfigFile(envelope: ShareEnvelope): void {
  const json = JSON.stringify(envelope, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = buildFileName(envelope);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    // 让下载有机会启动后再回收
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function readConfigFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.name.toLowerCase().endsWith('.json')) {
      reject(new Error('FILE_NOT_JSON'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => reject(reader.error ?? new Error('FILE_READ_FAILED'));
    reader.readAsText(file, 'utf-8');
  });
}

/** 弹出系统文件选择框并返回所选文件文本 */
export function pickConfigFile(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.multiple = false;

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      readConfigFile(file).then(resolve, reject);
    };
    // 用户取消选择时不报错，按未选择处理
    input.addEventListener('cancel', () => resolve(null));

    input.click();
  });
}
