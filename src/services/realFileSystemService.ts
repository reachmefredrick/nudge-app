// Real file system operations for JSON files
// Handles writing to actual files in src/data/ directory

import { promises as fs } from "fs";
import path from "path";

interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  createdAt: string;
  reminders: any[];
  settings: any;
  teamsData: any;
}

interface UsersJsonStructure {
  users: User[];
}

interface RemindersJsonStructure {
  users: { [key: string]: any };
  meta: {
    lastUpdated: string;
    version: string;
    totalReminders: number;
  };
}

class RealFileSystemService {
  private readonly USERS_FILE_PATH = path.join(
    process.cwd(),
    "src",
    "data",
    "users.json"
  );
  private readonly REMINDERS_FILE_PATH = path.join(
    process.cwd(),
    "src",
    "data",
    "reminders.json"
  );

  // Check if we're running in a Node.js environment
  private isNodeEnvironment(): boolean {
    return typeof window === "undefined" && typeof process !== "undefined";
  }

  // Load users from actual file
  async loadUsersFromFile(): Promise<UsersJsonStructure> {
    if (!this.isNodeEnvironment()) {
      console.warn("File operations not available in browser environment");
      return { users: [] };
    }

    try {
      const data = await fs.readFile(this.USERS_FILE_PATH, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Error loading users from file:", error);
      return { users: [] };
    }
  }

  // Save users to actual file
  async saveUsersToFile(usersData: UsersJsonStructure): Promise<boolean> {
    if (!this.isNodeEnvironment()) {
      console.warn("File operations not available in browser environment");
      return false;
    }

    try {
      const jsonData = JSON.stringify(usersData, null, 2);
      await fs.writeFile(this.USERS_FILE_PATH, jsonData, "utf8");
      console.log("✅ Users successfully saved to src/data/users.json");
      return true;
    } catch (error) {
      console.error("Error saving users to file:", error);
      return false;
    }
  }

  // Load reminders from actual file
  async loadRemindersFromFile(): Promise<RemindersJsonStructure> {
    if (!this.isNodeEnvironment()) {
      console.warn("File operations not available in browser environment");
      return {
        users: {},
        meta: {
          lastUpdated: new Date().toISOString(),
          version: "1.0",
          totalReminders: 0,
        },
      };
    }

    try {
      const data = await fs.readFile(this.REMINDERS_FILE_PATH, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Error loading reminders from file:", error);
      return {
        users: {},
        meta: {
          lastUpdated: new Date().toISOString(),
          version: "1.0",
          totalReminders: 0,
        },
      };
    }
  }

  // Save reminders to actual file
  async saveRemindersToFile(
    remindersData: RemindersJsonStructure
  ): Promise<boolean> {
    if (!this.isNodeEnvironment()) {
      console.warn("File operations not available in browser environment");
      return false;
    }

    try {
      // Update meta information
      remindersData.meta.lastUpdated = new Date().toISOString();
      remindersData.meta.totalReminders =
        this.calculateTotalReminders(remindersData);

      const jsonData = JSON.stringify(remindersData, null, 2);
      await fs.writeFile(this.REMINDERS_FILE_PATH, jsonData, "utf8");
      console.log("✅ Reminders successfully saved to src/data/reminders.json");
      return true;
    } catch (error) {
      console.error("Error saving reminders to file:", error);
      return false;
    }
  }

  // Calculate total reminders across all users
  private calculateTotalReminders(data: RemindersJsonStructure): number {
    return Object.values(data.users).reduce((total, user: any) => {
      return total + (user.reminders?.length || 0);
    }, 0);
  }

  // Add user to actual users.json file
  async addUserToFile(user: User): Promise<boolean> {
    const usersData = await this.loadUsersFromFile();

    // Check if user already exists
    const existingUser = usersData.users.find((u) => u.id === user.id);
    if (existingUser) {
      console.log(`User ${user.id} already exists in file, updating...`);
      const userIndex = usersData.users.findIndex((u) => u.id === user.id);
      usersData.users[userIndex] = user;
    } else {
      usersData.users.push(user);
      console.log(
        `➕ Adding new user ${user.name} (ID: ${user.id}) to src/data/users.json`
      );
    }

    return await this.saveUsersToFile(usersData);
  }

  // Update user in actual users.json file
  async updateUserInFile(
    userId: number,
    updates: Partial<User>
  ): Promise<boolean> {
    const usersData = await this.loadUsersFromFile();
    const userIndex = usersData.users.findIndex((u) => u.id === userId);

    if (userIndex === -1) {
      console.error(`User ${userId} not found in file`);
      return false;
    }

    usersData.users[userIndex] = { ...usersData.users[userIndex], ...updates };
    console.log(`📝 Updated user ${userId} in src/data/users.json`);

    return await this.saveUsersToFile(usersData);
  }

  // Add/Update user reminders in actual reminders.json file
  async syncUserRemindersToFile(
    userId: number,
    userName: string,
    userEmail: string,
    reminders: any[]
  ): Promise<boolean> {
    const remindersData = await this.loadRemindersFromFile();
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
      `💾 Synced ${reminders.length} reminders for user ${userName} (ID: ${userId}) to src/data/reminders.json`
    );

    return await this.saveRemindersToFile(remindersData);
  }

  // Delete user from files
  async deleteUserFromFiles(userId: number): Promise<boolean> {
    let success = true;

    // Remove from users.json
    const usersData = await this.loadUsersFromFile();
    const userIndex = usersData.users.findIndex((u) => u.id === userId);
    if (userIndex !== -1) {
      usersData.users.splice(userIndex, 1);
      success = success && (await this.saveUsersToFile(usersData));
      console.log(`🗑️ Removed user ${userId} from src/data/users.json`);
    }

    // Remove from reminders.json
    const remindersData = await this.loadRemindersFromFile();
    const userKey = userId.toString();
    if (remindersData.users[userKey]) {
      delete remindersData.users[userKey];
      success = success && (await this.saveRemindersToFile(remindersData));
      console.log(
        `🗑️ Removed user ${userId} data from src/data/reminders.json`
      );
    }

    return success;
  }

  // Get file statistics
  async getFileStatistics(): Promise<{
    usersFile: { exists: boolean; size: number; users: number };
    remindersFile: { exists: boolean; size: number; totalReminders: number };
  }> {
    if (!this.isNodeEnvironment()) {
      return {
        usersFile: { exists: false, size: 0, users: 0 },
        remindersFile: { exists: false, size: 0, totalReminders: 0 },
      };
    }

    const stats = {
      usersFile: { exists: false, size: 0, users: 0 },
      remindersFile: { exists: false, size: 0, totalReminders: 0 },
    };

    try {
      // Check users.json
      const usersStats = await fs.stat(this.USERS_FILE_PATH);
      const usersData = await this.loadUsersFromFile();
      stats.usersFile = {
        exists: true,
        size: usersStats.size,
        users: usersData.users.length,
      };
    } catch (error) {
      console.log("users.json not found or not accessible");
    }

    try {
      // Check reminders.json
      const remindersStats = await fs.stat(this.REMINDERS_FILE_PATH);
      const remindersData = await this.loadRemindersFromFile();
      stats.remindersFile = {
        exists: true,
        size: remindersStats.size,
        totalReminders: remindersData.meta.totalReminders,
      };
    } catch (error) {
      console.log("reminders.json not found or not accessible");
    }

    return stats;
  }

  // Sync all localStorage data to files
  async syncAllToFiles(
    usersData: UsersJsonStructure,
    remindersData: RemindersJsonStructure
  ): Promise<boolean> {
    const usersSuccess = await this.saveUsersToFile(usersData);
    const remindersSuccess = await this.saveRemindersToFile(remindersData);

    if (usersSuccess && remindersSuccess) {
      console.log("🔄 Successfully synced all data to JSON files");
      return true;
    } else {
      console.error("❌ Failed to sync some data to JSON files");
      return false;
    }
  }
}

// Export singleton instance
export const realFileSystemService = new RealFileSystemService();
export type { User, UsersJsonStructure, RemindersJsonStructure };
