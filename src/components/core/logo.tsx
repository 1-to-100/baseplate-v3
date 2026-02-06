'use client';

import * as React from 'react';
import Image from 'next/image';
import Box from '@mui/joy/Box';
import { useColorScheme } from '@mui/joy/styles';

import { NoSsr } from '@/components/core/no-ssr';
import { useLogoConfig } from '@/contexts/theme-config-context';

type Color = 'dark' | 'light';

export interface LogoProps {
  color?: Color;
  height?: number;
  width?: number;
  variant?: 'full' | 'icon';
}

export function Logo({
  color = 'dark',
  height,
  width,
  variant = 'full',
}: LogoProps): React.JSX.Element {
  const { colorScheme } = useColorScheme();
  const logoConfig = useLogoConfig();

  // Determine logo URL based on variant and color scheme
  const url = React.useMemo(() => {
    if (variant === 'icon' && logoConfig?.icon) {
      return logoConfig.icon;
    }

    // Use color scheme to determine which logo to show
    if (colorScheme === 'light') {
      return logoConfig?.light || '/assets/logo--light.svg';
    }
    return logoConfig?.dark || '/assets/logo--dark.svg';
  }, [colorScheme, logoConfig, variant]);

  // Use config dimensions or provided dimensions or fallback
  const logoHeight = height ?? logoConfig?.height ?? 60;
  const logoWidth = width ?? logoConfig?.width ?? 60;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        height: logoHeight,
        width: logoWidth,
        position: 'relative',
      }}
    >
      <Image
        alt='logo'
        src={url}
        fill
        style={{
          objectFit: 'contain',
        }}
      />
    </Box>
  );
}

export interface DynamicLogoProps {
  colorDark?: Color;
  colorLight?: Color;
  height?: number;
  width?: number;
  variant?: 'full' | 'icon';
}

export function DynamicLogo({
  colorDark = 'light',
  colorLight = 'dark',
  height,
  width,
  variant = 'full',
  ...props
}: DynamicLogoProps): React.JSX.Element {
  const { colorScheme } = useColorScheme();
  const logoConfig = useLogoConfig();
  const color = colorScheme === 'dark' ? colorDark : colorLight;

  // Use config dimensions or provided dimensions or fallback
  const logoHeight = height ?? logoConfig?.height ?? 60;
  const logoWidth = width ?? logoConfig?.width ?? 60;

  return (
    <NoSsr fallback={<Box sx={{ height: `${logoHeight}px`, width: `${logoWidth}px` }} />}>
      <Logo color={color} height={logoHeight} width={logoWidth} variant={variant} {...props} />
    </NoSsr>
  );
}
