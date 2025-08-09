"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  Divider,
} from "@mui/material";
import { hybridFileStorageService } from "@/services/hybridFileStorageService";
import type { FileStatistics } from "@/types/shared";

export default function FileStorageTestPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [stats, setStats] = useState<FileStatistics | null>(null);

  const addResult = (
    type: "success" | "error" | "info",
    message: string,
    data?: any
  ) => {
    setResults((prev) => [
      ...prev,
      {
        type,
        message,
        data,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const clearResults = () => {
    setResults([]);
    setStats(null);
  };

  const testUserOperations = async () => {
    setLoading(true);
    addResult("info", "Starting user operations test...");

    try {
      // Initialize the service
      hybridFileStorageService.initialize();
      addResult("success", "Hybrid file storage service initialized");

      // Test user data
      const testUser = {
        id: 999,
        name: "Test User " + Date.now(),
        email: `test${Date.now()}@example.com`,
        password: "testpass123",
        createdAt: new Date().toISOString(),
        reminders: [],
        settings: { theme: "dark", notifications: true },
        teamsData: { team1: "data" },
      };

      // Add user
      const userAdded = await hybridFileStorageService.addUserToFile(testUser);
      addResult("success", `User added to file: ${userAdded}`, testUser);

      // Update user
      const userUpdated = await hybridFileStorageService.updateUserInFile(
        testUser.id,
        {
          name: testUser.name + " (Updated)",
          settings: { ...testUser.settings, theme: "light" },
        }
      );
      addResult("success", `User updated in file: ${userUpdated}`);

      // Get file statistics
      const fileStats = hybridFileStorageService.getFileStatistics();
      setStats(fileStats);
      addResult("info", "File statistics retrieved", fileStats);
    } catch (error) {
      addResult("error", `User operations failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testReminderOperations = async () => {
    setLoading(true);
    addResult("info", "Starting reminder operations test...");

    try {
      const userId = 999;
      const testReminder = {
        id: Date.now(),
        title: "Test Reminder " + new Date().toLocaleString(),
        description: "This is a test reminder created by the test page",
        datetime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        priority: "high",
        active: true,
        createdAt: new Date().toISOString(),
      };

      // Add reminder
      const reminderAdded = await hybridFileStorageService.addReminderToFile(
        userId,
        testReminder
      );
      addResult(
        "success",
        `Reminder added to file: ${reminderAdded}`,
        testReminder
      );

      // Update reminder
      const updatedReminder = {
        ...testReminder,
        title: testReminder.title + " (Updated)",
        description: "This reminder has been updated",
        priority: "medium",
      };

      const reminderUpdated =
        await hybridFileStorageService.updateReminderInFile(
          userId,
          testReminder.id,
          updatedReminder
        );
      addResult("success", `Reminder updated in file: ${reminderUpdated}`);

      // Sync multiple reminders
      const multipleReminders = [
        updatedReminder,
        {
          id: Date.now() + 1,
          title: "Bulk Reminder 1",
          description: "First bulk reminder",
          datetime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          priority: "low",
          active: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: Date.now() + 2,
          title: "Bulk Reminder 2",
          description: "Second bulk reminder",
          datetime: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          priority: "medium",
          active: true,
          createdAt: new Date().toISOString(),
        },
      ];

      const bulkSynced = await hybridFileStorageService.syncUserRemindersToFile(
        userId,
        "Test User " + Date.now(),
        `test${Date.now()}@example.com`,
        multipleReminders
      );
      addResult("success", `Bulk reminders synced: ${bulkSynced}`, {
        count: multipleReminders.length,
      });

      // Get updated statistics
      const fileStats = hybridFileStorageService.getFileStatistics();
      setStats(fileStats);
      addResult("info", "Updated file statistics", fileStats);
    } catch (error) {
      addResult("error", `Reminder operations failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testFullSync = async () => {
    setLoading(true);
    addResult("info", "Starting full sync test...");

    try {
      const synced = await hybridFileStorageService.syncAllToFiles();
      addResult("success", `Full sync completed: ${synced}`);

      // Get final statistics
      const fileStats = hybridFileStorageService.getFileStatistics();
      setStats(fileStats);
      addResult("info", "Final file statistics", fileStats);
    } catch (error) {
      addResult("error", `Full sync failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const exportFiles = () => {
    try {
      const usersJson = hybridFileStorageService.exportUsersJsonFile();
      const remindersJson = hybridFileStorageService.exportRemindersJsonFile();

      // Create and download users file
      const usersBlob = new Blob([usersJson], { type: "application/json" });
      const usersUrl = URL.createObjectURL(usersBlob);
      const usersLink = document.createElement("a");
      usersLink.href = usersUrl;
      usersLink.download = `users-export-${
        new Date().toISOString().split("T")[0]
      }.json`;
      usersLink.click();

      // Create and download reminders file
      const remindersBlob = new Blob([remindersJson], {
        type: "application/json",
      });
      const remindersUrl = URL.createObjectURL(remindersBlob);
      const remindersLink = document.createElement("a");
      remindersLink.href = remindersUrl;
      remindersLink.download = `reminders-export-${
        new Date().toISOString().split("T")[0]
      }.json`;
      remindersLink.click();

      addResult("success", "JSON files exported successfully");
    } catch (error) {
      addResult("error", `Export failed: ${error}`);
    }
  };

  const getResultColor = (type: string) => {
    switch (type) {
      case "success":
        return "success";
      case "error":
        return "error";
      case "info":
        return "info";
      default:
        return "default";
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h4" gutterBottom>
        🧪 Hybrid File Storage Test Page
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        This page tests the dual storage system that saves data to both
        localStorage and actual JSON files in the project directory via the API
        endpoint.
      </Typography>

      <Grid container spacing={3}>
        {/* Test Controls */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Controls
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={testUserOperations}
                    disabled={loading}
                    sx={{ mb: 1 }}
                  >
                    Test Users
                  </Button>
                </Grid>

                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={testReminderOperations}
                    disabled={loading}
                    sx={{ mb: 1 }}
                  >
                    Test Reminders
                  </Button>
                </Grid>

                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={testFullSync}
                    disabled={loading}
                    sx={{ mb: 1 }}
                  >
                    Full Sync
                  </Button>
                </Grid>

                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={exportFiles}
                    disabled={loading}
                    sx={{ mb: 1 }}
                  >
                    Export Files
                  </Button>
                </Grid>

                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="text"
                    onClick={clearResults}
                    sx={{ mb: 1 }}
                  >
                    Clear Results
                  </Button>
                </Grid>
              </Grid>

              {loading && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                  <CircularProgress />
                </Box>
              )}
            </CardContent>
          </Card>

          {/* File Statistics */}
          {stats && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📊 File Statistics
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Users File Size
                    </Typography>
                    <Typography variant="h6">
                      {(stats.usersFile.size / 1024).toFixed(2)} KB
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Total Users
                    </Typography>
                    <Typography variant="h6">
                      {stats.usersFile.users}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Reminders File Size
                    </Typography>
                    <Typography variant="h6">
                      {(stats.remindersFile.size / 1024).toFixed(2)} KB
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Total Reminders
                    </Typography>
                    <Typography variant="h6">
                      {stats.remindersFile.totalReminders}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Last Updated
                    </Typography>
                    <Typography variant="body2">
                      {new Date(stats.lastUpdated).toLocaleString()}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Test Results */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📋 Test Results
              </Typography>

              <Box sx={{ maxHeight: 500, overflow: "auto" }}>
                {results.length === 0 ? (
                  <Typography
                    color="text.secondary"
                    sx={{ fontStyle: "italic" }}
                  >
                    No test results yet. Run some tests to see the output.
                  </Typography>
                ) : (
                  results.map((result, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 1,
                        }}
                      >
                        <Chip
                          size="small"
                          label={result.type.toUpperCase()}
                          color={getResultColor(result.type) as any}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {result.timestamp}
                        </Typography>
                      </Box>

                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {result.message}
                      </Typography>

                      {result.data && (
                        <Box
                          sx={{
                            bgcolor: "grey.100",
                            p: 1,
                            borderRadius: 1,
                            fontSize: "0.75rem",
                            fontFamily: "monospace",
                            overflow: "auto",
                          }}
                        >
                          <pre>{JSON.stringify(result.data, null, 2)}</pre>
                        </Box>
                      )}

                      {index < results.length - 1 && <Divider sx={{ mt: 1 }} />}
                    </Box>
                  ))
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>How it works:</strong> This test page demonstrates the dual
          storage system. All operations save data to both localStorage and
          actual JSON files in the
          <code> src/data/</code> directory via the API endpoint. Check the
          browser console for detailed logs and the project directory for the
          actual JSON files.
        </Typography>
      </Alert>
    </Box>
  );
}
