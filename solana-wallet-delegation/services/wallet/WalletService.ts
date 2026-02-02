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
      const mainOrgId = process.env.TURNKEY_ORG_ID || process.env.NEXT_PUBLIC_ORGANIZATION_ID;
      if (!mainOrgId) {
        throw new Error('TURNKEY_ORG_ID or NEXT_PUBLIC_ORGANIZATION_ID environment variable is required');
      }

      const mainApiPublicKey = process.env.TURNKEY_API_PUBLIC_KEY;
      const useMainKeyForEndUser = mainApiPublicKey &&
        mainApiPublicKey.toLowerCase() !== delegatedUserPublicKey.toLowerCase();

      if (mainApiPublicKey && !useMainKeyForEndUser) {
        console.warn(
          'TURNKEY_API_PUBLIC_KEY is the same as delegatedUserPublicKey. ' +
          'End User will not have an API key. Generate a separate key pair for End User admin access.'
        );
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
            apiKeys: useMainKeyForEndUser ? [
              {
                apiKeyName: 'Admin API Key',
                publicKey: mainApiPublicKey,
                curveType: 'API_KEY_CURVE_P256',
              },
            ] : [],
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

      const walletAccountsResponse = await this.apiClient.getWalletAccounts({
        organizationId: subOrgId,
        walletId: walletId,
      });

      const accounts: WalletAccount[] = walletAccountsResponse.accounts.map((acc, index) => ({
        address: acc.address,
        publicKey: acc.publicKey || '',
        curve: 'CURVE_ED25519',
        path: acc.path,
        pathFormat: 'PATH_FORMAT_BIP32',
        addressFormat: 'ADDRESS_FORMAT_SOLANA',
        accountType: index === 0 ? 'TRADING' : 'LONG_TERM_STORAGE',
      }));

      const wallet: Wallet = {
        id: walletId,
        name: `${config.name}-Wallet`,
        organizationId: subOrgId,
        accounts,
        createdAt: new Date(),
      };

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

  async updateRootQuorum(
    organizationId: string,
    endUserId: string,
    threshold: number = 1
  ): Promise<void> {
    try {
      await this.apiClient.updateRootQuorum({
        organizationId,
        threshold,
        userIds: [endUserId],
      });
    } catch (error) {
      console.error('Error updating root quorum:', error);
      throw new Error(`Failed to update root quorum: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

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

      // Fetch full account details after creation
      const accountsResponse = await this.apiClient.getWalletAccounts({
        organizationId,
        walletId: response.walletId,
      });

      const accounts: WalletAccount[] = accountsResponse.accounts.map((acc, index) => ({
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
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Failed to create wallet:', error);
      throw error;
    }
  }

  async getWallet(walletId: string, organizationId: string): Promise<Wallet | null> {
    try {
      const walletResponse = await this.apiClient.getWallet({
        organizationId,
        walletId,
      });

      const accountsResponse = await this.apiClient.getWalletAccounts({
        organizationId,
        walletId,
      });

      const accounts: WalletAccount[] = accountsResponse.accounts.map((acc, index) => ({
        address: acc.address,
        publicKey: acc.publicKey || '',
        curve: 'CURVE_ED25519',
        path: acc.path,
        pathFormat: 'PATH_FORMAT_BIP32',
        addressFormat: 'ADDRESS_FORMAT_SOLANA',
        accountType: index === 0 ? 'TRADING' : 'LONG_TERM_STORAGE',
      }));

      const createdAtTimestamp = walletResponse.wallet.createdAt;
      const createdAt = createdAtTimestamp?.seconds
        ? new Date(parseInt(createdAtTimestamp.seconds) * 1000)
        : new Date();

      return {
        id: walletResponse.wallet.walletId,
        name: walletResponse.wallet.walletName,
        organizationId,
        accounts,
        createdAt,
      };
    } catch (error) {
      console.error('Failed to get wallet:', error);
      return null;
    }
  }

  async listWallets(organizationId: string): Promise<Wallet[]> {
    try {
      const response = await this.apiClient.getWallets({
        organizationId,
      });

      const wallets: Wallet[] = [];
      for (const wallet of response.wallets) {
        // Fetch accounts for each wallet
        const accountsResponse = await this.apiClient.getWalletAccounts({
          organizationId,
          walletId: wallet.walletId,
        });

        const accounts: WalletAccount[] = accountsResponse.accounts.map((acc, index) => ({
          address: acc.address,
          publicKey: acc.publicKey || '',
          curve: 'CURVE_ED25519',
          path: acc.path,
          pathFormat: 'PATH_FORMAT_BIP32',
          addressFormat: 'ADDRESS_FORMAT_SOLANA',
          accountType: index === 0 ? 'TRADING' : 'LONG_TERM_STORAGE',
        }));

        const createdAtTimestamp = wallet.createdAt;
        const createdAt = createdAtTimestamp?.seconds
          ? new Date(parseInt(createdAtTimestamp.seconds) * 1000)
          : new Date();

        wallets.push({
          id: wallet.walletId,
          name: wallet.walletName,
          organizationId,
          accounts,
          createdAt,
        });
      }

      return wallets;
    } catch (error) {
      console.error('Failed to list wallets:', error);
      return [];
    }
  }

  async getWalletIds(organizationId: string): Promise<string[]> {
    try {
      const response = await this.apiClient.getWallets({
        organizationId,
      });

      return response.wallets.map(wallet => wallet.walletId);
    } catch (error) {
      console.error('Failed to get wallet IDs:', error);
      return [];
    }
  }

  async exportWallet(
    walletId: string,
    organizationId: string,
    targetPublicKey: string
  ): Promise<{ exportBundle: string }> {
    try {
      const response = await this.apiClient.exportWallet({
        organizationId,
        walletId,
        targetPublicKey,
      });

      return {
        exportBundle: response.exportBundle,
      };
    } catch (error) {
      console.error('Failed to export wallet:', error);
      throw error;
    }
  }

  async importWallet(
    organizationId: string,
    walletName: string,
    encryptedBundle: string,
    userId: string,
    config: WalletConfig
  ): Promise<Wallet> {
    try {
      const response = await this.apiClient.importWallet({
        organizationId,
        walletName,
        encryptedBundle,
        userId,
        accounts: this.generateWalletAccounts(config),
      });

      // Fetch full account details after import
      const accountsResponse = await this.apiClient.getWalletAccounts({
        organizationId,
        walletId: response.walletId,
      });

      const accounts: WalletAccount[] = accountsResponse.accounts.map((acc, index) => ({
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
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Failed to import wallet:', error);
      throw error;
    }
  }

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

      // Response contains addresses array, fetch full account details
      const address = response.addresses[0];
      const accountsResponse = await this.apiClient.getWalletAccounts({
        organizationId,
        walletId,
      });

      const account = accountsResponse.accounts.find(acc => acc.address === address);
      if (!account) {
        throw new Error('Created account not found');
      }

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
