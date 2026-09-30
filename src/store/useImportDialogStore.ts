import { create } from 'zustand';
import { useKeyboardStore } from './useKeyboardStore';
import {
  detectAndValidate,
  createSnapshot,
  type ConfigSnapshot,
  type ImportSource,
} from '@/share/importService';
import type { SanitizedConfig } from '@/share/validation';
import type { ValidationIssue } from '@/share/schema';
import { clearShareHash } from '@/share/shareLink';

/**
 * 导入弹窗状态机
 * --------------
 * closed    关闭
 * detecting 读取 / 解码 / 校验中
 * preview   校验通过（可能带 warning），等待用户确认——此时尚未触碰 store
 * invalid   校验失败，展示错误原因，store 与 3D 场景保持原样
 * applied   已写入成功，保留导入前快照支持一键恢复
 */
export type DialogStatus = 'closed' | 'detecting' | 'preview' | 'invalid' | 'applied';

export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  message: string;
}

interface ImportDialogState {
  status: DialogStatus;
  source: ImportSource | null;
  preview: SanitizedConfig | null;
  issues: ValidationIssue[];
  error: ValidationIssue | null;
  /** 成功导入前的现场，用于「撤销 / 恢复原配置」 */
  backup: ConfigSnapshot | null;
  /** 成功导入的配置，用于「重新应用」 */
  appliedConfig: SanitizedConfig | null;
  /** 当前现场停在哪一侧：'imported' 导入配置 / 'backup' 导入前原配置 */
  activeSide: 'imported' | 'backup';
  /** 地址栏 hash 是否归本次流程所有（仅启动时自带的分享链接） */
  urlOwned: boolean;

  toasts: Toast[];

  openImport: (source: ImportSource) => void;
  ingestText: (text: string, source: ImportSource) => Promise<void>;
  confirmImport: () => void;
  rollback: () => void;
  reapply: () => void;
  dismiss: () => void;
  pushToast: (kind: Toast['kind'], message: string) => void;
  dismissToast: (id: number) => void;
}

let toastSeq = 0;

export const useImportDialogStore = create<ImportDialogState>((set, get) => ({
  status: 'closed',
  source: null,
  preview: null,
  issues: [],
  error: null,
  backup: null,
  appliedConfig: null,
  activeSide: 'imported' as const,
  urlOwned: false,
  toasts: [],

  openImport: (source) => {
    set({
      status: 'detecting',
      source,
      preview: null,
      issues: [],
      error: null,
      activeSide: 'imported',
      urlOwned: source === 'url-onload',
    });
  },

  ingestText: async (text, source) => {
    set({
      status: 'detecting',
      source,
      error: null,
      preview: null,
      issues: [],
      activeSide: 'imported',
      urlOwned: source === 'url-onload',
      // 新一轮导入：旧备份失效
      backup: null,
      appliedConfig: null,
    });
    const outcome = await detectAndValidate(text, source);

    if (outcome.ok) {
      set({
        status: 'preview',
        preview: outcome.config,
        issues: outcome.issues,
      });
      return;
    }

    // 失败路径：store 自始至终没有被写入，场景保持原样
    set({
      status: 'invalid',
      error: outcome.error,
      issues: outcome.issues,
    });
  },

  confirmImport: () => {
    const { preview, source, backup } = get();
    if (!preview) return;

    try {
      const keyboard = useKeyboardStore.getState();
      // 仅在第一次应用时留存现场；applied → 重新应用不应覆盖最初备份
      const snapshot = backup ?? createSnapshot(keyboard);

      keyboard.importConfig({
        layout: preview.layout,
        caseMaterial: preview.caseMaterial,
        zoneColors: preview.zoneColors,
        extensions: preview.extensions,
      });

      if (source === 'url-onload') {
        // 地址栏里的链接只消费一次，避免刷新重复弹窗
        clearShareHash();
      }
      set({ urlOwned: false });

      set({
        status: 'applied',
        backup: snapshot,
        appliedConfig: preview,
        activeSide: 'imported',
      });
      get().pushToast('success', '配置已导入，3D 场景已更新');
    } catch (e) {
      // 理论上不可达（数据已过校验），但写入阶段任何异常都必须回滚
      if (backup) {
        useKeyboardStore.getState().importConfig(backup);
      }
      set({
        status: 'invalid',
        error: {
          severity: 'error',
          code: 'APPLY_FAILED',
          message: `写入配置失败，已恢复原配置：${(e as Error).message}`,
        },
      });
      get().pushToast('error', '导入失败，已回退到原配置');
    }
  },

  rollback: () => {
    const { backup } = get();
    if (!backup) return;
    try {
      useKeyboardStore.getState().importConfig(backup);
      set({ status: 'applied', activeSide: 'backup' });
      get().pushToast('info', '已恢复到导入前的配置');
    } catch (e) {
      get().pushToast('error', `恢复失败：${(e as Error).message}`);
    }
  },

  reapply: () => {
    const { appliedConfig, preview } = get();
    const config = appliedConfig ?? preview;
    if (!config) return;
    try {
      useKeyboardStore.getState().importConfig({
        layout: config.layout,
        caseMaterial: config.caseMaterial,
        zoneColors: config.zoneColors,
        extensions: config.extensions,
      });
      set({ status: 'applied', activeSide: 'imported' });
      get().pushToast('success', '已重新应用导入的配置');
    } catch (e) {
      get().pushToast('error', `应用失败：${(e as Error).message}`);
    }
  },

  dismiss: () => {
    // 启动时自带的分享链接只消费一次：用户放弃或校验失败后清掉 hash，
    // 避免刷新反复弹窗（菜单内复制链接写入的 hash 不归属本流程）
    if (get().urlOwned) {
      clearShareHash();
    }
    set({
      status: 'closed',
      source: null,
      preview: null,
      issues: [],
      error: null,
      urlOwned: false,
    });
  },

  pushToast: (kind, message) => {
    const id = ++toastSeq;
    set((state) => ({ toasts: [...state.toasts, { id, kind, message }] }));
    setTimeout(() => get().dismissToast(id), 4000);
  },

  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
