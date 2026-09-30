/**
 * 剪贴板通道
 * ----------
 * 复制：写入信封 JSON（与文件内容一致，最通用）；
 *      非安全上下文（无 navigator.clipboard）时走 execCommand 兜底。
 * 读取：可能是 JSON、分享链接或纯载荷，统一交给上层识别，
 *      因此这里不做任何解析。
 */

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // 权限被拒等场景继续走兜底
    }
  }
  copyTextFallback(text);
}

export async function readClipboardText(): Promise<string> {
  if (!navigator.clipboard?.readText) {
    throw new Error('CLIPBOARD_UNSUPPORTED');
  }
  return navigator.clipboard.readText();
}

function copyTextFallback(text: string): void {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  textarea.remove();
  if (!ok) {
    throw new Error('CLIPBOARD_COPY_FAILED');
  }
}
