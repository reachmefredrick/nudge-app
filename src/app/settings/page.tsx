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
import { userStorageService } from "@/services/userStorageService";
import { userService } from "@/services/userService";
import { fileStorageService } from "@/services/fileStorageService";
import { hybridFileStorageService } from "@/services/hybridFileStorageService";
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

  const [storageStats, setStorageStats] = useState({
    totalKeys: 0,
    totalSize: 0,
    remindersCount: 0,
  });

  const [usersStats, setUsersStats] = useState({
    totalUsers: 0,
    recentUsers: 0,
    activeUsersWithReminders: 0,
  });

  const [fileStats, setFileStats] = useState({
    totalUsers: 0,
    totalReminders: 0,
    fileSize: 0,
    lastUpdated: "",
  });

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem("nudge_settings");
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    // Load storage stats for current user
    if (user) {
      const stats = userStorageService.getUserStorageStats(user.id);
      setStorageStats(stats);

      // Load users statistics
      const userStats = userService.getUsersStats();
      setUsersStats(userStats);

      // Load file statistics
      const filestats = userStorageService.getFileStatistics();
      setFileStats(filestats);

      // Load hybrid file storage statistics
      const hybridStats = hybridFileStorageService.getFileStatistics();
      console.log("📊 Hybrid file storage statistics:", hybridStats);
    }
  }, [user]);

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
        "Are you sure you want to clear all your data? This action cannot be undone."
      )
    ) {
      if (user) {
        userStorageService.clearUserData(user.id);
        // Also clear general settings
        localStorage.removeItem("nudge_settings");
        setSnackbar({
          open: true,
          message: "All your data has been cleared.",
          severity: "warning",
        });
        // Refresh storage stats
        setStorageStats({ totalKeys: 0, totalSize: 0, remindersCount: 0 });

        // Refresh user stats
        const userStats = userService.getUsersStats();
        setUsersStats(userStats);
      }
    }
  };

  const exportData = () => {
    if (!user) return;

    // Export user data in the new JSON structure format
    const userData = userStorageService.exportUserData(user.id);

    const data = {
      exportType: "user-specific",
      exportDate: new Date().toISOString(),
      userData: userData,
      // Legacy format for compatibility
      legacy: {
        user: {
          name: user.name,
          email: user.email,
        },
        settings,
        reminders: userStorageService.getUserReminders(user.id),
        teamsData: userStorageService.getUserTeamsData(user.id),
        userSettings: userStorageService.getUserSettings(user.id),
      },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nudge-data-${user?.name || "user"}-${
      new Date().toISOString().split("T")[0]
    }.json`;
    a.click();
    URL.revokeObjectURL(url);

    setSnackbar({
      open: true,
      message: "Your data has been exported successfully!",
      severity: "success",
    });
  };

  const exportJsonDatabase = () => {
    if (!user) return;

    const jsonStructure = userStorageService.getJsonStructure();

    const blob = new Blob([JSON.stringify(jsonStructure, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nudge-reminders-database-${
      new Date().toISOString().split("T")[0]
    }.json`;
    a.click();
    URL.revokeObjectURL(url);

    setSnackbar({
      open: true,
      message: "Complete JSON database has been exported!",
      severity: "success",
    });
  };

  const exportCompleteUsersDatabase = () => {
    if (!user) return;

    const completeDatabase = userStorageService.exportCompleteUsersDatabase();

    const blob = new Blob([completeDatabase], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nudge-complete-users-database-${
      new Date().toISOString().split("T")[0]
    }.json`;
    a.click();
    URL.revokeObjectURL(url);

    setSnackbar({
      open: true,
      message:
        "Complete users database (including auth data) has been exported!",
      severity: "success",
    });
  };

  const exportUsersJson = () => {
    if (!user) return;

    const usersJson = userService.exportUsersJson();

    const blob = new Blob([usersJson], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setSnackbar({
      open: true,
      message: "Users.json file has been exported!",
      severity: "success",
    });
  };

  const exportRemindersJsonFile = () => {
    if (!user) return;

    const remindersJsonContent = userStorageService.exportRemindersJsonFile();

    const blob = new Blob([remindersJsonContent], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `data-reminders-${
      new Date().toISOString().split("T")[0]
    }.json`;
    a.click();
    URL.revokeObjectURL(url);

    setSnackbar({
      open: true,
      message: "data/reminders.json file has been exported!",
      severity: "success",
    });
  };

  const syncAllToFile = () => {
    if (!user) return;

    userStorageService.syncAllToFile();

    // Refresh file statistics
    const filestats = userStorageService.getFileStatistics();
    setFileStats(filestats);

    setSnackbar({
      open: true,
      message: "All data synced to data/reminders.json!",
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

              {/* Storage Statistics */}
              <Grid item xs={12}>
                <Box
                  sx={{
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 2,
                    p: 2,
                    bgcolor: "background.paper",
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    Storage Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="text.secondary">
                        Data Entries
                      </Typography>
                      <Typography variant="h6">
                        {storageStats.totalKeys}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="text.secondary">
                        Active Reminders
                      </Typography>
                      <Typography variant="h6">
                        {storageStats.remindersCount}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="text.secondary">
                        Storage Size
                      </Typography>
                      <Typography variant="h6">
                        {(storageStats.totalSize / 1024).toFixed(2)} KB
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>

              {/* User Statistics */}
              <Grid item xs={12}>
                <Box
                  sx={{
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 2,
                    p: 2,
                    bgcolor: "background.paper",
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    System Statistics
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="text.secondary">
                        Total Users
                      </Typography>
                      <Typography variant="h6">
                        {usersStats.totalUsers}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="text.secondary">
                        Recent Users (7 days)
                      </Typography>
                      <Typography variant="h6">
                        {usersStats.recentUsers}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="text.secondary">
                        Active Users
                      </Typography>
                      <Typography variant="h6">
                        {usersStats.activeUsersWithReminders}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>

              {/* File Statistics */}
              <Grid item xs={12}>
                <Box
                  sx={{
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 2,
                    p: 2,
                    bgcolor: "background.paper",
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    data/reminders.json Statistics
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="body2" color="text.secondary">
                        Users in File
                      </Typography>
                      <Typography variant="h6">
                        {fileStats.totalUsers}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="body2" color="text.secondary">
                        Total Reminders
                      </Typography>
                      <Typography variant="h6">
                        {fileStats.totalReminders}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="body2" color="text.secondary">
                        File Size
                      </Typography>
                      <Typography variant="h6">
                        {(fileStats.fileSize / 1024).toFixed(2)} KB
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="body2" color="text.secondary">
                        Last Updated
                      </Typography>
                      <Typography variant="body2">
                        {fileStats.lastUpdated
                          ? new Date(fileStats.lastUpdated).toLocaleString()
                          : "Never"}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>

              <Grid item xs={12} sm={2}>
                <Button
                  variant="outlined"
                  onClick={exportData}
                  startIcon={<Save />}
                  fullWidth
                  disabled={!user}
                >
                  Export Your Data
                </Button>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button
                  variant="outlined"
                  onClick={exportUsersJson}
                  startIcon={<Save />}
                  fullWidth
                  disabled={!user}
                  color="info"
                >
                  Export users.json
                </Button>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button
                  variant="outlined"
                  onClick={exportRemindersJsonFile}
                  startIcon={<Save />}
                  fullWidth
                  disabled={!user}
                  color="success"
                >
                  Export reminders.json
                </Button>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button
                  variant="outlined"
                  onClick={exportJsonDatabase}
                  startIcon={<Save />}
                  fullWidth
                  disabled={!user}
                  color="secondary"
                >
                  Export Reminders DB
                </Button>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button
                  variant="outlined"
                  onClick={exportCompleteUsersDatabase}
                  startIcon={<Save />}
                  fullWidth
                  disabled={!user}
                  color="warning"
                >
                  Export Complete DB
                </Button>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button
                  variant="outlined"
                  onClick={syncAllToFile}
                  startIcon={<Save />}
                  fullWidth
                  disabled={!user}
                  color="primary"
                >
                  Sync to File
                </Button>
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={clearAllData}
                  startIcon={<Delete />}
                  fullWidth
                  disabled={!user}
                >
                  Clear All Your Data
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
