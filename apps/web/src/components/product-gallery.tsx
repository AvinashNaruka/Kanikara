'use client';

import { useState } from 'react';

export function ProductGallery({
  name,
  images,
  videoUrl,
}: {
  name: string;
  images: string[];
  videoUrl: string | null;
}) {
  const [active, setActive] = useState(images[0] ?? '');
  const [zoomed, setZoomed] = useState(false);

  return (
    <div className="pd-gallery">
      {active ? (
        <button
          className={zoomed ? 'main-img zooming' : 'main-img'}
          onClick={() => setZoomed((value) => !value)}
          type="button"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={name} src={active} />
        </button>
      ) : (
        <div className="image-placeholder">KANIKARA</div>
      )}
      {images.length > 1 ? (
        <div className="pd-thumbs">
          {images.map((image) => (
            <button key={image} onClick={() => { setActive(image); setZoomed(false); }} type="button">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" src={image} />
            </button>
          ))}
        </div>
      ) : null}
      {videoUrl ? (
        <video className="product-video" controls src={videoUrl} />
      ) : null}
    </div>
  );
}
