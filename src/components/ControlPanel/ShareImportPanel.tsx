import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  ClipboardPaste,
  Download,
  FileJson,
  Link2,
  RotateCcw,
  Share2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LAYOUT_CONFIGS } from '@/data/layouts';
import { MATERIAL_CONFIGS } from '@/data/materials';
import { ZONE_CONFIGS, ZONE_LIST } from '@/data/zones';
import { readClipboardText, readConfigFile, writeClipboardText } from '@/lib/config/transfer';
import {
  CONFIG_SCHEMA_VERSION,
  type ConfigIssue,
  type ParseConfigResult,
  type ParseConfigSuccess,
  createShareUrl,
  downloadConfigFile,
  getSharePayloadFromCurrentUrl,
  parseImportText,
  parseSharePayload,
  serializeConfig,
} from '@/lib/config/shareSchema';
import { useKeyboardStore } from '@/store/useKeyboardStore';
import type { KeyboardConfig } from '@/types/keyboard';

interface ShareImportPanelProps {
  className?: string;
}

interface PreviewState {
  result: ParseConfigSuccess;
  sourceLabel: string;
  fromUrl: boolean;
}

interface StatusState {
  type: 'success' | 'error';
  message: string;
}

function useCurrentConfig(): KeyboardConfig {
  const layout = useKeyboardStore((state) => state.layout);
  const caseMaterial = useKeyboardStore((state) => state.caseMaterial);
  const zoneColors = useKeyboardStore((state) => state.zoneColors);
  const extensions = useKeyboardStore((state) => state.extensions);

  return useMemo(
    () => ({ layout, caseMaterial, zoneColors, extensions }),
    [layout, caseMaterial, zoneColors, extensions]
  );
}

function IssueList({ label, issues, tone }: { label: string; issues: ConfigIssue[]; tone: 'warning' | 'error' }) {
  if (issues.length === 0) return null;

  return (
    <div className={`rounded-xl border p-3 space-y-2 ${tone === 'warning' ? 'border-amber-500/30 bg-amber-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
      <div className={`flex items-center gap-2 text-xs font-medium ${tone === 'warning' ? 'text-amber-300' : 'text-red-300'}`}>
        <AlertTriangle className="w-3.5 h-3.5" />
        {label}
      </div>
      <ul className="space-y-1">
        {issues.map((issue, index) => (
          <li key={`${issue.path}-${index}`} className="text-xs text-gray-300">
            <span className="font-mono text-gray-400 mr-1">{issue.path}</span>
            {issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ImportPreviewModal({
  preview,
  onClose,
  onConfirm,
}: {
  preview: PreviewState;
  onClose: () => void;
  onConfirm: (preview: PreviewState) => void;
}) {
  const { result } = preview;
  const config = result.data;
  const layoutConfig = LAYOUT_CONFIGS[config.layout];
  const materialConfig = MATERIAL_CONFIGS[config.caseMaterial];
  const extensionKeys = Object.keys(config.extensions);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-gray-700/60 bg-gray-900 shadow-2xl flex flex-col">
        <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Share2 className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-semibold text-white">导入预览</h2>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs">
                v{result.sourceVersion}{result.migrated ? ' → v1' : ''}
              </span>
            </div>
            <p className="text-xs text-gray-400">来源：{preview.sourceLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="关闭预览"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {result.migrated && (
            <div className="px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-200">
              该配置来自旧版本，已完成迁移；确认后会以当前 v{CONFIG_SCHEMA_VERSION} schema 写入。
            </div>
          )}
          <IssueList label="迁移或校验警告（不会阻止导入）" issues={result.warnings} tone="warning" />

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700/50">
              <div className="text-xs text-gray-500 mb-1">布局</div>
              <div className="text-sm font-medium text-white">{layoutConfig.name}</div>
              <div className="text-xs text-gray-400 mt-1">{layoutConfig.keys.length} 键</div>
            </div>
            <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700/50">
              <div className="text-xs text-gray-500 mb-1">外壳材质</div>
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <span
                  className="w-4 h-4 rounded border border-gray-600"
                  style={{ backgroundColor: materialConfig.color }}
                />
                {materialConfig.name}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700/50">
            <div className="text-xs text-gray-500 mb-3">分区颜色</div>
            <div className="grid grid-cols-2 gap-2">
              {ZONE_LIST.map((zone) => (
                <div key={zone} className="flex items-center gap-2 text-xs text-gray-300">
                  <span
                    className="w-4 h-4 rounded border border-gray-600"
                    style={{ backgroundColor: config.zoneColors[zone] }}
                  />
                  <span>{ZONE_CONFIGS[zone].name}</span>
                  <span className="ml-auto font-mono text-gray-500">{config.zoneColors[zone]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-500">后续扩展配置</div>
              <div className="text-xs text-indigo-300">{extensionKeys.length} 个命名空间</div>
            </div>
            {extensionKeys.length === 0 ? (
              <div className="text-sm text-gray-400">无</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {extensionKeys.map((key) => (
                  <span key={key} className="px-2 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 text-xs font-mono">
                    {key}
                  </span>
                ))}
              </div>
            )}
          </div>

          <details className="rounded-xl border border-gray-700/50 bg-gray-950/50">
            <summary className="cursor-pointer select-none px-3 py-2 text-xs text-gray-400 hover:text-gray-200">
              查看规范化 JSON
            </summary>
            <textarea
              readOnly
              value={JSON.stringify(result.envelope, null, 2)}
              className="w-full h-48 p-3 bg-transparent text-xs font-mono text-gray-300 outline-none resize-none"
            />
          </details>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 text-sm"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(preview)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
          >
            确认导入
          </button>
        </div>
      </div>
    </div>
  );
}

export function ShareImportPanel({ className = '' }: ShareImportPanelProps) {
  const currentConfig = useCurrentConfig();
  const applySharedConfig = useKeyboardStore((state) => state.applySharedConfig);
  const restoreConfig = useKeyboardStore((state) => state.restoreConfig);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoShareHandled = useRef(false);

  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [status, setStatus] = useState<StatusState | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [undoPair, setUndoPair] = useState<{ previous: KeyboardConfig; imported: KeyboardConfig } | null>(null);

  const serializedConfig = useMemo(() => serializeConfig(currentConfig), [currentConfig]);

  const showParsedResult = (result: ParseConfigResult, sourceLabel: string, fromUrl = false) => {
    if (result.ok === false) {
      setStatus({ type: 'error', message: result.error });
      return;
    }
    setPreview({ result, sourceLabel, fromUrl });
    setStatus(null);
  };

  useEffect(() => {
    if (autoShareHandled.current) return;
    autoShareHandled.current = true;

    const payload = getSharePayloadFromCurrentUrl();
    if (!payload) return;
    showParsedResult(parseSharePayload(payload), '当前分享链接', true);
  }, []);

  const runAsyncAction = async (id: string, action: () => Promise<void>) => {
    setBusyAction(id);
    setStatus(null);
    try {
      await action();
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : '操作失败，请重试',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleCopyLink = () =>
    runAsyncAction('link', async () => {
      const url = createShareUrl(currentConfig);
      await writeClipboardText(url);
      setStatus({ type: 'success', message: '分享链接已复制到剪贴板' });
    });

  const handleCopyJson = () =>
    runAsyncAction('copy-json', async () => {
      await writeClipboardText(serializedConfig);
      setStatus({ type: 'success', message: '配置 JSON 已复制到剪贴板' });
    });

  const handleDownload = () => {
    try {
      downloadConfigFile(currentConfig);
      setStatus({ type: 'success', message: 'JSON 配置文件已开始下载' });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : '生成文件失败',
      });
    }
  };

  const handlePasteImport = () =>
    runAsyncAction('paste', async () => {
      const text = await readClipboardText();
      showParsedResult(parseImportText(text), '剪贴板');
    });

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setBusyAction('file');
    setStatus(null);
    try {
      const text = await readConfigFile(file);
      showParsedResult(parseImportText(text), `文件 ${file.name}`);
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : '文件读取失败',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleManualPreview = () => {
    showParsedResult(parseImportText(manualInput), '手动输入');
  };

  const closePreview = () => {
    if (preview?.fromUrl) {
      const url = new URL(window.location.href);
      url.hash = '';
      window.history.replaceState(null, '', url.href);
    }
    setPreview(null);
  };

  const handleConfirm = (nextPreview: PreviewState) => {
    const imported = nextPreview.result.data;
    const result = applySharedConfig(imported);
    if (result.ok === false || !result.snapshot) {
      setStatus({ type: 'error', message: result.error ?? '导入失败，当前配置已保留' });
      return;
    }

    setUndoPair({ previous: result.snapshot, imported });
    setPreview(null);
    setStatus({ type: 'success', message: '导入成功，3D 场景已更新' });

    if (nextPreview.fromUrl) {
      const url = new URL(window.location.href);
      url.hash = '';
      window.history.replaceState(null, '', url.href);
    }
  };

  const handleUndo = () => {
    if (!undoPair) return;
    const result = restoreConfig(undoPair.previous);
    if (result.ok === false) {
      setStatus({ type: 'error', message: result.error ?? '恢复失败，当前配置已保留' });
      return;
    }
    setStatus({ type: 'success', message: '已恢复到导入前配置' });
  };

  const handleRedoImport = () => {
    if (!undoPair) return;
    const result = restoreConfig(undoPair.imported);
    if (result.ok === false) {
      setStatus({ type: 'error', message: result.error ?? '恢复失败，当前配置已保留' });
      return;
    }
    setStatus({ type: 'success', message: '已重新应用导入配置' });
  };

  const actionButtonClass =
    'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gray-800/70 border border-gray-700/60 text-gray-200 text-xs font-medium hover:bg-gray-700/70 hover:border-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <Share2 className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-medium text-gray-200">分享与导入</h3>
        <span className="ml-auto px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-[10px] text-gray-400 font-mono">
          schema v{CONFIG_SCHEMA_VERSION}
        </span>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={handleCopyLink} disabled={busyAction !== null} className={actionButtonClass}>
            <Link2 className="w-3.5 h-3.5" />
            {busyAction === 'link' ? '处理中…' : '复制链接'}
          </button>
          <button type="button" onClick={handleCopyJson} disabled={busyAction !== null} className={actionButtonClass}>
            <ClipboardCopy className="w-3.5 h-3.5" />
            复制 JSON
          </button>
          <button type="button" onClick={handleDownload} disabled={busyAction !== null} className={actionButtonClass}>
            <Download className="w-3.5 h-3.5" />
            下载文件
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={handlePasteImport} disabled={busyAction !== null} className={actionButtonClass}>
            <ClipboardPaste className="w-3.5 h-3.5" />
            剪贴板导入
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busyAction !== null}
            className={actionButtonClass}
          >
            <Upload className="w-3.5 h-3.5" />
            {busyAction === 'file' ? '读取中…' : '选择文件'}
          </button>
          <button
            type="button"
            onClick={handleManualPreview}
            disabled={busyAction !== null || !manualInput.trim()}
            className={actionButtonClass}
          >
            <FileJson className="w-3.5 h-3.5" />
            解析输入
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleFileSelected}
          />
        </div>

        <textarea
          value={manualInput}
          onChange={(event) => setManualInput(event.target.value)}
          placeholder="也可粘贴 JSON 配置或完整分享链接，然后点击“解析输入”"
          className="w-full h-20 px-3 py-2 bg-gray-950/60 border border-gray-700/50 rounded-xl text-xs text-gray-200 font-mono resize-none focus:outline-none focus:border-emerald-500/50 placeholder:font-sans"
        />

        {undoPair && (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-gray-800/50 border border-gray-700/50">
            <RotateCcw className="w-3.5 h-3.5 text-amber-300 ml-1" />
            <span className="text-xs text-gray-300 flex-1">可在两套配置间恢复</span>
            <button onClick={handleUndo} className="px-2 py-1 rounded-lg bg-amber-500/15 text-amber-200 text-xs hover:bg-amber-500/25">
              撤销导入
            </button>
            <button onClick={handleRedoImport} className="px-2 py-1 rounded-lg bg-indigo-500/15 text-indigo-200 text-xs hover:bg-indigo-500/25">
              重新应用
            </button>
          </div>
        )}

        {status && (
          <div
            className={`flex items-start gap-2 px-3 py-2 rounded-xl border text-xs ${
              status.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : 'bg-red-500/10 border-red-500/30 text-red-200'
            }`}
          >
            {status.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            )}
            <span>{status.message}</span>
          </div>
        )}
      </div>

      {preview && <ImportPreviewModal preview={preview} onClose={closePreview} onConfirm={handleConfirm} />}
    </div>
  );
}
