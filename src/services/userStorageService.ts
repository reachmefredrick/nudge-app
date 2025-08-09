// User-specific JSON file-based storage service
// Manages data storage per user using structured JSON format

import { userService } from "./userService";
import { fileStorageService } from "./fileStorageService";
import { hybridFileStorageService } from "./hybridFileStorageService";
import type { RemindersJsonStructure, UserRemindersData } from "@/types/shared";

interface UserStorageService {
  saveUserReminders: (userId: number, reminders: any[]) => void;
  getUserReminders: (userId: number) => any[];
  clearUserData: (userId: number) => void;
  getAllUserKeys: (userId: number) => string[];
  saveUserSettings: (userId: number, settings: any) => void;
  getUserSettings: (userId: number) => any;
  saveUserTeamsData: (userId: number, teamsData: any) => void;
  getUserTeamsData: (userId: number) => any;
  getUserStorageStats: (userId: number) => {
    totalKeys: number;
    totalSize: number;
    remindersCount: number;
  };
  migrateGlobalDataToUser: (userId: number) => void;
}

class JsonFileStorageService implements UserStorageService {
  private readonly STORAGE_KEY = "nudge_reminders_json";

  // Load the entire JSON structure from localStorage
  private loadJsonData(): RemindersJsonStructure {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error("Error parsing stored JSON data:", error);
      }
    }

    // Return default structure if nothing stored or error occurred
    return {
      users: {},
      meta: {
        lastUpdated: new Date().toISOString(),
        version: "1.0",
        totalReminders: 0,
      },
    };
  }

  // Save the entire JSON structure to localStorage
  private saveJsonData(data: RemindersJsonStructure): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error saving JSON data:", error);
    }
  }

  // Ensure user exists in the JSON structure
  private ensureUserExists(
    userId: number,
    userData?: Partial<UserRemindersData>
  ): void {
    const data = this.loadJsonData();
    const userKey = userId.toString();

    if (!data.users[userKey]) {
      data.users[userKey] = {
        id: userId,
        name: userData?.name || `User ${userId}`,
        email: userData?.email || `user${userId}@example.com`,
        reminders: [],
        settings: {},
        teamsData: {},
        lastUpdated: new Date().toISOString(),
        ...userData,
      };
      this.saveJsonData(data);
    }
  }

  saveUserReminders(userId: number, reminders: any[]): void {
    this.ensureUserExists(userId);
    const data = this.loadJsonData();
    const userKey = userId.toString();
    const userData = data.users[userKey];

    data.users[userKey].reminders = reminders;
    data.users[userKey].lastUpdated = new Date().toISOString();
    this.saveJsonData(data);

    // Sync with userService
    userService.updateUserReminders(userId, reminders);

    // Sync with file storage (data/reminders.json)
    fileStorageService.syncUserRemindersToFile(userId, reminders);

    // Sync with hybrid file storage for actual JSON file capture
    hybridFileStorageService
      .syncUserRemindersToFile(userId, userData.name, userData.email, reminders)
      .catch((error) => {
        console.error("Failed to sync reminders to file storage:", error);
      });
  }
  getUserReminders(userId: number): any[] {
    this.ensureUserExists(userId);
    const data = this.loadJsonData();
    const userKey = userId.toString();

    return data.users[userKey]?.reminders || [];
  }

  saveUserSettings(userId: number, settings: any): void {
    this.ensureUserExists(userId);
    const data = this.loadJsonData();
    const userKey = userId.toString();

    data.users[userKey].settings = settings;
    data.users[userKey].lastUpdated = new Date().toISOString();
    this.saveJsonData(data);

    // Sync with userService
    userService.updateUserSettings(userId, settings);
  }
  getUserSettings(userId: number): any {
    this.ensureUserExists(userId);
    const data = this.loadJsonData();
    const userKey = userId.toString();

    return data.users[userKey]?.settings || {};
  }

  saveUserTeamsData(userId: number, teamsData: any): void {
    this.ensureUserExists(userId);
    const data = this.loadJsonData();
    const userKey = userId.toString();

    data.users[userKey].teamsData = teamsData;
    data.users[userKey].lastUpdated = new Date().toISOString();
    this.saveJsonData(data);

    // Sync with userService
    userService.updateUserTeamsData(userId, teamsData);
  }
  getUserTeamsData(userId: number): any {
    this.ensureUserExists(userId);
    const data = this.loadJsonData();
    const userKey = userId.toString();

    return data.users[userKey]?.teamsData || {};
  }

  clearUserData(userId: number): void {
    const data = this.loadJsonData();
    const userKey = userId.toString();

    if (data.users[userKey]) {
      delete data.users[userKey];
      this.saveJsonData(data);
    }
  }

  getAllUserKeys(userId: number): string[] {
    const data = this.loadJsonData();
    const userKey = userId.toString();

    if (data.users[userKey]) {
      return ["reminders", "settings", "teamsData"].filter(
        (key) => data.users[userKey][key as keyof UserRemindersData]
      );
    }

    return [];
  }

  // Utility method to migrate old global data to user-specific data
  migrateGlobalDataToUser(userId: number): void {
    // Check if user already has data in new format
    const data = this.loadJsonData();
    const userKey = userId.toString();

    if (data.users[userKey] && data.users[userKey].reminders.length > 0) {
      return; // User already has data, no need to migrate
    }

    // Migrate old reminders data from localStorage
    const oldReminders = localStorage.getItem("reminders");
    if (oldReminders) {
      try {
        const parsedReminders = JSON.parse(oldReminders);
        this.saveUserReminders(userId, parsedReminders);
        localStorage.removeItem("reminders");
      } catch (error) {
        console.error("Error migrating old reminders data:", error);
      }
    }

    // Migrate old settings data from localStorage
    const oldSettings = localStorage.getItem("settings");
    if (oldSettings) {
      try {
        const parsedSettings = JSON.parse(oldSettings);
        this.saveUserSettings(userId, parsedSettings);
        localStorage.removeItem("settings");
      } catch (error) {
        console.error("Error migrating old settings data:", error);
      }
    }

    // Migrate old teams data from localStorage
    const oldTeams = localStorage.getItem("teams");
    if (oldTeams) {
      try {
        const parsedTeams = JSON.parse(oldTeams);
        this.saveUserTeamsData(userId, parsedTeams);
        localStorage.removeItem("teams");
      } catch (error) {
        console.error("Error migrating old teams data:", error);
      }
    }
  }

  // Method to get storage usage stats
  getUserStorageStats(userId: number): {
    totalKeys: number;
    totalSize: number;
    remindersCount: number;
  } {
    const data = this.loadJsonData();
    const userKey = userId.toString();

    if (!data.users[userKey]) {
      return {
        totalKeys: 0,
        totalSize: 0,
        remindersCount: 0,
      };
    }

    const userData = data.users[userKey];
    const userKeys = this.getAllUserKeys(userId);

    // Calculate total size of user data
    const userDataString = JSON.stringify(userData);
    const totalSize = new Blob([userDataString]).size;

    return {
      totalKeys: userKeys.length,
      totalSize,
      remindersCount: userData.reminders?.length || 0,
    };
  }

  // Method to export user data in the new JSON format
  exportUserData(userId: number): UserRemindersData | null {
    const data = this.loadJsonData();
    const userKey = userId.toString();

    return data.users[userKey] || null;
  }

  // Method to get all users (for admin purposes)
  getAllUsers(): UserRemindersData[] {
    const data = this.loadJsonData();
    return Object.values(data.users);
  }

  // Method to initialize user with profile data
  initializeUser(userId: number, name: string, email: string): void {
    this.ensureUserExists(userId, { name, email });
  }

  // File-based reminder operations
  addReminderToFile(userId: number, reminder: any): void {
    fileStorageService.addReminderToFile(userId, reminder);
  }

  updateReminderInFile(
    userId: number,
    reminderId: number,
    updatedReminder: any
  ): void {
    fileStorageService.updateReminderInFile(
      userId,
      reminderId,
      updatedReminder
    );
  }

  deleteReminderFromFile(userId: number, reminderId: number): void {
    fileStorageService.deleteReminderFromFile(userId, reminderId);
  }

  // Get file statistics
  getFileStatistics(): {
    totalUsers: number;
    totalReminders: number;
    fileSize: number;
    lastUpdated: string;
  } {
    return fileStorageService.getFileStatistics();
  }

  // Export data/reminders.json content
  exportRemindersJsonFile(): string {
    return fileStorageService.exportFileDataAsJson();
  }

  // Sync all data to file
  syncAllToFile(): void {
    fileStorageService.syncAllUsersToFile();
  }

  // Method to export all data as downloadable JSON (for backup purposes)
  exportAllDataAsJson(): string {
    const data = this.loadJsonData();
    return JSON.stringify(data, null, 2);
  }

  // Method to import data from JSON string (for restore purposes)
  importDataFromJson(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString) as RemindersJsonStructure;
      this.saveJsonData(data);
      return true;
    } catch (error) {
      console.error("Error importing JSON data:", error);
      return false;
    }
  }

  // Method to get the current JSON structure for debugging
  getJsonStructure(): RemindersJsonStructure {
    return this.loadJsonData();
  }

  // Method to get combined statistics from both storage systems
  getCombinedUsersStats(): {
    usersServiceStats: any;
    storageServiceStats: {
      totalUserDataEntries: number;
      totalStorageSize: number;
    };
  } {
    const usersServiceStats = userService.getUsersStats();
    const data = this.loadJsonData();
    const totalUserDataEntries = Object.keys(data.users).length;
    const totalStorageSize = new Blob([JSON.stringify(data)]).size;

    return {
      usersServiceStats,
      storageServiceStats: {
        totalUserDataEntries,
        totalStorageSize,
      },
    };
  }

  // Method to export complete users database including all data
  exportCompleteUsersDatabase(): string {
    const remindersData = this.loadJsonData();
    const usersData = userService.getUsersJsonStructure();

    const completeDatabase = {
      meta: {
        exportDate: new Date().toISOString(),
        version: "1.0",
        description: "Complete Nudge app users database with reminders",
      },
      authentication: usersData,
      userData: remindersData,
    };

    return JSON.stringify(completeDatabase, null, 2);
  }
}

// Export singleton instance
export const userStorageService = new JsonFileStorageService();
export type { UserStorageService, UserRemindersData, RemindersJsonStructure };
