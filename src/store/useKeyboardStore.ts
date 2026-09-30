import { create } from 'zustand';
import {
  KeyboardState,
  KeyboardActions,
  LayoutType,
  CaseMaterial,
  KeyZone,
  KeyboardConfig,
} from '@/types/keyboard';
import { DEFAULT_ZONE_COLORS } from '@/data/zones';
import { snapshotConfig, validateKeyboardConfig } from '@/lib/config/shareSchema';

interface KeyboardStore extends KeyboardState, KeyboardActions {}

const initialConfig: KeyboardConfig = {
  layout: '65%',
  caseMaterial: 'aluminum',
  zoneColors: { ...DEFAULT_ZONE_COLORS },
  extensions: {},
};

export const useKeyboardStore = create<KeyboardStore>((set) => ({
  ...initialConfig,
  pressedKeys: new Set<string>(),
  lastImportSnapshot: null,

  setLayout: (layout: LayoutType) => {
    set({ layout });
  },

  setCaseMaterial: (caseMaterial: CaseMaterial) => {
    set({ caseMaterial });
  },

  setZoneColor: (zone: KeyZone, color: string) => {
    set((state) => ({
      zoneColors: {
        ...state.zoneColors,
        [zone]: color,
      },
    }));
  },

  pressKey: (keyId: string) => {
    set((state) => {
      const newPressedKeys = new Set(state.pressedKeys);
      newPressedKeys.add(keyId);
      return { pressedKeys: newPressedKeys };
    });
  },

  releaseKey: (keyId: string) => {
    set((state) => {
      const newPressedKeys = new Set(state.pressedKeys);
      newPressedKeys.delete(keyId);
      return { pressedKeys: newPressedKeys };
    });
  },

  resetColors: () => {
    set({ zoneColors: { ...DEFAULT_ZONE_COLORS } });
  },

  applySharedConfig: (candidate: unknown) => {
    const result = validateKeyboardConfig(candidate);
    if (result.ok === false) {
      return { ok: false, error: result.error };
    }

    let snapshot = snapshotConfig(initialConfig);
    set((state) => {
      snapshot = snapshotConfig(state);
      return {
        ...result.data,
        lastImportSnapshot: snapshot,
      };
    });

    return { ok: true, snapshot };
  },

  restoreConfig: (candidate: unknown) => {
    const result = validateKeyboardConfig(candidate);
    if (result.ok === false) {
      return { ok: false, error: result.error };
    }

    let snapshot = snapshotConfig(initialConfig);
    set((state) => {
      snapshot = snapshotConfig(state);
      return {
        ...result.data,
        lastImportSnapshot: snapshot,
      };
    });

    return { ok: true, snapshot };
  },
}));

export const useLayout = () => useKeyboardStore((state) => state.layout);
export const useCaseMaterial = () => useKeyboardStore((state) => state.caseMaterial);
export const useZoneColors = () => useKeyboardStore((state) => state.zoneColors);
export const usePressedKeys = () => useKeyboardStore((state) => state.pressedKeys);
export const useIsKeyPressed = (keyId: string) =>
  useKeyboardStore((state) => state.pressedKeys.has(keyId));
