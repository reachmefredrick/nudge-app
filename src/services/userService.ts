// Simple in-memory user storage service
// In a real application, this would be replaced with actual API calls

import { hybridFileStorageService } from "./hybridFileStorageService";
import type {
  User,
  UserRegistration,
  UserLogin,
  AuthUser,
  UsersJsonStructure,
} from "../types/shared";

class UserService {
  private users: User[] = [];
  private isClient = typeof window !== "undefined";
  private readonly USERS_STORAGE_KEY = "nudge_users_json";

  constructor() {
    this.loadUsers();
    // Initialize hybrid file storage
    if (this.isClient) {
      hybridFileStorageService.initialize();
    }
  }

  private loadUsers() {
    if (!this.isClient) {
      // On server side, use default data
      this.users = [
        {
          id: 1,
          name: "Demo User",
          email: "demo@example.com",
          password: "password123",
          createdAt: new Date().toISOString(),
          reminders: [],
          settings: {},
          teamsData: {},
        },
      ];
      return;
    }

    // Load users from localStorage with new JSON structure
    const storedUsersJson = localStorage.getItem(this.USERS_STORAGE_KEY);
    if (storedUsersJson) {
      try {
        const usersData: UsersJsonStructure = JSON.parse(storedUsersJson);
        this.users = usersData.users || [];
      } catch (error) {
        console.error("Error parsing stored users JSON:", error);
        this.initializeDefaultUsers();
      }
    } else {
      // Try to migrate from old localStorage format
      this.migrateOldUsersData();
    }

    // Ensure we have at least the demo user
    if (this.users.length === 0) {
      this.initializeDefaultUsers();
    }
  }

  private migrateOldUsersData() {
    const oldStoredUsers = localStorage.getItem("users");
    if (oldStoredUsers) {
      try {
        const oldUsers = JSON.parse(oldStoredUsers);
        // Convert old format to new format with additional fields
        this.users = oldUsers.map((user: any) => ({
          ...user,
          reminders: user.reminders || [],
          settings: user.settings || {},
          teamsData: user.teamsData || {},
        }));
        this.saveUsers();
        // Remove old storage
        localStorage.removeItem("users");
        console.log("Successfully migrated users from old format");
      } catch (error) {
        console.error("Error migrating old users data:", error);
        this.initializeDefaultUsers();
      }
    } else {
      this.initializeDefaultUsers();
    }
  }

  private initializeDefaultUsers() {
    this.users = [
      {
        id: 1,
        name: "Demo User",
        email: "demo@example.com",
        password: "password123",
        createdAt: new Date().toISOString(),
        reminders: [],
        settings: {},
        teamsData: {},
      },
    ];
    this.saveUsers();
  }

  private saveUsers() {
    if (this.isClient) {
      const usersData: UsersJsonStructure = {
        users: this.users,
      };
      localStorage.setItem(
        this.USERS_STORAGE_KEY,
        JSON.stringify(usersData, null, 2)
      );
    }
  }

  private generateToken(): string {
    return (
      "token_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now()
    );
  }

  private generateId(): number {
    return this.users.length > 0
      ? Math.max(...this.users.map((u) => u.id)) + 1
      : 1;
  }

  async login(credentials: UserLogin): Promise<AuthUser> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const user = this.users.find(
          (u) =>
            u.email.toLowerCase() === credentials.email.toLowerCase() &&
            u.password === credentials.password
        );

        if (user) {
          const authUser: AuthUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            token: this.generateToken(),
          };
          resolve(authUser);
        } else {
          reject(new Error("Invalid email or password"));
        }
      }, 1000); // Simulate API delay
    });
  }

  async register(userData: UserRegistration): Promise<AuthUser> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Check if user already exists
        const existingUser = this.users.find(
          (u) => u.email.toLowerCase() === userData.email.toLowerCase()
        );

        if (existingUser) {
          reject(new Error("User with this email already exists"));
          return;
        }

        // Validate input
        if (!userData.name.trim()) {
          reject(new Error("Name is required"));
          return;
        }

        if (!userData.email.trim() || !this.isValidEmail(userData.email)) {
          reject(new Error("Valid email is required"));
          return;
        }

        if (userData.password.length < 6) {
          reject(new Error("Password must be at least 6 characters long"));
          return;
        }

        // Create new user with complete structure
        const newUser: User = {
          id: this.generateId(),
          name: userData.name.trim(),
          email: userData.email.toLowerCase().trim(),
          password: userData.password,
          createdAt: new Date().toISOString(),
          reminders: [],
          settings: {},
          teamsData: {},
        };

        this.users.push(newUser);
        this.saveUsers();

        // Also save to hybrid file storage for actual JSON file capture
        if (this.isClient) {
          hybridFileStorageService.addUserToFile(newUser).catch((error) => {
            console.error("Failed to save user to file storage:", error);
          });
        }

        console.log(`✅ New user registered and saved to users.json:`, {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          createdAt: newUser.createdAt,
        });

        const authUser: AuthUser = {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          token: this.generateToken(),
        };

        resolve(authUser);
      }, 1000); // Simulate API delay
    });
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Get all users (for admin purposes - remove in production)
  getAllUsers(): User[] {
    return this.users.map((user) => ({ ...user, password: "[HIDDEN]" })) as any;
  }

  // Update user profile
  async updateProfile(
    userId: number,
    updates: Partial<Pick<User, "name" | "email">>
  ): Promise<AuthUser> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const userIndex = this.users.findIndex((u) => u.id === userId);

        if (userIndex === -1) {
          reject(new Error("User not found"));
          return;
        }

        // Check if email is being updated and if it already exists
        if (updates.email && updates.email !== this.users[userIndex].email) {
          const emailExists = this.users.some(
            (u) =>
              u.id !== userId &&
              u.email.toLowerCase() === updates.email!.toLowerCase()
          );

          if (emailExists) {
            reject(new Error("Email already in use"));
            return;
          }
        }

        // Update user
        if (updates.name) this.users[userIndex].name = updates.name.trim();
        if (updates.email)
          this.users[userIndex].email = updates.email.toLowerCase().trim();

        this.saveUsers();

        const authUser: AuthUser = {
          id: this.users[userIndex].id,
          name: this.users[userIndex].name,
          email: this.users[userIndex].email,
          token: this.generateToken(),
        };

        resolve(authUser);
      }, 500);
    });
  }

  // Change password
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const user = this.users.find((u) => u.id === userId);

        if (!user) {
          reject(new Error("User not found"));
          return;
        }

        if (user.password !== currentPassword) {
          reject(new Error("Current password is incorrect"));
          return;
        }

        if (newPassword.length < 6) {
          reject(new Error("New password must be at least 6 characters long"));
          return;
        }

        user.password = newPassword;
        this.saveUsers();
        resolve();
      }, 500);
    });
  }

  // Get user by ID (for internal use)
  getUserById(userId: number): User | null {
    return this.users.find((u) => u.id === userId) || null;
  }

  // Export all users data in JSON format
  exportUsersJson(): string {
    const usersData: UsersJsonStructure = {
      users: this.users,
    };
    return JSON.stringify(usersData, null, 2);
  }

  // Get users statistics
  getUsersStats(): {
    totalUsers: number;
    recentUsers: number;
    activeUsersWithReminders: number;
  } {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentUsers = this.users.filter(
      (user) => new Date(user.createdAt) >= sevenDaysAgo
    ).length;

    const activeUsersWithReminders = this.users.filter(
      (user) => user.reminders && user.reminders.length > 0
    ).length;

    return {
      totalUsers: this.users.length,
      recentUsers,
      activeUsersWithReminders,
    };
  }

  // Update user reminders count (for sync with storage service)
  updateUserReminders(userId: number, reminders: any[]): void {
    const user = this.users.find((u) => u.id === userId);
    if (user) {
      user.reminders = reminders;
      this.saveUsers();
    }
  }

  // Update user settings (for sync with storage service)
  updateUserSettings(userId: number, settings: any): void {
    const user = this.users.find((u) => u.id === userId);
    if (user) {
      user.settings = settings;
      this.saveUsers();
    }
  }

  // Update user teams data (for sync with storage service)
  updateUserTeamsData(userId: number, teamsData: any): void {
    const user = this.users.find((u) => u.id === userId);
    if (user) {
      user.teamsData = teamsData;
      this.saveUsers();
    }
  }

  // Get current JSON structure
  getUsersJsonStructure(): UsersJsonStructure {
    return {
      users: this.users,
    };
  }
}

export const userService = new UserService();
export type { AuthUser, UserRegistration, UserLogin, User, UsersJsonStructure };
