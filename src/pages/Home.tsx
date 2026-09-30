import { useState } from 'react';
import { KeyboardScene } from '@/components/Keyboard3D/KeyboardScene';
import { ControlPanel } from '@/components/ControlPanel/ControlPanel';
import { ImportDialog } from '@/components/Share/ImportDialog';
import { Toasts } from '@/components/Share/Toasts';
import { useKeyboardPress } from '@/hooks/useKeyboardPress';
import { useConsumeShareUrlOnLoad } from '@/hooks/useConsumeShareUrlOnLoad';
import { KeyZone } from '@/types/keyboard';

export default function Home() {
  const [selectedZone, setSelectedZone] = useState<KeyZone | null>(null);

  useKeyboardPress();
  useConsumeShareUrlOnLoad();

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#0a0a0f]">
      <div className="flex-1 relative">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-transparent to-purple-900/20 pointer-events-none z-10" />
          <div className="absolute inset-0 opacity-30 pointer-events-none z-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px',
              }}
            />
          </div>
          <KeyboardScene selectedZone={selectedZone} />
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <div className="px-6 py-3 bg-gray-900/60 backdrop-blur-xl rounded-full border border-gray-700/30">
            <p className="text-sm text-gray-300 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              按任意键体验3D键盘交互
            </p>
          </div>
        </div>

        <div className="absolute top-6 left-6 z-20">
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-900/40 backdrop-blur-md rounded-xl border border-gray-700/30">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">⌨</span>
            </div>
            <div>
              <div className="text-white font-semibold text-sm">Keyboard Studio</div>
              <div className="text-gray-400 text-xs">3D 键盘定制器</div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-96 flex-shrink-0">
        <ControlPanel
          selectedZone={selectedZone}
          onZoneChange={setSelectedZone}
        />
      </div>

      <ImportDialog />
      <Toasts />
    </div>
  );
}
