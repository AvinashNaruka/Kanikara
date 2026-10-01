'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function AdminMode() {
  const pathname = usePathname();

  useEffect(() => {
    document.body.classList.toggle('admin-mode', pathname.startsWith('/admin'));
    return () => document.body.classList.remove('admin-mode');
  }, [pathname]);

  return null;
}
