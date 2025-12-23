import * as React from 'react';
import Breadcrumbs from '@mui/joy/Breadcrumbs';

import { BreadcrumbsItem } from '@/components/core/breadcrumbs-item';
import { BreadcrumbsSeparator } from '@/components/core/breadcrumbs-separator';

type VisualStyleGuideBreadcrumbsProps = {
  guideName: string;
};

export default function VisualStyleGuideBreadcrumbs({
  guideName,
}: VisualStyleGuideBreadcrumbsProps): React.JSX.Element {
  return (
    <Breadcrumbs separator={<BreadcrumbsSeparator />}>
      <BreadcrumbsItem href="/style-guide/">Style Guide</BreadcrumbsItem>
      <BreadcrumbsItem type="end">{guideName}</BreadcrumbsItem>
    </Breadcrumbs>
  );
}

