import { QRCodeSVG } from 'qrcode.react';
import { MapPin } from 'lucide-react';

interface LocationQRProps {
  address: string;
  size?: number;
  showLabel?: boolean;
}

export const LocationQR = ({ address, size = 80, showLabel = false }: LocationQRProps) => {
  // Generate Google Maps URL from address
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative p-2 rounded-lg bg-background border border-border">
        <QRCodeSVG
          value={mapsUrl}
          size={size}
          level="M"
          includeMargin={false}
        />
      </div>
      {showLabel && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span>Scan for location</span>
        </div>
      )}
    </div>
  );
};
