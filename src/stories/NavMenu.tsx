import React from 'react';
import Box from '@mui/joy/Box';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import ListItemButton from '@mui/joy/ListItemButton';
import ListItemContent from '@mui/joy/ListItemContent';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import RouterLink from 'next/link';
import type { NavItemConfig } from '../types/nav';
import { icons } from '../components/dashboard/layout/nav-icons';

function SimpleNavItem({
  item,
  depth = 0,
  activeItem,
  onItemClick,
}: {
  item: NavItemConfig;
  depth?: number;
  activeItem: string;
  onItemClick: (key: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const hasChildren = item.items && item.items.length > 0;
  const Icon = item.icon ? icons[item.icon] : null;
  const isActive = activeItem === item.key;

  if (item.type === 'divider') {
    return (
      <ListItem sx={{ '--ListItem-paddingY': 0, minHeight: '20px' }}>
        <ListItemContent>
          <Box sx={{ borderTop: '1px solid var(--joy-palette-divider)', my: 1 }} />
        </ListItemContent>
      </ListItem>
    );
  }

  return (
    <ListItem sx={{ '--ListItem-paddingY': 0 }}>
      <ListItemContent>
        <ListItemButton
          component={hasChildren ? 'a' : RouterLink}
          href={hasChildren ? undefined : item.href}
          onClick={(e) => {
            if (hasChildren) {
              setOpen(!open);
            } else {
              onItemClick(item.key);
            }
          }}
          selected={isActive}
          sx={{
            borderRadius: '20px',
            color: 'var(--joy-palette-text-primary) !important',
            gap: 2,
            p: '12px 16px',
            '&:hover': {
              backgroundColor: 'transparent !important',
            },
            '&.Mui-selected': {
              WebkitBoxAlign: 'center',
              alignItems: 'center',
              borderRadius: '30px',
              color: 'var(--joy-palette-text-primary) !important',
              cursor: 'pointer',
              display: 'flex',
              gap: '16px',
              padding: '12px',
              textDecoration: 'none',
              backgroundColor: 'var(--NavItem-active-background)',
              border: '1px solid var(--joy-palette-divider)',
              '&:hover': {
                backgroundColor: 'var(--NavItem-active-background) !important',
              },
            },
          }}
        >
          {Icon && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Icon fill='currentColor' fontSize='var(--joy-fontSize-xl)' weight='regular' />
            </Box>
          )}
          <Box sx={{ flex: '1 1 auto' }}>
            <Typography
              component='span'
              fontSize='16px'
              fontWeight='400'
              sx={{
                color: 'var(--joy-palette-text-primary) !important',
                fontFamily:
                  "var(--joy-fontFamily-body, 'Be Vietnam Pro', var(--joy-fontFamily-fallback))",
              }}
            >
              {item.title}
            </Typography>
          </Box>
        </ListItemButton>
        {hasChildren && open && (
          <Box sx={{ pl: '20px' }}>
            <Box sx={{ borderLeft: '1px solid var(--joy-palette-neutral-700)', pl: '12px' }}>
              <List sx={{ '--List-gap': '8px', '--List-padding': 0 }}>
                {item.items?.map((childItem) => (
                  <SimpleNavItem
                    key={childItem.key}
                    item={childItem}
                    depth={depth + 1}
                    activeItem={activeItem}
                    onItemClick={onItemClick}
                  />
                ))}
              </List>
            </Box>
          </Box>
        )}
      </ListItemContent>
    </ListItem>
  );
}

export interface NavMenuProps {
  items: NavItemConfig[];
  showLogo?: boolean;
}

export function NavMenu({ items, showLogo = true }: NavMenuProps) {
  const [activeItem, setActiveItem] = React.useState('role');

  const handleItemClick = (key: string) => {
    setActiveItem(key);
  };

  return (
    <Box
      sx={{
        '--NavItem-active-background': 'var(--joy-palette-background-surface)',
        bgcolor: 'var(--joy-palette-background-body)',
        color: 'var(--joy-palette-text-primary)',
        height: '100vh',
        width: '320px',
        position: 'relative',
        p: 3,
        borderRight: '1px solid var(--joy-palette-divider)',
      }}
    >
      <Box sx={{ height: '100%', pb: '197px', position: 'relative', pt: '58px' }}>
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
          <List sx={{ '--List-padding': 0, '--List-gap': '8px' }}>
            {items.map((item) => (
              <SimpleNavItem
                key={item.key}
                item={item}
                activeItem={activeItem}
                onItemClick={handleItemClick}
              />
            ))}
          </List>
        </Box>
      </Box>
    </Box>
  );
}
