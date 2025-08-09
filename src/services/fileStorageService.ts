// File-based storage service for data/reminders.json
// Handles saving reminders directly to the JSON file structure

import { userStorageService } from "./userStorageService";

interface FileRemindersStructure {
  users: { [key: string]: any };
  meta: {
    lastUpdated: string;
    version: string;
    totalReminders: number;
  };
}

class FileStorageService {
  private readonly FILE_SYNC_KEY = "nudge_file_sync_data";

  // Load the file-synced data from localStorage (simulates file operations)
  private loadFileData(): FileRemindersStructure {
    const stored = localStorage.getItem(this.FILE_SYNC_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error("Error parsing file sync data:", error);
      }
    }

    // Return default structure
    return {
      users: {},
      meta: {
        lastUpdated: new Date().toISOString(),
        version: "1.0",
        totalReminders: 0,
      },
    };
  }

  // Save data to file-sync storage (simulates writing to data/reminders.json)
  private saveFileData(data: FileRemindersStructure): void {
    try {
      // Update meta information
      data.meta.lastUpdated = new Date().toISOString();
      data.meta.totalReminders = this.calculateTotalReminders(data);

      // Save to localStorage (simulates file write)
      localStorage.setItem(this.FILE_SYNC_KEY, JSON.stringify(data, null, 2));

      console.log("💾 Reminders synced to data/reminders.json structure:", {
        totalUsers: Object.keys(data.users).length,
        totalReminders: data.meta.totalReminders,
        lastUpdated: data.meta.lastUpdated,
      });
    } catch (error) {
      console.error("Error saving file sync data:", error);
    }
  }

  // Calculate total reminders across all users
  private calculateTotalReminders(data: FileRemindersStructure): number {
    return Object.values(data.users).reduce((total, user: any) => {
      return total + (user.reminders?.length || 0);
    }, 0);
  }

  // Sync user reminders to file structure
  syncUserRemindersToFile(userId: number, reminders: any[]): void {
    const fileData = this.loadFileData();
    const userKey = userId.toString();

    // Get user info from userService
    const userInfo = userStorageService.exportUserData(userId);

    if (userInfo) {
      fileData.users[userKey] = {
        id: userId,
        name: userInfo.name,
        email: userInfo.email,
        reminders: reminders,
        settings: userInfo.settings || {},
        teamsData: userInfo.teamsData || {},
        lastUpdated: new Date().toISOString(),
      };

      this.saveFileData(fileData);
    }
  }

  // Get all reminders from file structure
  getAllRemindersFromFile(): FileRemindersStructure {
    return this.loadFileData();
  }

  // Get user reminders from file structure
  getUserRemindersFromFile(userId: number): any[] {
    const fileData = this.loadFileData();
    const userKey = userId.toString();

    return fileData.users[userKey]?.reminders || [];
  }

  // Update reminder in file structure
  updateReminderInFile(
    userId: number,
    reminderId: number,
    updatedReminder: any
  ): void {
    const fileData = this.loadFileData();
    const userKey = userId.toString();

    if (fileData.users[userKey] && fileData.users[userKey].reminders) {
      const reminderIndex = fileData.users[userKey].reminders.findIndex(
        (r: any) => r.id === reminderId
      );

      if (reminderIndex !== -1) {
        fileData.users[userKey].reminders[reminderIndex] = updatedReminder;
        fileData.users[userKey].lastUpdated = new Date().toISOString();
        this.saveFileData(fileData);

        console.log(
          `📝 Updated reminder ${reminderId} for user ${userId} in data/reminders.json`
        );
      }
    }
  }

  // Add reminder to file structure
  addReminderToFile(userId: number, reminder: any): void {
    const fileData = this.loadFileData();
    const userKey = userId.toString();

    if (!fileData.users[userKey]) {
      // Initialize user if doesn't exist
      const userInfo = userStorageService.exportUserData(userId);
      fileData.users[userKey] = {
        id: userId,
        name: userInfo?.name || `User ${userId}`,
        email: userInfo?.email || `user${userId}@example.com`,
        reminders: [],
        settings: {},
        teamsData: {},
        lastUpdated: new Date().toISOString(),
      };
    }

    fileData.users[userKey].reminders.push(reminder);
    fileData.users[userKey].lastUpdated = new Date().toISOString();
    this.saveFileData(fileData);

    console.log(
      `➕ Added reminder "${reminder.title}" for user ${userId} to data/reminders.json`
    );
  }

  // Delete reminder from file structure
  deleteReminderFromFile(userId: number, reminderId: number): void {
    const fileData = this.loadFileData();
    const userKey = userId.toString();

    if (fileData.users[userKey] && fileData.users[userKey].reminders) {
      const originalLength = fileData.users[userKey].reminders.length;
      fileData.users[userKey].reminders = fileData.users[
        userKey
      ].reminders.filter((r: any) => r.id !== reminderId);

      if (fileData.users[userKey].reminders.length < originalLength) {
        fileData.users[userKey].lastUpdated = new Date().toISOString();
        this.saveFileData(fileData);

        console.log(
          `🗑️ Deleted reminder ${reminderId} for user ${userId} from data/reminders.json`
        );
      }
    }
  }

  // Clear user data from file structure
  clearUserFromFile(userId: number): void {
    const fileData = this.loadFileData();
    const userKey = userId.toString();

    if (fileData.users[userKey]) {
      delete fileData.users[userKey];
      this.saveFileData(fileData);

      console.log(
        `🧹 Cleared all data for user ${userId} from data/reminders.json`
      );
    }
  }

  // Export file data as JSON string (for download)
  exportFileDataAsJson(): string {
    const fileData = this.loadFileData();
    return JSON.stringify(fileData, null, 2);
  }

  // Import file data from JSON string
  importFileDataFromJson(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString) as FileRemindersStructure;
      this.saveFileData(data);

      console.log(
        "📥 Successfully imported data to data/reminders.json structure"
      );
      return true;
    } catch (error) {
      console.error("Error importing file data:", error);
      return false;
    }
  }

  // Get file statistics
  getFileStatistics(): {
    totalUsers: number;
    totalReminders: number;
    fileSize: number;
    lastUpdated: string;
  } {
    const fileData = this.loadFileData();
    const fileDataString = JSON.stringify(fileData);

    return {
      totalUsers: Object.keys(fileData.users).length,
      totalReminders: fileData.meta.totalReminders,
      fileSize: new Blob([fileDataString]).size,
      lastUpdated: fileData.meta.lastUpdated,
    };
  }

  // Sync all user data to file (bulk operation)
  syncAllUsersToFile(): void {
    const currentData = userStorageService.getJsonStructure();
    const fileData = this.loadFileData();

    // Sync all users from storage to file structure
    Object.keys(currentData.users).forEach((userKey) => {
      const userData = currentData.users[userKey];
      fileData.users[userKey] = {
        ...userData,
        lastUpdated: new Date().toISOString(),
      };
    });

    this.saveFileData(fileData);
    console.log("🔄 Synced all user data to data/reminders.json structure");
  }
}

// Export singleton instance
export const fileStorageService = new FileStorageService();
export type { FileRemindersStructure };
