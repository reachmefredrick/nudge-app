// Simple in-memory user storage service
// In a real application, this would be replaced with actual API calls

interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

interface UserRegistration {
  name: string;
  email: string;
  password: string;
}

interface UserLogin {
  email: string;
  password: string;
}

interface AuthUser {
  id: number;
  name: string;
  email: string;
  token: string;
}

class UserService {
  private users: User[] = [];
  private isClient = typeof window !== "undefined";

  constructor() {
    this.loadUsers();
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
        },
      ];
      return;
    }

    // Load users from localStorage or initialize with default data
    const storedUsers = localStorage.getItem("users");
    if (storedUsers) {
      this.users = JSON.parse(storedUsers);
    } else {
      // Initialize with default demo user
      this.users = [
        {
          id: 1,
          name: "Demo User",
          email: "demo@example.com",
          password: "password123",
          createdAt: new Date().toISOString(),
        },
      ];
      this.saveUsers();
    }
  }

  private saveUsers() {
    if (this.isClient) {
      localStorage.setItem("users", JSON.stringify(this.users));
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

        // Create new user
        const newUser: User = {
          id: this.generateId(),
          name: userData.name.trim(),
          email: userData.email.toLowerCase().trim(),
          password: userData.password,
          createdAt: new Date().toISOString(),
        };

        this.users.push(newUser);
        this.saveUsers();

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
}

export const userService = new UserService();
export type { AuthUser, UserRegistration, UserLogin };
