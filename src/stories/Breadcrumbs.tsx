import React from 'react';
import { Breadcrumbs as JoyBreadcrumbs, Link, Typography } from '@mui/joy';

export interface BreadcrumbItem {
  /** Breadcrumb label */
  label: string;
  /** Breadcrumb link (optional for last item) */
  href?: string;
  /** Whether this item is clickable */
  clickable?: boolean;
  /** Custom icon for the breadcrumb */
  icon?: React.ReactNode;
}

export interface BreadcrumbsProps {
  /** Array of breadcrumb items */
  items: BreadcrumbItem[];
  /** Separator between breadcrumbs */
  separator?: React.ReactNode;
  /** Custom size */
  size?: 'sm' | 'md' | 'lg';
  /** Custom color */
  color?: 'primary' | 'neutral' | 'danger' | 'success' | 'warning';
  /** Whether to show the last item as clickable */
  lastItemClickable?: boolean;
}

/** Breadcrumbs component for navigation */
export const Breadcrumbs = ({
  items,
  separator = '/',
  size = 'md',
  color = 'primary',
  lastItemClickable = false,
}: BreadcrumbsProps) => {
  const renderBreadcrumbItem = (item: BreadcrumbItem, index: number, isLast: boolean) => {
    const isClickable = item.clickable !== undefined ? item.clickable : (isLast ? lastItemClickable : true);
    
    if (isClickable && item.href) {
      return (
        <Link
          key={index}
          href={item.href}
          color={color}
          underline="hover"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: size === 'sm' ? '0.875rem' : size === 'lg' ? '1.125rem' : '1rem',
            color: 'var(--joy-palette-text-primary)',
            '&:hover': {
              color: `var(--joy-palette-${color}-500)`,
            },
          }}
        >
          {item.icon && <span>{item.icon}</span>}
          {item.label}
        </Link>
      );
    }

    return (
      <Typography
        key={index}
        level={size === 'sm' ? 'body-sm' : size === 'lg' ? 'body-lg' : 'body-md'}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          color: isLast ? 'var(--joy-palette-text-primary)' : 'var(--joy-palette-text-secondary)',
          fontWeight: isLast ? 600 : 400,
        }}
      >
        {item.icon && <span>{item.icon}</span>}
        {item.label}
      </Typography>
    );
  };

  return (
    <JoyBreadcrumbs
      separator={separator}
      sx={{
        padding: 0,
        '& .MuiBreadcrumbs-separator': {
          color: 'var(--joy-palette-text-secondary)',
          fontSize: size === 'sm' ? '0.875rem' : size === 'lg' ? '1.125rem' : '1rem',
        },
        '& .MuiBreadcrumbs-expandButton': {
          color: `var(--joy-palette-${color}-500)`,
          '&:hover': {
            backgroundColor: `var(--joy-palette-${color}-50)`,
          },
        },
      }}
    >
      {items.map((item, index) => 
        renderBreadcrumbItem(item, index, index === items.length - 1)
      )}
    </JoyBreadcrumbs>
  );
};
