import { create } from 'zustand';
import { KeyboardState, KeyboardActions, LayoutType, CaseMaterial, KeyZone } from '@/types/keyboard';
import { DEFAULT_ZONE_COLORS } from '@/data/zones';

interface KeyboardStore extends KeyboardState, KeyboardActions {}

export const useKeyboardStore = create<KeyboardStore>((set) => ({
  layout: '65%',
  caseMaterial: 'aluminum',
  zoneColors: { ...DEFAULT_ZONE_COLORS },
  pressedKeys: new Set<string>(),
  extensions: {},

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

  setExtension: (key: string, value: unknown) => {
    set((state) => ({
      extensions: { ...state.extensions, [key]: value },
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

  importConfig: (config) => {
    // 最后一道防线：即便调用方绕过了 share 层，也只接受结构完整的补丁。
    // 注意绝不触碰 pressedKeys，物理按键交互态不应被分享数据影响。
    if (
      typeof config.layout !== 'string' ||
      typeof config.caseMaterial !== 'string' ||
      typeof config.zoneColors !== 'object' ||
      config.zoneColors === null
    ) {
      throw new Error('invalid config patch rejected');
    }
    set(() => ({
      layout: config.layout,
      caseMaterial: config.caseMaterial,
      zoneColors: { ...config.zoneColors },
      extensions: config.extensions ? { ...config.extensions } : {},
    }));
  },
}));

export const useLayout = () => useKeyboardStore((state) => state.layout);
export const useCaseMaterial = () => useKeyboardStore((state) => state.caseMaterial);
export const useZoneColors = () => useKeyboardStore((state) => state.zoneColors);
export const useExtensions = () => useKeyboardStore((state) => state.extensions);
export const usePressedKeys = () => useKeyboardStore((state) => state.pressedKeys);
export const useIsKeyPressed = (keyId: string) =>
  useKeyboardStore((state) => state.pressedKeys.has(keyId));
