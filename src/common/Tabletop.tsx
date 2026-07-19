import React from 'react';
import { Volume2, VolumeX, Home, RotateCcw } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { audio } from '../utils/audio';

interface TabletopProps {
  children: React.ReactNode;
  feltColor?: 'green' | 'burgundy';
  title?: string;
  onReturnHome?: () => void;
  onRestart?: () => void;
  extraHeaderActions?: React.ReactNode;
}

export const Tabletop: React.FC<TabletopProps> = ({
  children,
  feltColor = 'green',
  title,
  onReturnHome,
  onRestart,
  extraHeaderActions,
}) => {
  const { soundEnabled, toggleSound } = useAppStore();

  const handleToggleSound = () => {
    toggleSound();
    audio.playCoinClink();
  };

  const handleHomeClick = () => {
    audio.playWoodKnock();
    if (onReturnHome) onReturnHome();
  };

  const handleRestartClick = () => {
    audio.playCardSlide();
    if (onRestart) onRestart();
  };

  const feltClass = feltColor === 'green' ? 'velvet-felt-green' : 'velvet-felt-burgundy';

  return (
    <div className="min-h-screen w-full bg-[#120a06] flex flex-col items-center justify-center p-3 sm:p-6 select-none relative overflow-hidden bg-leather">
      {/* Table border mimicking a premium wooden card table frame */}
      <div className="w-full max-w-6xl w-screen-lg flex flex-col wood-board rounded-3xl overflow-hidden relative border-t-8 border-b-8 border-l-8 border-r-8 border-oak">
        
        {/* Brass corner rivets */}
        <div className="absolute top-2 left-2 w-4 h-4 rounded-full bg-brass border border-black/40 shadow-inner z-10"></div>
        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-brass border border-black/40 shadow-inner z-10"></div>
        <div className="absolute bottom-2 left-2 w-4 h-4 rounded-full bg-brass border border-black/40 shadow-inner z-10"></div>
        <div className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-brass border border-black/40 shadow-inner z-10"></div>

        {/* Top Wood Header Panel */}
        <div className="wood-panel px-4 py-3 sm:px-6 flex items-center justify-between border-b-4 border-walnut z-10">
          <div className="flex items-center gap-3">
            {onReturnHome && (
              <button
                onClick={handleHomeClick}
                className="p-2 rounded bg-walnut hover:bg-oak border border-brass/35 text-brass transition active:scale-95 cursor-pointer shadow-md"
                title="Return Home"
              >
                <Home size={18} />
              </button>
            )}
            {onRestart && (
              <button
                onClick={handleRestartClick}
                className="p-2 rounded bg-walnut hover:bg-oak border border-brass/35 text-brass transition active:scale-95 cursor-pointer shadow-md"
                title="Restart Match"
              >
                <RotateCcw size={18} />
              </button>
            )}
          </div>

          {title && (
            <h1 className="font-serif font-bold text-lg sm:text-2xl text-brass gold-glow tracking-widest uppercase">
              {title}
            </h1>
          )}

          <div className="flex items-center gap-3">
            {extraHeaderActions}
            <button
              onClick={handleToggleSound}
              className="p-2 rounded bg-walnut hover:bg-oak border border-brass/35 text-brass transition active:scale-95 cursor-pointer shadow-md"
              title={soundEnabled ? "Mute Sounds" : "Unmute Sounds"}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>
        </div>

        {/* Felt Surface Area */}
        <div className={`flex-1 min-h-[500px] md:min-h-[600px] ${feltClass} p-4 sm:p-6 relative flex flex-col justify-between`}>
          {children}
        </div>
      </div>
    </div>
  );
};
