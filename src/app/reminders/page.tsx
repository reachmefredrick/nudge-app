"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
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
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  IconButton,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Schedule,
  Repeat,
  NotificationImportant,
} from "@mui/icons-material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { useNotification } from "@/contexts/NotificationContext";
import ProtectedLayout from "@/components/ProtectedLayout";

interface ReminderData {
  id: number;
  title: string;
  description: string;
  datetime: Date;
  priority: string;
  isRecurring: boolean;
  recurringType: string;
  recurringInterval: number;
  active: boolean;
  createdAt: Date;
}

interface FormData {
  title: string;
  description: string;
  datetime: Date;
  priority: string;
  isRecurring: boolean;
  recurringType: string;
  recurringInterval: number;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<ReminderData[]>([]);
  const [open, setOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderData | null>(
    null
  );
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    datetime: new Date(),
    priority: "medium",
    isRecurring: false,
    recurringType: "daily",
    recurringInterval: 1,
  });

  const {
    sendNotification,
    scheduleNotification,
    scheduleRecurringNotification,
  } = useNotification();

  useEffect(() => {
    // Load reminders from localStorage
    const storedReminders = localStorage.getItem("reminders");
    if (storedReminders) {
      setReminders(
        JSON.parse(storedReminders).map((r: any) => ({
          ...r,
          datetime: new Date(r.datetime),
          createdAt: new Date(r.createdAt),
        }))
      );
    }
  }, []);

  useEffect(() => {
    // Save reminders to localStorage
    localStorage.setItem(
      "reminders",
      JSON.stringify(
        reminders.map((r) => ({
          ...r,
          datetime: r.datetime.toISOString(),
          createdAt: r.createdAt.toISOString(),
        }))
      )
    );
  }, [reminders]);

  const handleOpen = (reminder: ReminderData | null = null) => {
    if (reminder) {
      setEditingReminder(reminder);
      setFormData({
        title: reminder.title,
        description: reminder.description,
        datetime: reminder.datetime,
        priority: reminder.priority,
        isRecurring: reminder.isRecurring || false,
        recurringType: reminder.recurringType || "daily",
        recurringInterval: reminder.recurringInterval || 1,
      });
    } else {
      setEditingReminder(null);
      setFormData({
        title: "",
        description: "",
        datetime: new Date(),
        priority: "medium",
        isRecurring: false,
        recurringType: "daily",
        recurringInterval: 1,
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingReminder(null);
  };

  const handleSave = () => {
    const newReminder: ReminderData = {
      id: editingReminder ? editingReminder.id : Date.now(),
      ...formData,
      createdAt: editingReminder ? editingReminder.createdAt : new Date(),
      active: true,
    };

    if (editingReminder) {
      setReminders((prev) =>
        prev.map((r) => (r.id === editingReminder.id ? newReminder : r))
      );
    } else {
      setReminders((prev) => [...prev, newReminder]);
    }

    // Schedule the notification
    scheduleReminderNotification(newReminder);

    handleClose();
  };

  const scheduleReminderNotification = (reminder: ReminderData) => {
    const now = new Date();
    const reminderTime = new Date(reminder.datetime);
    const delay = reminderTime.getTime() - now.getTime();

    if (delay > 0) {
      if (reminder.isRecurring) {
        const intervals: { [key: string]: number } = {
          daily: 24 * 60 * 60 * 1000,
          weekly: 7 * 24 * 60 * 60 * 1000,
          monthly: 30 * 24 * 60 * 60 * 1000,
        };

        const interval =
          intervals[reminder.recurringType] * reminder.recurringInterval;

        scheduleRecurringNotification(
          reminder.title,
          {
            body: reminder.description,
            icon: "/logo192.png",
            tag: `reminder-${reminder.id}`,
          },
          interval
        );
      } else {
        scheduleNotification(
          reminder.title,
          {
            body: reminder.description,
            icon: "/logo192.png",
            tag: `reminder-${reminder.id}`,
          },
          delay
        );
      }
    }
  };

  const handleDelete = (id: number) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const toggleActive = (id: number) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  };

  const testReminder = (reminder: ReminderData) => {
    sendNotification(reminder.title, {
      body: reminder.description,
      icon: "/logo192.png",
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "error";
      case "medium":
        return "warning";
      case "low":
        return "info";
      default:
        return "default";
    }
  };

  const formatRecurring = (reminder: ReminderData) => {
    if (!reminder.isRecurring) return "";
    const interval =
      reminder.recurringInterval > 1 ? `${reminder.recurringInterval} ` : "";
    const type =
      reminder.recurringInterval > 1
        ? reminder.recurringType.replace("ly", "ly every")
        : reminder.recurringType;
    return `Repeats ${interval}${type}`;
  };

  return (
    <ProtectedLayout>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Box>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 3 }}
          >
            <Typography variant="h4">Reminders</Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpen()}
            >
              New Reminder
            </Button>
          </Box>

          {reminders.length === 0 ? (
            <Card>
              <CardContent>
                <Typography variant="h6" align="center" color="textSecondary">
                  No reminders yet
                </Typography>
                <Typography
                  variant="body2"
                  align="center"
                  color="textSecondary"
                >
                  Create your first reminder to get started!
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={3}>
              {reminders.map((reminder) => (
                <Grid item xs={12} md={6} lg={4} key={reminder.id}>
                  <Card sx={{ opacity: reminder.active ? 1 : 0.6 }}>
                    <CardContent>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        sx={{ mb: 2 }}
                      >
                        <Typography variant="h6" component="div">
                          {reminder.title}
                        </Typography>
                        <Chip
                          label={reminder.priority}
                          color={getPriorityColor(reminder.priority) as any}
                          size="small"
                        />
                      </Box>

                      <Typography
                        variant="body2"
                        color="textSecondary"
                        sx={{ mb: 2 }}
                      >
                        {reminder.description}
                      </Typography>

                      <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                        <Schedule sx={{ mr: 1, fontSize: 16 }} />
                        <Typography variant="body2">
                          {reminder.datetime.toLocaleString()}
                        </Typography>
                      </Box>

                      {reminder.isRecurring && (
                        <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                          <Repeat sx={{ mr: 1, fontSize: 16 }} />
                          <Typography variant="body2" color="textSecondary">
                            {formatRecurring(reminder)}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>

                    <CardActions>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={reminder.active}
                            onChange={() => toggleActive(reminder.id)}
                            size="small"
                          />
                        }
                        label="Active"
                      />
                      <Box sx={{ flexGrow: 1 }} />
                      <IconButton
                        size="small"
                        onClick={() => testReminder(reminder)}
                      >
                        <NotificationImportant />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleOpen(reminder)}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(reminder.id)}
                      >
                        <Delete />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Create/Edit Dialog */}
          <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
              {editingReminder ? "Edit Reminder" : "Create New Reminder"}
            </DialogTitle>
            <DialogContent>
              <TextField
                fullWidth
                label="Title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                margin="normal"
                required
              />

              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                margin="normal"
                multiline
                rows={3}
              />

              <DateTimePicker
                label="Date & Time"
                value={formData.datetime}
                onChange={(newValue) =>
                  newValue &&
                  setFormData((prev) => ({ ...prev, datetime: newValue }))
                }
                slotProps={{ textField: { fullWidth: true, margin: "normal" } }}
              />

              <FormControl fullWidth margin="normal">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      priority: e.target.value,
                    }))
                  }
                  label="Priority"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isRecurring}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        isRecurring: e.target.checked,
                      }))
                    }
                  />
                }
                label="Recurring Reminder"
                sx={{ mt: 2 }}
              />

              {formData.isRecurring && (
                <Box sx={{ mt: 2 }}>
                  <TextField
                    label="Repeat every"
                    type="number"
                    value={formData.recurringInterval}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        recurringInterval: parseInt(e.target.value),
                      }))
                    }
                    inputProps={{ min: 1 }}
                    sx={{ mr: 2, width: 120 }}
                  />

                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>Period</InputLabel>
                    <Select
                      value={formData.recurringType}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          recurringType: e.target.value,
                        }))
                      }
                      label="Period"
                    >
                      <MenuItem value="daily">Day(s)</MenuItem>
                      <MenuItem value="weekly">Week(s)</MenuItem>
                      <MenuItem value="monthly">Month(s)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              )}
            </DialogContent>

            <DialogActions>
              <Button onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSave} variant="contained">
                {editingReminder ? "Update" : "Create"}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </LocalizationProvider>
    </ProtectedLayout>
  );
}
