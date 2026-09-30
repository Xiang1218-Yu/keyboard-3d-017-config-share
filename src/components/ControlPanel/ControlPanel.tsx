import { Keyboard, Info, Mouse, MousePointer2 } from 'lucide-react';
import { useState } from 'react';
import { LayoutSelector } from './LayoutSelector';
import { MaterialSelector } from './MaterialSelector';
import { ZoneColorPicker } from './ZoneColorPicker';
import { ShareMenu } from '@/components/Share/ShareMenu';
import { ImportButton } from '@/components/Share/ImportButton';
import { KeyZone } from '@/types/keyboard';
import { useLayout } from '@/store/useKeyboardStore';
import { LAYOUT_CONFIGS } from '@/data/layouts';

interface ControlPanelProps {
  selectedZone: KeyZone | null;
  onZoneChange: (zone: KeyZone | null) => void;
}

export function ControlPanel({ selectedZone, onZoneChange }: ControlPanelProps) {
  const [showTips, setShowTips] = useState(true);
  const layout = useLayout();
  const layoutConfig = LAYOUT_CONFIGS[layout];

  return (
    <div className="h-full flex flex-col bg-gray-900/80 backdrop-blur-xl border-l border-gray-800/50">
      <div className="p-6 border-b border-gray-800/50">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
            <Keyboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">DIY 键盘工坊</h1>
            <p className="text-xs text-gray-400">定制你的专属键盘</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/40 rounded-lg">
          <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <span className="text-xs text-gray-300">
            当前布局: <span className="text-indigo-300 font-medium">{layoutConfig.name}</span>
            <span className="text-gray-500 ml-1">({layoutConfig.keys.length} 键)</span>
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <LayoutSelector />
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-700/50 to-transparent" />
        <MaterialSelector />
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-700/50 to-transparent" />
        <ZoneColorPicker selectedZone={selectedZone} onZoneChange={onZoneChange} />
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-700/50 to-transparent" />
        <div>
          <h3 className="text-sm font-medium text-gray-200 mb-3">分享与导入</h3>
          <div className="flex gap-2">
            <div className="flex-1">
              <ShareMenu />
            </div>
            <div className="flex-1">
              <ImportButton />
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500 leading-relaxed">
            支持分享链接、JSON 文件与剪贴板；导入的配置会先经过版本与字段校验，确认后才会应用。
          </p>
        </div>
      </div>

      <div className="p-4 border-t border-gray-800/50">
        <button
          onClick={() => setShowTips(!showTips)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-800/30 rounded-lg transition-all"
        >
          <span className="flex items-center gap-2">
            <Mouse className="w-4 h-4" />
            操作提示
          </span>
          <span className="text-gray-500">{showTips ? '收起' : '展开'}</span>
        </button>
        
        {showTips && (
          <div className="mt-3 space-y-2 animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-start gap-2 px-3 py-2 bg-gray-800/30 rounded-lg">
              <MousePointer2 className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-gray-400">
                <div className="text-gray-300 mb-0.5">3D 视图操作</div>
                <div>左键拖动旋转 · 滚轮缩放 · 右键平移</div>
              </div>
            </div>
            <div className="flex items-start gap-2 px-3 py-2 bg-gray-800/30 rounded-lg">
              <Keyboard className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-gray-400">
                <div className="text-gray-300 mb-0.5">按键交互</div>
                <div>点击 3D 按键或使用物理键盘体验按动效果</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
