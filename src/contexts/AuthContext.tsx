"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { userService, type AuthUser } from "@/services/userService";

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<AuthUser>;
  logout: () => void;
  loading: boolean;
  updateProfile: (updates: {
    name?: string;
    email?: string;
  }) => Promise<AuthUser>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only run on client side
    if (typeof window !== "undefined") {
      // Check if user is logged in from localStorage
      const storedUser = localStorage.getItem("authUser");
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        } catch (error) {
          console.error("Error parsing stored user:", error);
          localStorage.removeItem("authUser");
        }
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    try {
      const authUser = await userService.login({ email, password });
      setUser(authUser);
      if (typeof window !== "undefined") {
        localStorage.setItem("authUser", JSON.stringify(authUser));
      }
      return authUser;
    } catch (error) {
      throw error;
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string
  ): Promise<AuthUser> => {
    try {
      const authUser = await userService.register({ name, email, password });
      setUser(authUser);
      if (typeof window !== "undefined") {
        localStorage.setItem("authUser", JSON.stringify(authUser));
      }
      return authUser;
    } catch (error) {
      throw error;
    }
  };

  const updateProfile = async (updates: {
    name?: string;
    email?: string;
  }): Promise<AuthUser> => {
    if (!user) {
      throw new Error("No user logged in");
    }

    try {
      const updatedUser = await userService.updateProfile(user.id, updates);
      setUser(updatedUser);
      if (typeof window !== "undefined") {
        localStorage.setItem("authUser", JSON.stringify(updatedUser));
      }
      return updatedUser;
    } catch (error) {
      throw error;
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<void> => {
    if (!user) {
      throw new Error("No user logged in");
    }

    try {
      await userService.changePassword(user.id, currentPassword, newPassword);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("authUser");
    }
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    loading,
    updateProfile,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
