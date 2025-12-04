import type { Meta, StoryObj } from '@storybook/nextjs';
import React from 'react';

import { fn } from 'storybook/test';

import { Button } from './Button';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: 'centered',
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs'],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {
    backgroundColor: { control: 'color' },
    variant: {
      control: { type: 'select' },
      options: ['solid', 'outlined', 'plain'],
    },
    color: {
      control: { type: 'select' },
      options: ['primary', 'neutral', 'danger'],
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
  },
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
  args: { onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Primary: Story = {
  args: {
    primary: true,
    label: 'Primary Button',
  },
};

export const Secondary: Story = {
  args: {
    label: 'Secondary Button',
    variant: 'outlined',
  },
};

export const Plain: Story = {
  args: {
    label: 'Plain Button',
    variant: 'plain',
  },
};

export const Danger: Story = {
  args: {
    label: 'Danger Button',
    color: 'danger',
  },
};

export const WithCustomBackground: Story = {
  args: {
    label: 'Custom Background',
    backgroundColor: '#FF6B6B',
  },
};

export const AllVariants: Story = {
  args: {
    label: 'Button',
  },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button label='Primary' primary />
        <Button label='Secondary' variant='outlined' />
        <Button label='Plain' variant='plain' />
      </div>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button label='Danger' color='danger' />
        <Button label='Custom BG' backgroundColor='#FF6B6B' />
      </div>
    </div>
  ),
};
