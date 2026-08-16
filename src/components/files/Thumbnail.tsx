import { useState } from 'react';
import { isImage } from '../../utils/format';
import { IconFile, IconImage } from '../icons';

interface ThumbnailProps {
  name: string;
  mimeType: string;
  url?: string | null;
  size?: 'sm' | 'lg';
}

/**
 * Image thumbnail with a graceful fall-back.
 *
 * A file can be an image whose thumbnail isn't generated yet (status pending or
 * processing) or whose URL has expired — both land on the placeholder icon
 * rather than a broken-image glyph.
 */
export function Thumbnail({ name, mimeType, url, size = 'sm' }: ThumbnailProps) {
  const [broken, setBroken] = useState(false);
  const showImage = url && isImage(mimeType) && !broken;

  return (
    <span className={`thumb${size === 'lg' ? ' thumb-lg' : ''}`}>
      {showImage ? (
        <img
          src={url}
          alt={`Preview of ${name}`}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      ) : isImage(mimeType) ? (
        <IconImage size={size === 'lg' ? 22 : 17} />
      ) : (
        <IconFile size={size === 'lg' ? 22 : 17} />
      )}
    </span>
  );
}
