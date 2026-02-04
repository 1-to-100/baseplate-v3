'use client';

import React from 'react';
import Box from '@mui/joy/Box';
import Popper from '@mui/material/Popper';
import { Plus, UploadSimple } from '@phosphor-icons/react/dist/ssr';
import type { CompanyHeaderMenuProps } from './types';

const menuItemStyle = {
  padding: '8px 16px',
  fontSize: '16px',
  fontWeight: '400',
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
  color: 'var(--joy-palette-text-primary)',
  '&:hover': { backgroundColor: 'var(--joy-palette-background-mainBg)' },
  gap: '14px',
};

export default function CompanyHeaderMenu({
  anchorEl,
  open,
  onClose,
  onAddToList,
  onExport,
  showAddToList = true,
  showExport = true,
  popperRef,
}: CompanyHeaderMenuProps): React.JSX.Element {
  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      placement='bottom-start'
      style={{
        minWidth: '220px',
        borderRadius: '8px',
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
        backgroundColor: 'var(--joy-palette-background-surface)',
        zIndex: 1300,
        border: '1px solid var(--joy-palette-divider)',
      }}
    >
      <Box ref={popperRef}>
        {showAddToList && onAddToList && (
          <Box
            onMouseDown={(event) => {
              event.preventDefault();
              onAddToList();
              onClose();
            }}
            sx={menuItemStyle}
          >
            <Plus size={20} />
            Add to list
          </Box>
        )}
        {showExport && onExport && (
          <Box
            onMouseDown={(event) => {
              event.preventDefault();
              onExport();
              onClose();
            }}
            sx={menuItemStyle}
          >
            <UploadSimple size={20} />
            Export as CSV
          </Box>
        )}
      </Box>
    </Popper>
  );
}
