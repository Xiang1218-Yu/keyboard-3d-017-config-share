import { MAX_IMPORT_BYTES } from './shareSchema';

export async function writeClipboardText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    const copied = document.execCommand('copy');
    if (!copied) throw new Error('浏览器拒绝写入剪贴板');
  } finally {
    textarea.remove();
  }
}

export async function readClipboardText(): Promise<string> {
  if (!navigator.clipboard?.readText) {
    throw new Error('当前浏览器不支持读取剪贴板，请手动粘贴到输入框');
  }
  return navigator.clipboard.readText();
}

export function readConfigFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_IMPORT_BYTES) {
      reject(new Error(`文件不能超过 ${MAX_IMPORT_BYTES} 字节`));
      return;
    }
    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      reject(new Error('请选择 .json 配置文件'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('文件读取失败'));
    reader.readAsText(file, 'utf-8');
  });
}
