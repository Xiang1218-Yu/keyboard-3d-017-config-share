import { useEffect, useRef } from 'react';
import { extractConfigFromLocation } from '@/share/shareLink';
import { useImportDialogStore } from '@/store/useImportDialogStore';

/**
 * 应用启动时消费地址栏里的分享链接（#k=...）。
 * - 链接只进入「预览」状态，绝不自动写入 store / 场景
 * - 仅在挂载时尝试一次，避免路由切换或热更新重复弹窗
 * - 用户确认后才清理 hash；取消或失败时保留 hash，刷新可重试
 */
export function useConsumeShareUrlOnLoad() {
  const triedRef = useRef(false);

  useEffect(() => {
    if (triedRef.current) return;
    triedRef.current = true;

    let cancelled = false;
    void (async () => {
      let jsonText: string | null = null;
      try {
        jsonText = await extractConfigFromLocation();
      } catch {
        // 解码失败也弹出失败弹窗，给出明确原因
        if (!cancelled) {
          const store = useImportDialogStore.getState();
          store.openImport('url-onload');
          useImportDialogStore.setState({
            status: 'invalid',
            error: {
              severity: 'error',
              code: 'SHARE_URL_DECODE_FAILED',
              message: '分享链接解析失败，链接可能已损坏或被截断',
            },
            issues: [],
          });
        }
        return;
      }

      if (cancelled || !jsonText) return;

      const store = useImportDialogStore.getState();
      store.openImport('url-onload');
      await store.ingestText(jsonText, 'url-onload');
    })();

    return () => {
      cancelled = true;
    };
  }, []);
}
