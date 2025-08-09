"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  InputLabel,
  Button,
  TextField,
  Snackbar,
  Alert,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Notifications,
  Schedule,
  Group,
  Security,
  Delete,
  Save,
  Person,
} from "@mui/icons-material";
import { useNotification } from "@/contexts/NotificationContext";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedLayout from "@/components/ProtectedLayout";
import ProfileManagement from "@/components/ProfileManagement";

interface Settings {
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
    email: boolean;
  };
  reminders: {
    defaultPriority: string;
    defaultDuration: number;
    autoSnooze: boolean;
    snoozeTime: number;
  };
  teams: {
    defaultNotificationSound: boolean;
    alertPriority: string;
    autoJoinPublic: boolean;
  };
  general: {
    theme: string;
    language: string;
    timezone: string;
    dateFormat: string;
  };
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: "success" | "error" | "warning" | "info";
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    "aria-controls": `settings-tabpanel-${index}`,
  };
}

export default function Settings() {
  const { user } = useAuth();
  const { requestPermission } = useNotification();

  const [tabValue, setTabValue] = useState(0);

  const [settings, setSettings] = useState<Settings>({
    notifications: {
      enabled: true,
      sound: true,
      desktop: true,
      email: false,
    },
    reminders: {
      defaultPriority: "medium",
      defaultDuration: 30,
      autoSnooze: false,
      snoozeTime: 5,
    },
    teams: {
      defaultNotificationSound: true,
      alertPriority: "high",
      autoJoinPublic: false,
    },
    general: {
      theme: "light",
      language: "en",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dateFormat: "MM/dd/yyyy",
    },
  });

  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem("nudge_settings");
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem("nudge_settings", JSON.stringify(settings));
    setSnackbar({
      open: true,
      message: "Settings saved successfully!",
      severity: "success",
    });
  };

  const handleSettingChange = (
    category: keyof Settings,
    field: string,
    value: string | number | boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  };

  const clearAllData = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all data? This action cannot be undone."
      )
    ) {
      localStorage.clear();
      setSnackbar({
        open: true,
        message: "All data has been cleared.",
        severity: "warning",
      });
    }
  };

  const exportData = () => {
    const data = {
      settings,
      reminders: JSON.parse(localStorage.getItem("nudge_reminders") || "[]"),
      teams: JSON.parse(localStorage.getItem("nudge_teams") || "[]"),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nudge_data_backup.json";
    a.click();
    URL.revokeObjectURL(url);

    setSnackbar({
      open: true,
      message: "Data exported successfully!",
      severity: "success",
    });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const SettingsSection = ({
    title,
    icon,
    children,
  }: {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          {icon && icon}
          <Typography variant="h6" component="h2" ml={icon ? 1 : 0}>
            {title}
          </Typography>
        </Box>
        {children}
      </CardContent>
    </Card>
  );

  return (
    <ProtectedLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="settings tabs"
          >
            <Tab label="Profile" icon={<Person />} {...a11yProps(0)} />
            <Tab
              label="Notifications"
              icon={<Notifications />}
              {...a11yProps(1)}
            />
            <Tab label="Reminders" icon={<Schedule />} {...a11yProps(2)} />
            <Tab label="Teams" icon={<Group />} {...a11yProps(3)} />
            <Tab label="General" {...a11yProps(4)} />
            <Tab label="Data" icon={<Security />} {...a11yProps(5)} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <ProfileManagement />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <SettingsSection
            title="Notification Settings"
            icon={<Notifications />}
          >
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notifications.enabled}
                      onChange={(e) =>
                        handleSettingChange(
                          "notifications",
                          "enabled",
                          e.target.checked
                        )
                      }
                    />
                  }
                  label="Enable Notifications"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notifications.sound}
                      onChange={(e) =>
                        handleSettingChange(
                          "notifications",
                          "sound",
                          e.target.checked
                        )
                      }
                    />
                  }
                  label="Sound Notifications"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notifications.desktop}
                      onChange={(e) =>
                        handleSettingChange(
                          "notifications",
                          "desktop",
                          e.target.checked
                        )
                      }
                    />
                  }
                  label="Desktop Notifications"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notifications.email}
                      onChange={(e) =>
                        handleSettingChange(
                          "notifications",
                          "email",
                          e.target.checked
                        )
                      }
                    />
                  }
                  label="Email Notifications"
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  onClick={requestPermission}
                  startIcon={<Notifications />}
                >
                  Test Desktop Notification
                </Button>
              </Grid>
            </Grid>
          </SettingsSection>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <SettingsSection title="Reminder Settings" icon={<Schedule />}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Default Priority</InputLabel>
                  <Select
                    value={settings.reminders.defaultPriority}
                    label="Default Priority"
                    onChange={(e) =>
                      handleSettingChange(
                        "reminders",
                        "defaultPriority",
                        e.target.value
                      )
                    }
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Default Duration (minutes)"
                  type="number"
                  value={settings.reminders.defaultDuration}
                  onChange={(e) =>
                    handleSettingChange(
                      "reminders",
                      "defaultDuration",
                      parseInt(e.target.value)
                    )
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.reminders.autoSnooze}
                      onChange={(e) =>
                        handleSettingChange(
                          "reminders",
                          "autoSnooze",
                          e.target.checked
                        )
                      }
                    />
                  }
                  label="Auto Snooze"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Snooze Time (minutes)"
                  type="number"
                  value={settings.reminders.snoozeTime}
                  onChange={(e) =>
                    handleSettingChange(
                      "reminders",
                      "snoozeTime",
                      parseInt(e.target.value)
                    )
                  }
                />
              </Grid>
            </Grid>
          </SettingsSection>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <SettingsSection title="Team Settings" icon={<Group />}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.teams.defaultNotificationSound}
                      onChange={(e) =>
                        handleSettingChange(
                          "teams",
                          "defaultNotificationSound",
                          e.target.checked
                        )
                      }
                    />
                  }
                  label="Team Notification Sound"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Alert Priority</InputLabel>
                  <Select
                    value={settings.teams.alertPriority}
                    label="Alert Priority"
                    onChange={(e) =>
                      handleSettingChange(
                        "teams",
                        "alertPriority",
                        e.target.value
                      )
                    }
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.teams.autoJoinPublic}
                      onChange={(e) =>
                        handleSettingChange(
                          "teams",
                          "autoJoinPublic",
                          e.target.checked
                        )
                      }
                    />
                  }
                  label="Auto Join Public Teams"
                />
              </Grid>
            </Grid>
          </SettingsSection>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <SettingsSection title="General Settings">
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Theme</InputLabel>
                  <Select
                    value={settings.general.theme}
                    label="Theme"
                    onChange={(e) =>
                      handleSettingChange("general", "theme", e.target.value)
                    }
                  >
                    <MenuItem value="light">Light</MenuItem>
                    <MenuItem value="dark">Dark</MenuItem>
                    <MenuItem value="auto">Auto</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={settings.general.language}
                    label="Language"
                    onChange={(e) =>
                      handleSettingChange("general", "language", e.target.value)
                    }
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="es">Spanish</MenuItem>
                    <MenuItem value="fr">French</MenuItem>
                    <MenuItem value="de">German</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Timezone"
                  value={settings.general.timezone}
                  disabled
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Date Format</InputLabel>
                  <Select
                    value={settings.general.dateFormat}
                    label="Date Format"
                    onChange={(e) =>
                      handleSettingChange(
                        "general",
                        "dateFormat",
                        e.target.value
                      )
                    }
                  >
                    <MenuItem value="MM/dd/yyyy">MM/dd/yyyy</MenuItem>
                    <MenuItem value="dd/MM/yyyy">dd/MM/yyyy</MenuItem>
                    <MenuItem value="yyyy-MM-dd">yyyy-MM-dd</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </SettingsSection>
        </TabPanel>

        <TabPanel value={tabValue} index={5}>
          <SettingsSection title="Data Management" icon={<Security />}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Manage your data, including export and deletion options.
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  onClick={exportData}
                  startIcon={<Save />}
                  fullWidth
                >
                  Export Data
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={clearAllData}
                  startIcon={<Delete />}
                  fullWidth
                >
                  Clear All Data
                </Button>
              </Grid>
            </Grid>
          </SettingsSection>
        </TabPanel>

        <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            color="primary"
            onClick={saveSettings}
            startIcon={<Save />}
          >
            Save All Settings
          </Button>
        </Box>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ProtectedLayout>
  );
}
