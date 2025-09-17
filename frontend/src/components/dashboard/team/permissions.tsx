import * as React from 'react';
import Button from '@mui/joy/Button';
import Card from '@mui/joy/Card';
import Checkbox from '@mui/joy/Checkbox';
import Stack from '@mui/joy/Stack';
import Table from '@mui/joy/Table';
import Typography from '@mui/joy/Typography';

export interface Permission {
  name: string;
  readOnly?: boolean;
  member?: boolean;
  manager?: boolean;
  admin?: boolean;
}

export interface PermissionsGroup {
  name: string;
  permissions: Permission[];
}

const columns = [
  { name: 'Actions', width: '300px' },
  { name: 'Read Only' },
  { name: 'Member' },
  { name: 'Manager' },
  { name: 'Admin' },
];

export interface PermissionsProps {
  groups: PermissionsGroup[];
}

export function Permissions({ groups = [] }: PermissionsProps): React.JSX.Element {
  return (
    <Stack spacing={3}>
      <Card sx={{ '--Card-padding': 0, overflowX: 'auto' }}>
        <Table
          sx={{
            '--TableCell-headBackground': 'var(--joy-palette-background-level1)',
            minWidth: '700px',
            '& th:not(:first-of-type)': { textAlign: 'center' },
            '& td:not(:first-of-type)': { textAlign: 'center' },
          }}
        >
          <thead>
            <tr>
              {columns.map(
                (column): React.JSX.Element => (
                  <th key={column.name} style={{ width: column.width, minWidth: column.width, maxWidth: column.width }}>
                    {column.name}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {groups.map(
              (group): React.JSX.Element => (
                <React.Fragment key={group.name}>
                  <tr>
                    <td colSpan={5}>
                      <Typography level="title-sm">{group.name}</Typography>
                    </td>
                  </tr>
                  {group.permissions.map(
                    (permission): React.JSX.Element => (
                      <tr key={permission.name}>
                        <td>{permission.name}</td>
                        {(
                          [
                            { id: 'readOnly', value: permission.readOnly },
                            { id: 'member', value: permission.member },
                            { id: 'manager', value: permission.manager },
                            { id: 'admin', value: permission.admin },
                          ] satisfies { id: string; value?: boolean }[]
                        ).map(
                          (role): React.JSX.Element => (
                            <td key={role.id}>
                              <Checkbox color="neutral" defaultChecked={role.value} readOnly variant="outlined" />
                            </td>
                          )
                        )}
                      </tr>
                    )
                  )}
                </React.Fragment>
              )
            )}
          </tbody>
        </Table>
      </Card>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
        <Button color="neutral" variant="outlined">
          Discard
        </Button>
        <Button>Save Changes</Button>
      </Stack>
    </Stack>
  );
}
