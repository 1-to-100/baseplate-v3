import type { Meta, StoryObj } from '@storybook/nextjs';
import { ModalComponent } from './Modal';
import type { ModalData } from './Modal';

const meta: Meta<typeof ModalComponent> = {
  title: 'Components/Modal',
  component: ModalComponent,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    isLoading: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ModalComponent>;

// Приклад даних для модального вікна
const userFormData: ModalData = {
  title: 'Add User',
  fields: [
    {
      name: 'firstName',
      label: 'First Name',
      type: 'text',
      placeholder: 'Enter first name',
      required: true,
    },
    {
      name: 'lastName',
      label: 'Last Name',
      type: 'text',
      placeholder: 'Enter last name',
      required: true,
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      placeholder: 'Enter email',
      required: true,
    },
  ],
};

const loginFormData: ModalData = {
  title: 'Login',
  fields: [
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      placeholder: 'Enter your email',
      required: true,
    },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      placeholder: 'Enter your password',
      required: true,
    },
  ],
};

export const AddUser: Story = {
  args: {
    open: true,
    data: userFormData,
    onSave: (formData) => console.log('Form data:', formData),
    isLoading: false,
  },
};

export const Login: Story = {
  args: {
    open: true,
    data: loginFormData,
    onSave: (formData) => console.log('Form data:', formData),
    isLoading: false,
  },
};

export const Loading: Story = {
  args: {
    open: true,
    data: userFormData,
    onSave: (formData) => console.log('Form data:', formData),
    isLoading: true,
  },
};
