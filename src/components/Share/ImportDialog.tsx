import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Undo2,
  Redo2,
  ShieldCheck,
  Info,
  X,
} from 'lucide-react';
import { useKeyboardStore } from '@/store/useKeyboardStore';
import { useImportDialogStore } from '@/store/useImportDialogStore';
import { LAYOUT_CONFIGS } from '@/data/layouts';
import { MATERIAL_CONFIGS } from '@/data/materials';
import { ZONE_LIST, ZONE_CONFIGS } from '@/data/zones';
import type { ValidationIssue } from '@/share/schema';
import type { SanitizedConfig } from '@/share/validation';
import { cn } from '@/lib/utils';

const SOURCE_LABEL: Record<string, string> = {
  link: '分享链接',
  file: 'JSON 文件',
  clipboard: '剪贴板',
  manual: '手动粘贴',
  'url-onload': '分享链接（打开即导入）',
};

export function ImportDialog() {
  const status = useImportDialogStore((s) => s.status);
  const source = useImportDialogStore((s) => s.source);
  const preview = useImportDialogStore((s) => s.preview);
  const appliedConfig = useImportDialogStore((s) => s.appliedConfig);
  const issues = useImportDialogStore((s) => s.issues);
  const error = useImportDialogStore((s) => s.error);
  const backup = useImportDialogStore((s) => s.backup);
  const activeSide = useImportDialogStore((s) => s.activeSide);
  const confirmImport = useImportDialogStore((s) => s.confirmImport);
  const rollback = useImportDialogStore((s) => s.rollback);
  const reapply = useImportDialogStore((s) => s.reapply);
  const dismiss = useImportDialogStore((s) => s.dismiss);

  const layout = useKeyboardStore((s) => s.layout);
  const caseMaterial = useKeyboardStore((s) => s.caseMaterial);
  const zoneColors = useKeyboardStore((s) => s.zoneColors);

  if (status === 'closed') return null;

  const shownConfig = status === 'applied' ? appliedConfig : preview;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={status === 'detecting' ? undefined : dismiss}
      />

      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-gray-800/70 bg-gray-900/95 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            {statusIcon(status)}
            <div>
              <h2 className="text-base font-semibold text-white">{titleFor(status)}</h2>
              {source && <p className="text-xs text-gray-400">来源：{SOURCE_LABEL[source] ?? source}</p>}
            </div>
          </div>
          {status !== 'detecting' && (
            <button
              onClick={dismiss}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-5">
          {status === 'detecting' && <DetectingBody />}
          {status === 'invalid' && (
            <InvalidBody error={error} issues={issues} onClose={dismiss} />
          )}
          {status === 'preview' && shownConfig && (
            <PreviewBody
              current={{ layout, caseMaterial, zoneColors }}
              previewConfig={shownConfig}
              issues={issues}
              onCancel={dismiss}
              onConfirm={confirmImport}
            />
          )}
          {status === 'applied' && shownConfig && (
            <AppliedBody
              hasBackup={!!backup}
              activeSide={activeSide}
              onRollback={rollback}
              onReapply={reapply}
              onClose={dismiss}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function statusIcon(status: string) {
  if (status === 'detecting') return <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />;
  if (status === 'preview') return <ShieldCheck className="w-5 h-5 text-indigo-400" />;
  if (status === 'invalid') return <XCircle className="w-5 h-5 text-red-400" />;
  return <CheckCircle2 className="w-5 h-5 text-green-400" />;
}

function titleFor(status: string) {
  switch (status) {
    case 'detecting':
      return '正在解析配置…';
    case 'preview':
      return '导入预览';
    case 'invalid':
      return '导入失败';
    case 'applied':
      return '导入成功';
    default:
      return '';
  }
}

function DetectingBody() {
  return (
    <div className="py-10 flex flex-col items-center gap-3 text-gray-400">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      <p className="text-sm">解码并校验配置中，当前配置与 3D 场景不会被修改</p>
    </div>
  );
}

interface InvalidBodyProps {
  error: ValidationIssue | null;
  issues: ValidationIssue[];
  onClose: () => void;
}

function InvalidBody({ error, issues, onClose }: InvalidBodyProps) {
  const warnings = issues.filter((i) => i.severity === 'warning');
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
        <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-medium text-red-200">{error?.message ?? '配置校验未通过'}</div>
          {error?.code && <div className="text-xs text-red-400/70 mt-1 font-mono">{error.code}</div>}
        </div>
      </div>
      <p className="text-xs text-gray-400 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        未对当前配置和 3D 场景做任何修改，请向分享者索要完整的配置内容。
      </p>
      {warnings.length > 0 && <IssueList issues={warnings} />}
      <button
        onClick={onClose}
        className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium text-white transition-colors"
      >
        知道了
      </button>
    </div>
  );
}

interface CurrentConfig {
  layout: string;
  caseMaterial: string;
  zoneColors: Record<string, string>;
}

interface PreviewBodyProps {
  current: CurrentConfig;
  previewConfig: SanitizedConfig;
  issues: ValidationIssue[];
  onCancel: () => void;
  onConfirm: () => void;
}

function PreviewBody({ current, previewConfig, issues, onCancel, onConfirm }: PreviewBodyProps) {
  const warnings = issues.filter((i) => i.severity === 'warning');
  const extensionCount = Object.keys(previewConfig.extensions).length;
  const migrated = issues.some(
    (i) =>
      i.code === 'LEGACY_NO_VERSION' ||
      i.code.startsWith('MIGRATED') ||
      i.code === 'MIGRATION_PATH_MISSING'
  );

  return (
    <div className="space-y-4">
      {previewConfig.name && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg">
          <span className="text-xs text-gray-400">配置名称</span>
          <span className="text-sm text-white font-medium">{previewConfig.name}</span>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
          schema v{previewConfig.schemaVersion}
        </span>
        {migrated && (
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-amber-500/15 text-amber-300 border border-amber-500/30">
            已从旧版本迁移
          </span>
        )}
        {extensionCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-purple-500/15 text-purple-300 border border-purple-500/30">
            含 {extensionCount} 项扩展配置
          </span>
        )}
        {previewConfig.exportedAt && (
          <span className="text-[11px] text-gray-500">
            导出于 {new Date(previewConfig.exportedAt).toLocaleString()}
          </span>
        )}
      </div>

      <div className="space-y-2">
        <DiffRow
          label="键位布局"
          changed={current.layout !== previewConfig.layout}
          incoming={
            <span>
              {LAYOUT_CONFIGS[previewConfig.layout].name}
              <span className="text-gray-500 ml-1">
                ({LAYOUT_CONFIGS[previewConfig.layout].keys.length} 键)
              </span>
            </span>
          }
          current={
            <span className="text-gray-400">
              {LAYOUT_CONFIGS[current.layout as keyof typeof LAYOUT_CONFIGS]?.name ?? current.layout}
            </span>
          }
        />
        <DiffRow
          label="外壳材质"
          changed={current.caseMaterial !== previewConfig.caseMaterial}
          incoming={
            <span className="flex items-center gap-2">
              <span
                className="inline-block w-3.5 h-3.5 rounded-sm border border-gray-600/50"
                style={{ backgroundColor: MATERIAL_CONFIGS[previewConfig.caseMaterial].color }}
              />
              {MATERIAL_CONFIGS[previewConfig.caseMaterial].name}
            </span>
          }
          current={
            <span className="text-gray-400">
              {MATERIAL_CONFIGS[current.caseMaterial as keyof typeof MATERIAL_CONFIGS]?.name ??
                current.caseMaterial}
            </span>
          }
        />

        <div className="p-3 bg-gray-800/40 border border-gray-700/40 rounded-xl">
          <div className="text-xs text-gray-400 mb-2">分区颜色</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {ZONE_LIST.map((zone) => {
              const incomingColor = previewConfig.zoneColors[zone];
              const currentColor = current.zoneColors[zone];
              const changed = incomingColor !== currentColor;
              return (
                <div key={zone} className="flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      'w-4 h-4 rounded border flex-shrink-0',
                      changed ? 'border-amber-400/70' : 'border-gray-600/50'
                    )}
                    style={{ backgroundColor: incomingColor }}
                  />
                  <span className={cn('truncate', changed ? 'text-gray-200' : 'text-gray-400')}>
                    {ZONE_CONFIGS[zone].name}
                  </span>
                  {changed && <span className="ml-auto text-[10px] text-amber-400/80">变更</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {warnings.length > 0 && <IssueList issues={warnings} />}

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <ShieldCheck className="w-3.5 h-3.5 text-green-500/80" />
        内容已通过结构与颜色校验，确认后才会写入；原配置会自动留存可恢复。
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium text-gray-200 transition-colors"
        >
          取消
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium text-white transition-colors"
        >
          应用配置
        </button>
      </div>
    </div>
  );
}

interface DiffRowProps {
  label: string;
  changed: boolean;
  incoming: React.ReactNode;
  current: React.ReactNode;
}

function DiffRow({ label, changed, incoming, current }: DiffRowProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-800/40 border border-gray-700/40 rounded-xl">
      <span className="text-xs text-gray-400 w-16 flex-shrink-0">{label}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white truncate">{incoming}</div>
        {changed && <div className="text-xs text-gray-500 truncate">当前：{current}</div>}
      </div>
      {changed ? (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex-shrink-0">
          变更
        </span>
      ) : (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/30 text-gray-400 flex-shrink-0">
          相同
        </span>
      )}
    </div>
  );
}

function IssueList({ issues }: { issues: ValidationIssue[] }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
        校验提示（{issues.length}）
      </div>
      <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
        {issues.map((issue, idx) => (
          <li
            key={`${issue.code}-${idx}`}
            className="flex items-start gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded-lg"
          >
            <span className="text-xs text-amber-200/90">{issue.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface AppliedBodyProps {
  hasBackup: boolean;
  activeSide: 'imported' | 'backup';
  onRollback: () => void;
  onReapply: () => void;
  onClose: () => void;
}

function AppliedBody({ hasBackup, activeSide, onRollback, onReapply, onClose }: AppliedBodyProps) {
  const restored = activeSide === 'backup';
  const banner = restored
    ? { cls: 'bg-indigo-500/10 border-indigo-500/30', icon: 'text-indigo-400', title: '已恢复到导入前的配置', desc: '当前 3D 场景显示的是你原来的配置，可随时重新应用导入内容。' }
    : { cls: 'bg-green-500/10 border-green-500/30', icon: 'text-green-400', title: '配置已应用到 3D 场景', desc: '布局、外壳材质与分区颜色已原子替换，按键交互状态未受影响。' };

  return (
    <div className="space-y-4">
      <div className={`flex items-start gap-3 p-4 ${banner.cls} border rounded-xl`}>
        <CheckCircle2 className={`w-5 h-5 ${banner.icon} flex-shrink-0 mt-0.5`} />
        <div>
          <div className="text-sm font-medium text-green-200">{banner.title}</div>
          <div className="text-xs text-green-400/70 mt-1">{banner.desc}</div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onRollback}
          disabled={!hasBackup || restored}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors',
            hasBackup && !restored
              ? 'bg-gray-800 hover:bg-gray-700 text-gray-100'
              : 'bg-gray-800/40 text-gray-500 cursor-not-allowed'
          )}
        >
          <Undo2 className="w-4 h-4" />
          {restored ? '当前即原配置' : '恢复原配置'}
        </button>
        <button
          onClick={onReapply}
          disabled={!restored}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/40 disabled:text-gray-500 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-gray-100 transition-colors"
        >
          <Redo2 className="w-4 h-4" />
          重新应用
        </button>
      </div>
      <button
        onClick={onClose}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium text-white transition-colors"
      >
        继续编辑
      </button>
    </div>
  );
}
