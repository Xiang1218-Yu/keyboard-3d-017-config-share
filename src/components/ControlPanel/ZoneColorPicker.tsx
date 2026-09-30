import { Palette, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useZoneColors } from '@/store/useKeyboardStore';
import { useKeyboardStore } from '@/store/useKeyboardStore';
import { ZONE_LIST, ZONE_CONFIGS } from '@/data/zones';
import { PRESET_COLORS } from '@/data/materials';
import { KeyZone } from '@/types/keyboard';

interface ZoneColorPickerProps {
  selectedZone: KeyZone | null;
  onZoneChange: (zone: KeyZone | null) => void;
}

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;
const SHORT_HEX_COLOR_RE = /^#[0-9a-f]{3}$/i;

function normalizeHexColor(value: string): string | null {
  if (HEX_COLOR_RE.test(value)) return value.toLowerCase();
  if (SHORT_HEX_COLOR_RE.test(value)) {
    return `#${value
      .slice(1)
      .split('')
      .map((char) => char + char)
      .join('')}`.toLowerCase();
  }
  return null;
}

export function ZoneColorPicker({ selectedZone, onZoneChange }: ZoneColorPickerProps) {
  const zoneColors = useZoneColors();
  const setZoneColor = useKeyboardStore((state) => state.setZoneColor);
  const resetColors = useKeyboardStore((state) => state.resetColors);
  const [colorDraft, setColorDraft] = useState(zoneColors[selectedZone ?? 'alphanumeric'] ?? '#3b82f6');

  useEffect(() => {
    if (selectedZone) {
      setColorDraft(zoneColors[selectedZone]);
    }
  }, [selectedZone, zoneColors]);

  const commitDraftColor = () => {
    if (!selectedZone) return;
    const normalized = normalizeHexColor(colorDraft);
    if (normalized) {
      setZoneColor(selectedZone, normalized);
      setColorDraft(normalized);
      return;
    }
    setColorDraft(zoneColors[selectedZone]);
  };

  const handleColorSelect = (color: string) => {
    if (selectedZone) {
      setZoneColor(selectedZone, color);
    }
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    if (selectedZone) {
      setZoneColor(selectedZone, color);
      setColorDraft(color);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-medium text-gray-200">键帽颜色</h3>
        </div>
        <button
          onClick={resetColors}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-lg transition-all"
        >
          <RotateCcw className="w-3 h-3" />
          重置
        </button>
      </div>

      <div className="mb-4">
        <div className="text-xs text-gray-400 mb-2">选择分区</div>
        <div className="flex flex-wrap gap-1.5">
          {ZONE_LIST.map((zone) => {
            const config = ZONE_CONFIGS[zone as KeyZone];
            const isSelected = selectedZone === zone;
            const currentColor = zoneColors[zone as KeyZone];
            
            return (
              <button
                key={zone}
                onClick={() => onZoneChange(isSelected ? null : (zone as KeyZone))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all duration-200 ${
                  isSelected
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                    : 'bg-gray-800/60 text-gray-300 border border-gray-700/50 hover:bg-gray-700/60 hover:border-gray-600/50'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-sm border border-gray-600/50"
                  style={{ backgroundColor: currentColor }}
                />
                {config.name}
              </button>
            );
          })}
        </div>
      </div>

      {selectedZone && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-3 bg-gray-800/40 rounded-xl border border-gray-700/30">
            <div className="text-xs text-gray-400 mb-2">
              当前分区: <span className="text-purple-300">{ZONE_CONFIGS[selectedZone].name}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">自定义颜色</div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={zoneColors[selectedZone]}
                    onChange={handleCustomColorChange}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={colorDraft}
                    onChange={(e) => setColorDraft(e.target.value)}
                    onBlur={commitDraftColor}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    className={`flex-1 px-3 py-2 bg-gray-900/60 border rounded-lg text-sm text-white font-mono focus:outline-none ${
                      normalizeHexColor(colorDraft)
                        ? 'border-gray-700/50 focus:border-purple-500/50'
                        : 'border-red-500/60 focus:border-red-500'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-400 mb-2">预设颜色</div>
            <div className="grid grid-cols-9 gap-1.5">
              {PRESET_COLORS.map((color) => {
                const isActive = zoneColors[selectedZone]?.toLowerCase() === color.toLowerCase();
                return (
                  <button
                    key={color}
                    onClick={() => handleColorSelect(color)}
                    className={`aspect-square rounded-md border-2 transition-all duration-150 hover:scale-110 ${
                      isActive
                        ? 'border-white shadow-lg'
                        : 'border-transparent hover:border-gray-500'
                    }`}
                    style={{
                      backgroundColor: color,
                      boxShadow: isActive ? `0 0 12px ${color}80` : 'none',
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!selectedZone && (
        <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30 text-center">
          <div className="text-gray-500 text-sm">选择一个分区开始定制颜色</div>
        </div>
      )}
    </div>
  );
}
