import { Turnkey } from '@turnkey/sdk-server';
import { TurnkeyApiClient } from '@turnkey/sdk-server';
import type {
  Wallet,
  WalletAccount,
  SubOrganization,
  User,
  WalletConfig
} from '@/lib/types';
import { SOLANA_DERIVATION_PATHS, ACCOUNT_TYPES } from '@/lib/constants';

export class WalletService {
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
   * Creates a sub-organization with wallet and two root users for delegated access
   */
  async createSubOrganizationWithDelegatedAccess(
    config: WalletConfig,
    endUserEmail: string,
    delegatedUserPublicKey: string
  ): Promise<{
    subOrganization: SubOrganization;
    wallet: Wallet;
    accounts: WalletAccount[];
    delegatedUserId: string;
    endUserId: string;
  }> {
    try {
      // Use the main organization ID from environment
      const mainOrgId = process.env.TURNKEY_ORG_ID || process.env.NEXT_PUBLIC_ORGANIZATION_ID;
      if (!mainOrgId) {
        throw new Error('TURNKEY_ORG_ID or NEXT_PUBLIC_ORGANIZATION_ID environment variable is required');
      }

      // Create sub-organization with two root users
      const subOrgResponse = await this.apiClient.createSubOrganization({
        organizationId: mainOrgId,
        subOrganizationName: config.name,
        rootUsers: [
          {
            userName: 'Delegated User',
            apiKeys: [
              {
                apiKeyName: 'Delegated API Key',
                publicKey: delegatedUserPublicKey,
                curveType: 'API_KEY_CURVE_P256',
              },
            ],
            authenticators: [],
            oauthProviders: [],
          },
          {
            userName: 'End User',
            userEmail: endUserEmail,
            apiKeys: [],
            authenticators: [],
            oauthProviders: [],
          },
        ],
        rootQuorumThreshold: 1,
        wallet: {
          walletName: `${config.name}-Wallet`,
          accounts: this.generateWalletAccounts(config),
        },
      });

      const subOrgId = subOrgResponse.subOrganizationId;
      const walletId = subOrgResponse.wallet?.walletId || '';
      const delegatedUserId = subOrgResponse.rootUserIds?.[0] || '';
      const endUserId = subOrgResponse.rootUserIds?.[1] || '';

      // Create an initial admin policy for the sub-organization
      // This allows the root organization to manage this sub-org
      try {
        await this.apiClient.createPolicy({
          organizationId: subOrgId,
          policyName: 'Root Organization Admin Access',
          effect: 'EFFECT_ALLOW',
          consensus: 'true', // Allow any authenticated user from root org
          condition: 'true', // Allow all operations
          notes: 'Initial admin policy allowing root organization to manage this sub-organization',
        });
      } catch (policyError) {
        console.warn('Could not create initial admin policy:', policyError);
        // Continue - the sub-org was created successfully
      }

      // Get wallet accounts
      const walletAccountsResponse = await this.apiClient.getWalletAccounts({
        organizationId: subOrgId,
        walletId: walletId,
      });

      // Map accounts to our types
      const accounts: WalletAccount[] = walletAccountsResponse.accounts.map((acc, index) => ({
        address: acc.address,
        publicKey: acc.publicKey || '',
        curve: 'CURVE_ED25519',
        path: acc.path,
        pathFormat: 'PATH_FORMAT_BIP32',
        addressFormat: 'ADDRESS_FORMAT_SOLANA',
        accountType: index === 0 ? 'TRADING' : 'LONG_TERM_STORAGE',
      }));

      // Create wallet object
      const wallet: Wallet = {
        id: walletId,
        name: `${config.name}-Wallet`,
        organizationId: subOrgId,
        accounts,
        createdAt: new Date(),
      };

      // Create sub-organization object
      const subOrganization: SubOrganization = {
        id: subOrgId,
        name: config.name,
        rootUsers: [delegatedUserId, endUserId],
        rootQuorumThreshold: 1,
        wallets: [wallet],
        users: [],
        policies: [],
        createdAt: new Date(),
      };

      return {
        subOrganization,
        wallet,
        accounts,
        delegatedUserId,
        endUserId,
      };
    } catch (error) {
      console.error('Error creating sub-organization:', error);
      throw new Error(`Failed to create sub-organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Updates the root quorum to exclude the delegated user
   */
  async updateRootQuorum(
    organizationId: string,
    endUserId: string,
    threshold: number = 1
  ): Promise<void> {
    try {
      await this.apiClient.updateRootQuorum({
        organizationId,
        threshold,
        userIds: [endUserId], // Only include the end user
      });
    } catch (error) {
      console.error('Error updating root quorum:', error);
      throw new Error(`Failed to update root quorum: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Creates a new wallet in an existing sub-organization
   */
  async createWallet(
    organizationId: string,
    walletName: string,
    config: WalletConfig
  ): Promise<Wallet> {
    try {
      const response = await this.apiClient.createWallet({
        organizationId,
        walletName,
        accounts: this.generateWalletAccounts(config),
      });

      const accounts: WalletAccount[] = response.accounts.map((acc, index) => ({
        address: acc.address,
        publicKey: acc.publicKey || '',
        curve: 'CURVE_ED25519',
        path: acc.path,
        pathFormat: 'PATH_FORMAT_BIP32',
        addressFormat: 'ADDRESS_FORMAT_SOLANA',
        accountType: index === 0 ? 'TRADING' : 'LONG_TERM_STORAGE',
      }));

      return {
        id: response.walletId,
        name: walletName,
        organizationId,
        accounts,
        createdAt: new Date(response.createdAt),
      };
    } catch (error) {
      console.error('Failed to create wallet:', error);
      throw error;
    }
  }

  /**
   * Retrieves wallet details by ID
   */
  async getWallet(walletId: string, organizationId: string): Promise<Wallet | null> {
    try {
      const response = await this.apiClient.getWallet({
        organizationId,
        walletId,
      });

      const accounts: WalletAccount[] = response.wallet.accounts.map((acc, index) => ({
        address: acc.address,
        publicKey: acc.publicKey || '',
        curve: 'CURVE_ED25519',
        path: acc.path,
        pathFormat: 'PATH_FORMAT_BIP32',
        addressFormat: 'ADDRESS_FORMAT_SOLANA',
        accountType: index === 0 ? 'TRADING' : 'LONG_TERM_STORAGE',
      }));

      return {
        id: response.wallet.walletId,
        name: response.wallet.walletName,
        organizationId,
        accounts,
        createdAt: new Date(response.wallet.createdAt),
      };
    } catch (error) {
      console.error('Failed to get wallet:', error);
      return null;
    }
  }

  /**
   * Lists all wallets in an organization
   */
  async listWallets(organizationId: string): Promise<Wallet[]> {
    try {
      const response = await this.apiClient.getWallets({
        organizationId,
      });

      return response.wallets.map(wallet => {
        const accounts: WalletAccount[] = wallet.accounts.map((acc, index) => ({
          address: acc.address,
          publicKey: acc.publicKey || '',
          curve: 'CURVE_ED25519',
          path: acc.path,
          pathFormat: 'PATH_FORMAT_BIP32',
          addressFormat: 'ADDRESS_FORMAT_SOLANA',
          accountType: index === 0 ? 'TRADING' : 'LONG_TERM_STORAGE',
        }));

        return {
          id: wallet.walletId,
          name: wallet.walletName,
          organizationId,
          accounts,
          createdAt: new Date(wallet.createdAt),
        };
      });
    } catch (error) {
      console.error('Failed to list wallets:', error);
      return [];
    }
  }

  /**
   * Exports wallet mnemonic (requires proper authentication)
   */
  async exportWallet(
    walletId: string,
    organizationId: string,
    targetPublicKey: string
  ): Promise<{ mnemonic: string; encryptedBundle: string }> {
    try {
      const response = await this.apiClient.exportWallet({
        organizationId,
        walletId,
        targetPublicKey,
      });

      return {
        mnemonic: response.mnemonic || '',
        encryptedBundle: response.encryptedBundle,
      };
    } catch (error) {
      console.error('Failed to export wallet:', error);
      throw error;
    }
  }

  /**
   * Imports a wallet from mnemonic
   */
  async importWallet(
    organizationId: string,
    walletName: string,
    encryptedBundle: string,
    config: WalletConfig
  ): Promise<Wallet> {
    try {
      const response = await this.apiClient.importWallet({
        organizationId,
        walletName,
        encryptedBundle,
        accounts: this.generateWalletAccounts(config),
      });

      const accounts: WalletAccount[] = response.accounts.map((acc, index) => ({
        address: acc.address,
        publicKey: acc.publicKey || '',
        curve: 'CURVE_ED25519',
        path: acc.path,
        pathFormat: 'PATH_FORMAT_BIP32',
        addressFormat: 'ADDRESS_FORMAT_SOLANA',
        accountType: index === 0 ? 'TRADING' : 'LONG_TERM_STORAGE',
      }));

      return {
        id: response.walletId,
        name: walletName,
        organizationId,
        accounts,
        createdAt: new Date(response.createdAt),
      };
    } catch (error) {
      console.error('Failed to import wallet:', error);
      throw error;
    }
  }

  /**
   * Derives additional accounts for an existing wallet
   */
  async deriveAccount(
    walletId: string,
    organizationId: string,
    path: string,
    accountType: 'TRADING' | 'LONG_TERM_STORAGE'
  ): Promise<WalletAccount> {
    try {
      const response = await this.apiClient.createWalletAccounts({
        organizationId,
        walletId,
        accounts: [{
          curve: 'CURVE_ED25519',
          pathFormat: 'PATH_FORMAT_BIP32',
          path,
          addressFormat: 'ADDRESS_FORMAT_SOLANA',
        }],
      });

      const account = response.accounts[0];
      return {
        address: account.address,
        publicKey: account.publicKey || '',
        curve: 'CURVE_ED25519',
        path: account.path,
        pathFormat: 'PATH_FORMAT_BIP32',
        addressFormat: 'ADDRESS_FORMAT_SOLANA',
        accountType,
      };
    } catch (error) {
      console.error('Failed to derive account:', error);
      throw error;
    }
  }

  /**
   * Gets the balance of a wallet account
   */
  async getAccountBalance(address: string): Promise<number> {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [address],
        }),
      });

      const data = await response.json();
      return data.result?.value || 0;
    } catch (error) {
      console.error('Failed to get account balance:', error);
      return 0;
    }
  }

  /**
   * Generates wallet accounts based on configuration
   */
  private generateWalletAccounts(config: WalletConfig): any[] {
    const accounts = [];

    if (config.enableTradingAccount) {
      accounts.push({
        curve: 'CURVE_ED25519',
        pathFormat: 'PATH_FORMAT_BIP32',
        path: SOLANA_DERIVATION_PATHS.TRADING,
        addressFormat: 'ADDRESS_FORMAT_SOLANA',
      });
    }

    if (config.enableLongTermStorage) {
      accounts.push({
        curve: 'CURVE_ED25519',
        pathFormat: 'PATH_FORMAT_BIP32',
        path: SOLANA_DERIVATION_PATHS.LONG_TERM_STORAGE,
        addressFormat: 'ADDRESS_FORMAT_SOLANA',
      });
    }

    return accounts;
  }
}