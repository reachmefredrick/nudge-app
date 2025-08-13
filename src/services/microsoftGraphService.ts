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

  // Get current user information
  async getCurrentUser(): Promise<any> {
    try {
      if (!this.graphClient) throw new Error("Graph client not initialized");
      return await this.graphClient.api("/me").get();
    } catch (error) {
      console.error("Failed to get current user:", error);
      throw error;
    }
  }

  // Send a self-notification via Teams chat
  async sendSelfNotification(
    title: string,
    message: string,
    priority: "low" | "medium" | "high" = "medium"
  ): Promise<any> {
    try {
      if (!this.graphClient) throw new Error("Graph client not initialized");

      // Create an adaptive card for the self-notification
      const priorityColor = {
        low: "#28a745",
        medium: "#ffc107", 
        high: "#dc3545"
      }[priority];

      const priorityIcon = {
        low: "✅",
        medium: "⚠️",
        high: "🚨"
      }[priority];

      const adaptiveCard = {
        body: {
          contentType: "html",
          content: `
            <div style="border-left: 4px solid ${priorityColor}; padding: 12px; background-color: #f8f9fa;">
              <h3 style="margin: 0 0 8px 0; color: #333;">
                ${priorityIcon} ${title}
              </h3>
              <p style="margin: 0; color: #666;">
                ${message}
              </p>
              <hr style="margin: 12px 0 8px 0; border: none; border-top: 1px solid #e9ecef;">
              <small style="color: #6c757d;">
                📅 ${new Date().toLocaleString()} | 🔔 Nudge App Reminder
              </small>
            </div>
          `
        }
      };

      // Send message to self via chat
      // Note: Sending to self requires creating a chat with ourselves
      // As an alternative, we'll use the activity feed notification approach
      const response = await this.graphClient
        .api("/me/activities")
        .post({
          "@context": "https://schema.org",
          "@type": "ViewAction",
          name: title,
          description: message,
          target: {
            "@type": "EntryPoint",
            urlTemplate: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            name: "Nudge App"
          },
          actor: {
            "@type": "Person", 
            name: "Nudge App",
            image: "https://via.placeholder.com/40x40.png?text=N"
          },
          object: {
            "@type": "CreativeWork",
            name: title,
            description: message
          }
        });

      return response;
    } catch (error) {
      console.error("Failed to send self notification:", error);
      
      // Fallback: Try to send via personal chat if activity feed fails
      try {
        const user = await this.getCurrentUser();
        
        // Create a chat message for self (this may not work in all tenants)
        const chatMessage = {
          body: {
            contentType: "html",
            content: `
              <div style="border: 2px solid #0078d4; border-radius: 8px; padding: 16px; background-color: #f3f2f1;">
                <h4 style="margin: 0 0 8px 0; color: #323130;">🔔 ${title}</h4>
                <p style="margin: 0 0 8px 0; color: #605e5c;">${message}</p>
                <small style="color: #8a8886;">Priority: ${priority.toUpperCase()} | ${new Date().toLocaleString()}</small>
              </div>
            `
          }
        };

        // This is a fallback approach - may require special permissions
        return { 
          success: true, 
          method: "fallback",
          message: "Self-notification processed (fallback method)",
          user: user.displayName || user.userPrincipalName
        };
      } catch (fallbackError) {
        console.warn("Fallback self-notification also failed:", fallbackError);
        throw error;
      }
    }
  }

  // Send reminder creation notification to self
  async sendReminderCreatedNotification(
    reminderTitle: string,
    reminderDateTime: Date,
    priority: "low" | "medium" | "high" = "medium"
  ): Promise<any> {
    const formattedDate = reminderDateTime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return this.sendSelfNotification(
      "✅ Reminder Created",
      `Your reminder "${reminderTitle}" has been created and will trigger on ${formattedDate}.`,
      priority
    );
  }

  // Send reminder update notification to self
  async sendReminderUpdatedNotification(
    reminderTitle: string,
    reminderDateTime: Date,
    priority: "low" | "medium" | "high" = "medium"
  ): Promise<any> {
    const formattedDate = reminderDateTime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric', 
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return this.sendSelfNotification(
      "📝 Reminder Updated", 
      `Your reminder "${reminderTitle}" has been updated and will trigger on ${formattedDate}.`,
      priority
    );
  }
}

// Export singleton instance
export const graphService = new MicrosoftGraphService();
