'use client';

import * as React from 'react';
import { Popper } from '@mui/base/Popper';

export interface PopperMenuProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose?: () => void;
  placement?:
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'top-start'
    | 'top-end'
    | 'bottom-start'
    | 'bottom-end'
    | 'left-start'
    | 'left-end'
    | 'right-start'
    | 'right-end';
  children: React.ReactNode;
  minWidth?: string | number;
  style?: React.CSSProperties;
}

export interface MenuItemProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onClick' | 'onMouseDown'
> {
  icon?: React.ReactNode;
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseDown?: (event: React.MouseEvent<HTMLDivElement>) => void;
  sx?: React.CSSProperties;
}

export function PopperMenu({
  open,
  anchorEl,
  onClose,
  placement = 'bottom-start',
  children,
  minWidth = '150px',
  style,
}: PopperMenuProps) {
  const popperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open || !onClose) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        anchorEl &&
        !anchorEl.contains(event.target as Node) &&
        popperRef.current &&
        !popperRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, anchorEl]);

  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      placement={placement}
      style={{
        minWidth,
        borderRadius: '8px',
        backgroundColor: 'var(--joy-palette-background-surface)',
        zIndex: 1300,
        border: '1px solid var(--joy-palette-divider)',
        ...style,
      }}
    >
      <div ref={popperRef}>{children}</div>
    </Popper>
  );
}

export function MenuItem({
  icon,
  children,
  danger = false,
  disabled = false,
  onClick,
  onMouseDown,
  sx,
  ...props
}: MenuItemProps) {
  return (
    <div
      role='menuitem'
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onMouseDown={onMouseDown}
      style={{
        padding: '8px 16px',
        fontSize: '16px',
        fontWeight: 400,
        display: 'flex',
        alignItems: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: danger ? 'rgb(239, 68, 68)' : 'var(--joy-palette-text-primary)',
        gap: '12px',
        opacity: disabled ? 0.5 : 1,
        ...sx,
      }}
      {...props}
    >
      {icon ? <div style={{ display: 'flex', alignItems: 'center' }}>{icon}</div> : null}
      {children}
    </div>
  );
}
