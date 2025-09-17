import * as React from 'react';
import { useTheme } from '@mui/joy/styles';
import type { Breakpoint } from '@mui/system/createTheme';

// https://github.com/mui/material-ui/issues/23885#issuecomment-1475450249
export function useCurrentBreakpoint(): Breakpoint {
  const globalTheme = useTheme();

  const mqs: [Breakpoint, string][] = globalTheme.breakpoints.keys.map((key, index, breakpoints) => {
    let mq = '';
    if (index === breakpoints.length - 1) {
      mq = globalTheme.breakpoints.up(key);
    } else {
      mq = index + 1 < breakpoints.length
        ? globalTheme.breakpoints.between(key, breakpoints[index + 1] as Breakpoint)
        : globalTheme.breakpoints.up(key);
    }
    return [key, mq.replace(/^@media(?: ?)/m, '')];
  });

  const [currentBreakpoint, setCurrentBreakpoint] = React.useState<Breakpoint>(() => {
    return 'xs' as Breakpoint;
    // const bp = mqs.find(([, mq]) => window.matchMedia(mq).matches);
    // return bp ? bp[0] : 'xs';
  });

  React.useEffect((): (() => void) => {
    function handleCurrentBreakpointChange(key: Breakpoint, e: MediaQueryListEvent): void {
      if (e.matches) {
        setCurrentBreakpoint(key);
      }
    }

    const handlers: [string, (e: MediaQueryListEvent) => void][] = mqs.map(([key, mq]) => {
      const handler = (e: MediaQueryListEvent): void => {
        handleCurrentBreakpointChange(key, e);
      };
      return [mq, handler];
    });

    handlers.forEach(([mq, handler]) => {
      window.matchMedia(mq).addEventListener('change', handler);
    });

    return (): void => {
      handlers.forEach(([mq, handler]) => {
        window.matchMedia(mq).removeEventListener('change', handler);
      });
    };
  }, [mqs]);

  return currentBreakpoint;
}
