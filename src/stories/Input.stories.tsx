import type { Meta, StoryObj } from '@storybook/nextjs';
import React from 'react';

import { fn } from 'storybook/test';

import { Input } from './Input';

const meta = {
  title: 'Components/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    variant: {
      control: { type: 'select' },
      options: ['outlined'],
    },
    color: {
      control: { type: 'select' },
      options: ['primary', 'neutral', 'danger', 'success', 'warning'],
    },
    disabled: {
      control: 'boolean',
    },
    error: {
      control: 'boolean',
    },
    required: {
      control: 'boolean',
    },
  },
  args: { 
    onChange: fn(),
    onFocus: fn(),
    onBlur: fn(),
    placeholder: 'Enter text...',
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter your text here',
  },
};

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'Enter your email',
  },
};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter your password',
  },
};

export const Search: Story = {
  args: {
    type: 'search',
    placeholder: 'Search...',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: 'Disabled input',
    placeholder: 'This input is disabled',
  },
};

export const Error: Story = {
  args: {
    error: true,
    value: 'Invalid input',
    placeholder: 'Enter valid text',
  },
};


export const AllVariants: Story = {
  args: {
    placeholder: 'Input',
  },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start', minWidth: '300px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4>Types</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Input type="text" placeholder="Text input" />
          <Input type="email" placeholder="Email input" />
          <Input type="password" placeholder="Password input" />
          <Input type="number" placeholder="Number input" />
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4>States</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Input placeholder="Normal" />
          <Input disabled placeholder="Disabled" />
          <Input error placeholder="Error state" />
        </div>
      </div>
      
    </div>
  ),
};
