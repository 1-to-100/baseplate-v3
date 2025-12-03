"use client";

import * as React from "react";
import { useCallback } from "react";
import Box from "@mui/joy/Box";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import Table from "@mui/joy/Table";
import IconButton from "@mui/joy/IconButton";
import CircularProgress from "@mui/joy/CircularProgress";
import { Plus as PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { PencilSimple as PencilIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import { Trash as TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getTeams } from "@/lib/api/teams";
import { useUserInfo } from "@/hooks/use-user-info";
import { isSystemAdministrator } from "@/lib/user-utils";
import type { TeamWithRelations } from "@/types/database";
import AddEditTeamModal from "@/components/dashboard/modals/AddEditTeamModal";
import { paths } from "@/paths";

export default function Page(): React.JSX.Element {
  const { userInfo } = useUserInfo();
  const customerId = userInfo?.customerId;
  const router = useRouter();
  const [openAddModal, setOpenAddModal] = React.useState(false);
  const [teamIdToEdit, setTeamIdToEdit] = React.useState<string | undefined>(undefined);

  const isSystemAdmin = isSystemAdministrator(userInfo);
  // For system admin, pass undefined to get all teams; otherwise pass customerId
  const teamsCustomerId = isSystemAdmin ? undefined : customerId;

  const { data, isLoading, error } = useQuery({
    queryKey: ["teams", teamsCustomerId, isSystemAdmin],
    queryFn: async () => {
      const response = await getTeams(teamsCustomerId);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || [];
    },
    enabled: isSystemAdmin || !!customerId,
  });

  const teams = data || [];

  const handleAddTeam = useCallback(() => {
    setOpenAddModal(true);
  }, []);

  const handleEdit = useCallback((teamId: string) => {
    setTeamIdToEdit(teamId);
    setOpenAddModal(true);
  }, []);

  const handleRemove = useCallback((teamId: string) => {
    // Handler will be implemented later
  }, []);

  const handleCloseModal = useCallback(() => {
    setOpenAddModal(false);
    setTeamIdToEdit(undefined);
  }, []);

  return (
    <Box sx={{ p: { xs: 2, sm: "var(--Content-padding)" } }}>
      <Stack spacing={{ xs: 2, sm: 3 }} sx={{ mt: { xs: 6, sm: 0 } }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: { xs: "wrap", sm: "nowrap" },
          }}
        >
          <Typography level="h2">Team Management</Typography>
          <Button
            variant="solid"
            color="primary"
            onClick={handleAddTeam}
            startDecorator={<PlusIcon fontSize="var(--Icon-fontSize)" />}
            sx={{
              width: { xs: "100%", sm: "auto" },
              py: { xs: 1, sm: 0.75 },
            }}
          >
            Add Team
          </Button>
        </Stack>

      {isLoading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: { xs: "40vh", sm: "50vh" },
          }}
        >
          <CircularProgress size="lg" />
        </Box>
      ) : error ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: { xs: "40vh", sm: "50vh" },
          }}
        >
          <Typography level="body-md" color="danger">
            {error instanceof Error ? error.message : "Failed to load teams"}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            overflowX: "auto",
            width: "100%",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: { xs: "thin", sm: "auto" },
            "&::-webkit-scrollbar": {
              height: { xs: "8px", sm: "12px" },
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "var(--joy-palette-divider)",
              borderRadius: "4px",
            },
          }}
        >
          <Table
            aria-label="team management table"
            sx={{
              minWidth: "800px",
              tableLayout: "fixed",
              "& th, & td": {
                px: { xs: 1, sm: 2 },
                py: { xs: 1, sm: 1.5 },
              },
            }}
          >
            <thead>
              <tr>
                <th style={{ width: isSystemAdmin ? "30%" : "40%" }}>Team</th>
                {isSystemAdmin && (
                  <th style={{ width: "20%" }}>Customer</th>
                )}
                <th style={{ width: isSystemAdmin ? "15%" : "20%", textAlign: "center" }}>Users</th>
                <th style={{ width: isSystemAdmin ? "25%" : "30%" }}>Manager Name</th>
                <th style={{ width: "10%", textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {teams.length === 0 ? (
                <tr>
                  <td
                    colSpan={isSystemAdmin ? 5 : 4}
                    style={{ textAlign: "center", padding: "20px" }}
                  >
                    <Typography level="body-md" color="neutral">
                      No teams found
                    </Typography>
                  </td>
                </tr>
              ) : (
                teams.map((team: TeamWithRelations) => {
                  const memberCount = team.team_members?.length || 0;
                  const managerName = team.manager?.full_name || "";
                  const customerName = team.customer?.name || "-";

                  return (
                    <tr key={team.team_id}>
                      <td
                        onClick={() => router.push(paths.dashboard.teamManagement.details(team.team_id))}
                        style={{ cursor: "pointer" }}
                      >
                        <Typography
                          sx={{
                            fontSize: { xs: "12px", sm: "14px" },
                            fontWeight: 500,
                          }}
                        >
                          {team.team_name}
                        </Typography>
                      </td>
                      {isSystemAdmin && (
                        <td
                          style={{ cursor: "pointer" }}
                          onClick={() => router.push(paths.dashboard.teamManagement.details(team.team_id))}
                        >
                          <Typography
                            sx={{
                              fontSize: { xs: "12px", sm: "14px" },
                              color: "var(--joy-palette-text-secondary)",
                            }}
                          >
                            {customerName}
                          </Typography>
                        </td>
                      )}
                      <td
                        style={{ textAlign: "center", cursor: "pointer" }}
                        onClick={() => router.push(paths.dashboard.teamManagement.details(team.team_id))}
                      >
                        <Typography
                          sx={{
                            fontSize: { xs: "12px", sm: "14px" },
                            color: "var(--joy-palette-text-secondary)",
                          }}
                        >
                          {memberCount}
                        </Typography>
                      </td>
                      <td
                        style={{ cursor: "pointer" }}
                        onClick={() => router.push(paths.dashboard.teamManagement.details(team.team_id))}
                      >
                        <Typography
                          sx={{
                            fontSize: { xs: "12px", sm: "14px" },
                            color: "var(--joy-palette-text-secondary)",
                          }}
                        >
                          {managerName || "-"}
                        </Typography>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ justifyContent: "flex-end" }}
                        >
                          <IconButton
                            size="sm"
                            variant="plain"
                            color="neutral"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleEdit(team.team_id);
                            }}
                            sx={{
                              "&:hover": {
                                bgcolor: "var(--joy-palette-neutral-100)",
                              },
                            }}
                          >
                            <PencilIcon fontSize="var(--Icon-fontSize)" />
                          </IconButton>
                          <IconButton
                            size="sm"
                            variant="plain"
                            color="danger"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRemove(team.team_id);
                            }}
                            sx={{
                              "&:hover": {
                                bgcolor: "var(--joy-palette-danger-50)",
                              },
                            }}
                          >
                            <TrashIcon fontSize="var(--Icon-fontSize)" />
                          </IconButton>
                        </Stack>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </Box>
      )}
      </Stack>
      <AddEditTeamModal
        open={openAddModal}
        onClose={handleCloseModal}
        teamId={teamIdToEdit}
      />
    </Box>
  );
}
