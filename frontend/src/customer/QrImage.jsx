import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** Real, scannable QR code for a ticket number (the gate staff verify it against the server). */
export async function qrDataUrl(value, size = 240) {
  return QRCode.toDataURL(value, { width: size, margin: 1, errorCorrectionLevel: 'M' });
}

export default function QrImage({ value, size = 112, className = '' }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let active = true;
    qrDataUrl(value, size * 3).then((url) => { if (active) setSrc(url); }).catch(() => {});
    return () => { active = false; };
  }, [value, size]);
  if (!src) return <div style={{ width: size, height: size }} className={className} />;
  return <img src={src} alt={`QR code for ticket ${value}`} width={size} height={size} className={className} />;
}
