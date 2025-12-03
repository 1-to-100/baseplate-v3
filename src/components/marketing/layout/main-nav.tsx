'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { usePathname } from 'next/navigation';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import IconButton from '@mui/joy/IconButton';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { List as ListIcon } from '@phosphor-icons/react/dist/ssr/List';

import type { NavItemConfig } from '@/types/nav';
import { paths } from '@/paths';
import { isNavItemActive } from '@/lib/is-nav-item-active';
import { Logo } from '@/components/core/logo';
import { NoSsr } from '@/components/core/no-ssr';
import { DynamicLogo } from '@/components/core/logo';

import { ColorSchemeSwitch } from './color-scheme-switch';
import { MobileNav } from './mobile-nav';

export function MainNav(): React.JSX.Element {
  const [openNav, setOpenNav] = React.useState<boolean>(false);
  const pathname = usePathname();

  return (
    <React.Fragment>
      <Box
        component="header"
        sx={{ left: 0, p: '20px', position: 'fixed', top: 0, width: '100%', zIndex: 'var(--MainNav-zIndex)' }}
      >
        <Box
          sx={{
            bgcolor: 'var(--joy-palette-neutral-950)',
            borderRadius: 'var(--joy-radius-xl)',
            boxShadow: 'var(--joy-shadow-sm)',
            display: 'grid',
            // gridTemplateColumns: { xs: '1fr 1fr', md: '240px 1fr 240px' },
            maxWidth: 'lg',
            minHeight: '56px',
            mx: 'auto',
            outline: '4px solid rgba(255, 255, 255, 0.12)',
            px: '16px',
            py: '8px',
          }}
        >
          {/* <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Box component={RouterLink} href={paths.home} sx={{ display: 'inline-block', fontSize: 0 }}>
              <DynamicLogo  colorDark="light" colorLight="dark" height={24} width={82} />
            </Box>
          </Stack> */}
          <Stack
            direction="row"
            spacing={2}
            sx={{ display: { xs: 'none', md: 'flex' },  justifyContent: 'center', gap: '20px' }}
          >
            <NavItem href={paths.home} pathname={pathname} title="Home" />
            <NavItem external href="https://1to100.com/baseplate/" pathname={pathname} title="Documentation" />
            <NavItem external href="https://github.com/1-to-100/baseplate" pathname={pathname} title="Sources" />
            <NavItem href={paths.dashboard.overview} pathname={pathname} title="Application" />
          </Stack>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'flex-end', display: { md: 'none' } }}>
            {/* <NoSsr>
              <ColorSchemeSwitch />
            </NoSsr> */}
            <IconButton
              onClick={(): void => {
                setOpenNav(true);
              }}
              sx={{
                color: 'var(--joy-palette-common-white)',
                display: { md: 'none' },
                '&:hover': { bgcolor: 'var(--joy-palette-neutral-800)', color: 'var(--joy-palette-common-white)' },
              }}
            >
              <ListIcon fontSize="var(--Icon-fontSize)" weight="bold" />
            </IconButton>
            {/* <Button
              component="a"
              href={paths.purchase}
              sx={{
                bgcolor: 'var(--joy-palette-common-white)',
                color: 'var(--joy-palette-neutral-900)',
                display: { xs: 'none', md: 'flex' },
                '&:hover': { bgcolor: 'var(--joy-palette-neutral-50)' },
              }}
              target="_blank"
            >
              Purchase
            </Button> */}
          </Stack>
        </Box>
      </Box>
      <MobileNav
        onClose={(): void => {
          setOpenNav(false);
        }}
        open={openNav}
      />
    </React.Fragment>
  );
}

interface NavItemProps extends Omit<NavItemConfig, 'key'> {
  pathname: string;
}

function NavItem({ disabled, external, href, pathname, title }: NavItemProps): React.JSX.Element {
  const active = isNavItemActive({ disabled, external, href, pathname });

  return (
    <Typography
      {...(href && { component: RouterLink, href, ...(external && { target: '_blank', rel: 'noreferrer' }) })}
      sx={{
        alignItems: 'center',
        color: 'var(--joy-palette-common-white)',
        fontSize: 'sm',
        fontWeight: 'md',
        display: 'inline-flex',
        px: '8px',
        textDecoration: 'none',
        ...(active && { color: 'var(--joy-palette-neutral-500)' }),
        '&:hover': { ...(!active && { color: 'var(--joy-palette-neutral-500)' }) },
      }}
    >
      <span>{title}</span>
    </Typography>
  );
}
