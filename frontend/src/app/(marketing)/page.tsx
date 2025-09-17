import * as React from 'react';
import type { Metadata } from 'next';

import { config } from '@/config';
import { Customers } from '@/components/marketing/home/customers';
import { Faqs } from '@/components/marketing/home/faqs';
import { Features } from '@/components/marketing/home/features';
import { GetStarted } from '@/components/marketing/home/get-started';
import { Hero } from '@/components/marketing/home/hero';
import { Plans } from '@/components/marketing/home/plans';
import { Reviews } from '@/components/marketing/home/reviews';

export const metadata = {
  title: `BasePlate: Redefining SaaS Product Management | ${config.site.name}`,
  description: config.site.description,
} satisfies Metadata;

export default function Page(): React.JSX.Element {
  return (
    <div>
      <Hero />
      {/* <Customers />
      <Features />
      <GetStarted />
      <Reviews />
      <Plans />
      <Faqs /> */}
    </div>
  );
}
