import type { Meta, StoryObj } from '@storybook/nextjs';
import { CardComponent } from './Card';
import type { CardData } from './Card';

const meta: Meta<typeof CardComponent> = {
  title: 'Components/Card',
  component: CardComponent,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    showActions: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof CardComponent>;

const sampleData: CardData[] = [
  {
    id: '1',
    name: 'Administrator',
    description:
      'Full access to all system features and user management capabilities. Can create, edit, and delete users, roles, and system settings.',
    userCount: 5,
    isDefault: true,
  },
  {
    id: '2',
    name: 'Manager',
    description:
      'Can manage team members, view reports, and access project management tools. Limited administrative capabilities.',
    userCount: 12,
    isDefault: false,
  },
  {
    id: '3',
    name: 'User',
    description:
      'Standard user access with basic functionality. Can view assigned projects and update personal information.',
    userCount: 45,
    isDefault: false,
  },
  {
    id: '4',
    name: 'Guest',
    description:
      'Limited access for temporary users. Can only view public information and basic project details.',
    userCount: 8,
    isDefault: false,
  },
  {
    id: '5',
    name: 'Support',
    description:
      'Customer support role with access to help desk tools and user assistance features.',
    userCount: 3,
    isDefault: false,
  },
  {
    id: '6',
    name: 'Analyst',
    description: 'Data analysis role with access to reporting tools and analytics dashboards.',
    userCount: 7,
    isDefault: false,
  },
];

export const Default: Story = {
  args: {
    data: sampleData,
    showActions: true,
  },
};

export const WithoutActions: Story = {
  args: {
    data: sampleData,
    showActions: false,
  },
};

export const SingleCard: Story = {
  args: {
    data: sampleData.slice(0, 1),
    showActions: true,
  },
};
