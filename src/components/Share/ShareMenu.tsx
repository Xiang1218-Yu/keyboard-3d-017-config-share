import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Share2,
  Link2,
  FileJson,
  ClipboardCopy,
  Check,
  AlertTriangle,
  Loader2,
  X,
} from 'lucide-react';
import { useKeyboardStore } from '@/store/useKeyboardStore';
import { useImportDialogStore } from '@/store/useImportDialogStore';
import { createSnapshot, buildExportEnvelope } from '@/share/importService';
import { buildShareUrl, shareHashOf, ShareUrlError, SHARE_URL_TOO_LONG } from '@/share/shareLink';
import { downloadConfigFile } from '@/share/fileTransfer';
import { copyText } from '@/share/clipboard';
import { isShareUrlTooLong } from '@/share/validation';
import { cn } from '@/lib/utils';

type ExportKind = 'link' | 'file' | 'clipboard';

export function ShareMenu() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<ExportKind | null>(null);
  const [done, setDone] = useState<ExportKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [urlTooLong, setUrlTooLong] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const layout = useKeyboardStore((s) => s.layout);
  const caseMaterial = useKeyboardStore((s) => s.caseMaterial);
  const zoneColors = useKeyboardStore((s) => s.zoneColors);
  const extensions = useKeyboardStore((s) => s.extensions);
  const pushToast = useImportDialogStore((s) => s.pushToast);

  const snapshot = useMemo(
    () => createSnapshot({ layout, caseMaterial, zoneColors, extensions }),
    [layout, caseMaterial, zoneColors, extensions]
  );

  // 每次打开时重置交互状态并预算链接长度风险
  useEffect(() => {
    if (!open) return;
    setError(null);
    setDone(null);
    setShareUrl(null);
    setUrlTooLong(false);

    let cancelled = false;
    buildShareUrl(buildExportEnvelope(snapshot, name))
      .then((url) => {
        if (!cancelled) {
          setShareUrl(url);
          setUrlTooLong(isShareUrlTooLong(url));
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setUrlTooLong(e instanceof ShareUrlError && e.message === SHARE_URL_TOO_LONG);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, snapshot, name]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const flashDone = (kind: ExportKind) => {
    setDone(kind);
    setTimeout(() => setDone((cur) => (cur === kind ? null : cur)), 1800);
  };

  const handleLink = async () => {
    setBusy('link');
    setError(null);
    try {
      const url = shareUrl ?? (await buildShareUrl(buildExportEnvelope(snapshot, name)));
      if (isShareUrlTooLong(url)) {
        throw new ShareUrlError(SHARE_URL_TOO_LONG);
      }
      await copyText(url);
      // 同时把链接放到地址栏，当前页面即可被直接转发（只改 hash，不触发刷新）
      window.history.replaceState(null, '', shareHashOf(url));
      flashDone('link');
      pushToast('success', '分享链接已复制到剪贴板');
    } catch (e) {
      if (e instanceof ShareUrlError && e.message === SHARE_URL_TOO_LONG) {
        setError('配置生成的链接超长（> 2048 字符），请改用 JSON 文件或剪贴板分享');
      } else {
        setError('复制链接失败，请检查浏览器剪贴板权限');
      }
    } finally {
      setBusy(null);
    }
  };

  const handleFile = () => {
    setBusy('file');
    setError(null);
    try {
      downloadConfigFile(buildExportEnvelope(snapshot, name));
      flashDone('file');
      pushToast('success', 'JSON 配置文件已开始下载');
    } catch (e) {
      setError(`导出文件失败：${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const handleClipboard = async () => {
    setBusy('clipboard');
    setError(null);
    try {
      const json = JSON.stringify(buildExportEnvelope(snapshot, name), null, 2);
      await copyText(json);
      flashDone('clipboard');
      pushToast('success', '完整 JSON 配置已复制到剪贴板');
    } catch (e) {
      setError(`复制失败：${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all',
          open
            ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/50'
            : 'text-gray-300 bg-gray-800/60 border border-gray-700/50 hover:bg-gray-700/60'
        )}
      >
        <Share2 className="w-3.5 h-3.5" />
        分享配置
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-80 p-4 bg-gray-800/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl z-30">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-white">分享当前配置</h4>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <label className="block text-xs text-gray-400 mb-1.5">配置名称（可选）</label>
          <input
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：我的紫色 TKL"
            className="w-full px-3 py-2 mb-3 bg-gray-900/60 border border-gray-700/50 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50"
          />

          <div className="space-y-2">
            <ExportButton
              kind="link"
              icon={<Link2 className="w-4 h-4" />}
              title="分享链接"
              desc="压缩编码到 URL 片段，复制即可发送"
              busy={busy === 'link'}
              done={done === 'link'}
              disabled={urlTooLong}
              onClick={handleLink}
            />
            <ExportButton
              kind="file"
              icon={<FileJson className="w-4 h-4" />}
              title="导出 JSON 文件"
              desc="下载带版本号的 .keyboard.json"
              busy={busy === 'file'}
              done={done === 'file'}
              onClick={handleFile}
            />
            <ExportButton
              kind="clipboard"
              icon={<ClipboardCopy className="w-4 h-4" />}
              title="复制到剪贴板"
              desc="完整可读的 JSON，适合聊天窗口粘贴"
              busy={busy === 'clipboard'}
              done={done === 'clipboard'}
              onClick={handleClipboard}
            />
          </div>

          {urlTooLong && (
            <div className="mt-3 flex items-start gap-2 px-2.5 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-200/90">
                当前配置生成的链接超长，部分浏览器 / 聊天工具会截断。请用文件或剪贴板分享。
              </p>
            </div>
          )}
          {error && (
            <div className="mt-3 flex items-start gap-2 px-2.5 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-200/90">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ExportButtonProps {
  kind: ExportKind;
  icon: React.ReactNode;
  title: string;
  desc: string;
  busy: boolean;
  done: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function ExportButton({ icon, title, desc, busy, done, disabled, onClick }: ExportButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all',
        disabled
          ? 'opacity-50 cursor-not-allowed bg-gray-800/40 border-gray-700/40'
          : 'bg-gray-900/50 border-gray-700/50 hover:bg-gray-700/50 hover:border-gray-600/60'
      )}
    >
      <span className="text-indigo-300 flex-shrink-0">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : done ? <Check className="w-4 h-4 text-green-400" /> : icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-white">{title}</span>
        <span className="block text-xs text-gray-400 truncate">{desc}</span>
      </span>
    </button>
  );
}
