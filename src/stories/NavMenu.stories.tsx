import type { Meta, StoryObj } from '@storybook/nextjs';
import { NavMenu } from './NavMenu';
import type { NavItemConfig } from '../types/nav';

const meta: Meta<typeof NavMenu> = {
  title: 'Components/NavMenu',
  component: NavMenu,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof NavMenu>;

const navItems: NavItemConfig[] = [
  {
    key: 'role',
    title: 'Role Settings',
    href: '/role-settings',
    icon: 'role',
  },
  {
    key: 'customer',
    title: 'Customer Management',
    href: '/customer-management',
    icon: 'customer',
  },
  {
    key: 'system-users',
    title: 'System Users',
    href: '/system-users',
    icon: 'users',
  },
  {
    key: 'notification',
    title: 'Notification Management',
    href: '/notification-management',
    icon: 'bell',
  },
];

export const Default: Story = {
  args: {
    items: navItems,
  },
};
