import type { NavItemConfig } from '@/types/nav';
import { paths } from '@/paths';
import { SYSTEM_ROLES } from '@/lib/user-utils';

// NOTE: We did not use React Components for Icons, because
//  you may one to get the config from the server.

// NOTE: First level elements are groups.

export interface LayoutConfig {
  navItems: NavItemConfig[];
}

export const layoutConfig: LayoutConfig = {
  navItems: [
    {
      key: 'dashboards',
      title: 'Dashboards',
      items: [
        // { key: 'overview', title: 'Dashboard', href: paths.dashboard.overview, icon: 'grid-four' },
        {
          key: 'management',
          title: 'User Management',
          href: paths.dashboard.userManagement,
          icon: 'user-list',
          permissions: [
            SYSTEM_ROLES.SYSTEM_ADMINISTRATOR,
            SYSTEM_ROLES.CUSTOMER_ADMINISTRATOR,
            SYSTEM_ROLES.MANAGER,
            SYSTEM_ROLES.CUSTOMER_SUCCESS,
          ],
        },
        {
          key: 'team-management',
          title: 'Team Management',
          href: paths.dashboard.teamManagement.list,
          icon: 'team-management',
        },
        {
          key: 'documentation',
          title: 'Documentation',
          href: paths.dashboard.documentation.list,
          icon: 'documentation',
        },
        {
          key: 'segments',
          title: 'Segments',
          href: paths.strategyForge.segments.list,
          icon: 'grid-four',
          matcher: { type: 'startsWith', href: paths.strategyForge.segments.list },
        },
        {
          key: 'companies',
          title: 'Companies',
          href: paths.strategyForge.companies.list,
          icon: 'buildings',
          matcher: { type: 'startsWith', href: paths.strategyForge.companies.list },
        },
        {
          key: 'lists',
          title: 'Lists',
          href: paths.strategyForge.lists.list,
          icon: 'list',
          matcher: { type: 'startsWith', href: paths.strategyForge.lists.list },
        },
        {
          key: 'divider1',
          type: 'divider',
          permissions: [SYSTEM_ROLES.SYSTEM_ADMINISTRATOR, SYSTEM_ROLES.CUSTOMER_SUCCESS],
        },
        {
          key: 'role',
          title: 'Role Settings',
          href: paths.dashboard.roleSettings.list,
          icon: 'role',
          permissions: [SYSTEM_ROLES.SYSTEM_ADMINISTRATOR],
        },
        {
          key: 'customer',
          title: 'Customer Management',
          href: paths.dashboard.customerManagement.list,
          icon: 'customer',
          permissions: [SYSTEM_ROLES.SYSTEM_ADMINISTRATOR, SYSTEM_ROLES.CUSTOMER_SUCCESS],
        },
        {
          key: 'system-users',
          title: 'System Users',
          href: paths.dashboard.systemUsers.list,
          icon: 'user-gear',
          permissions: [SYSTEM_ROLES.SYSTEM_ADMINISTRATOR],
        },
        {
          key: 'notification-management',
          title: 'Notification Management',
          href: paths.dashboard.notificationManagement.list,
          icon: 'bell',
          permissions: [SYSTEM_ROLES.SYSTEM_ADMINISTRATOR, SYSTEM_ROLES.CUSTOMER_SUCCESS],
        },
        {
          key: 'llm-jobs',
          title: 'Jobs',
          href: paths.dashboard.llmJobs.list,
          icon: 'robot',
        },
        // { key: 'test', title: 'User Test', href: paths.dashboard.test.list, icon: 'help' },
        // { key: 'accounting', title: 'Accounting', href: paths.dashboard.crypto, icon: 'accounting' },
        // { key: 'help', title: 'Help Centre', href: paths.dashboard.crypto, icon: 'help' },
      ],
    },
    // {
    //   key: 'general',
    //   title: 'General',
    //   items: [
    //     {
    //       key: 'orders',
    //       title: 'Orders',
    //       icon: 'shopping-cart',
    //       items: [
    //         { key: 'orders', title: 'List Orders', href: paths.dashboard.orders.list },
    //         { key: 'orders:create', title: 'Create Order', href: paths.dashboard.orders.create },
    //         { key: 'orders:details', title: 'Order Details', href: paths.dashboard.orders.details('1') },
    //       ],
    //     },
    //     {
    //       key: 'invoices',
    //       title: 'Invoices',
    //       icon: 'receipt',
    //       items: [
    //         { key: 'invoices', title: 'List Invoices', href: paths.dashboard.invoices.list },
    //         { key: 'invoices:create', title: 'Create Invoice', href: paths.dashboard.invoices.create },
    //         { key: 'invoices:details', title: 'Invoice Details', href: paths.dashboard.invoices.details('1') },
    //       ],
    //     },
    //     {
    //       key: 'products',
    //       title: 'Products',
    //       icon: 'package',
    //       items: [
    //         { key: 'products', title: 'List Products', href: paths.dashboard.products.list },
    //         { key: 'products:create', title: 'Create Product', href: paths.dashboard.products.create },
    //         { key: 'products:details', title: 'Product Details', href: paths.dashboard.products.details('1') },
    //       ],
    //     },
    //     {
    //       key: 'customer',
    //       title: 'Customers',
    //       icon: 'users',
    //       items: [
    //         { key: 'customer', title: 'List Customers', href: paths.dashboard.customers.list },
    //         { key: 'customer:create', title: 'Create Customer', href: paths.dashboard.customers.create },
    //         { key: 'customer:details', title: 'Customer Details', href: paths.dashboard.customers.details('1') },
    //       ],
    //     },
    //     {
    //       key: 'team',
    //       title: 'Team',
    //       href: paths.dashboard.team.members.list,
    //       icon: 'buildings',
    //       matcher: { type: 'startsWith', href: '/dashboard/team' },
    //     },
    //     { key: 'tasks', title: 'Tasks', href: paths.dashboard.tasks, icon: 'kanban' },
    //     {
    //       key: 'settings',
    //       title: 'Settings',
    //       href: paths.dashboard.settings.profile,
    //       icon: 'gear-six',
    //       matcher: { type: 'startsWith', href: paths.dashboard.settings.profile },
    //     },
    //     { key: 'blank', title: 'Blank', href: paths.dashboard.blank, icon: 'file' },
    //   ],
    // },
  ],
};
