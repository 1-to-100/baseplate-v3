import * as React from 'react';
import { Breadcrumbs } from '@mui/joy';
import { BreadcrumbsItem } from '@/components/core/breadcrumbs-item';
import { BreadcrumbsSeparator } from '@/components/core/breadcrumbs-separator';
import Typography from '@mui/joy/Typography';

type WrittenStyleGuideBreadcrumbsProps = {
  guideName: string;
};

export default function WrittenStyleGuideBreadcrumbs({
  guideName,
}: WrittenStyleGuideBreadcrumbsProps): React.JSX.Element {
  return (
    <Breadcrumbs separator={<BreadcrumbsSeparator />}>
      <BreadcrumbsItem href='/style-guide/'>Founder&apos;s Desk</BreadcrumbsItem>
      <BreadcrumbsItem href='/style-guide/'>Style Guide</BreadcrumbsItem>
      <Typography>{guideName || 'Written Style'}</Typography>
    </Breadcrumbs>
  );
}
