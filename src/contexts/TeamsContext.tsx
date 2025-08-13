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

  // Storage helper functions for persistent team/channel selection
  const saveTeamsSelection = useCallback(
    (team: Team | null, channel: Channel | null) => {
      try {
        const selection = {
          selectedTeam: team,
          selectedChannel: channel,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(
          "nudge-app-teams-selection",
          JSON.stringify(selection)
        );
        console.log("💾 Teams selection saved:", {
          team: team?.displayName,
          channel: channel?.displayName,
        });
      } catch (error) {
        console.error("Failed to save teams selection:", error);
      }
    },
    []
  );

  const loadTeamsSelection = useCallback(() => {
    try {
      const stored = localStorage.getItem("nudge-app-teams-selection");
      if (stored) {
        const selection = JSON.parse(stored);
        console.log("📂 Loaded teams selection:", selection);
        return {
          selectedTeam: selection.selectedTeam,
          selectedChannel: selection.selectedChannel,
        };
      }
    } catch (error) {
      console.error("Failed to load teams selection:", error);
    }
    return { selectedTeam: null, selectedChannel: null };
  }, []);

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

  const initializeAuth = useCallback(async () => {
    try {
      await graphService.initialize();
      const authenticated = graphService.isSignedIn();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        const account = graphService.getCurrentAccount();
        setUser(account);
        // Teams will be loaded by a separate useEffect
      }
    } catch (error) {
      console.error("Failed to initialize auth:", error);
      setError("Failed to initialize authentication");
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Load teams when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadTeams();
    }
  }, [isAuthenticated, loadTeams]);

  const signIn = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check configuration first
      const config = graphService.checkConfiguration();
      if (!config.isValid) {
        const configError = `Configuration issues detected:\n${config.issues.join(
          "\n"
        )}`;
        console.error("❌ Configuration problems:", config.issues);
        setError(
          "Azure configuration is incomplete. Please check your .env.local file."
        );
        return;
      }

      const result = await graphService.signIn();
      if (result) {
        setIsAuthenticated(true);
        setUser(result.account);
        await loadTeams();
      }
    } catch (error: any) {
      console.error("Sign in failed:", error);
      if (error?.message?.includes("AADSTS")) {
        setError(
          "Azure AD authentication failed. Please check your app registration."
        );
      } else {
        setError("Sign in failed. Please try again.");
      }
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

      // Clear stored teams selection on sign out
      try {
        localStorage.removeItem("nudge-app-teams-selection");
        console.log("🗑️ Teams selection cleared on sign out");
      } catch (error) {
        console.error("Failed to clear teams selection:", error);
      }
    } catch (error) {
      console.error("Sign out failed:", error);
      setError("Sign out failed");
    } finally {
      setIsLoading(false);
    }
  };

  const selectTeam = useCallback(
    async (team: Team) => {
      try {
        console.log(
          `🔄 Loading channels for team: ${team.displayName} (${team.id})`
        );
        setSelectedTeam(team);
        setIsLoading(true);
        setChannels([]);
        setSelectedChannel(null);
        setError(null); // Clear any previous errors

        const channelsData = await graphService.getTeamChannels(team.id);
        setChannels(channelsData);

        // Try to restore the previously selected channel first
        const storedSelection = loadTeamsSelection();
        let selectedChannelToSet: Channel | null = null;

        if (
          storedSelection.selectedChannel &&
          storedSelection.selectedTeam?.id === team.id
        ) {
          // Find the stored channel in the current channels list
          const matchingChannel = channelsData.find(
            (c) => c.id === storedSelection.selectedChannel?.id
          );
          if (matchingChannel) {
            console.log(
              "✅ Restoring channel selection:",
              matchingChannel.displayName
            );
            selectedChannelToSet = matchingChannel;
          }
        }

        // If no stored channel was found, auto-select "General" channel or first available
        if (!selectedChannelToSet) {
          const generalChannel = channelsData.find(
            (c) => c.displayName.toLowerCase() === "general"
          );
          selectedChannelToSet = generalChannel || channelsData[0];
        }

        if (selectedChannelToSet) {
          setSelectedChannel(selectedChannelToSet);
          // Save the selection
          saveTeamsSelection(team, selectedChannelToSet);
        }
      } catch (error: any) {
        console.error("❌ Failed to load team channels:", {
          teamName: team.displayName,
          teamId: team.id,
          error: error?.message || "Unknown error",
        });
        setError(
          error?.message || "Failed to load team channels. Please try again."
        );
        // Keep the team selected even if channels fail to load
        // This allows users to retry or manually refresh
      } finally {
        setIsLoading(false);
      }
    },
    [loadTeamsSelection, saveTeamsSelection]
  );

  const selectChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    // Save the selection when channel is manually changed
    saveTeamsSelection(selectedTeam, channel);
    console.log("💾 Channel selection updated:", {
      team: selectedTeam?.displayName,
      channel: channel.displayName,
    });
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

  // Restore team selection after teams are loaded
  useEffect(() => {
    if (teams.length > 0) {
      const storedSelection = loadTeamsSelection();
      if (storedSelection.selectedTeam) {
        // Find the stored team in the current teams list
        const matchingTeam = teams.find(
          (t) => t.id === storedSelection.selectedTeam?.id
        );
        if (matchingTeam) {
          console.log("✅ Restoring team selection:", matchingTeam.displayName);
          // Use setTimeout to avoid state update issues
          setTimeout(() => {
            selectTeam(matchingTeam);
          }, 100);
        }
      }
    }
  }, [teams, loadTeamsSelection, selectTeam]);

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
