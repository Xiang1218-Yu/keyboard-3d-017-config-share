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

export interface KeyboardState {
  layout: LayoutType;
  caseMaterial: CaseMaterial;
  zoneColors: Record<KeyZone, string>;
  pressedKeys: Set<string>;
  /**
   * 扩展配置槽：分享 schema 中 data.extensions 的运行时落点。
   * 后续新增配置（背光、灯效、键程曲线……）先放这里，随 schema 版本化演进，
   * 老版本导入时未知扩展仍可原样保留并再次分享。
   */
  extensions: Record<string, unknown>;
}

/** 通过校验的外部配置写入 store 时的补丁形状（原子替换，不含交互态） */
export interface KeyboardConfigPatch {
  layout: LayoutType;
  caseMaterial: CaseMaterial;
  zoneColors: Record<KeyZone, string>;
  extensions?: Record<string, unknown>;
}

export interface KeyboardActions {
  setLayout: (layout: LayoutType) => void;
  setCaseMaterial: (material: CaseMaterial) => void;
  setZoneColor: (zone: KeyZone, color: string) => void;
  setExtension: (key: string, value: unknown) => void;
  pressKey: (keyId: string) => void;
  releaseKey: (keyId: string) => void;
  resetColors: () => void;
  /**
   * 原子导入整份配置。唯一允许外部配置进入 store 的入口：
   * 只接受已经过 share 层校验/清洗的补丁，绝不覆盖 pressedKeys。
   */
  importConfig: (config: KeyboardConfigPatch) => void;
}
