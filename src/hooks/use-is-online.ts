import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

/** Whether the phone is online, as tracked by TanStack Query's onlineManager (see services/offline-cache). */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
    () => true
  );
}
