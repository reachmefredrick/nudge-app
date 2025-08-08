"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  IconButton,
  Snackbar,
  Alert,
} from "@mui/material";
import { Add, Send, Group, Delete } from "@mui/icons-material";
import { useNotification } from "@/contexts/NotificationContext";
import ProtectedLayout from "@/components/ProtectedLayout";

interface Team {
  id: number;
  name: string;
  description: string;
  members: string[];
  color: string;
}

interface NewTeam {
  name: string;
  description: string;
  members: string[];
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: "success" | "error" | "warning" | "info";
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [alertDialog, setAlertDialog] = useState(false);
  const [teamDialog, setTeamDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertPriority, setAlertPriority] = useState("normal");
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: "",
    severity: "success",
  });
  const [newTeam, setNewTeam] = useState<NewTeam>({
    name: "",
    description: "",
    members: [],
  });
  const [newMember, setNewMember] = useState("");

  const { sendTeamsAlert, sendNotification } = useNotification();

  useEffect(() => {
    // Load teams from localStorage
    const storedTeams = localStorage.getItem("teams");
    if (storedTeams) {
      setTeams(JSON.parse(storedTeams));
    } else {
      // Initialize with sample teams
      const sampleTeams: Team[] = [
        {
          id: 1,
          name: "Development Team",
          description: "Frontend and Backend developers",
          members: ["john@example.com", "jane@example.com", "mike@example.com"],
          color: "#2196f3",
        },
        {
          id: 2,
          name: "Marketing Team",
          description: "Marketing and content creators",
          members: ["sarah@example.com", "tom@example.com"],
          color: "#4caf50",
        },
      ];
      setTeams(sampleTeams);
      localStorage.setItem("teams", JSON.stringify(sampleTeams));
    }
  }, []);

  useEffect(() => {
    // Save teams to localStorage
    localStorage.setItem("teams", JSON.stringify(teams));
  }, [teams]);

  const handleSendAlert = async () => {
    if (!selectedTeam || !alertMessage.trim()) {
      setSnackbar({
        open: true,
        message: "Please select a team and enter a message",
        severity: "error",
      });
      return;
    }

    try {
      const result = await sendTeamsAlert(alertMessage, selectedTeam.members);

      if (result.success) {
        setSnackbar({
          open: true,
          message: `Alert sent to ${selectedTeam.name} successfully!`,
          severity: "success",
        });

        // Also send local notification
        sendNotification("Teams Alert Sent", {
          body: `Alert sent to ${selectedTeam.name}: ${alertMessage}`,
          icon: "/logo192.png",
        });

        setAlertDialog(false);
        setAlertMessage("");
        setSelectedTeam(null);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to send alert: ${(error as Error).message}`,
        severity: "error",
      });
    }
  };

  const handleCreateTeam = () => {
    const team: Team = {
      id: Date.now(),
      ...newTeam,
      color: getRandomColor(),
    };

    setTeams((prev) => [...prev, team]);
    setTeamDialog(false);
    setNewTeam({ name: "", description: "", members: [] });

    setSnackbar({
      open: true,
      message: "Team created successfully!",
      severity: "success",
    });
  };

  const handleDeleteTeam = (teamId: number) => {
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
    setSnackbar({
      open: true,
      message: "Team deleted successfully!",
      severity: "success",
    });
  };

  const addMember = () => {
    if (newMember.trim() && !newTeam.members.includes(newMember.trim())) {
      setNewTeam((prev) => ({
        ...prev,
        members: [...prev.members, newMember.trim()],
      }));
      setNewMember("");
    }
  };

  const removeMember = (email: string) => {
    setNewTeam((prev) => ({
      ...prev,
      members: prev.members.filter((m) => m !== email),
    }));
  };

  const getRandomColor = () => {
    const colors = [
      "#2196f3",
      "#4caf50",
      "#ff9800",
      "#9c27b0",
      "#f44336",
      "#00bcd4",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <ProtectedLayout>
      <Box>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 3 }}
        >
          <Typography variant="h4">Teams & Alerts</Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => setTeamDialog(true)}
              sx={{ mr: 2 }}
            >
              New Team
            </Button>
            <Button
              variant="contained"
              startIcon={<Send />}
              onClick={() => setAlertDialog(true)}
              disabled={teams.length === 0}
            >
              Send Alert
            </Button>
          </Box>
        </Box>

        {teams.length === 0 ? (
          <Card>
            <CardContent>
              <Typography variant="h6" align="center" color="textSecondary">
                No teams yet
              </Typography>
              <Typography variant="body2" align="center" color="textSecondary">
                Create your first team to start sending alerts!
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {teams.map((team) => (
              <Grid item xs={12} md={6} lg={4} key={team.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                      <Avatar sx={{ bgcolor: team.color, mr: 2 }}>
                        <Group />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" component="div">
                          {team.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {team.members.length} members
                        </Typography>
                      </Box>
                    </Box>

                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {team.description}
                    </Typography>

                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Members:
                    </Typography>
                    <Box sx={{ maxHeight: 100, overflow: "auto" }}>
                      {team.members.map((member, index) => (
                        <Chip
                          key={index}
                          label={member}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </Box>
                  </CardContent>

                  <CardActions>
                    <Button
                      size="small"
                      startIcon={<Send />}
                      onClick={() => {
                        setSelectedTeam(team);
                        setAlertDialog(true);
                      }}
                    >
                      Send Alert
                    </Button>
                    <Box sx={{ flexGrow: 1 }} />
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteTeam(team.id)}
                    >
                      <Delete />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Send Alert Dialog */}
        <Dialog
          open={alertDialog}
          onClose={() => setAlertDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Send Team Alert</DialogTitle>
          <DialogContent>
            <FormControl fullWidth margin="normal">
              <InputLabel>Select Team</InputLabel>
              <Select
                value={selectedTeam?.id || ""}
                onChange={(e) =>
                  setSelectedTeam(
                    teams.find((t) => t.id === e.target.value) || null
                  )
                }
                label="Select Team"
              >
                {teams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name} ({team.members.length} members)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Alert Message"
              value={alertMessage}
              onChange={(e) => setAlertMessage(e.target.value)}
              margin="normal"
              multiline
              rows={4}
              required
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Priority</InputLabel>
              <Select
                value={alertPriority}
                onChange={(e) => setAlertPriority(e.target.value)}
                label="Priority"
              >
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </Select>
            </FormControl>

            {selectedTeam && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Alert will be sent to:
                </Typography>
                {selectedTeam.members.map((member, index) => (
                  <Chip
                    key={index}
                    label={member}
                    size="small"
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </Box>
            )}
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setAlertDialog(false)}>Cancel</Button>
            <Button onClick={handleSendAlert} variant="contained">
              Send Alert
            </Button>
          </DialogActions>
        </Dialog>

        {/* Create Team Dialog */}
        <Dialog
          open={teamDialog}
          onClose={() => setTeamDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Create New Team</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Team Name"
              value={newTeam.name}
              onChange={(e) =>
                setNewTeam((prev) => ({ ...prev, name: e.target.value }))
              }
              margin="normal"
              required
            />

            <TextField
              fullWidth
              label="Description"
              value={newTeam.description}
              onChange={(e) =>
                setNewTeam((prev) => ({ ...prev, description: e.target.value }))
              }
              margin="normal"
              multiline
              rows={2}
            />

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Team Members
              </Typography>
              <Box display="flex" gap={1} sx={{ mb: 2 }}>
                <TextField
                  label="Email Address"
                  value={newMember}
                  onChange={(e) => setNewMember(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addMember()}
                  size="small"
                  sx={{ flexGrow: 1 }}
                />
                <Button onClick={addMember} variant="outlined">
                  Add
                </Button>
              </Box>

              {newTeam.members.map((member, index) => (
                <Chip
                  key={index}
                  label={member}
                  onDelete={() => removeMember(member)}
                  sx={{ mr: 0.5, mb: 0.5 }}
                />
              ))}
            </Box>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setTeamDialog(false)}>Cancel</Button>
            <Button
              onClick={handleCreateTeam}
              variant="contained"
              disabled={!newTeam.name.trim()}
            >
              Create Team
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          <Alert
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            severity={snackbar.severity}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ProtectedLayout>
  );
}
