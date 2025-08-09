// Teams Notification Management Component
// src/components/TeamsNotificationManager.tsx

import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  Paper,
  Grid,
  Divider,
  Tab,
  Tabs,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  Send as SendIcon,
  Notifications as NotificationIcon,
  Groups as TeamIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

interface ScheduledNotification {
  id: string;
  title: string;
  message: string;
  teamId: string;
  channelId: string;
  priority: "low" | "medium" | "high";
  scheduleTime: Date;
  recurring?: {
    type: "daily" | "weekly" | "monthly" | "custom";
    interval: number;
    endDate?: Date;
    daysOfWeek?: number[];
    dayOfMonth?: number;
  };
  isActive: boolean;
  createdAt: Date;
  nextSend?: Date;
}

interface NotificationFormData {
  title: string;
  message: string;
  teamId: string;
  channelId: string;
  priority: "low" | "medium" | "high";
  scheduleTime: Date | null;
  isRecurring: boolean;
  recurring: {
    type: "daily" | "weekly" | "monthly" | "custom";
    interval: number;
    endDate: Date | null;
    daysOfWeek: number[];
    dayOfMonth: number;
  };
}

const TeamsNotificationManager: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [notifications, setNotifications] = useState<ScheduledNotification[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<NotificationFormData>({
    title: "",
    message: "",
    teamId: "",
    channelId: "",
    priority: "medium",
    scheduleTime: null,
    isRecurring: false,
    recurring: {
      type: "daily",
      interval: 1,
      endDate: null,
      daysOfWeek: [],
      dayOfMonth: 1,
    },
  });
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Sample teams/channels for demo (in production, fetch from Graph API)
  const sampleTeams = [
    {
      id: "team-1",
      name: "Development Team",
      channels: [
        { id: "channel-1", name: "General" },
        { id: "channel-2", name: "Sprint Updates" },
      ],
    },
    {
      id: "team-2",
      name: "Marketing Team",
      channels: [
        { id: "channel-3", name: "General" },
        { id: "channel-4", name: "Campaigns" },
      ],
    },
  ];

  useEffect(() => {
    loadNotifications();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/teams-notifications?action=list");
      const data = await response.json();

      if (data.success) {
        setNotifications(
          data.notifications.map((n: any) => ({
            ...n,
            scheduleTime: new Date(n.scheduleTime),
            createdAt: new Date(n.createdAt),
            nextSend: n.nextSend ? new Date(n.nextSend) : undefined,
            recurring: n.recurring
              ? {
                  ...n.recurring,
                  endDate: n.recurring.endDate
                    ? new Date(n.recurring.endDate)
                    : undefined,
                }
              : undefined,
          }))
        );
      } else {
        showAlert("error", "Failed to load notifications");
      }
    } catch (error) {
      showAlert("error", "Error loading notifications");
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type: "success" | "error", message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleSendImmediate = async () => {
    if (
      !formData.title ||
      !formData.message ||
      !formData.teamId ||
      !formData.channelId
    ) {
      showAlert("error", "Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/teams-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send-immediate",
          ...formData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showAlert("success", "Notification sent successfully!");
        resetForm();
        setDialogOpen(false);
      } else {
        showAlert("error", data.error || "Failed to send notification");
      }
    } catch (error) {
      showAlert("error", "Error sending notification");
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleNotification = async () => {
    if (
      !formData.title ||
      !formData.message ||
      !formData.teamId ||
      !formData.channelId ||
      !formData.scheduleTime
    ) {
      showAlert("error", "Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      const action = formData.isRecurring ? "schedule-recurring" : "schedule";
      const payload: any = {
        action,
        title: formData.title,
        message: formData.message,
        teamId: formData.teamId,
        channelId: formData.channelId,
        priority: formData.priority,
        scheduleTime: formData.scheduleTime.toISOString(),
      };

      if (formData.isRecurring) {
        payload.recurring = {
          ...formData.recurring,
          endDate: formData.recurring.endDate?.toISOString(),
        };
      }

      const response = await fetch("/api/teams-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        showAlert(
          "success",
          `Notification ${
            formData.isRecurring ? "recurring schedule" : "scheduled"
          } successfully!`
        );
        resetForm();
        setDialogOpen(false);
        loadNotifications();
      } else {
        showAlert("error", data.error || "Failed to schedule notification");
      }
    } catch (error) {
      showAlert("error", "Error scheduling notification");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelNotification = async (notificationId: string) => {
    try {
      setLoading(true);
      const response = await fetch("/api/teams-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          notificationId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showAlert("success", "Notification cancelled successfully!");
        loadNotifications();
      } else {
        showAlert("error", data.error || "Failed to cancel notification");
      }
    } catch (error) {
      showAlert("error", "Error cancelling notification");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      message: "",
      teamId: "",
      channelId: "",
      priority: "medium",
      scheduleTime: null,
      isRecurring: false,
      recurring: {
        type: "daily",
        interval: 1,
        endDate: null,
        daysOfWeek: [],
        dayOfMonth: 1,
      },
    });
  };

  const getSelectedTeam = () =>
    sampleTeams.find((t) => t.id === formData.teamId);
  const getSelectedChannel = () =>
    getSelectedTeam()?.channels.find((c) => c.id === formData.channelId);

  const formatNextSend = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();

    if (diff < 0) return "Overdue";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `in ${days}d ${hours}h`;
    if (hours > 0) return `in ${hours}h ${minutes}m`;
    return `in ${minutes}m`;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        {alert && (
          <Alert severity={alert.type} sx={{ mb: 2 }}>
            {alert.message}
          </Alert>
        )}

        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <Tab icon={<SendIcon />} label="Send Notification" />
            <Tab icon={<ScheduleIcon />} label="Scheduled Notifications" />
            <Tab icon={<SettingsIcon />} label="Teams & Channels" />
          </Tabs>
        </Paper>

        {/* Send Notification Tab */}
        {tabValue === 0 && (
          <Card>
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography variant="h6" component="h2">
                  <NotificationIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                  Teams Notifications
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setDialogOpen(true)}
                >
                  New Notification
                </Button>
              </Box>

              <Typography variant="body2" color="text.secondary">
                Send immediate or scheduled notifications to Microsoft Teams
                channels. Perfect for reminders, announcements, and automated
                updates.
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Scheduled Notifications Tab */}
        {tabValue === 1 && (
          <Card>
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography variant="h6" component="h2">
                  Scheduled Notifications
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={loadNotifications}
                  disabled={loading}
                >
                  Refresh
                </Button>
              </Box>

              {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : notifications.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  textAlign="center"
                  py={3}
                >
                  No scheduled notifications. Create one to get started!
                </Typography>
              ) : (
                <List>
                  {notifications.map((notification) => (
                    <ListItem key={notification.id} divider>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle1">
                              {notification.title}
                            </Typography>
                            <Chip
                              label={notification.priority}
                              size="small"
                              color={
                                notification.priority === "high"
                                  ? "error"
                                  : notification.priority === "medium"
                                  ? "warning"
                                  : "default"
                              }
                            />
                            {notification.recurring && (
                              <Chip
                                label={`${notification.recurring.type} recurring`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {notification.message}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Team: {notification.teamId} | Channel:{" "}
                              {notification.channelId}
                            </Typography>
                            {notification.nextSend && (
                              <Typography
                                variant="caption"
                                display="block"
                                color="primary"
                              >
                                Next: {notification.nextSend.toLocaleString()} (
                                {formatNextSend(notification.nextSend)})
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() =>
                            handleCancelNotification(notification.id)
                          }
                          disabled={!notification.isActive}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        )}

        {/* Teams & Channels Tab */}
        {tabValue === 2 && (
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" mb={2}>
                <TeamIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                Available Teams & Channels
              </Typography>

              {sampleTeams.map((team) => (
                <Accordion key={team.id}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1">{team.name}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {team.channels.map((channel) => (
                        <ListItem key={channel.id}>
                          <ListItemText
                            primary={channel.name}
                            secondary={`Channel ID: ${channel.id}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              ))}

              <Alert severity="info" sx={{ mt: 2 }}>
                In production, teams and channels would be dynamically loaded
                from Microsoft Graph API based on user permissions.
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Notification Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Create Teams Notification</DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Message"
                  multiline
                  rows={3}
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  required
                />
              </Grid>

              <Grid item xs={6}>
                <FormControl fullWidth required>
                  <InputLabel>Team</InputLabel>
                  <Select
                    value={formData.teamId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        teamId: e.target.value,
                        channelId: "",
                      })
                    }
                  >
                    {sampleTeams.map((team) => (
                      <MenuItem key={team.id} value={team.id}>
                        {team.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6}>
                <FormControl fullWidth required disabled={!formData.teamId}>
                  <InputLabel>Channel</InputLabel>
                  <Select
                    value={formData.channelId}
                    onChange={(e) =>
                      setFormData({ ...formData, channelId: e.target.value })
                    }
                  >
                    {getSelectedTeam()?.channels.map((channel) => (
                      <MenuItem key={channel.id} value={channel.id}>
                        {channel.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: e.target.value as "low" | "medium" | "high",
                      })
                    }
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6}>
                <DateTimePicker
                  label="Schedule Time (optional)"
                  value={formData.scheduleTime}
                  onChange={(date) =>
                    setFormData({ ...formData, scheduleTime: date })
                  }
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>

              {formData.scheduleTime && (
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isRecurring}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isRecurring: e.target.checked,
                          })
                        }
                      />
                    }
                    label="Recurring Notification"
                  />
                </Grid>
              )}

              {formData.isRecurring && (
                <>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Recurrence Type</InputLabel>
                      <Select
                        value={formData.recurring.type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            recurring: {
                              ...formData.recurring,
                              type: e.target.value as any,
                            },
                          })
                        }
                      >
                        <MenuItem value="daily">Daily</MenuItem>
                        <MenuItem value="weekly">Weekly</MenuItem>
                        <MenuItem value="monthly">Monthly</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Interval"
                      value={formData.recurring.interval}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          recurring: {
                            ...formData.recurring,
                            interval: parseInt(e.target.value) || 1,
                          },
                        })
                      }
                      inputProps={{ min: 1 }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <DateTimePicker
                      label="End Date (optional)"
                      value={formData.recurring.endDate}
                      onChange={(date) =>
                        setFormData({
                          ...formData,
                          recurring: { ...formData.recurring, endDate: date },
                        })
                      }
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            {!formData.scheduleTime ? (
              <Button
                onClick={handleSendImmediate}
                variant="contained"
                disabled={loading}
                startIcon={<SendIcon />}
              >
                Send Now
              </Button>
            ) : (
              <Button
                onClick={handleScheduleNotification}
                variant="contained"
                disabled={loading}
                startIcon={<ScheduleIcon />}
              >
                Schedule
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default TeamsNotificationManager;
