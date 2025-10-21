import { Turnkey } from '@turnkey/sdk-server';
import { TurnkeyApiClient } from '@turnkey/sdk-server';
import type { SubOrganization, User, UserTag } from '@/lib/types';
import { USER_TAGS } from '@/lib/constants';

export class SubOrganizationManager {
  private client: Turnkey;
  private apiClient: TurnkeyApiClient;

  constructor() {
    this.client = new Turnkey({
      apiBaseUrl: process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL!,
      apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
      apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
      defaultOrganizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID!,
    });

    this.apiClient = this.client.apiClient();
  }

  /**
   * Creates a user tag for role-based access control
   */
  async createUserTag(
    organizationId: string,
    tagName: string,
    userIds: string[] = []
  ): Promise<UserTag> {
    try {
      const response = await this.apiClient.createUserTag({
        organizationId,
        userTagName: tagName,
        userIds,
      });

      return {
        id: response.userTagId,
        name: tagName,
      };
    } catch (error) {
      console.error('Failed to create user tag:', error);
      throw error;
    }
  }

  /**
   * Creates a new user with specified tags
   */
  async createUser(
    organizationId: string,
    userName: string,
    userEmail: string,
    tags: string[],
    authenticators?: any[]
  ): Promise<User> {
    try {
      const response = await this.apiClient.createUser({
        organizationId,
        userName,
        userEmail,
        userTags: tags,
        authenticators,
      });

      return {
        id: response.userId,
        name: userName,
        email: userEmail,
        tags,
        isRoot: tags.includes(USER_TAGS.ADMIN),
        createdAt: new Date(response.createdAt),
        updatedAt: new Date(response.updatedAt),
      };
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }

  /**
   * Updates user information
   */
  async updateUser(
    organizationId: string,
    userId: string,
    updates: {
      userName?: string;
      userEmail?: string;
      userTags?: string[];
    }
  ): Promise<User> {
    try {
      const response = await this.apiClient.updateUser({
        organizationId,
        userId,
        ...updates,
      });

      const user = await this.getUser(organizationId, userId);
      return user!;
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  }

  /**
   * Retrieves user details
   */
  async getUser(organizationId: string, userId: string): Promise<User | null> {
    try {
      const response = await this.apiClient.getUser({
        organizationId,
        userId,
      });

      return {
        id: response.userId,
        name: response.userName,
        email: response.userEmail || undefined,
        tags: response.userTags || [],
        isRoot: response.userTags?.includes(USER_TAGS.ADMIN) || false,
        createdAt: new Date(response.createdAt),
        updatedAt: new Date(response.updatedAt),
      };
    } catch (error) {
      console.error('Failed to get user:', error);
      return null;
    }
  }

  /**
   * Lists all users in an organization
   */
  async listUsers(organizationId: string): Promise<User[]> {
    try {
      const response = await this.apiClient.getUsers({
        organizationId,
      });

      return response.users.map(user => ({
        id: user.userId,
        name: user.userName,
        email: user.userEmail || undefined,
        tags: user.userTags || [],
        isRoot: user.userTags?.includes(USER_TAGS.ADMIN) || false,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      }));
    } catch (error) {
      console.error('Failed to list users:', error);
      return [];
    }
  }

  /**
   * Deletes a user
   */
  async deleteUser(organizationId: string, userId: string): Promise<boolean> {
    try {
      await this.apiClient.deleteUser({
        organizationId,
        userId,
      });
      return true;
    } catch (error) {
      console.error('Failed to delete user:', error);
      return false;
    }
  }

  /**
   * Creates API credentials for a user
   */
  async createAPIKey(
    organizationId: string,
    userId: string,
    apiKeyName: string,
    publicKey: string
  ): Promise<{ apiKeyId: string }> {
    try {
      const response = await this.apiClient.createApiKey({
        organizationId,
        userId,
        apiKeyName,
        publicKey,
        curveType: 'API_KEY_CURVE_P256',
      });

      return { apiKeyId: response.apiKeyId };
    } catch (error) {
      console.error('Failed to create API key:', error);
      throw error;
    }
  }

  /**
   * Creates a passkey authenticator for a user
   */
  async createPasskey(
    organizationId: string,
    userId: string,
    authenticatorName: string,
    challenge: string,
    attestation: any
  ): Promise<{ authenticatorId: string }> {
    try {
      const response = await this.apiClient.createAuthenticator({
        organizationId,
        userId,
        authenticatorName,
        challenge,
        attestation,
      });

      return { authenticatorId: response.authenticatorId };
    } catch (error) {
      console.error('Failed to create passkey:', error);
      throw error;
    }
  }

  /**
   * Updates sub-organization configuration
   */
  async updateSubOrganization(
    organizationId: string,
    updates: {
      name?: string;
      rootQuorumThreshold?: number;
      disableEmailRecovery?: boolean;
      disableEmailAuth?: boolean;
    }
  ): Promise<boolean> {
    try {
      await this.apiClient.updateOrganizationConfig({
        organizationId,
        ...updates,
      });
      return true;
    } catch (error) {
      console.error('Failed to update sub-organization:', error);
      return false;
    }
  }

  /**
   * Gets sub-organization details
   */
  async getSubOrganization(organizationId: string): Promise<SubOrganization | null> {
    try {
      const response = await this.apiClient.getOrganizationConfig({
        organizationId,
      });

      const users = await this.listUsers(organizationId);

      return {
        id: organizationId,
        name: response.organizationName || '',
        rootUsers: response.rootUsers || [],
        rootQuorumThreshold: response.rootQuorumThreshold || 1,
        wallets: [],
        users,
        policies: [],
        createdAt: new Date(response.createdAt),
      };
    } catch (error) {
      console.error('Failed to get sub-organization:', error);
      return null;
    }
  }

  /**
   * Sets up default user tags for a new sub-organization
   */
  async setupDefaultTags(organizationId: string): Promise<{
    adminTagId: string;
    traderTagId: string;
    viewerTagId: string;
  }> {
    const adminTag = await this.createUserTag(organizationId, USER_TAGS.ADMIN);
    const traderTag = await this.createUserTag(organizationId, USER_TAGS.TRADER);
    const viewerTag = await this.createUserTag(organizationId, USER_TAGS.VIEWER);

    return {
      adminTagId: adminTag.id,
      traderTagId: traderTag.id,
      viewerTagId: viewerTag.id,
    };
  }

  /**
   * Adds a root user to the sub-organization
   */
  async addRootUser(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const config = await this.apiClient.getOrganizationConfig({
        organizationId,
      });

      const rootUsers = [...(config.rootUsers || []), userId];

      await this.apiClient.updateOrganizationConfig({
        organizationId,
        rootUsers,
      });

      return true;
    } catch (error) {
      console.error('Failed to add root user:', error);
      return false;
    }
  }

  /**
   * Removes a root user from the sub-organization
   */
  async removeRootUser(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const config = await this.apiClient.getOrganizationConfig({
        organizationId,
      });

      const rootUsers = (config.rootUsers || []).filter(id => id !== userId);

      await this.apiClient.updateOrganizationConfig({
        organizationId,
        rootUsers,
      });

      return true;
    } catch (error) {
      console.error('Failed to remove root user:', error);
      return false;
    }
  }
}