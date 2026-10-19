import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.ts';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#F2F6FA] bg-[#1A2533] border border-[#F87171]/40 rounded-lg shadow-xl"
    >
      <WifiOff className="w-3.5 h-3.5 text-[#F87171]" />
      <span>Offline Mode — Serving cached metadata from local atlas</span>
    </div>
  );
};
