import {
  PublicClientApplication,
  AuthenticationResult,
  Configuration,
} from "@azure/msal-browser";
import { Client } from "@microsoft/microsoft-graph-client";
import { AuthenticationProvider } from "@microsoft/microsoft-graph-client";

// MSAL configuration
const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/${
      process.env.NEXT_PUBLIC_AZURE_TENANT_ID || "common"
    }`,
    redirectUri: typeof window !== "undefined" ? window.location.origin : "",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

// Required scopes for Teams operations
const loginRequest = {
  scopes: [
    "https://graph.microsoft.com/ChannelMessage.Send",
    "https://graph.microsoft.com/Team.ReadBasic.All",
    "https://graph.microsoft.com/Channel.ReadBasic.All",
    "https://graph.microsoft.com/User.Read",
  ],
};

class GraphAuthProvider implements AuthenticationProvider {
  private msalInstance: PublicClientApplication;

  constructor(msalInstance: PublicClientApplication) {
    this.msalInstance = msalInstance;
  }

  async getAccessToken(): Promise<string> {
    try {
      const accounts = this.msalInstance.getAllAccounts();
      if (accounts.length === 0) {
        throw new Error("No accounts found. Please sign in first.");
      }

      const request = {
        ...loginRequest,
        account: accounts[0],
      };

      const response = await this.msalInstance.acquireTokenSilent(request);
      return response.accessToken;
    } catch (error) {
      console.error("Silent token acquisition failed:", error);
      // Fallback to interactive login
      const response = await this.msalInstance.acquireTokenPopup(loginRequest);
      return response.accessToken;
    }
  }
}

export class MicrosoftGraphService {
  private msalInstance: PublicClientApplication;
  private graphClient: Client | null = null;
  private authProvider: GraphAuthProvider | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.msalInstance = new PublicClientApplication(msalConfig);
      this.authProvider = new GraphAuthProvider(this.msalInstance);
      this.graphClient = Client.initWithMiddleware({
        authProvider: this.authProvider,
      });
    } else {
      // Server-side fallback
      this.msalInstance = {} as PublicClientApplication;
    }
  }

  async initialize(): Promise<void> {
    if (typeof window !== "undefined") {
      await this.msalInstance.initialize();
    }
  }

  async signIn(): Promise<AuthenticationResult | null> {
    try {
      if (!this.msalInstance) throw new Error("MSAL not initialized");

      const response = await this.msalInstance.loginPopup(loginRequest);
      return response;
    } catch (error) {
      console.error("Sign in failed:", error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      if (!this.msalInstance) throw new Error("MSAL not initialized");

      const accounts = this.msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        await this.msalInstance.logoutPopup();
      }
    } catch (error) {
      console.error("Sign out failed:", error);
      throw error;
    }
  }

  isSignedIn(): boolean {
    if (!this.msalInstance) return false;
    return this.msalInstance.getAllAccounts().length > 0;
  }

  getCurrentAccount(): any {
    if (!this.msalInstance) return null;
    const accounts = this.msalInstance.getAllAccounts();
    return accounts.length > 0 ? accounts[0] : null;
  }

  async getMyTeams(): Promise<any[]> {
    try {
      if (!this.graphClient) throw new Error("Graph client not initialized");

      const response = await this.graphClient.api("/me/joinedTeams").get();

      return response.value || [];
    } catch (error) {
      console.error("Failed to get teams:", error);
      throw error;
    }
  }

  async getTeamChannels(teamId: string): Promise<any[]> {
    try {
      if (!this.graphClient) throw new Error("Graph client not initialized");

      const response = await this.graphClient
        .api(`/teams/${teamId}/channels`)
        .get();

      return response.value || [];
    } catch (error) {
      console.error("Failed to get team channels:", error);
      throw error;
    }
  }

  async sendChannelMessage(
    teamId: string,
    channelId: string,
    title: string,
    content: string,
    priority: "low" | "medium" | "high" = "medium"
  ): Promise<any> {
    try {
      if (!this.graphClient) throw new Error("Graph client not initialized");

      const priorityColors = {
        low: "#28a745",
        medium: "#ffc107",
        high: "#dc3545",
      };

      const priorityEmojis = {
        low: "🟢",
        medium: "🟡",
        high: "🔴",
      };

      // Create adaptive card for rich formatting
      const adaptiveCard = {
        type: "message",
        attachments: [
          {
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
              type: "AdaptiveCard",
              version: "1.2",
              body: [
                {
                  type: "Container",
                  style: "emphasis",
                  items: [
                    {
                      type: "ColumnSet",
                      columns: [
                        {
                          type: "Column",
                          width: "auto",
                          items: [
                            {
                              type: "TextBlock",
                              text: priorityEmojis[priority],
                              size: "Large",
                            },
                          ],
                        },
                        {
                          type: "Column",
                          width: "stretch",
                          items: [
                            {
                              type: "TextBlock",
                              text: `Reminder: ${title}`,
                              weight: "Bolder",
                              size: "Medium",
                              color: "Accent",
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "TextBlock",
                  text: content,
                  wrap: true,
                  spacing: "Medium",
                },
                {
                  type: "FactSet",
                  facts: [
                    {
                      title: "Priority:",
                      value: priority.toUpperCase(),
                    },
                    {
                      title: "Sent by:",
                      value: "Nudge App",
                    },
                    {
                      title: "Time:",
                      value: new Date().toLocaleString(),
                    },
                  ],
                },
              ],
              actions: [
                {
                  type: "Action.OpenUrl",
                  title: "Open Nudge App",
                  url: `${
                    typeof window !== "undefined" ? window.location.origin : ""
                  }/reminders`,
                },
              ],
            },
          },
        ],
      };

      const response = await this.graphClient
        .api(`/teams/${teamId}/channels/${channelId}/messages`)
        .post(adaptiveCard);

      return response;
    } catch (error) {
      console.error("Failed to send channel message:", error);
      throw error;
    }
  }

  async sendChatMessage(chatId: string, content: string): Promise<any> {
    try {
      if (!this.graphClient) throw new Error("Graph client not initialized");

      const message = {
        body: {
          content: content,
          contentType: "text",
        },
      };

      const response = await this.graphClient
        .api(`/chats/${chatId}/messages`)
        .post(message);

      return response;
    } catch (error) {
      console.error("Failed to send chat message:", error);
      throw error;
    }
  }

  async testConnection(): Promise<{
    success: boolean;
    user?: any;
    error?: string;
  }> {
    try {
      if (!this.graphClient) throw new Error("Graph client not initialized");

      const user = await this.graphClient.api("/me").get();
      return { success: true, user };
    } catch (error) {
      console.error("Connection test failed:", error);
      return { success: false, error: (error as Error).message };
    }
  }
}

// Export singleton instance
export const graphService = new MicrosoftGraphService();
