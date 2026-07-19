import React from 'react';
import { EyeOff } from 'lucide-react';
import { audio } from '../utils/audio';

interface DevicePassShieldProps {
  nextPlayerName: string;
  onReveal: () => void;
}

export const DevicePassShield: React.FC<DevicePassShieldProps> = ({
  nextPlayerName,
  onReveal,
}) => {
  const handleClick = () => {
    audio.playWoodKnock();
    onReveal();
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0d0603] p-4 text-center">
      <div className="wood-panel border-4 border-brass rounded-2xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-brass/10 border border-brass flex items-center justify-center text-brass shadow-lg animate-pulse">
          <EyeOff size={32} />
        </div>
        
        <div>
          <h2 className="font-serif font-bold text-xl sm:text-2xl text-brass tracking-wider uppercase mb-2">
            Pass the Device
          </h2>
          <div className="w-24 h-0.5 bg-brass/30 mx-auto mb-4"></div>
          <p className="text-ivory/80 text-sm sm:text-base">
            Please hand this device to
          </p>
          <p className="text-brass font-bold text-xl sm:text-2xl mt-1 tracking-wide">
            {nextPlayerName}
          </p>
          <p className="text-ivory/50 text-xs mt-3 italic">
            Keep your cards hidden from opponent eyes.
          </p>
        </div>

        <button
          onClick={handleClick}
          className="mt-4 w-full px-6 py-3 bg-brass hover:bg-[#d4b473] text-walnut font-bold rounded-lg border border-brass/50 shadow-lg active:scale-95 transition cursor-pointer font-serif tracking-wider uppercase text-sm sm:text-base"
        >
          I am {nextPlayerName}
        </button>
      </div>
    </div>
  );
};
