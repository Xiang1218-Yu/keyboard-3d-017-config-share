export type LayoutType = '60%' | '65%' | '75%' | 'TKL' | 'Full';

export type KeyZone =
  | 'alphanumeric'
  | 'function'
  | 'navigation'
  | 'numpad'
  | 'modifiers'
  | 'spacebar';

export type CaseMaterial = 'aluminum' | 'plastic' | 'wood' | 'carbon';

export interface KeyConfig {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  row: number;
  col: number;
  zone: KeyZone;
  keyCode?: string;
}

export interface LayoutConfig {
  type: LayoutType;
  name: string;
  description: string;
  keys: KeyConfig[];
  width: number;
  height: number;
}

export interface MaterialConfig {
  id: CaseMaterial;
  name: string;
  color: string;
  roughness: number;
  metalness: number;
}

export interface ZoneConfig {
  id: KeyZone;
  name: string;
  description: string;
  defaultColor: string;
}

/**
 * 保留给后续版本使用的命名空间配置。导入时只允许 JSON 兼容值，
 * 未被当前版本识别的内容会原样保留，但不会参与 3D 场景渲染。
 */
export type KeyboardExtensions = Record<string, unknown>;

export interface KeyboardConfig {
  layout: LayoutType;
  caseMaterial: CaseMaterial;
  zoneColors: Record<KeyZone, string>;
  extensions: KeyboardExtensions;
}

export interface KeyboardState extends KeyboardConfig {
  pressedKeys: Set<string>;
  lastImportSnapshot: KeyboardConfig | null;
}

export interface KeyboardActions {
  setLayout: (layout: LayoutType) => void;
  setCaseMaterial: (material: CaseMaterial) => void;
  setZoneColor: (zone: KeyZone, color: string) => void;
  pressKey: (keyId: string) => void;
  releaseKey: (keyId: string) => void;
  resetColors: () => void;
  applySharedConfig: (config: unknown) => ApplyConfigResult;
  restoreConfig: (config: unknown) => ApplyConfigResult;
}

export interface ApplyConfigResult {
  ok: boolean;
  error?: string;
  snapshot?: KeyboardConfig;
}
