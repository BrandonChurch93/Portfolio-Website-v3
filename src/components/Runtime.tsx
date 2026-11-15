'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { installHooks } from '../hooks/site-hooks';
import { lamp } from '../lamp/lamp';
import { clock } from '../world/clock';
import { sweepGone } from '../world/contexts';
import { tiers } from '../world/tier';

// Starts the one clock, the lamp and the tier, and the test hooks when asked for. Renders nothing.
export function Runtime() {
  useEffect(() => {
    installHooks();
    tiers.detect();
    lamp.bind();
    clock.start();
    // The lamp as CSS variables, so interface metal (nav rules, link underlines) can catch it.
    const root = document.documentElement.style;
    return lamp.subscribe((s) => {
      root.setProperty('--lamp-x', `${s.px.toFixed(0)}px`);
      root.setProperty('--lamp-y', `${s.py.toFixed(0)}px`);
    });
  }, []);
  // A page that has been left: whatever WebGL it did not let go is let go here.
  const path = usePathname();
  useEffect(() => { sweepGone(); }, [path]);
  return null;
}
