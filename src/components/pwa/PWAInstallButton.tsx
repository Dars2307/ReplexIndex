import React, { useState } from 'react';
import { Download, Share2, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall.ts';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#0B1018] bg-[#52D5C5] hover:bg-[#75E5D7] rounded-md transition-colors whitespace-nowrap shrink-0"
        aria-label="Install Replex App"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#A4B3C3] hover:text-[#F2F6FA] bg-[#1A2533] border border-[#223044] rounded-md transition-colors whitespace-nowrap shrink-0"
          aria-label="Install Replex on iOS"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Add to Home</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-xl bg-[#131B27] border border-[#223044] p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#1E2B3C]">
                <h3 className="text-sm font-semibold text-[#F2F6FA]">Install Replex on iPhone / iPad</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-[#718296] hover:text-[#F2F6FA]"
                  aria-label="Close installation guide"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-xs text-[#A4B3C3] leading-relaxed">
                <p>1. Tap the <strong className="text-[#F2F6FA]">Share</strong> icon at the bottom of Safari.</p>
                <p>2. Scroll down the sheet and select <strong className="text-[#F2F6FA]">Add to Home Screen</strong>.</p>
                <p>3. Tap <strong className="text-[#52D5C5]">Add</strong> in the top right corner to install the standalone atlas.</p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full py-2 text-xs font-medium bg-[#1A2533] hover:bg-[#223044] text-[#F2F6FA] border border-[#2D3E54] rounded-md transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
