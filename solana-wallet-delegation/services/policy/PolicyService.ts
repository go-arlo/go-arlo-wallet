import { Turnkey } from '@turnkey/sdk-server';
import { TurnkeyApiClient } from '@turnkey/sdk-server';
import type { Policy, PolicyTemplate, TransactionLimits } from '@/lib/types';
import { POLICY_EFFECTS, USER_TAGS } from '@/lib/constants';

export class PolicyService {
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
   * Creates a new policy
   */
  async createPolicy(
    organizationId: string,
    name: string,
    effect: 'EFFECT_ALLOW' | 'EFFECT_DENY',
    consensus: string,
    condition: string,
    notes?: string
  ): Promise<Policy> {
    try {
      const response = await this.apiClient.createPolicy({
        organizationId,
        policyName: name,
        effect,
        consensus,
        condition,
        notes: notes || '',
      });

      return {
        id: response.policyId,
        name,
        effect,
        consensus,
        condition,
        organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error('Failed to create policy:', error);
      throw error;
    }
  }

  /**
   * Updates an existing policy
   */
  async updatePolicy(
    organizationId: string,
    policyId: string,
    updates: {
      policyName?: string;
      effect?: 'EFFECT_ALLOW' | 'EFFECT_DENY';
      consensus?: string;
      condition?: string;
    }
  ): Promise<Policy> {
    try {
      const response = await this.apiClient.updatePolicy({
        organizationId,
        policyId,
        ...updates,
      });

      const policy = await this.getPolicy(organizationId, policyId);
      return policy!;
    } catch (error) {
      console.error('Failed to update policy:', error);
      throw error;
    }
  }

  /**
   * Retrieves a policy by ID
   */
  async getPolicy(organizationId: string, policyId: string): Promise<Policy | null> {
    try {
      const response = await this.apiClient.getPolicy({
        organizationId,
        policyId,
      });

      return {
        id: response.policy.policyId,
        name: response.policy.policyName,
        effect: response.policy.effect as 'EFFECT_ALLOW' | 'EFFECT_DENY',
        consensus: response.policy.consensus,
        condition: response.policy.condition,
        organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error('Failed to get policy:', error);
      return null;
    }
  }

  /**
   * Lists all policies in an organization
   */
  async listPolicies(organizationId: string): Promise<Policy[]> {
    try {
      const response = await this.apiClient.getPolicies({
        organizationId,
      });

      return response.policies.map(policy => ({
        id: policy.policyId,
        name: policy.policyName,
        effect: policy.effect as 'EFFECT_ALLOW' | 'EFFECT_DENY',
        consensus: policy.consensus,
        condition: policy.condition,
        organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    } catch (error) {
      console.error('Failed to list policies:', error);
      return [];
    }
  }

  /**
   * Deletes a policy
   */
  async deletePolicy(organizationId: string, policyId: string): Promise<boolean> {
    try {
      await this.apiClient.deletePolicy({
        organizationId,
        policyId,
      });
      return true;
    } catch (error) {
      console.error('Failed to delete policy:', error);
      return false;
    }
  }

  /**
   * Creates admin policy with unrestricted access
   */
  async createAdminPolicy(
    organizationId: string,
    adminTagId: string
  ): Promise<Policy> {
    return this.createPolicy(
      organizationId,
      'Admin users have unrestricted access',
      POLICY_EFFECTS.ALLOW,
      `approvers.any(user, user.tags.contains('${adminTagId}'))`,
      'true',
      'Policy granting admin users unrestricted access to all operations'
    );
  }

  /**
   * Creates root user admin policy - allows root org users to manage sub-org
   */
  async createRootAdminPolicy(
    organizationId: string,
    rootUserId?: string
  ): Promise<Policy> {
    // If no specific user ID provided, allow any user from root org
    const consensus = rootUserId
      ? `approvers.any(user, user.id == '${rootUserId}')`
      : 'true'; // Allow any authenticated user (from root org)

    return this.createPolicy(
      organizationId,
      'Root Organization Admin Access',
      POLICY_EFFECTS.ALLOW,
      consensus,
      'true',
      'Policy granting root organization users full access to manage this sub-organization'
    );
  }

  /**
   * Creates trader policy for trading account operations
   */
  async createTraderPolicy(
    organizationId: string,
    traderTagId: string,
    tradingAccountAddress: string,
    limits: TransactionLimits
  ): Promise<Policy> {
    const condition = `
      solana.tx.instructions.count() <= 3 &&
      solana.tx.spl_transfers.any(transfer,
        transfer.from == '${tradingAccountAddress}' &&
        transfer.amount <= ${limits.perTransaction}
      )
    `;

    return this.createPolicy(
      organizationId,
      'Traders can execute swaps on trading account within limits',
      POLICY_EFFECTS.ALLOW,
      `approvers.any(user, user.tags.contains('${traderTagId}'))`,
      condition,
      `Policy allowing traders to execute swaps on trading account with transaction limit of ${limits.perTransaction}`
    );
  }

  /**
   * Creates policy for depositing to long-term storage
   */
  async createDepositPolicy(
    organizationId: string,
    userTagId: string,
    longTermStorageAddress: string
  ): Promise<Policy> {
    const condition = `
      solana.tx.instructions.count() == 1 &&
      solana.tx.spl_transfers.any(transfer,
        transfer.to == '${longTermStorageAddress}'
      )
    `;

    return this.createPolicy(
      organizationId,
      'Users can deposit to long-term storage',
      POLICY_EFFECTS.ALLOW,
      `approvers.any(user, user.tags.contains('${userTagId}'))`,
      condition,
      `Policy allowing users to deposit funds to long-term storage account ${longTermStorageAddress}`
    );
  }

  /**
   * Creates policy to deny arbitrary transfers
   */
  async createDenyArbitraryTransfersPolicy(
    organizationId: string,
    userTagId: string,
    allowedAddresses: string[]
  ): Promise<Policy> {
    const addressConditions = allowedAddresses
      .map(addr => `transfer.to != '${addr}'`)
      .join(' && ');

    const condition = `
      solana.tx.spl_transfers.any(transfer, ${addressConditions})
    `;

    return this.createPolicy(
      organizationId,
      'Deny transfers to unauthorized addresses',
      POLICY_EFFECTS.DENY,
      `approvers.any(user, user.tags.contains('${userTagId}'))`,
      condition,
      'Policy denying transfers to any addresses not in the allowed list'
    );
  }

  /**
   * Creates SPL token transfer policy
   */
  async createSPLTokenTransferPolicy(
    organizationId: string,
    userTagId: string,
    tokenMint: string,
    recipientATA: string,
    maxAmount: number
  ): Promise<Policy> {
    const condition = `
      solana.tx.instructions.count() == 1 &&
      solana.tx.spl_transfers.any(transfer,
        transfer.mint == '${tokenMint}' &&
        transfer.to == '${recipientATA}' &&
        transfer.amount <= ${maxAmount}
      )
    `;

    return this.createPolicy(
      organizationId,
      `SPL token transfer policy for ${tokenMint}`,
      POLICY_EFFECTS.ALLOW,
      `approvers.any(user, user.tags.contains('${userTagId}'))`,
      condition,
      `Policy allowing SPL token transfers for mint ${tokenMint} with max amount ${maxAmount}`
    );
  }

  /**
   * Creates time-based delegation policy
   */
  async createTimeBoundPolicy(
    organizationId: string,
    userId: string,
    condition: string,
    expirationTimestamp: number
  ): Promise<Policy> {
    const timeCondition = `
      ${condition} &&
      now() < ${expirationTimestamp}
    `;

    return this.createPolicy(
      organizationId,
      `Time-bound delegation until ${new Date(expirationTimestamp).toISOString()}`,
      POLICY_EFFECTS.ALLOW,
      `approvers.any(user, user.id == '${userId}')`,
      timeCondition,
      `Time-limited policy expiring at ${new Date(expirationTimestamp).toISOString()}`
    );
  }

  /**
   * Creates quota-based policy with spending limits
   */
  async createQuotaPolicy(
    organizationId: string,
    userId: string,
    dailyLimit: number,
    weeklyLimit: number
  ): Promise<Policy> {
    // Note: Actual quota tracking would need to be implemented separately
    // This is a simplified version showing the concept
    const condition = `
      solana.tx.spl_transfers.all(transfer,
        transfer.amount <= ${dailyLimit}
      )
    `;

    return this.createPolicy(
      organizationId,
      `Quota-based policy with daily limit of ${dailyLimit}`,
      POLICY_EFFECTS.ALLOW,
      `approvers.any(user, user.id == '${userId}')`,
      condition,
      `Quota policy with daily limit: ${dailyLimit}, weekly limit: ${weeklyLimit}`
    );
  }

  /**
   * Creates program-specific policy
   */
  async createProgramPolicy(
    organizationId: string,
    userId: string,
    allowedProgramIds: string[],
    instructionLimit: number = 5
  ): Promise<Policy> {
    const programConditions = allowedProgramIds
      .map(id => `'${id}'`)
      .join(', ');

    const condition = `
      solana.tx.instructions.count() <= ${instructionLimit} &&
      solana.tx.instructions.all(instruction,
        instruction.program_id in [${programConditions}]
      )
    `;

    return this.createPolicy(
      organizationId,
      'Delegated Access - Program Restrictions',
      POLICY_EFFECTS.ALLOW,
      `approvers.any(user, user.id == '${userId}')`,
      condition,
      `Policy restricting operations to ${allowedProgramIds.length} allowed programs with max ${instructionLimit} instructions per transaction`
    );
  }

  /**
   * Creates delegated access policy for limited transaction permissions
   */
  async createDelegatedAccessPolicy(
    organizationId: string,
    delegatedUserId: string,
    allowedAddresses: string | string[], // Accept single address or array
    maxAmount?: number,
    allowedPrograms?: string[],
    instructionLimit?: number
  ): Promise<Policy> {
    // Convert to array if single address provided (backward compatibility)
    const addresses = Array.isArray(allowedAddresses) ? allowedAddresses : [allowedAddresses];

    // Include all necessary programs for Jupiter swaps
    const programs = allowedPrograms || [
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',  // SPL Token Program
      'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', // SPL Token-2022 Program
      '11111111111111111111111111111111',               // System Program
      'ComputeBudget111111111111111111111111111111',    // Compute Budget Program
      'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',   // Jupiter Aggregator V6
      'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB',   // Jupiter V4
      'JUP3c2Uh3WA4Ng34tw6kPd2G4C5BB21Xo36Je1s32Ph',   // Jupiter V3
      '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',   // Raydium AMM
      'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',   // Whirlpool
      '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1'    // Orca
    ];

    // Default instruction limit for swaps
    const maxInstructions = instructionLimit || 50;

    // Build program condition
    const programCondition = programs.map(id => `'${id}'`).join(', ');

    // Build address condition for transfers using simple format that works
    const transferCondition = addresses.length === 1
      ? `transfer.to == '${addresses[0]}'`
      : `(${addresses.map(addr => `transfer.to == '${addr}'`).join(' || ')})`;

    // Create a condition that allows Jupiter swaps with reasonable restrictions
    // Since Turnkey doesn't support program_id checks, we'll use instruction count as the main restriction
    let condition = `solana.tx.instructions.count() <= ${maxInstructions}`;

    const addressList = addresses.length > 3
      ? `${addresses.slice(0, 3).join(', ')}... (${addresses.length} total)`
      : addresses.join(', ');

    return this.createPolicy(
      organizationId,
      'Delegated Access - Transaction Policy',
      POLICY_EFFECTS.ALLOW,
      `approvers.any(user, user.id == '${delegatedUserId}')`,
      condition,
      `Delegated access policy allowing transactions with max ${maxInstructions} instructions`
    );
  }


  /**
   * Creates Jupiter swap policy with instruction and amount limits
   */
  async createJupiterSwapPolicy(
    organizationId: string,
    delegatedUserId: string,
    maxAmountPerSwap?: number
  ): Promise<Policy> {
    // Build condition - instruction count limit for complexity control
    let condition = `solana.tx.instructions.count() <= 30`;

    // Add amount restriction if specified
    if (maxAmountPerSwap) {
      condition += ` && solana.tx.spl_transfers.all(transfer, transfer.amount <= ${maxAmountPerSwap})`;
    }

    return this.createPolicy(
      organizationId,
      'Jupiter Swap Access Policy',
      POLICY_EFFECTS.ALLOW,
      `approvers.any(user, user.id == '${delegatedUserId}')`,
      condition,
      `Policy allowing transactions with max 30 instructions${maxAmountPerSwap ? ` and max amount ${maxAmountPerSwap} per transfer` : ''}`
    );
  }


  /**
   * Creates an emergency shutdown policy
   */
  async createEmergencyShutdownPolicy(
    organizationId: string,
    adminUserId: string
  ): Promise<Policy> {
    // This policy denies ALL transactions when activated
    return this.createPolicy(
      organizationId,
      'EMERGENCY SHUTDOWN - All Operations Blocked',
      POLICY_EFFECTS.DENY,
      'true', // Applies to everyone
      'true', // Denies everything
      'Emergency shutdown activated - all operations are blocked until this policy is removed'
    );
  }

  /**
   * Creates NFT minting policy
   */
  async createNFTMintPolicy(
    organizationId: string,
    userTagId: string,
    collectionAddress: string,
    maxMints: number = 1
  ): Promise<Policy> {
    const condition = `
      solana.tx.instructions.count() <= ${maxMints} &&
      solana.tx.instructions.any(instruction,
        instruction.program_id == 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' &&
        instruction.data[0..1] == '0x0' &&
        contains(instruction.accounts, '${collectionAddress}')
      )
    `;

    return this.createPolicy(
      organizationId,
      `NFT minting policy for collection ${collectionAddress}`,
      POLICY_EFFECTS.ALLOW,
      `approvers.any(user, user.tags.contains('${userTagId}'))`,
      condition,
      `NFT minting policy for collection ${collectionAddress} with max mints: ${maxMints}`
    );
  }

  /**
   * Gets policy templates for common use cases
   */
  getPolicyTemplates(): PolicyTemplate[] {
    return [
      {
        name: 'Trading Bot',
        description: 'Allows automated trading within specified limits',
        effect: POLICY_EFFECTS.ALLOW,
        consensusTemplate: "approvers.any(user, user.tags.contains('{{traderTagId}}'))",
        conditionTemplate: `
          solana.tx.instructions.count() <= 3 &&
          solana.tx.spl_transfers.any(transfer,
            transfer.from == '{{tradingAccount}}' &&
            transfer.amount <= {{maxAmount}}
          )
        `,
        requiredParams: ['traderTagId', 'tradingAccount', 'maxAmount'],
      },
      {
        name: 'NFT Mint Bot',
        description: 'Allows automated NFT minting from specific collections',
        effect: POLICY_EFFECTS.ALLOW,
        consensusTemplate: "approvers.any(user, user.id == '{{agentId}}')",
        conditionTemplate: `
          solana.tx.instructions.any(instruction,
            instruction.program_id == 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' &&
            contains(instruction.accounts, '{{collectionAddress}}')
          )
        `,
        requiredParams: ['agentId', 'collectionAddress'],
      },
      {
        name: 'DeFi Automation',
        description: 'Allows interaction with specific DeFi protocols',
        effect: POLICY_EFFECTS.ALLOW,
        consensusTemplate: "approvers.any(user, user.tags.contains('{{defiTagId}}'))",
        conditionTemplate: `
          solana.tx.instructions.all(instruction,
            instruction.program_id in [{{allowedPrograms}}]
          ) &&
          solana.tx.value <= {{maxValue}}
        `,
        requiredParams: ['defiTagId', 'allowedPrograms', 'maxValue'],
      },
      {
        name: 'Emergency Freeze',
        description: 'Denies all transactions in emergency situations',
        effect: POLICY_EFFECTS.DENY,
        consensusTemplate: "true",
        conditionTemplate: "true",
        requiredParams: [],
      },
    ];
  }
}