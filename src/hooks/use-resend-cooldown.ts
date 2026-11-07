import { useCallback, useEffect, useState } from 'react';

import { RESEND_COOLDOWN_SECONDS, secondsUntilResend } from '@/utils/auth-errors';

/**
 * Countdown for the "Resend email" button. Call `start()` after an email is
 * sent; `secondsLeft` ticks down to 0, when the button can be used again.
 */
export function useResendCooldown(cooldown = RESEND_COOLDOWN_SECONDS) {
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const secondsLeft = secondsUntilResend(sentAt, now, cooldown);

  useEffect(() => {
    if (secondsLeft === 0) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const start = useCallback(() => {
    const t = Date.now();
    setSentAt(t);
    setNow(t);
  }, []);

  return { secondsLeft, start };
}
