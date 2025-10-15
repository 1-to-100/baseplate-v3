import React from 'react';
import Box from '@mui/joy/Box';
import Table from '@mui/joy/Table';
import Sheet from '@mui/joy/Sheet';
import Typography from '@mui/joy/Typography';
import Checkbox from '@mui/joy/Checkbox';
import IconButton from '@mui/joy/IconButton';
import Tooltip from '@mui/joy/Tooltip';
import { DotsThreeVertical } from '@phosphor-icons/react/dist/ssr/DotsThreeVertical';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { PencilSimple as PencilIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { TrashSimple } from '@phosphor-icons/react/dist/ssr/TrashSimple';
import { Popper } from '@mui/base/Popper';
import Pagination from '../components/dashboard/layout/pagination';

export interface TableData {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  lastLogin: string;
}

export interface TableProps {
  data: TableData[];
  itemsPerPage?: number;
  showPagination?: boolean;
  title?: string;
}

export function TableComponent({ 
  data, 
  itemsPerPage = 10, 
  showPagination = true,
  title = 'Users Table'
}: TableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [disabled, setDisabled] = React.useState(false);
  const [selectedRows, setSelectedRows] = React.useState<string[]>([]);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [menuRowIndex, setMenuRowIndex] = React.useState<number | null>(null);

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = data.slice(startIndex, endIndex);

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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRowCheckboxChange = (rowId: string) => {
    setSelectedRows((prev) =>
      prev.includes(rowId)
        ? prev.filter((id) => id !== rowId)
        : [...prev, rowId]
    );
  };

  const handleSelectAllChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedRows(currentData.map((row) => row.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, index: number) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setMenuRowIndex(index);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuRowIndex(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'danger';
      case 'pending':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const menuItemStyle = {
    padding: { xs: "6px 12px", sm: "8px 16px" },
    fontSize: { xs: "12px", sm: "14px" },
    fontWeight: "400",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    color: "var(--joy-palette-text-primary)",
    "&:hover": { backgroundColor: "var(--joy-palette-background-mainBg)" },
  };

  return (
    <Box sx={{ width: '100%', mx: 'auto' }}>
      {title && (
        <Typography level="h4" sx={{ mb: 2, color: 'var(--joy-palette-text-primary)' }}>
          {title}
        </Typography>
      )}
      
      <Sheet
        sx={{
          width: '100%',
          borderRadius: 'sm',
          overflow: 'auto',
          minHeight: 0,
        }}
      >
        <Table
          aria-label="basic table"
          sx={{
            '--TableCell-headBackground': 'var(--joy-palette-background-level1)',
            '--Table-headerUnderlineThickness': '1px',
            '--TableRow-hoverBackground': 'var(--joy-palette-background-level1)',
            '--TableCell-paddingY': '12px',
            '--TableCell-paddingX': '16px',
            '--TableCell-color': 'var(--joy-palette-text-primary)',
            '& .MuiTypography-root': {
              color: 'var(--joy-palette-text-primary) !important',
              fontWeight: '300 !important',
            },
          }}
        >
          <thead>
            <tr>
              <th style={{ width: '60px' }}>
                <Checkbox
                  checked={currentData.length > 0 && selectedRows.length === currentData.length}
                  indeterminate={selectedRows.length > 0 && selectedRows.length < currentData.length}
                  onChange={handleSelectAllChange}
                  disabled={currentData.length === 0}
                />
              </th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th style={{ width: '60px' }}></th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((row, index) => (
              <tr key={row.id}>
                <td>
                  <Checkbox
                    checked={selectedRows.includes(row.id)}
                    onChange={() => handleRowCheckboxChange(row.id)}
                  />
                </td>
                <td>
                  <Typography level="body-sm" fontWeight="lg">
                    {row.name}
                  </Typography>
                </td>
                <td>
                  <Typography level="body-sm">
                    {row.email}
                  </Typography>
                </td>
                <td>
                  <Typography level="body-sm">
                    {row.role}
                  </Typography>
                </td>
                <td>
                  <Tooltip
                    title={row.status}
                    placement="top"
                    sx={{
                      background: "#DAD8FD",
                      color: "#3D37DD",
                      textTransform: "capitalize",
                    }}
                  >
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 'sm',
                        fontSize: 'xs',
                        fontWeight: 'sm',
                        backgroundColor: `var(--joy-palette-${getStatusColor(row.status)}-softBg)`,
                        color: `var(--joy-palette-${getStatusColor(row.status)}-softColor)`,
                      }}
                    >
                      {row.status}
                    </Box>
                  </Tooltip>
                </td>
                <td>
                  <Typography level="body-sm">
                    {row.lastLogin}
                  </Typography>
                </td>
                <td>
                  <IconButton
                    size="sm"
                    onClick={(event) => handleMenuOpen(event, index)}
                  >
                    <DotsThreeVertical
                      weight="bold"
                      size={22}
                      color="var(--joy-palette-text-secondary)"
                    />
                  </IconButton>
                  <Popper
                    open={menuRowIndex === index && Boolean(anchorEl)}
                    anchorEl={anchorEl}
                    placement="bottom-start"
                    style={{
                      minWidth: "150px",
                      borderRadius: "8px",
                      boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
                      backgroundColor: "var(--joy-palette-background-surface)",
                      zIndex: 1300,
                      border: "1px solid var(--joy-palette-divider)",
                    }}
                  >
                    <Box
                      onMouseDown={(event) => {
                        event.preventDefault();
                        console.log('Quick preview for:', row.name);
                        handleMenuClose();
                      }}
                      sx={{
                        ...menuItemStyle,
                        gap: { xs: "10px", sm: "14px" },
                      }}
                    >
                      <Box
                        sx={{
                          width: "16px",
                          height: "16px",
                          border: "2px dashed var(--joy-palette-text-secondary)",
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Box
                          sx={{
                            width: "8px",
                            height: "8px",
                            backgroundColor: "var(--joy-palette-text-secondary)",
                            borderRadius: "2px",
                          }}
                        />
                      </Box>
                      Quick preview
                    </Box>
                    <Box
                      onMouseDown={(event) => {
                        event.preventDefault();
                        console.log('View profile for:', row.name);
                        handleMenuClose();
                      }}
                      sx={{
                        ...menuItemStyle,
                        gap: { xs: "10px", sm: "14px" },
                      }}
                    >
                      <EyeIcon fontSize="20px" />
                      View profile
                    </Box>
                    <Box
                      onMouseDown={(event) => {
                        event.preventDefault();
                        console.log('Edit for:', row.name);
                        handleMenuClose();
                      }}
                      sx={{
                        ...menuItemStyle,
                        gap: { xs: "10px", sm: "14px" },
                      }}
                    >
                      <PencilIcon fontSize="20px" />
                      Edit
                    </Box>
                    <Box
                      onMouseDown={(event) => {
                        event.preventDefault();
                        console.log('Add to list for:', row.name);
                        handleMenuClose();
                      }}
                      sx={{
                        ...menuItemStyle,
                        gap: { xs: "10px", sm: "14px" },
                      }}
                    >
                      <PlusIcon fontSize="20px" />
                      Add to list
                    </Box>
                    <Box
                      onMouseDown={(event) => {
                        event.preventDefault();
                        console.log('Delete person for:', row.name);
                        handleMenuClose();
                      }}
                      sx={{
                        ...menuItemStyle,
                        gap: { xs: "10px", sm: "14px" },
                      }}
                    >
                      <TrashSimple size={20} />
                      Delete person
                    </Box>
                  </Popper>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Sheet>

      {showPagination && totalPages > 1 && (
        <Pagination
          totalPages={totalPages}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          disabled={disabled}
        />
      )}
    </Box>
  );
}

