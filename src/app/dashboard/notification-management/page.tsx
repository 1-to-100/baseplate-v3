'use client';

import * as React from 'react';
import type { Metadata } from 'next';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import IconButton from '@mui/joy/IconButton';
import Table from '@mui/joy/Table';
import Checkbox from '@mui/joy/Checkbox';
import Button from '@mui/joy/Button';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { DotsThreeVertical } from '@phosphor-icons/react/dist/ssr/DotsThreeVertical';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { PencilSimple as PencilIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { PaperPlaneRight as SendIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneRight';
import { ArrowsDownUp as SortIcon } from '@phosphor-icons/react/dist/ssr/ArrowsDownUp';
import { config } from '@/config';
import DeleteItemModal from '@/components/dashboard/modals/DeleteItemModal';
import { useState, useCallback, useEffect, useRef } from 'react';
import AddEditNotificationModal from '@/components/dashboard/modals/AddEditNotificationModal';
import Pagination from '@/components/dashboard/layout/pagination';
import { Popper } from '@mui/base/Popper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getNotificationTemplates, deleteNotification } from '../../../lib/api/notifications';
import { ApiNotification } from '@/contexts/auth/types';
import CircularProgress from '@mui/joy/CircularProgress';
import SendNotificationsModal from '@/components/dashboard/modals/SendNotificationsModal';
import { useRouter } from 'next/navigation';
import { paths } from '@/paths';
import NotificationDetailsPopover from '@/components/dashboard/notification-management/notification-details-popover';
import { useColorScheme } from '@mui/joy/styles';
import { toast } from '@/components/core/toaster';
import { useGlobalSearch } from '@/hooks/use-global-search';
import { sanitizeNotificationHTML } from '@/lib/sanitize';
import { useUserInfo } from '@/hooks/use-user-info';
import { isSystemAdministrator, isCustomerSuccess } from '@/lib/user-utils';
import { NotAuthorized } from '@/components/core/not-authorized';
import Alert from '@mui/joy/Alert';

interface HttpError extends Error {
  response?: {
    status: number;
  };
}

const metadata = {
  title: `Notification Management | Dashboard | ${config.site.name}`,
} satisfies Metadata;

export default function Page(): React.JSX.Element {
  const { colorScheme } = useColorScheme();
  const { debouncedSearchValue } = useGlobalSearch();
  const { userInfo, isUserLoading } = useUserInfo();
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [anchorEl, setAnchorPopper] = useState<null | HTMLElement>(null);
  const [menuRowIndex, setMenuRowIndex] = useState<number | null>(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [rowsToDelete, setRowsToDelete] = useState<string[]>([]);
  const [popoverAnchorEl, setPopoverAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedNotification, setSelectedNotification] = useState<ApiNotification | null>(null);
  const [openAddNotificationModal, setOpenAddNotificationModal] = useState(false);
  const [notificationToEditId, setNotificationToEditId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<keyof ApiNotification | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [openSentNotificationsModal, setOpenSentNotificationsModal] = useState(false);
  const [addUserAnchorEl, setAddUserAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  const rowsPerPage = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: [
      'notificationTemplates',
      currentPage,
      debouncedSearchValue,
      sortColumn,
      sortDirection,
    ],
    queryFn: async () => {
      const response = await getNotificationTemplates({
        page: currentPage,
        perPage: rowsPerPage,
        search: debouncedSearchValue || undefined,
        orderBy: sortColumn || undefined,
        orderDirection: sortDirection,
      });
      return {
        ...response,
        data: (response.data as ApiNotification[]).map((notification) => ({
          ...notification,
          recipients: {
            customers: notification.Customer?.name || '',
            users: notification.User
              ? `${notification.User.firstName} ${notification.User.lastName} (${notification.User.email})`
              : '',
          },
        })) as ApiNotification[],
      };
    },
    enabled: true,
  });

  const notifications = data?.data || [];
  const totalPages = data?.meta?.lastPage || 1;
  const hasResults = notifications.length > 0;

  useEffect(() => {
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

  // useEffect(() => {}, [popoverAnchorEl, selectedNotification]);

  const handleRowCheckboxChange = (userId: string) => {
    setSelectedRows((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  useEffect(() => {
    const handleClickOutsidePopover = (event: MouseEvent) => {
      if (
        popoverAnchorEl &&
        !popoverAnchorEl.contains(event.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        handleClosePopover();
      }
    };

    document.addEventListener('mousedown', handleClickOutsidePopover);

    return () => {
      document.removeEventListener('mousedown', handleClickOutsidePopover);
    };
  }, [popoverAnchorEl]);

  const handleSelectAllChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasResults) return;
    if (event.target.checked) {
      setSelectedRows(notifications.map((notification) => notification.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleDelete = () => {
    if (selectedRows.length > 0) {
      setRowsToDelete(selectedRows);
      setOpenDeleteModal(true);
    }
  };

  const handleDeleteUser = (userId: string) => {
    setRowsToDelete([userId]);
    setOpenDeleteModal(true);
  };

  const handleDeleteRow = useCallback((userId: string) => {
    setRowsToDelete([userId]);
    setOpenDeleteModal(true);
  }, []);

  const confirmDelete = async () => {
    try {
      setOpenDeleteModal(false);
      await Promise.all(rowsToDelete.map((id) => deleteNotification(id)));

      await queryClient.invalidateQueries({
        queryKey: ['notificationTemplates'],
      });
      toast.success('Notifications has been deleted successfully');

      setRowsToDelete([]);
      setSelectedRows([]);
    } catch (error) {
      console.error('Error deleting notifications:', error);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, index: number) => {
    event.stopPropagation();
    setAnchorPopper(event.currentTarget);
    setMenuRowIndex(index);
  };

  const handleMenuClose = () => {
    setAnchorPopper(null);
    setMenuRowIndex(null);
  };

  const handleClosePopover = () => {
    setSelectedNotification(null);
    setPopoverAnchorEl(null);
  };

  const handleCloseFilter = () => {
    setIsFilterOpen(false);
  };

  const handleOpenDetail = async (event: React.MouseEvent<HTMLElement>, notificationId: string) => {
    event.preventDefault();
    event.persist();
    const targetElement = event.currentTarget;
    setSelectedNotificationId(notificationId as string);
    setPopoverAnchorEl(targetElement);
    handleCloseFilter();
    handleMenuClose();
  };

  const handleEdit = async (userId: string) => {
    try {
      setNotificationToEditId(userId);
      setOpenAddNotificationModal(true);
    } catch (err) {
      // Handle error
    }
    handleMenuClose();
  };

  const handleAddUser = () => {
    setOpenAddNotificationModal(true);
    handleMenuClose();
  };

  const handleCloseAddNotificationModal = () => {
    setOpenAddNotificationModal(false);
    setNotificationToEditId(null);
    queryClient.invalidateQueries({ queryKey: ['notificationTemplates'] });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedRows([]);
  };

  const handleSort = (column: keyof ApiNotification) => {
    const isAsc = sortColumn === column && sortDirection === 'asc';
    const newDirection = isAsc ? 'desc' : 'asc';
    setSortColumn(column);
    setSortDirection(newDirection);
  };

  const notificationsToDelete = rowsToDelete
    .map((userId) => {
      const notification = notifications.find((n) => n.id === userId);
      return notification ? notification.title : undefined;
    })
    .filter((name): name is string => name !== undefined);

  const menuItemStyle = {
    padding: { xs: '6px 12px', sm: '8px 16px' },
    fontSize: { xs: '12px', sm: '14px' },
    fontWeight: '400',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    color: 'var(--joy-palette-text-primary)',
    '&:hover': { backgroundColor: 'var(--joy-palette-background-level1)' },
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addUserAnchorEl && !addUserAnchorEl.contains(event.target as Node)) {
        handleAddUserClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [addUserAnchorEl]);

  const handleAddUserClick = (event: React.MouseEvent<HTMLElement>) => {
    if (addUserAnchorEl) {
      handleAddUserClose();
    } else {
      setAddUserAnchorEl(event.currentTarget);
    }
  };

  const handleAddUserClose = () => {
    setAddUserAnchorEl(null);
  };

  const handleOpenSentNotificationsModal = (notification: ApiNotification) => {
    setOpenSentNotificationsModal(true);
    setSelectedNotification(notification);
  };
  const handleCloseSentNotificationsModal = () => setOpenSentNotificationsModal(false);

  if (isUserLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: { xs: '40vh', sm: '50vh' },
        }}
      >
        <CircularProgress size='lg' />
      </Box>
    );
  }

  const hasAccess = isSystemAdministrator(userInfo) || isCustomerSuccess(userInfo);

  if (!hasAccess) {
    return <NotAuthorized />;
  }

  if (error) {
    const httpError = error as HttpError;
    if (httpError.response?.status === 403) {
      return <NotAuthorized />;
    }
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: { xs: '40vh', sm: '50vh' },
        }}
      >
        <Alert color='danger'>
          Something went wrong while loading the data. Please try again later.
        </Alert>
      </Box>
    );
  }

  const getFirstLine = (html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const nodes = Array.from(tempDiv.childNodes);

    if (nodes.length === 0) return '';

    const firstNode = nodes[0];

    switch (firstNode?.nodeType) {
      case Node.TEXT_NODE:
        return firstNode.textContent?.split('\n')[0] || '';
      case Node.ELEMENT_NODE:
        return (firstNode as Element).outerHTML;
      default:
        return '';
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 'var(--Content-padding)' } }}>
      <Stack spacing={{ xs: 2, sm: 3 }} sx={{ mt: { xs: 6, sm: 0 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 2, sm: 3 }}
          sx={{ alignItems: { xs: 'stretch', sm: 'flex-start' } }}
        >
          <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
            <Typography
              fontSize={{ xs: 'xl2', sm: 'xl3' }}
              level='h1'
              sx={{ wordBreak: 'break-word' }}
            >
              Notification Management
            </Typography>
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 1, sm: 2 }}
            sx={{
              alignItems: { xs: 'stretch', sm: 'center' },
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            {selectedRows.length > 0 ? (
              <Box
                sx={{
                  borderRight: { xs: 'none', sm: '1px solid #E5E7EB' },
                  borderBottom: { xs: '1px solid #E5E7EB', sm: 'none' },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: { xs: 'space-between', sm: 'flex-start' },
                  padding: { xs: '8px 0', sm: '0 16px 0 0' },
                  gap: { xs: 1, sm: '12px' },
                  flexWrap: 'wrap',
                }}
              >
                <Typography level='body-sm'>
                  {selectedRows.length} row{selectedRows.length > 1 ? 's' : ''} selected
                </Typography>
                <Stack direction='row' spacing={1}>
                  <IconButton
                    onClick={handleDelete}
                    sx={{
                      bgcolor: '#FEE2E2',
                      color: '#EF4444',
                      borderRadius: '50%',
                      width: { xs: 28, sm: 32 },
                      height: { xs: 28, sm: 32 },
                      '&:hover': { bgcolor: '#FECACA' },
                    }}
                  >
                    <TrashIcon fontSize='var(--Icon-fontSize)' />
                  </IconButton>
                </Stack>
              </Box>
            ) : null}
            <Button
              variant='outlined'
              color='primary'
              onClick={() => router.push(paths.dashboard.notificationManagement.history)}
              sx={{
                width: { xs: '100%', sm: 'auto' },
                py: { xs: 1, sm: 0.75 },
              }}
            >
              Notification history
            </Button>

            <Button
              variant='solid'
              color='primary'
              onClick={handleAddUser}
              startDecorator={<PlusIcon fontSize='var(--Icon-fontSize)' />}
              sx={{
                width: { xs: '100%', sm: 'auto' },
                py: { xs: 1, sm: 0.75 },
              }}
            >
              Add notification
            </Button>
          </Stack>
        </Stack>

        {isLoading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: { xs: '40vh', sm: '50vh' },
            }}
          >
            <CircularProgress size='lg' />
          </Box>
        ) : (
          <>
            <Box>
              <Box
                sx={{
                  overflowX: 'auto',
                  width: '100%',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: { xs: 'thin', sm: 'auto' },
                  '&::-webkit-scrollbar': {
                    height: { xs: '8px', sm: '12px' },
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'var(--joy-palette-divider)',
                    borderRadius: '4px',
                  },
                }}
              >
                <Table
                  aria-label='user management table'
                  sx={{
                    minWidth: '800px',
                    tableLayout: 'fixed',
                    '& th, & td': {
                      px: { xs: 1, sm: 2 },
                      py: { xs: 1, sm: 1.5 },
                    },
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>
                        <Checkbox
                          checked={hasResults && selectedRows.length === notifications.length}
                          indeterminate={
                            hasResults &&
                            selectedRows.length > 0 &&
                            selectedRows.length < notifications.length
                          }
                          onChange={handleSelectAllChange}
                          disabled={!hasResults}
                        />
                      </th>
                      <th style={{ width: '30%' }} onClick={() => handleSort('title')}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            '& .sort-icon': {
                              opacity: 0,
                              transition: 'opacity 0.2s ease-in-out',
                            },
                            '&:hover .sort-icon': { opacity: 1 },
                          }}
                        >
                          Title
                          <SortIcon
                            className='sort-icon'
                            fontSize='16'
                            color='var(--joy-palette-text-secondary)'
                          />
                        </Box>
                      </th>
                      <th style={{ width: '25%' }} onClick={() => handleSort('message')}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            '& .sort-icon': {
                              opacity: 0,
                              transition: 'opacity 0.2s ease-in-out',
                            },
                            '&:hover .sort-icon': { opacity: 1 },
                          }}
                        >
                          Message
                          <SortIcon
                            className='sort-icon'
                            fontSize='16'
                            color='var(--joy-palette-text-secondary)'
                          />
                        </Box>
                      </th>
                      <th style={{ width: '20%' }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            '& .sort-icon': {
                              opacity: 0,
                              transition: 'opacity 0.2s ease-in-out',
                            },
                            '&:hover .sort-icon': { opacity: 1 },
                          }}
                        >
                          Type
                          <SortIcon
                            className='sort-icon'
                            fontSize='16'
                            color='var(--joy-palette-text-secondary)'
                          />
                        </Box>
                      </th>
                      <th style={{ width: '15%' }} onClick={() => handleSort('createdAt')}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            '& .sort-icon': {
                              opacity: 0,
                              transition: 'opacity 0.2s ease-in-out',
                            },
                            '&:hover .sort-icon': { opacity: 1 },
                          }}
                        >
                          Channel
                          <SortIcon
                            className='sort-icon'
                            fontSize='16'
                            color='var(--joy-palette-text-secondary)'
                          />
                        </Box>
                      </th>
                      <th style={{ width: '60px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifications.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>
                          <Typography level='body-md' color='neutral'>
                            No items found
                          </Typography>
                        </td>
                      </tr>
                    ) : (
                      notifications.map((notification, index) => (
                        <tr
                          key={notification.id}
                          onMouseEnter={() => setHoveredRow(index)}
                          onMouseLeave={() => setHoveredRow(null)}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenDetail(event, notification.id);
                          }}
                        >
                          <td>
                            <Checkbox
                              checked={selectedRows.includes(notification.id)}
                              onChange={(event) => {
                                event.stopPropagation();
                                handleRowCheckboxChange(notification.id);
                              }}
                              onClick={(event) => {
                                event.stopPropagation();
                              }}
                            />
                          </td>
                          <td>
                            <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
                              <Typography
                                sx={{
                                  wordBreak: 'break-all',
                                  fontSize: { xs: '12px', sm: '14px' },
                                }}
                              >
                                {notification.title.slice(0, 85)}
                              </Typography>
                            </Stack>
                          </td>
                          <td>
                            <Box
                              sx={{
                                position: 'relative',
                                display: 'inline-block',
                                fontWeight: 400,
                                color: 'var(--joy-palette-text-secondary)',
                                wordBreak: 'break-all',
                                fontSize: { xs: '12px', sm: '14px' },
                                img: {
                                  maxWidth: '300px',
                                  height: 'auto',
                                },
                                p: {
                                  ...(colorScheme === 'dark' && {
                                    "&[style*='color: black'], &[style*='color: #000'], &[style*='color: rgb(0, 0, 0)'], &[style*='color: rgba(0,0,0'], &[style*='color: rgb(11, 13, 14)']":
                                      {
                                        color: 'var(--joy-palette-text-secondary) !important',
                                      },
                                  }),
                                },
                                span: {
                                  ...(colorScheme === 'dark' && {
                                    "&[style*='color: black'], &[style*='color: #000'], &[style*='color: rgb(0, 0, 0)'], &[style*='color: rgba(0,0,0'], &[style*='color: rgb(11, 13, 14)']":
                                      {
                                        color: 'var(--joy-palette-text-secondary) !important',
                                      },
                                  }),
                                },
                              }}
                            >
                              <div
                                dangerouslySetInnerHTML={{
                                  __html: sanitizeNotificationHTML(
                                    getFirstLine(notification.message)
                                  ),
                                }}
                              />
                            </Box>
                          </td>
                          <td
                            style={{
                              fontWeight: 400,
                              color: 'var(--joy-palette-text-secondary)',
                            }}
                          >
                            <Box
                              sx={{
                                fontSize: { xs: '12px', sm: '14px' },
                                wordBreak: 'break-all',
                                fontWeight: 500,
                                backgroundColor: notification?.type?.includes('in_app')
                                  ? colorScheme === 'dark'
                                    ? 'rgba(79, 70, 229, 0.2)'
                                    : '#E0E7FF'
                                  : notification?.type?.includes('email')
                                    ? colorScheme === 'dark'
                                      ? 'rgba(22, 163, 74, 0.2)'
                                      : '#DCFCE7'
                                    : colorScheme === 'dark'
                                      ? 'rgba(107, 114, 128, 0.2)'
                                      : '#F3F4F6',
                                color: notification?.type?.includes('in_app')
                                  ? colorScheme === 'dark'
                                    ? '#818CF8'
                                    : '#4F46E5'
                                  : notification?.type?.includes('email')
                                    ? colorScheme === 'dark'
                                      ? '#4ADE80'
                                      : '#16A34A'
                                    : colorScheme === 'dark'
                                      ? '#9CA3AF'
                                      : '#6B7280',
                                borderRadius: '12px',
                                padding: '2px 8px',
                                display: 'inline-block',
                              }}
                            >
                              {notification.type?.includes('in_app')
                                ? 'In-App'
                                : notification.type?.includes('email')
                                  ? 'Email'
                                  : notification.type?.[0] || ''}
                            </Box>
                          </td>
                          <td
                            style={{
                              color: 'var(--joy-palette-text-secondary)',
                            }}
                          >
                            <Box
                              sx={{
                                fontSize: { xs: '12px', sm: '14px' },
                                wordBreak: 'break-all',
                                fontWeight: 500,
                                backgroundColor:
                                  notification?.channel === 'info'
                                    ? colorScheme === 'dark'
                                      ? 'rgba(107, 114, 128, 0.2)'
                                      : '#EEEFF0'
                                    : notification?.channel === 'article'
                                      ? colorScheme === 'dark'
                                        ? 'rgba(107, 114, 128, 0.2)'
                                        : '#EEEFF0'
                                      : notification?.channel === 'warning'
                                        ? colorScheme === 'dark'
                                          ? 'rgba(183, 76, 6, 0.2)'
                                          : '#FFF8C5'
                                        : notification?.channel === 'alert'
                                          ? colorScheme === 'dark'
                                            ? 'rgba(211, 35, 47, 0.2)'
                                            : '#FFE9E8'
                                          : colorScheme === 'dark'
                                            ? 'rgba(79, 70, 229, 0.2)'
                                            : '#4F46E5',
                                color:
                                  notification?.channel === 'info'
                                    ? colorScheme === 'dark'
                                      ? '#D1D5DB'
                                      : '#6B7280'
                                    : notification?.channel === 'article'
                                      ? colorScheme === 'dark'
                                        ? '#D1D5DB'
                                        : '#6B7280'
                                      : notification?.channel === 'warning'
                                        ? colorScheme === 'dark'
                                          ? '#FDBA74'
                                          : '#b74c06'
                                        : notification?.channel === 'alert'
                                          ? colorScheme === 'dark'
                                            ? '#FCA5A5'
                                            : '#D3232F'
                                          : colorScheme === 'dark'
                                            ? '#818CF8'
                                            : '#4F46E5',
                                borderRadius: '12px',
                                padding: '2px 8px',
                                display: 'inline-block',
                              }}
                            >
                              {notification.channel}
                            </Box>
                          </td>
                          <td>
                            <IconButton size='sm' onClick={(event) => handleMenuOpen(event, index)}>
                              <DotsThreeVertical
                                weight='bold'
                                size={22}
                                color='var(--joy-palette-text-secondary)'
                              />
                            </IconButton>
                            <Popper
                              open={menuRowIndex === index && Boolean(anchorEl)}
                              anchorEl={anchorEl}
                              placement='bottom-start'
                              style={{
                                minWidth: '150px',
                                borderRadius: '8px',
                                boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                                backgroundColor: 'var(--joy-palette-background-surface)',
                                zIndex: 1300,
                                border: '1px solid var(--joy-palette-divider)',
                              }}
                            >
                              <Box
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  handleOpenDetail(event, notification.id);
                                }}
                                sx={{
                                  ...menuItemStyle,
                                  gap: { xs: '10px', sm: '14px' },
                                }}
                              >
                                <EyeIcon fontSize='20px' />
                                Open detail
                              </Box>
                              <Box
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  handleEdit(notification.id);
                                }}
                                sx={{
                                  ...menuItemStyle,
                                  gap: { xs: '10px', sm: '14px' },
                                }}
                              >
                                <PencilIcon fontSize='20px' />
                                Edit
                              </Box>
                              <Box
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  handleOpenSentNotificationsModal(notification);
                                }}
                                sx={{
                                  ...menuItemStyle,
                                  gap: { xs: '10px', sm: '14px' },
                                }}
                              >
                                <SendIcon fontSize='18px' />
                                Send
                              </Box>
                              <Box
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  handleDeleteUser(notification.id);
                                }}
                                sx={{
                                  ...menuItemStyle,
                                  gap: { xs: '10px', sm: '14px' },
                                }}
                              >
                                <TrashIcon fontSize='20px' />
                                Delete
                              </Box>
                            </Popper>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </Box>

              {notifications.length > 9 && (
                <Pagination
                  totalPages={totalPages}
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                  disabled={!hasResults}
                />
              )}
            </Box>
          </>
        )}
      </Stack>

      <DeleteItemModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        usersToDelete={notificationsToDelete}
        title='Delete notification'
        description='Are you sure you want to delete this notification?'
      />

      <NotificationDetailsPopover
        open={!!popoverAnchorEl}
        onClose={() => {
          setPopoverAnchorEl(null);
          setSelectedNotificationId(null);
        }}
        anchorEl={popoverAnchorEl}
        notificationId={selectedNotificationId || ''}
        ref={popoverRef}
      />

      <AddEditNotificationModal
        open={openAddNotificationModal}
        onClose={handleCloseAddNotificationModal}
        notificationToEditId={notificationToEditId}
      />

      <SendNotificationsModal
        open={openSentNotificationsModal}
        onClose={handleCloseSentNotificationsModal}
        selectedNotificationId={selectedNotification?.id ?? ''}
      />
    </Box>
  );
}
