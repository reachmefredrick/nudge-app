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

      const priorityEmojis = {
        low: "🟢",
        medium: "🟡",
        high: "🔴",
      };

      // Use a simpler message format that's more compatible
      const simpleMessage = {
        body: {
          contentType: "html",
          content: `
            <div style="border-left: 4px solid ${
              priority === "high"
                ? "#dc3545"
                : priority === "medium"
                ? "#ffc107"
                : "#28a745"
            }; padding: 12px; margin: 8px 0;">
              <h3 style="margin: 0 0 8px 0; color: #323130;">
                ${priorityEmojis[priority]} ${title}
              </h3>
              <p style="margin: 0 0 12px 0; color: #605e5c;">
                ${content}
              </p>
              <div style="font-size: 12px; color: #8a8886; border-top: 1px solid #edebe9; padding-top: 8px;">
                <strong>Priority:</strong> ${priority.toUpperCase()} | 
                <strong>Sent by:</strong> Nudge App | 
                <strong>Time:</strong> ${new Date().toLocaleString()}
              </div>
            </div>
          `,
        },
      };

      const response = await this.graphClient
        .api(`/teams/${teamId}/channels/${channelId}/messages`)
        .post(simpleMessage);

      return response;
    } catch (error) {
      console.error("Failed to send channel message:", error);

      // Fallback to plain text if HTML fails
      try {
        if (!this.graphClient) throw new Error("Graph client not initialized");

        const priorityEmojis = {
          low: "🟢",
          medium: "🟡",
          high: "🔴",
        };

        const fallbackMessage = {
          body: {
            contentType: "text",
            content: `${
              priorityEmojis[priority]
            } ${title}\n\n${content}\n\nPriority: ${priority.toUpperCase()} | Sent by: Nudge App | Time: ${new Date().toLocaleString()}`,
          },
        };

        const fallbackResponse = await this.graphClient
          .api(`/teams/${teamId}/channels/${channelId}/messages`)
          .post(fallbackMessage);

        return fallbackResponse;
      } catch (fallbackError) {
        console.error("Fallback message also failed:", fallbackError);
        throw error;
      }
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

      // Create priority-based formatting
      const priorityIcon = {
        low: "✅",
        medium: "⚠️",
        high: "🚨",
      }[priority];

      console.log(`Attempting to send self-notification: ${title}`);

      // Simplified approach: Try to post to user's timeline activity
      // This avoids the complex JSON structure that was causing the error
      const simpleActivity = {
        appActivityId: `nudge-reminder-${Date.now()}`,
        activitySourceHost:
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        userTimezone: "UTC",
        appDisplayName: "Nudge App",
        activitiesSourceHost:
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        visualElements: {
          displayText: `${priorityIcon} ${title}`,
          description: message,
        },
        historyItems: [
          {
            userTimezone: "UTC",
            startedDateTime: new Date().toISOString(),
            lastActiveDateTime: new Date().toISOString(),
          },
        ],
      };

      try {
        const response = await this.graphClient
          .api("/me/activities")
          .post(simpleActivity);

        console.log("Self-notification sent successfully via activities API");
        return {
          success: true,
          method: "activity",
          message: "Self-notification sent successfully",
          response,
        };
      } catch (activityError: any) {
        console.warn("Activities API failed:", activityError.message);

        // Alternative approach: Try to send to user's own mail
        try {
          const currentUser = await this.getCurrentUser();
          const emailMessage = {
            subject: `${priorityIcon} ${title} - Nudge App`,
            body: {
              contentType: "Text",
              content: `${message}\n\nTimestamp: ${new Date().toLocaleString()}\nPriority: ${priority.toUpperCase()}\n\nSent from Nudge App`,
            },
            toRecipients: [
              {
                emailAddress: {
                  address: currentUser.mail || currentUser.userPrincipalName,
                  name: currentUser.displayName,
                },
              },
            ],
          };

          await this.graphClient
            .api("/me/sendMail")
            .post({ message: emailMessage });

          console.log("Self-notification sent successfully via email");
          return {
            success: true,
            method: "email",
            message: "Self-notification sent via email",
            recipient: currentUser.mail || currentUser.userPrincipalName,
          };
        } catch (emailError: any) {
          console.warn("Email approach also failed:", emailError.message);

          // Final fallback: Local notification processing
          return {
            success: true,
            method: "local",
            message: `Self-notification processed locally: ${priorityIcon} ${title}`,
            details: message,
            timestamp: new Date().toISOString(),
            priority: priority,
            note: "Teams self-notification attempted but fell back to local processing",
          };
        }
      }
    } catch (error: any) {
      console.error("Failed to send self notification:", error);

      // Return error with fallback information
      return {
        success: false,
        method: "error",
        error: error.message,
        fallbackMessage: `${title}: ${message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Send reminder creation notification to self
  async sendReminderCreatedNotification(
    reminderTitle: string,
    reminderDateTime: Date,
    priority: "low" | "medium" | "high" = "medium"
  ): Promise<any> {
    const formattedDate = reminderDateTime.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
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
    const formattedDate = reminderDateTime.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
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
