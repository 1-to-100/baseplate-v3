import type { Meta, StoryObj } from '@storybook/nextjs';
import React from 'react';
import { Breadcrumbs } from '@mui/joy';
import { BreadcrumbsItem } from '@/components/core/breadcrumbs-item';
import { BreadcrumbsSeparator } from '@/components/core/breadcrumbs-separator';

const meta = {
  title: 'Components/Breadcrumbs',
  component: Breadcrumbs,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof Breadcrumbs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Breadcrumbs separator={<BreadcrumbsSeparator />}>
      <BreadcrumbsItem href='/' type='start' />
      <BreadcrumbsItem href='/dashboard'>Dashboard</BreadcrumbsItem>
      <BreadcrumbsItem type='end'>Customer Management</BreadcrumbsItem>
    </Breadcrumbs>
  ),
};

export const WithMultipleLevels: Story = {
  render: () => (
    <Breadcrumbs separator={<BreadcrumbsSeparator />}>
      <BreadcrumbsItem href='/' type='start' />
      <BreadcrumbsItem href='/dashboard'>Dashboard</BreadcrumbsItem>
      <BreadcrumbsItem href='/dashboard/customers'>Customers</BreadcrumbsItem>
      <BreadcrumbsItem type='end'>Customer Details</BreadcrumbsItem>
    </Breadcrumbs>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        alignItems: 'flex-start',
        minWidth: '400px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4>Default</h4>
        <Breadcrumbs separator={<BreadcrumbsSeparator />}>
          <BreadcrumbsItem href='/' type='start' />
          <BreadcrumbsItem href='/dashboard'>Dashboard</BreadcrumbsItem>
          <BreadcrumbsItem type='end'>Page</BreadcrumbsItem>
        </Breadcrumbs>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4>With Multiple Levels</h4>
        <Breadcrumbs separator={<BreadcrumbsSeparator />}>
          <BreadcrumbsItem href='/' type='start' />
          <BreadcrumbsItem href='/dashboard'>Dashboard</BreadcrumbsItem>
          <BreadcrumbsItem href='/dashboard/section'>Section</BreadcrumbsItem>
          <BreadcrumbsItem type='end'>Current Page</BreadcrumbsItem>
        </Breadcrumbs>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4>Simple Navigation</h4>
        <Breadcrumbs separator={<BreadcrumbsSeparator />}>
          <BreadcrumbsItem href='/' type='start' />
          <BreadcrumbsItem type='end'>Home</BreadcrumbsItem>
        </Breadcrumbs>
      </div>
    </div>
  ),
};
