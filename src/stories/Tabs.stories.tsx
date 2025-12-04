import type { Meta, StoryObj } from '@storybook/nextjs';
import React from 'react';

import { fn } from 'storybook/test';

import { Tabs } from './Tabs';

const meta = {
  title: 'Components/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    variant: {
      control: { type: 'select' },
      options: ['custom'],
    },
    showContent: {
      control: 'boolean',
    },
  },
  args: {
    onChange: fn(),
    showContent: true,
    variant: 'custom',
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tabs: [
      { value: 'tab1', label: 'Tab 1', content: 'Content for Tab 1' },
      { value: 'tab2', label: 'Tab 2', content: 'Content for Tab 2' },
      { value: 'tab3', label: 'Tab 3', content: 'Content for Tab 3' },
    ],
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    tabs: [
      { value: 'tab1', label: 'Small Tab 1', content: 'Small tab content 1' },
      { value: 'tab2', label: 'Small Tab 2', content: 'Small tab content 2' },
    ],
  },
};

export const AllVariants: Story = {
  args: {
    tabs: [
      { value: 'tab1', label: 'Tab 1', content: 'Content 1' },
      { value: 'tab2', label: 'Tab 2', content: 'Content 2' },
    ],
  },
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        alignItems: 'flex-start',
        minWidth: '400px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4>Basic Tabs</h4>
        <Tabs
          tabs={[
            { value: 'tab1', label: 'Tab 1', content: 'Basic tab content 1' },
            { value: 'tab2', label: 'Tab 2', content: 'Basic tab content 2' },
            { value: 'tab3', label: 'Tab 3', content: 'Basic tab content 3' },
          ]}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4>Sizes</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <strong>Small:</strong>
            <Tabs
              size='sm'
              tabs={[
                { value: 'small1', label: 'Small 1', content: 'Small tab 1' },
                { value: 'small2', label: 'Small 2', content: 'Small tab 2' },
              ]}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4>Without Content</h4>
        <Tabs
          showContent={false}
          tabs={[
            { value: 'tab1', label: 'Tab 1' },
            { value: 'tab2', label: 'Tab 2' },
            { value: 'tab3', label: 'Tab 3' },
          ]}
        />
      </div>
    </div>
  ),
};
