'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { usePathname } from 'next/navigation';
import Box from '@mui/joy/Box';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import ListItemContent from '@mui/joy/ListItemContent';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { CaretUp as CaretUpIcon } from '@phosphor-icons/react/dist/ssr/CaretUp';

import type { NavItemConfig } from '@/types/nav';
import { paths } from '@/paths';
import { isNavItemActive } from '@/lib/is-nav-item-active';
import { Logo } from '@/components/core/logo';
import { NoSsr } from '@/components/core/no-ssr';
import { useUserInfo } from '@/hooks/use-user-info';
import { ColorSchemeSwitch } from './color-scheme-switch';
import { icons } from './nav-icons';
import {
  isSystemAdministrator,
  isCustomerSuccess,
  isCustomerAdminOrManager,
} from '@/lib/user-utils';

export interface SideNavProps {
  items: NavItemConfig[];
}

export function SideNav({ items }: SideNavProps): React.JSX.Element {
  const pathname = usePathname();
  const { userInfo } = useUserInfo();

  const filteredItems = items.map((group) => ({
    ...group,
    items: group.items?.filter((item) => {
      if (isCustomerSuccess(userInfo)) {
        return item.key !== 'role' && item.key !== 'system-users';
      }

      if (isCustomerAdminOrManager(userInfo)) {
        return (
          item.key !== 'role' &&
          item.key !== 'customer' &&
          item.key !== 'system-users' &&
          item.key !== 'notification-management'
        );
      }

      if (!isSystemAdministrator(userInfo) && !isCustomerSuccess(userInfo)) {
        return (
          item.key !== 'role' &&
          item.key !== 'customer' &&
          item.key !== 'system-users' &&
          item.key !== 'notification-management' &&
          item.key !== 'management'
        );
      }
      return true;
    }),
  }));

  return (
    <Box
      sx={{
        '--SideNav-background': 'var(--joy-palette-background-level1)',
        '--SideNav-color': 'var(--joy-palette-common-white)',
        '--NavItem-color': 'var(--joy-palette-text-primary)',
        '--NavItem-active-background': 'var(--joy-palette-background-level2)',
        '--NavItem-active-color': 'var(--joy-palette-text-primary)',
        '--NavItem-active-icon-color': 'var(--joy-palette-common-white)',
        '--NavItem-open-color': 'var(--joy-palette-common-white)',
        '--NavItem-hover-background': undefined,
        '--NavItem-hover-color': 'var(--joy-palette-common-white)',
        '--NavItem-disabled-background': 'var(--joy-palette-neutral-800)',
        '--NavItem-disabled-color': 'var(--joy-palette-neutral-400)',
        '--NavItem-icon-color': 'var(--joy-palette-neutral-400)',
        bgcolor: 'var(--SideNav-background)',
        color: 'var(--SideNav-color)',
        display: { xs: 'none', lg: 'block' },
        height: '100%',
        left: 0,
        position: 'fixed',
        p: 'var(--Layout-gap)',
        top: 0,
        width: 'var(--SideNav-width)',
        zIndex: 'var(--SideNav-zIndex)',
      }}
    >
      <Box
        sx={{
          height: '100%',
          pb: '197px',
          position: 'relative',
          pt: '58px',
        }}
      >
        <Stack
          sx={{
            left: '-15px',
            position: 'absolute',
            top: '15px',
            width: '100%',
            zIndex: 2,
          }}
        >
          <div>
            <Box
              component={RouterLink}
              href={paths.home}
              sx={{ display: 'inline-block', fontSize: 0 }}
            >
              <Logo color='light' height={40} width={180} />
            </Box>
          </div>
          {/* <WorkspaceSwitch /> */}
        </Stack>
        <Box
          component='nav'
          sx={{
            height: '100%',
            overflowY: 'auto',
            pb: '20px',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {renderNavGroups({ items: filteredItems, pathname })}
        </Box>
        <Box
          sx={{
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            left: 0,
            position: 'absolute',
            width: '100%',
            zIndex: 1,
            '&:before': {
              background: 'linear-gradient(to top, var(--SideNav-background), transparent)',
              content: '" "',
              height: '40px',
              left: 0,
              pointerEvents: 'none',
              position: 'absolute',
              top: '-40px',
              width: '100%',
            },
          }}
        >
          <NoSsr>
            <ColorSchemeSwitch />
          </NoSsr>
          {/* <CurrentUser /> */}
        </Box>
      </Box>
    </Box>
  );
}

function hasActiveChildOrGrandchild(items: NavItemConfig[] | undefined, pathname: string): boolean {
  if (!items?.length) return false;

  return items.some((item) => {
    if (item.href && pathname.startsWith(item.href)) {
      return true;
    }

    return Boolean(
      item.items?.some((subItem) => subItem.href && pathname.startsWith(subItem.href))
    );
  });
}

function renderNavGroups({
  items,
  pathname,
}: {
  items: NavItemConfig[];
  pathname: string;
}): React.JSX.Element {
  const children = items.flatMap((curr): React.ReactNode[] => {
    // If the group has an icon, render it as an expandable menu item instead of a header
    if (curr.icon && curr.items) {
      const forceOpen = hasActiveChildOrGrandchild(curr.items, pathname);
      const { key, ...navItemProps } = curr;

      return [
        <NavItem depth={0} forceOpen={forceOpen} pathname={pathname} {...navItemProps} key={key}>
          {renderNavItems({
            depth: 1,
            pathname,
            items: curr.items,
          })}
        </NavItem>,
      ];
    }

    // Support top-level single-link items (not groups)
    if (curr.href && !curr.items) {
      const { items: _items, key, ...navItemProps } = curr;
      return [<NavItem depth={0} pathname={pathname} {...navItemProps} key={key} />];
    }

    // Render as a group header
    return [
      <ListItem
        key={curr.key}
        sx={{
          '--ListItem-paddingRight': 0,
          '--ListItem-paddingLeft': 0,
          '--ListItem-paddingY': 0,
        }}
      >
        <ListItemContent>
          {curr.title ? (
            <Box sx={{ py: '12px' }}>
              <Typography fontSize='16px' fontWeight='lg' textColor='common.black'>
                {curr.title}
              </Typography>
            </Box>
          ) : null}
          {renderNavItems({
            depth: 0,
            pathname,
            items: curr.items,
          })}
        </ListItemContent>
      </ListItem>,
    ];
  });

  return <List sx={{ '--List-padding': 0 }}>{children}</List>;
}

function renderNavItems({
  depth = 0,
  pathname,
  items = [],
}: {
  depth: number;
  pathname: string;
  items?: NavItemConfig[];
}): React.JSX.Element {
  const children = items.reduce(
    (acc: React.ReactNode[], curr: NavItemConfig): React.ReactNode[] => {
      const { items: childItems, key, ...item } = curr;

      const forceOpen = childItems
        ? Boolean(
            childItems.find((childItem) => childItem.href && pathname.startsWith(childItem.href))
          )
        : false;

      acc.push(
        <NavItem depth={depth} forceOpen={forceOpen} key={key} pathname={pathname} {...item}>
          {childItems ? renderNavItems({ depth: depth + 1, pathname, items: childItems }) : null}
        </NavItem>
      );

      return acc;
    },
    []
  );

  return (
    <List data-depth={depth} sx={{ '--List-gap': '8px', '--List-padding': 0 }}>
      {children}
    </List>
  );
}

interface NavItemProps extends Omit<NavItemConfig, 'items'> {
  children?: React.ReactNode;
  depth: number;
  forceOpen?: boolean;
  pathname: string;
  type?: 'divider';
}

function NavItem({
  children,
  depth,
  disabled,
  external,
  forceOpen = false,
  href,
  icon,
  matcher,
  pathname,
  title,
  type,
}: NavItemProps): React.JSX.Element {
  const [open, setOpen] = React.useState<boolean>(forceOpen);
  const active = isNavItemActive({ disabled, external, href, matcher, pathname });
  const Icon = icon ? icons[icon] : null;
  const ExpandIcon = open ? CaretUpIcon : CaretDownIcon;
  const isBranch = Boolean(children && !href);
  const isLeaf = Boolean(!children && href);
  const showChildren = Boolean(children && open);
  const { userInfo } = useUserInfo();

  if (type === 'divider') {
    const shouldShowDivider = isSystemAdministrator(userInfo) || isCustomerSuccess(userInfo);
    if (!shouldShowDivider) {
      return <></>;
    }
    return (
      <ListItem
        data-depth={depth}
        sx={{
          '--ListItem-paddingRight': 0,
          '--ListItem-paddingLeft': 0,
          '--ListItem-paddingY': 0,
          userSelect: 'none',
          minHeight: '20px',
        }}
      >
        <ListItemContent>
          <Box
            sx={{
              borderTop: '1px solid var(--joy-palette-divider)',
              my: 1,
            }}
          />
        </ListItemContent>
      </ListItem>
    );
  }

  if (!(isBranch || isLeaf)) {
    throw new Error('Children or href required');
  }

  return (
    <ListItem
      data-depth={depth}
      sx={{
        '--ListItem-paddingRight': 0,
        '--ListItem-paddingLeft': 0,
        '--ListItem-paddingY': 0,
        userSelect: 'none',
      }}
    >
      <ListItemContent>
        <Box
          {...(isBranch
            ? {
                component: 'a',
                onClick: (): void => {
                  setOpen(!open);
                },
              }
            : {
                component: RouterLink,
                href,
                target: external ? '_blank' : '',
                rel: external ? 'noreferrer' : '',
              })}
          sx={{
            alignItems: 'center',
            borderRadius: 'var(--joy-radius-sm)',
            color: 'var(--NavItem-color)',
            cursor: 'pointer',
            display: 'flex',
            gap: 2,
            p: '12px',
            textDecoration: 'none',
            ...(disabled && {
              bgcolor: 'var(--NavItem-disabled-background)',
              color: 'var(--NavItem-disabled-color)',
              cursor: 'not-allowed',
            }),
            ...(active && {
              bgcolor: 'var(--NavItem-active-background)',
              borderRadius: '30px',
              color: 'var(--joy-palette-text-primary)',
            }),
            ...(open && { color: 'var(--NavItem-open-color)' }),
          }}
        >
          {Icon ? (
            <Box
              sx={{
                alignItems: 'center',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Icon
                fill={
                  active ? 'var(--joy-palette-text-primary)' : 'var(--joy-palette-text-primary)'
                }
                fontSize='var(--joy-fontSize-xl)'
                weight={forceOpen || active ? 'regular' : 'thin'}
              />
            </Box>
          ) : null}
          <Box sx={{ flex: '1 1 auto' }}>
            <Typography component='span' fontSize='16px' fontWeight='400' textColor='inherit'>
              {title}
            </Typography>
          </Box>
          {isBranch ? <ExpandIcon fontSize='var(--joy-fontSize-sm)' weight='bold' /> : null}
        </Box>
        {showChildren ? (
          <Box sx={{ pl: '20px' }}>
            <Box
              sx={{
                borderLeft: '1px solid var(--joy-palette-neutral-700)',
                pl: '12px',
              }}
            >
              {children}
            </Box>
          </Box>
        ) : null}
      </ListItemContent>
    </ListItem>
  );
}
