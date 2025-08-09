// Hybrid file and localStorage service
// Manages both localStorage and simulates file operations with download/upload

import type {
  User,
  UsersJsonStructure,
  RemindersJsonStructure,
  FileStatistics,
  ApiResponse,
} from "../types/shared";

class HybridFileStorageService {
  private readonly USERS_STORAGE_KEY = "nudge_users_json";
  private readonly REMINDERS_STORAGE_KEY = "nudge_reminders_json";
  private readonly FILE_SYNC_KEY = "nudge_file_sync_data";

  // Initialize file structure in localStorage
  initializeFileStructures(): void {
    // Initialize users structure if not exists
    if (!localStorage.getItem(this.USERS_STORAGE_KEY)) {
      const defaultUsers: UsersJsonStructure = {
        users: [
          {
            id: 1,
            name: "Demo User",
            email: "demo@example.com",
            password: "password123",
            createdAt: "2025-08-05T00:00:00.000Z",
            reminders: [],
            settings: {},
            teamsData: {},
          },
        ],
      };
      localStorage.setItem(
        this.USERS_STORAGE_KEY,
        JSON.stringify(defaultUsers, null, 2)
      );
    }

    // Initialize reminders structure if not exists
    if (!localStorage.getItem(this.REMINDERS_STORAGE_KEY)) {
      const defaultReminders: RemindersJsonStructure = {
        users: {},
        meta: {
          lastUpdated: new Date().toISOString(),
          version: "1.0",
          totalReminders: 0,
        },
      };
      localStorage.setItem(
        this.REMINDERS_STORAGE_KEY,
        JSON.stringify(defaultReminders, null, 2)
      );
    }
  }

  // Load users from localStorage (simulating file read)
  loadUsersFromStorage(): UsersJsonStructure {
    try {
      const data = localStorage.getItem(this.USERS_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error loading users from storage:", error);
    }

    return { users: [] };
  }

  // Save users to localStorage and actual file system
  async saveUsersToStorage(usersData: UsersJsonStructure): Promise<boolean> {
    try {
      // Save to localStorage
      localStorage.setItem(
        this.USERS_STORAGE_KEY,
        JSON.stringify(usersData, null, 2)
      );
      console.log("✅ Users saved to localStorage");

      // Save to actual file system via API
      await this.writeToActualFile("users.json", usersData);

      return true;
    } catch (error) {
      console.error("Error saving users to storage:", error);
      return false;
    }
  }

  // Load reminders from localStorage (simulating file read)
  loadRemindersFromStorage(): RemindersJsonStructure {
    try {
      const data = localStorage.getItem(this.REMINDERS_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error loading reminders from storage:", error);
    }

    return {
      users: {},
      meta: {
        lastUpdated: new Date().toISOString(),
        version: "1.0",
        totalReminders: 0,
      },
    };
  }

  // Write data to actual file system via API
  private async writeToActualFile(filename: string, data: any): Promise<void> {
    try {
      const response = await fetch("/api/file-storage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename, data }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(
          `📁 Successfully wrote ${filename} to actual file system:`,
          result.message
        );
      } else {
        const error = await response.json();
        console.error(
          `❌ Failed to write ${filename} to file system:`,
          error.error
        );
      }
    } catch (error) {
      console.error(`❌ Network error writing ${filename}:`, error);
    }
  }

  // Save reminders to localStorage and actual file system
  async saveRemindersToStorage(
    remindersData: RemindersJsonStructure
  ): Promise<boolean> {
    try {
      // Update meta information
      remindersData.meta.lastUpdated = new Date().toISOString();
      remindersData.meta.totalReminders =
        this.calculateTotalReminders(remindersData);

      // Save to localStorage
      localStorage.setItem(
        this.REMINDERS_STORAGE_KEY,
        JSON.stringify(remindersData, null, 2)
      );
      console.log("✅ Reminders saved to localStorage");

      // Save to actual file system via API
      await this.writeToActualFile("reminders.json", remindersData);

      return true;
    } catch (error) {
      console.error("Error saving reminders to storage:", error);
      return false;
    }
  }

  // Calculate total reminders across all users
  private calculateTotalReminders(data: RemindersJsonStructure): number {
    return Object.values(data.users).reduce((total, user: any) => {
      return total + (user.reminders?.length || 0);
    }, 0);
  }

  // Trigger automatic file download (simulates writing to project directory)
  private triggerFileDownload(filename: string, data: any): void {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split("T")[0]}`;
    a.style.display = "none";

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(
      `📁 Auto-downloaded ${filename} to simulate file write to src/data/`
    );
  }

  // Add user to file system
  async addUserToFile(user: User): Promise<boolean> {
    const usersData = this.loadUsersFromStorage();

    // Check if user already exists
    const existingUserIndex = usersData.users.findIndex(
      (u) => u.id === user.id
    );
    if (existingUserIndex !== -1) {
      console.log(`User ${user.id} already exists, updating...`);
      usersData.users[existingUserIndex] = user;
    } else {
      usersData.users.push(user);
      console.log(
        `➕ Adding new user ${user.name} (ID: ${user.id}) to users.json`
      );
    }

    return await this.saveUsersToStorage(usersData);
  }

  // Update user in file system
  async updateUserInFile(
    userId: number,
    updates: Partial<User>
  ): Promise<boolean> {
    const usersData = this.loadUsersFromStorage();
    const userIndex = usersData.users.findIndex((u) => u.id === userId);

    if (userIndex === -1) {
      console.error(`User ${userId} not found in file`);
      return false;
    }

    usersData.users[userIndex] = { ...usersData.users[userIndex], ...updates };
    console.log(`📝 Updated user ${userId} in users.json`);

    return await this.saveUsersToStorage(usersData);
  }

  // Sync user reminders to file system
  async syncUserRemindersToFile(
    userId: number,
    userName: string,
    userEmail: string,
    reminders: any[]
  ): Promise<boolean> {
    const remindersData = this.loadRemindersFromStorage();
    const userKey = userId.toString();

    remindersData.users[userKey] = {
      id: userId,
      name: userName,
      email: userEmail,
      reminders: reminders,
      settings: remindersData.users[userKey]?.settings || {},
      teamsData: remindersData.users[userKey]?.teamsData || {},
      lastUpdated: new Date().toISOString(),
    };

    console.log(
      `💾 Synced ${reminders.length} reminders for user ${userName} (ID: ${userId}) to reminders.json`
    );

    return await this.saveRemindersToStorage(remindersData);
  }

  // Add single reminder to file system
  async addReminderToFile(userId: number, reminder: any): Promise<boolean> {
    const remindersData = this.loadRemindersFromStorage();
    const userKey = userId.toString();

    if (!remindersData.users[userKey]) {
      // Initialize user if doesn't exist
      remindersData.users[userKey] = {
        id: userId,
        name: `User ${userId}`,
        email: `user${userId}@example.com`,
        reminders: [],
        settings: {},
        teamsData: {},
        lastUpdated: new Date().toISOString(),
      };
    }

    remindersData.users[userKey].reminders.push(reminder);
    remindersData.users[userKey].lastUpdated = new Date().toISOString();

    console.log(
      `➕ Added reminder "${reminder.title}" for user ${userId} to reminders.json`
    );

    return await this.saveRemindersToStorage(remindersData);
  }

  // Update reminder in file system
  async updateReminderInFile(
    userId: number,
    reminderId: number,
    updatedReminder: any
  ): Promise<boolean> {
    const remindersData = this.loadRemindersFromStorage();
    const userKey = userId.toString();

    if (
      remindersData.users[userKey] &&
      remindersData.users[userKey].reminders
    ) {
      const reminderIndex = remindersData.users[userKey].reminders.findIndex(
        (r: any) => r.id === reminderId
      );

      if (reminderIndex !== -1) {
        remindersData.users[userKey].reminders[reminderIndex] = updatedReminder;
        remindersData.users[userKey].lastUpdated = new Date().toISOString();

        console.log(
          `📝 Updated reminder ${reminderId} for user ${userId} in reminders.json`
        );
        return await this.saveRemindersToStorage(remindersData);
      }
    }

    return false;
  }

  // Delete reminder from file system
  async deleteReminderFromFile(
    userId: number,
    reminderId: number
  ): Promise<boolean> {
    const remindersData = this.loadRemindersFromStorage();
    const userKey = userId.toString();

    if (
      remindersData.users[userKey] &&
      remindersData.users[userKey].reminders
    ) {
      const originalLength = remindersData.users[userKey].reminders.length;
      remindersData.users[userKey].reminders = remindersData.users[
        userKey
      ].reminders.filter((r: any) => r.id !== reminderId);

      if (remindersData.users[userKey].reminders.length < originalLength) {
        remindersData.users[userKey].lastUpdated = new Date().toISOString();
        console.log(
          `🗑️ Deleted reminder ${reminderId} for user ${userId} from reminders.json`
        );
        return await this.saveRemindersToStorage(remindersData);
      }
    }

    return false;
  }

  // Delete user from both files
  async deleteUserFromFiles(userId: number): Promise<boolean> {
    let success = true;

    // Remove from users.json
    const usersData = this.loadUsersFromStorage();
    const userIndex = usersData.users.findIndex((u) => u.id === userId);
    if (userIndex !== -1) {
      usersData.users.splice(userIndex, 1);
      success = success && (await this.saveUsersToStorage(usersData));
      console.log(`🗑️ Removed user ${userId} from users.json`);
    }

    // Remove from reminders.json
    const remindersData = this.loadRemindersFromStorage();
    const userKey = userId.toString();
    if (remindersData.users[userKey]) {
      delete remindersData.users[userKey];
      success = success && (await this.saveRemindersToStorage(remindersData));
      console.log(`🗑️ Removed user ${userId} data from reminders.json`);
    }

    return success;
  }

  // Get file statistics
  getFileStatistics(): FileStatistics {
    const usersData = this.loadUsersFromStorage();
    const remindersData = this.loadRemindersFromStorage();

    const usersDataString = JSON.stringify(usersData);
    const remindersDataString = JSON.stringify(remindersData);

    return {
      usersFile: {
        size: new Blob([usersDataString]).size,
        users: usersData.users.length,
      },
      remindersFile: {
        size: new Blob([remindersDataString]).size,
        totalReminders: remindersData.meta.totalReminders,
      },
      lastUpdated: remindersData.meta.lastUpdated,
    };
  }

  // Export users.json file
  exportUsersJsonFile(): string {
    const usersData = this.loadUsersFromStorage();
    return JSON.stringify(usersData, null, 2);
  }

  // Export reminders.json file
  exportRemindersJsonFile(): string {
    const remindersData = this.loadRemindersFromStorage();
    return JSON.stringify(remindersData, null, 2);
  }

  // Manual sync all data to files
  async syncAllToFiles(): Promise<boolean> {
    const usersData = this.loadUsersFromStorage();
    const remindersData = this.loadRemindersFromStorage();

    const usersSuccess = await this.saveUsersToStorage(usersData);
    const remindersSuccess = await this.saveRemindersToStorage(remindersData);

    if (usersSuccess && remindersSuccess) {
      console.log("🔄 Successfully synced all data to JSON files");
      return true;
    } else {
      console.error("❌ Failed to sync some data to JSON files");
      return false;
    }
  }

  // Initialize the service
  initialize(): void {
    this.initializeFileStructures();
    console.log("🚀 Hybrid file storage service initialized");
    console.log(
      "📁 Users and reminders will be captured in JSON files alongside localStorage"
    );
  }
}

// Export singleton instance
export const hybridFileStorageService = new HybridFileStorageService();
