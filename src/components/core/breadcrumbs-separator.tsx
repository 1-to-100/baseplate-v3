import * as React from 'react';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';

export function BreadcrumbsSeparator(): React.JSX.Element {
  return <CaretRightIcon color="var(--joy-palette-text-primary)" fontSize="var(--joy-fontSize-xs)" />;
}
