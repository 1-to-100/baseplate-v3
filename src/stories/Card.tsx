import React from 'react';
import Box from '@mui/joy/Box';
import Card from '@mui/joy/Card';
import Typography from '@mui/joy/Typography';
import Avatar from '@mui/joy/Avatar';
import IconButton from '@mui/joy/IconButton';
import { DotsThree } from '@phosphor-icons/react/dist/ssr/DotsThree';
import { PencilSimple as PencilIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { Popper } from '@mui/base/Popper';
import type { ColorPaletteProp, VariantProp } from '@mui/joy';

export interface CardData {
  id: string;
  name: string;
  description?: string;
  userCount: number;
  isDefault?: boolean;
}

export interface CardProps {
  data: CardData[];
  showActions?: boolean;
  onCardClick?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function CardComponent({
  data,
  showActions = true,
  onCardClick,
  onEdit,
  onDelete,
}: CardProps) {
  const [activeCardId, setActiveCardId] = React.useState<string | null>(null);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (anchorEl && !anchorEl.contains(event.target as Node)) {
        handleMenuClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [anchorEl]);

  const handleCardClick = (cardId: string) => {
    if (onCardClick) {
      onCardClick(cardId);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, cardId: string) => {
    event.stopPropagation();
    if (activeCardId === cardId) {
      handleMenuClose();
    } else {
      setAnchorEl(event.currentTarget);
      setActiveCardId(cardId);
    }
  };

  const handleEdit = (cardId: string) => {
    if (onEdit) {
      onEdit(cardId);
    }
    handleMenuClose();
  };

  const handleDelete = (cardId: string) => {
    if (onDelete) {
      onDelete(cardId);
    }
    handleMenuClose();
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setActiveCardId(null);
  };

  const menuItemStyle = {
    padding: '8px 16px',
    fontSize: '16px',
    fontWeight: '400',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    color: 'var(--joy-palette-text-primary)',
    '&:hover': { backgroundColor: 'var(--joy-palette-background-mainBg)' },
  };

  const iconStyle = {
    marginRight: '14px',
  };

  const avatarColors: ColorPaletteProp[] = ['primary', 'neutral', 'danger', 'warning', 'success'];

  const getAvatarProps = (name: string) => {
    const hash = Array.from(name).reduce(
      (acc: number, char: string) => acc + char.charCodeAt(0),
      0
    );
    const colorIndex = hash % avatarColors.length;
    return {
      color: avatarColors[colorIndex],
      variant: 'soft' as VariantProp,
    };
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
        },
        p: 0,
        gap: 2,
        mt: 2,
        maxWidth: '1050px',
      }}
    >
      {data.map((card) => (
        <Card
          key={card.id}
          variant='outlined'
          onClick={() => handleCardClick(card.id)}
          sx={{
            p: '16px',
            borderRadius: '8px',
            border: '1px solid var(--joy-palette-divider)',
            boxShadow: 'none',
            backgroundColor: 'var(--joy-palette-background-body)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '210px',
            cursor: 'pointer',
            '&:hover': {
              borderColor: 'var(--joy-palette-text-secondary)',
            },
            maxWidth: { xs: '100%', sm: '336px' },
            minWidth: { xs: '100%', sm: '236px' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                fontWeight: 'bold',
                fontSize: '16px',
              }}
              {...getAvatarProps(card.name)}
            >
              {card.name
                .split(' ')
                .slice(0, 2)
                .map((n) => n[0]?.toUpperCase() || '')
                .join('')}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                level='title-md'
                sx={{
                  fontWeight: '500',
                  fontSize: '14px',
                  color: 'var(--joy-palette-text-primary)',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  whiteSpace: 'normal',
                  width: '100%',
                  maxWidth: '100%',
                  display: 'block',
                  overflow: 'hidden',
                }}
              >
                {card.name.slice(0, 50)}
              </Typography>
              <Typography
                level='body-xs'
                sx={{
                  mt: 0.5,
                  color: 'var(--joy-palette-text-secondary)',
                  fontWeight: '400',
                  fontSize: '12px',
                }}
              >
                {card.isDefault ? 'Default role' : 'Custom role'}
              </Typography>
            </Box>
            {showActions && (
              <IconButton size='sm' onClick={(event) => handleMenuOpen(event, card.id)}>
                <DotsThree weight='bold' size={22} color='var(--joy-palette-text-secondary)' />
              </IconButton>
            )}
            {showActions && (
              <Popper
                open={activeCardId === card.id && Boolean(anchorEl)}
                anchorEl={anchorEl}
                placement='bottom-start'
                style={{
                  minWidth: '150px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--joy-palette-background-surface)',
                  zIndex: 1300,
                  border: '1px solid var(--joy-palette-divider)',
                }}
              >
                <Box
                  onMouseDown={(event) => {
                    event.preventDefault();
                    handleEdit(card.id);
                  }}
                  sx={menuItemStyle}
                >
                  <PencilIcon fontSize='20px' style={iconStyle} />
                  Edit
                </Box>
                <Box
                  onMouseDown={(event) => {
                    event.preventDefault();
                    handleDelete(card.id);
                  }}
                  sx={{ ...menuItemStyle, color: '#EF4444' }}
                >
                  <TrashIcon fontSize='20px' style={iconStyle} />
                  Delete
                </Box>
              </Popper>
            )}
          </Box>
          <Box
            sx={{
              mt: 1.5,
              flexGrow: 1,
            }}
          >
            <Typography
              level='body-sm'
              sx={{
                color: 'var(--joy-palette-text-secondary)',
                fontWeight: '300',
                fontSize: '14px',
                lineHeight: '1.5',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'normal',
              }}
            >
              {card.description?.slice(0, 89) || ''}
            </Typography>
          </Box>
          <Typography
            level='body-md'
            sx={{
              fontWeight: '400',
              fontSize: '12px',
              color: 'var(--joy-palette-text-secondary)',
              pt: 1.5,
              borderTop: '1px solid var(--joy-palette-divider)',
              mt: 'auto',
            }}
          >
            {card.userCount} people
          </Typography>
        </Card>
      ))}
    </Box>
  );
}
