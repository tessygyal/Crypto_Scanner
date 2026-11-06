import { ComingSoon } from '@/components/coming-soon';
import { Disclaimer } from '@/components/disclaimer';

export default function CheckScreen() {
  return (
    <ComingSoon
      title="Check"
      description="Paste a link, scan a QR code or enter a coin name to see its risk indicators.">
      <Disclaimer />
    </ComingSoon>
  );
}
