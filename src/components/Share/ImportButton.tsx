import { useEffect, useRef, useState } from 'react';
import {
  Download,
  FileUp,
  ClipboardPaste,
  Link2,
  Loader2,
  X,
} from 'lucide-react';
import { useImportDialogStore } from '@/store/useImportDialogStore';
import { pickConfigFile } from '@/share/fileTransfer';
import { readClipboardText } from '@/share/clipboard';
import { cn } from '@/lib/utils';

export function ImportButton() {
  const [open, setOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const status = useImportDialogStore((s) => s.status);
  const ingestText = useImportDialogStore((s) => s.ingestText);
  const openImport = useImportDialogStore((s) => s.openImport);
  const containerRef = useRef<HTMLDivElement>(null);

  const busy = status === 'detecting';

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowPaste(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const handleFile = async () => {
    setLocalError(null);
    setOpen(false);
    openImport('file');
    try {
      const text = await pickConfigFile();
      if (text === null) {
        // 用户取消文件选择：关闭检测态
        useImportDialogStore.getState().dismiss();
        return;
      }
      await ingestText(text, 'file');
    } catch (e) {
      const code = (e as Error)?.message;
      useImportDialogStore.setState({
        status: 'invalid',
        error: {
          severity: 'error',
          code: code ?? 'FILE_READ_FAILED',
          message: code === 'FILE_NOT_JSON' ? '请选择 .json 配置文件' : `读取文件失败：${code}`,
        },
        issues: [],
      });
    }
  };

  const handleClipboard = async () => {
    setLocalError(null);
    setOpen(false);
    openImport('clipboard');
    try {
      const text = await readClipboardText();
      if (!text.trim()) {
        useImportDialogStore.setState({
          status: 'invalid',
          error: { severity: 'error', code: 'EMPTY_CLIPBOARD', message: '剪贴板为空' },
          issues: [],
        });
        return;
      }
      await ingestText(text, 'clipboard');
    } catch (e) {
      const code = (e as Error)?.message;
      useImportDialogStore.setState({
        status: 'invalid',
        error: {
          severity: 'error',
          code: code ?? 'CLIPBOARD_FAILED',
          message:
            code === 'CLIPBOARD_UNSUPPORTED'
              ? '当前浏览器不支持读取剪贴板（需要 HTTPS 或 localhost），请手动粘贴到下方输入框'
              : `读取剪贴板失败：${code}`,
        },
        issues: [],
      });
    }
  };

  const handleManualParse = async () => {
    if (!pasteText.trim()) {
      setLocalError('请先粘贴分享链接或 JSON 配置');
      return;
    }
    setLocalError(null);
    setOpen(false);
    setShowPaste(false);
    await ingestText(pasteText, 'manual');
    setPasteText('');
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all',
          open
            ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50'
            : 'text-gray-300 bg-gray-800/60 border border-gray-700/50 hover:bg-gray-700/60',
          busy && 'opacity-70 cursor-wait'
        )}
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        导入配置
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-80 p-2 bg-gray-800/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl z-30">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-medium text-gray-400">选择导入方式</span>
            <button
              onClick={() => {
                setOpen(false);
                setShowPaste(false);
              }}
              className="text-gray-500 hover:text-gray-200"
              aria-label="关闭"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleFile}
            className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-gray-700/50 transition-colors text-left"
          >
            <FileUp className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span>
              <span className="block text-sm text-white">JSON 文件</span>
              <span className="block text-xs text-gray-400">选择别人发你的 .keyboard.json</span>
            </span>
          </button>

          <button
            onClick={handleClipboard}
            className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-gray-700/50 transition-colors text-left"
          >
            <ClipboardPaste className="w-4 h-4 text-green-400 flex-shrink-0" />
            <span>
              <span className="block text-sm text-white">读取剪贴板</span>
              <span className="block text-xs text-gray-400">自动识别链接或 JSON</span>
            </span>
          </button>

          <button
            onClick={() => setShowPaste((v) => !v)}
            className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-gray-700/50 transition-colors text-left"
          >
            <Link2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span>
              <span className="block text-sm text-white">粘贴链接 / JSON</span>
              <span className="block text-xs text-gray-400">手动粘贴后解析</span>
            </span>
          </button>

          {showPaste && (
            <div className="px-2 pb-2 pt-1 space-y-2">
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="粘贴 https://… 分享链接，或整段 JSON 配置"
                rows={4}
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700/50 rounded-lg text-xs text-white placeholder:text-gray-600 font-mono resize-none focus:outline-none focus:border-indigo-500/50"
              />
              {localError && <p className="text-xs text-red-400">{localError}</p>}
              <button
                onClick={handleManualParse}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-medium text-white transition-colors"
              >
                解析并预览
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
