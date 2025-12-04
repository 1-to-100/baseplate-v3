import type { Meta, StoryObj } from '@storybook/nextjs';
import React from 'react';

import { fn } from 'storybook/test';

import { Select } from './Select';

const meta = {
  title: 'Components/Select',
  component: Select,
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
      options: ['outlined'],
    },
    color: {
      control: { type: 'select' },
      options: ['primary', 'neutral', 'danger', 'success', 'warning'],
    },
    disabled: {
      control: 'boolean',
    },
    multiple: {
      control: 'boolean',
    },
    required: {
      control: 'boolean',
    },
  },
  args: {
    onChange: fn(),
    variant: 'outlined',
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

const basicOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
  { value: 'option4', label: 'Option 4' },
  { value: 'option5', label: 'Option 5' },
];

const countryOptions = [
  { value: 'us', label: 'United States' },
  { value: 'ca', label: 'Canada' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' },
  { value: 'au', label: 'Australia' },
];

const categoryOptions = [
  { value: 'tech', label: 'Technology' },
  { value: 'design', label: 'Design' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales', label: 'Sales' },
  { value: 'support', label: 'Support' },
];

export const Default: Story = {
  args: {
    options: basicOptions,
    placeholder: 'Select an option',
  },
};

export const Countries: Story = {
  args: {
    options: countryOptions,
    placeholder: 'Select a country',
  },
};

export const Disabled: Story = {
  args: {
    options: basicOptions,
    disabled: true,
    value: 'option1',
    placeholder: 'This select is disabled',
  },
};

export const Multiple: Story = {
  args: {
    multiple: true,
    options: categoryOptions,
    placeholder: 'Select multiple categories',
    renderValue: (selected) => {
      if (Array.isArray(selected) && selected.length > 0) {
        return `Selected: ${selected.length} items`;
      }
      return 'Select multiple categories';
    },
  },
};

export const AllVariants: Story = {
  args: {
    options: basicOptions,
    placeholder: 'Select an option',
  },
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        alignItems: 'flex-start',
        minWidth: '300px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4>Basic Select</h4>
        <Select options={basicOptions} placeholder='Select an option' />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4>Sizes</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Select size='sm' options={basicOptions} placeholder='Small' />
          <Select size='md' options={basicOptions} placeholder='Medium' />
          <Select size='lg' options={basicOptions} placeholder='Large' />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4>States</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Select options={basicOptions} placeholder='Normal' />
          <Select options={basicOptions} disabled value='option1' placeholder='Disabled' />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4>Multiple Selection</h4>
        <Select
          multiple
          options={categoryOptions}
          placeholder='Select multiple categories'
          renderValue={(selected) => {
            if (Array.isArray(selected) && selected.length > 0) {
              return `Selected: ${selected.length} items`;
            }
            return 'Select multiple categories';
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4>With Disabled Options</h4>
        <Select
          options={[
            { value: 'option1', label: 'Option 1' },
            { value: 'option2', label: 'Option 2', disabled: true },
            { value: 'option3', label: 'Option 3' },
            { value: 'option4', label: 'Option 4', disabled: true },
            { value: 'option5', label: 'Option 5' },
          ]}
          placeholder='Select an option'
        />
      </div>
    </div>
  ),
};
