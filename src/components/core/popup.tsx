'use client';

import * as React from 'react';
import { ClickAwayListener } from '@mui/base/ClickAwayListener';
import { Popper } from '@mui/base/Popper';
import type { PopperProps } from '@mui/base/Popper';
import Sheet from '@mui/joy/Sheet';
import { styled } from '@mui/joy/styles';
import type { SxProps } from '@mui/system/styleFunctionSx';

const PopupRoot = styled(Popper)({ zIndex: 'var(--joy-zIndex-popup)', width: '100%' });

export const PopupContent = styled(Sheet)({
  border: '1px solid var(--joy-palette-neutral-outlinedBorder)',
  borderRadius: 'var(--joy-radius-lg)',
  boxShadow:
    'var(--joy-shadowRing, 0 0 #000),0px 2px 8px -2px rgba(var(--joy-shadowChannel, 21 21 21) / var(--joy-shadowOpacity, 0.04)),0px 6px 12px -2px rgba(var(--joy-shadowChannel, 21 21 21) / var(--joy-shadowOpacity, 0.04))',
});

interface PopupProps extends Pick<PopperProps, 'anchorEl' | 'disablePortal' | 'modifiers' | 'open' | 'placement'> {
  children: React.ReactElement;
  onClose?: () => void;
  sx?: SxProps;
}

export function Popup({ children, onClose, ...props }: PopupProps): React.JSX.Element {
  return (
    <PopupRoot {...props} role={undefined}>
      <ClickAwayListener
        onClickAway={(): void => {
          onClose?.();
        }}
      >
        {children}
      </ClickAwayListener>
    </PopupRoot>
  );
}
