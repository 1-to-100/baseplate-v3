import * as React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Strategy-forge uses the (scalekit) shell (single header/sidenav from parent layout).
 * This layout only passes through children to avoid duplicating the header.
 */
export default function Layout({ children }: LayoutProps): React.JSX.Element {
  return <>{children}</>;
}
