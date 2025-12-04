import type { Meta, StoryObj } from '@storybook/nextjs';
import { FormControls } from './FormControls';
import { useState } from 'react';

const meta: Meta<typeof FormControls> = {
  title: 'Components/FormControls',
  component: FormControls,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['radio', 'checkbox'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    color: {
      control: { type: 'select' },
      options: ['primary', 'neutral', 'danger', 'success', 'warning'],
    },
    disabled: {
      control: { type: 'boolean' },
    },
    error: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof FormControls>;

const radioOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

const checkboxOptions = [
  { value: 'feature1', label: 'Feature 1' },
  { value: 'feature2', label: 'Feature 2' },
  { value: 'feature3', label: 'Feature 3' },
  { value: 'feature4', label: 'Feature 4' },
];

function FormControlsWrapper(props: React.ComponentProps<typeof FormControls>) {
  const [value, setValue] = useState<string | string[]>(props.type === 'radio' ? '' : []);

  const handleChange = (newValue: string | string[]) => {
    setValue(newValue);
  };

  return <FormControls {...props} value={value} onChange={handleChange} />;
}

export const RadioButtons: Story = {
  render: (args) => <FormControlsWrapper {...args} />,
  args: {
    type: 'radio',
    label: 'Select an option',
    options: radioOptions,
    helperText: 'Choose one option from the list',
  },
};

export const Checkboxes: Story = {
  render: (args) => <FormControlsWrapper {...args} />,
  args: {
    type: 'checkbox',
    label: 'Select features',
    options: checkboxOptions,
    helperText: 'You can select multiple features',
  },
};

export const DisabledRadioButtons: Story = {
  render: (args) => <FormControlsWrapper {...args} />,
  args: {
    type: 'radio',
    label: 'Select an option',
    options: radioOptions,
    disabled: true,
    helperText: 'This field is disabled',
  },
};

export const DisabledCheckboxes: Story = {
  render: (args) => <FormControlsWrapper {...args} />,
  args: {
    type: 'checkbox',
    label: 'Select features',
    options: checkboxOptions,
    disabled: true,
    helperText: 'This field is disabled',
  },
};
