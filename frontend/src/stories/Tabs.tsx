import React, { useState } from 'react';
import { Tabs as JoyTabs, TabList, Tab, TabsProps as JoyTabsProps } from '@mui/joy';

export interface TabItem {
  /** Tab value */
  value: string;
  /** Tab label */
  label: string;
  /** Tab icon (optional) */
  icon?: React.ReactNode;
  /** Tab content */
  content?: React.ReactNode;
}

export interface TabsProps extends Omit<JoyTabsProps, 'variant' | 'onChange'> {
  /** Array of tab items */
  tabs: TabItem[];
  /** Default selected tab value */
  defaultValue?: string;
  /** Current selected tab value */
  value?: string;
  /** Tab size */
  size?: 'sm' | 'md' | 'lg';
  /** Tab variant */
  variant?: 'custom';
  /** Whether to show tab content */
  showContent?: boolean;
  /** Optional change handler */
  onChange?: (event: React.SyntheticEvent | null, value: string | number | null) => void;
}

/** Tabs component for user interaction */
export const Tabs = ({
  tabs,
  defaultValue,
  value,
  size = 'md',
  variant = 'custom',
  showContent = true,
  onChange,
  ...props
}: TabsProps) => {
  const [internalValue, setInternalValue] = useState(defaultValue || tabs[0]?.value || '');

  const handleChange = (event: React.SyntheticEvent | null, newValue: string | number | null) => {
    if (value === undefined && typeof newValue === 'string') {
      setInternalValue(newValue);
    }
    onChange?.(event, newValue);
  };

  const currentValue = value !== undefined ? value : internalValue;
  const currentTab = tabs.find(tab => tab.value === currentValue);

  return (
    <div>
      <JoyTabs
        value={currentValue}
        onChange={handleChange}
        size={size}
        variant={variant}
        sx={{
          // Стилі з theme файлу
          backgroundColor: 'transparent',
          '& .MuiTabList-root': {
            backgroundColor: 'var(--joy-palette-background-mainBg)',
            borderRadius: '20px',
            boxShadow: 'none',
            gap: '4px',
            padding: '4px',
          },
          '& .MuiTab-root': {
            borderRadius: '20px',
            flex: '1 1 auto',
            '&:after': { display: 'none' },
            '&.Mui-selected': {
              backgroundColor: 'var(--joy-palette-background-navActiveBg)',
              boxShadow: 'var(--joy-shadow-sm)',
              color: 'var(--joy-palette-text-primary)',
              border: '1px solid var(--joy-palette-divider)',
            },
            '&:not(&.Mui-selected):hover': {
              backgroundColor: 'var(--joy-palette-background-level2)',
            },
          },
        }}
        {...props}
      >
        <TabList>
          {tabs.map((tab) => (
            <Tab key={tab.value} value={tab.value}>
              {tab.icon && <span style={{ marginRight: '8px' }}>{tab.icon}</span>}
              {tab.label}
            </Tab>
          ))}
        </TabList>
      </JoyTabs>
      
      {showContent && currentTab?.content && (
        <div style={{ marginTop: '16px', padding: '16px', border: '1px solid var(--joy-palette-divider)', borderRadius: '8px' }}>
          {currentTab.content}
        </div>
      )}
    </div>
  );
};
