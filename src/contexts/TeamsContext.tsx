"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { graphService } from "@/services/microsoftGraphService";

interface Team {
  id: string;
  displayName: string;
  description?: string;
}

interface Channel {
  id: string;
  displayName: string;
  description?: string;
  membershipType: string;
}

interface TeamsContextType {
  isAuthenticated: boolean;
  user: {
    displayName?: string;
    mail?: string;
    id?: string;
  } | null;
  teams: Team[];
  selectedTeam: Team | null;
  channels: Channel[];
  selectedChannel: Channel | null;
  isLoading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  selectTeam: (team: Team) => void;
  selectChannel: (channel: Channel) => void;
  sendMessage: (
    title: string,
    content: string,
    priority?: "low" | "medium" | "high"
  ) => Promise<{ success: boolean; error?: string }>;
  testConnection: () => Promise<{ success: boolean; error?: string }>;
  refreshTeams: () => Promise<void>;
}

const TeamsContext = createContext<TeamsContextType | undefined>(undefined);

export const useTeams = () => {
  const context = useContext(TeamsContext);
  if (context === undefined) {
    throw new Error("useTeams must be used within a TeamsProvider");
  }
  return context;
};

interface TeamsProviderProps {
  children: ReactNode;
}

export const TeamsProvider: React.FC<TeamsProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeAuth = useCallback(async () => {
    try {
      await graphService.initialize();
      const authenticated = graphService.isSignedIn();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        const account = graphService.getCurrentAccount();
        setUser(account);
        await loadTeams();
      }
    } catch (error) {
      console.error("Failed to initialize auth:", error);
      setError("Failed to initialize authentication");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const signIn = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await graphService.signIn();
      if (result) {
        setIsAuthenticated(true);
        setUser(result.account);
        await loadTeams();
      }
    } catch (error) {
      console.error("Sign in failed:", error);
      setError("Sign in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await graphService.signOut();
      setIsAuthenticated(false);
      setUser(null);
      setTeams([]);
      setSelectedTeam(null);
      setChannels([]);
      setSelectedChannel(null);
    } catch (error) {
      console.error("Sign out failed:", error);
      setError("Sign out failed");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeams = useCallback(async () => {
    try {
      setIsLoading(true);
      const teamsData = await graphService.getMyTeams();
      setTeams(teamsData);
    } catch (error) {
      console.error("Failed to load teams:", error);
      setError("Failed to load teams");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectTeam = useCallback(async (team: Team) => {
    try {
      setSelectedTeam(team);
      setIsLoading(true);
      setChannels([]);
      setSelectedChannel(null);

      const channelsData = await graphService.getTeamChannels(team.id);
      setChannels(channelsData);

      // Auto-select "General" channel or first available
      const generalChannel = channelsData.find(
        (c) => c.displayName.toLowerCase() === "general"
      );
      const defaultChannel = generalChannel || channelsData[0];

      if (defaultChannel) {
        setSelectedChannel(defaultChannel);
      }
    } catch (error) {
      console.error("Failed to load team channels:", error);
      setError("Failed to load team channels");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectChannel = (channel: Channel) => {
    setSelectedChannel(channel);
  };

  const sendMessage = async (
    title: string,
    content: string,
    priority: "low" | "medium" | "high" = "medium"
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!selectedTeam || !selectedChannel) {
        return { success: false, error: "No team or channel selected" };
      }

      await graphService.sendChannelMessage(
        selectedTeam.id,
        selectedChannel.id,
        title,
        content,
        priority
      );

      return { success: true };
    } catch (error) {
      console.error("Failed to send message:", error);
      return { success: false, error: (error as Error).message };
    }
  };

  const testConnection = async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      const result = await graphService.testConnection();
      if (result.success) {
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  };

  const refreshTeams = async () => {
    await loadTeams();
  };

  const value: TeamsContextType = {
    isAuthenticated,
    user,
    teams,
    selectedTeam,
    channels,
    selectedChannel,
    isLoading,
    error,
    signIn,
    signOut,
    selectTeam,
    selectChannel,
    sendMessage,
    testConnection,
    refreshTeams,
  };

  return (
    <TeamsContext.Provider value={value}>{children}</TeamsContext.Provider>
  );
};
