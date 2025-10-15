import type { Meta, StoryObj } from '@storybook/nextjs';
import { TableComponent } from './Table';
import type { TableData } from './Table';

const meta: Meta<typeof TableComponent> = {
  title: 'Components/Table',
  component: TableComponent,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    itemsPerPage: {
      control: { type: 'number', min: 1, max: 50 },
    },
    showPagination: {
      control: { type: 'boolean' },
    },
    title: {
      control: { type: 'text' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof TableComponent>;

const sampleData: TableData[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'Admin',
    status: 'active',
    lastLogin: '2024-01-15 10:30',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    role: 'User',
    status: 'active',
    lastLogin: '2024-01-14 15:45',
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob.johnson@example.com',
    role: 'Manager',
    status: 'inactive',
    lastLogin: '2024-01-10 09:20',
  },
  {
    id: '4',
    name: 'Alice Brown',
    email: 'alice.brown@example.com',
    role: 'User',
    status: 'pending',
    lastLogin: '2024-01-12 14:15',
  },
  {
    id: '5',
    name: 'Charlie Wilson',
    email: 'charlie.wilson@example.com',
    role: 'Admin',
    status: 'active',
    lastLogin: '2024-01-13 11:30',
  },
  {
    id: '6',
    name: 'Diana Davis',
    email: 'diana.davis@example.com',
    role: 'User',
    status: 'active',
    lastLogin: '2024-01-11 16:45',
  },
  {
    id: '7',
    name: 'Edward Miller',
    email: 'edward.miller@example.com',
    role: 'Manager',
    status: 'inactive',
    lastLogin: '2024-01-09 08:30',
  },
  {
    id: '8',
    name: 'Fiona Garcia',
    email: 'fiona.garcia@example.com',
    role: 'User',
    status: 'pending',
    lastLogin: '2024-01-08 13:20',
  },
  {
    id: '9',
    name: 'George Martinez',
    email: 'george.martinez@example.com',
    role: 'Admin',
    status: 'active',
    lastLogin: '2024-01-07 12:15',
  },
  {
    id: '10',
    name: 'Helen Rodriguez',
    email: 'helen.rodriguez@example.com',
    role: 'User',
    status: 'active',
    lastLogin: '2024-01-06 17:30',
  },
  {
    id: '11',
    name: 'Ivan Lee',
    email: 'ivan.lee@example.com',
    role: 'Manager',
    status: 'inactive',
    lastLogin: '2024-01-05 10:45',
  },
  {
    id: '12',
    name: 'Julia White',
    email: 'julia.white@example.com',
    role: 'User',
    status: 'pending',
    lastLogin: '2024-01-04 14:20',
  },
  {
    id: '13',
    name: 'Kevin Taylor',
    email: 'kevin.taylor@example.com',
    role: 'Admin',
    status: 'active',
    lastLogin: '2024-01-03 09:15',
  },
  {
    id: '14',
    name: 'Laura Anderson',
    email: 'laura.anderson@example.com',
    role: 'User',
    status: 'active',
    lastLogin: '2024-01-02 16:30',
  },
  {
    id: '15',
    name: 'Michael Thomas',
    email: 'michael.thomas@example.com',
    role: 'Manager',
    status: 'inactive',
    lastLogin: '2024-01-01 11:45',
  },
];

export const Default: Story = {
  args: {
    data: sampleData,
    itemsPerPage: 10,
    showPagination: true,
    title: 'Users Table',
  },
};

export const SmallData: Story = {
  args: {
    data: sampleData.slice(0, 8),
    itemsPerPage: 3,
    showPagination: true,
    title: 'Small Users Table with Pagination',
  },
};

export const WithoutPagination: Story = {
  args: {
    data: sampleData,
    itemsPerPage: 50,
    showPagination: false,
    title: 'Table Without Pagination',
  },
};

export const CustomItemsPerPage: Story = {
  args: {
    data: sampleData,
    itemsPerPage: 3,
    showPagination: true,
    title: 'Table with 3 Items Per Page',
  },
};
