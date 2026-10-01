'use client';

import type { Banner } from '@kanikara/contracts';
import Link from 'next/link';
import { useState } from 'react';

export function HeroCarousel({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);
  if (!banners.length) return null;
  const current = banners[index % banners.length];

  return (
    <section className="hero-carousel">
      <div className="hc-track">
        {banners.map((banner, bannerIndex) => (
          <div className={bannerIndex === index ? 'hc-slide active' : 'hc-slide'} key={banner.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={banner.title ?? ''} src={banner.imageUrl} />
          </div>
        ))}
        {current?.title ? (
          <div className="hc-caption">
            <h2>{current.title}</h2>
            {current.subtitle ? <p>{current.subtitle}</p> : null}
            {current.linkUrl ? (
              <Link className="btn btn-gold" href={current.linkUrl.startsWith('http') ? current.linkUrl : '/shop'}>
                {current.ctaText || 'Shop now'}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
      {banners.length > 1 ? (
        <>
          <button className="hc-arrow hc-prev" onClick={() => setIndex((value) => (value - 1 + banners.length) % banners.length)} type="button">‹</button>
          <button className="hc-arrow hc-next" onClick={() => setIndex((value) => (value + 1) % banners.length)} type="button">›</button>
          <div className="hc-dots">
            {banners.map((banner, bannerIndex) => (
              <button className={bannerIndex === index ? 'hc-dot on' : 'hc-dot'} key={banner.id} onClick={() => setIndex(bannerIndex)} type="button" />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
