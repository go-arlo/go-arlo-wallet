import { Turnkey } from '@turnkey/sdk-server';
import { TurnkeyApiClient } from '@turnkey/sdk-server';
import type {
  DelegationRequest,
  DelegationScope,
  DelegatedKey,
  TransactionLimits,
  Permission,
} from '@/lib/types';
import { DELEGATION_STATUS, POLICY_EFFECTS } from '@/lib/constants';
import { PolicyService } from '../policy/PolicyService';

interface DelegationResponse {
  status: 'APPROVED' | 'REJECTED';
  reason?: string;
  policyKeyId?: string;
  expiresAt?: Date;
}

export class DelegationService {
  private client: Turnkey;
  private apiClient: TurnkeyApiClient;
  private policyService: PolicyService;
  private activeDelegations: Map<string, DelegatedKey> = new Map();

  constructor() {
    this.client = new Turnkey({
      apiBaseUrl: process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL!,
      apiPublicKey: process.env.DELEGATED_TURNKEY_API_PUBLIC_KEY!,
      apiPrivateKey: process.env.DELEGATED_TURNKEY_API_PRIVATE_KEY!,
      defaultOrganizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID!,
    });

    this.apiClient = this.client.apiClient();
    this.policyService = new PolicyService();
  }

  /**
   * Processes a delegation request from an agent
   */
  async processDelegationRequest(
    request: DelegationRequest,
    userId: string,
    organizationId: string
  ): Promise<DelegationResponse> {
    try {
      // 1. Validate agent identity
      const agent = await this.verifyAgent(request.agentId);
      if (!agent.isValid) {
        return {
          status: 'REJECTED',
          reason: 'Invalid or unverified agent',
        };
      }

      // 2. Create delegated policy key directly (risk assessment removed)
      const policyKey = await this.createDelegatedPolicyKey(
        organizationId,
        request.agentId,
        request.scope,
        userId
      );

      // 3. Store delegation
      const expiresAt = new Date(Date.now() + request.scope.duration * 1000);
      const delegatedKey: DelegatedKey = {
        id: policyKey.id,
        policyId: policyKey.id,
        agentId: request.agentId,
        publicKey: policyKey.publicKey,
        permissions: request.scope.permissions,
        expiresAt,
        isActive: true,
        quotaUsed: {
          daily: 0,
          weekly: 0,
          monthly: 0,
        },
      };

      this.activeDelegations.set(policyKey.id, delegatedKey);

      return {
        status: 'APPROVED',
        policyKeyId: policyKey.id,
        expiresAt,
      };
    } catch (error) {
      console.error('Failed to process delegation request:', error);
      return {
        status: 'REJECTED',
        reason: 'Internal error processing request',
      };
    }
  }

  /**
   * Creates a delegated policy key with specified scope
   */
  private async createDelegatedPolicyKey(
    organizationId: string,
    agentId: string,
    scope: DelegationScope,
    userId: string
  ): Promise<{ id: string; publicKey: string }> {
    // Build condition from scope
    const condition = this.buildConditionFromScope(scope);

    // Create the policy
    const policy = await this.policyService.createPolicy(
      organizationId,
      `Delegation for agent ${agentId}`,
      POLICY_EFFECTS.ALLOW,
      `approvers.any(user, user.id == '${agentId}')`,
      condition
    );

    // Create the key for this policy
    const keyResponse = await this.apiClient.createApiKey({
      organizationId,
      userId: agentId,
      apiKeyName: `Delegation key for ${agentId}`,
      publicKey: await this.generatePublicKey(),
      curveType: 'API_KEY_CURVE_P256',
    });

    return {
      id: keyResponse.apiKeyId,
      publicKey: keyResponse.publicKey || '',
    };
  }

  /**
   * Builds policy condition from delegation scope
   */
  private buildConditionFromScope(scope: DelegationScope): string {
    const conditions: string[] = [];

    // Transaction count limit
    conditions.push('solana.tx.instructions.count() <= 10');

    // Permission-based conditions
    if (scope.permissions.length > 0) {
      const permissionConditions = scope.permissions.map(permission => {
        switch (permission.action) {
          case 'TRANSFER':
            return `solana.tx.spl_transfers.any(transfer, transfer.amount <= ${scope.limits.perTransaction})`;
          case 'SWAP':
            return `solana.tx.instructions.any(instruction, instruction.program_id in ['9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'])`;
          case 'STAKE':
            return `solana.tx.instructions.any(instruction, instruction.program_id == 'Stake11111111111111111111111111111111111111')`;
          case 'MINT_NFT':
            return `solana.tx.instructions.any(instruction, instruction.program_id == 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' && instruction.data[0] == 0x0)`;
          default:
            return 'false';
        }
      });
      conditions.push(`(${permissionConditions.join(' || ')})`);
    }

    // Program restrictions
    if (scope.programs.length > 0) {
      const programList = scope.programs.map(p => `'${p}'`).join(', ');
      conditions.push(`solana.tx.instructions.all(instruction, instruction.program_id in [${programList}])`);
    }

    // Token restrictions
    if (scope.tokens.length > 0) {
      const tokenList = scope.tokens.map(t => `'${t}'`).join(', ');
      conditions.push(`solana.tx.spl_transfers.all(transfer, transfer.mint in [${tokenList}])`);
    }

    // Time restriction
    const expirationTimestamp = Math.floor(Date.now() / 1000) + scope.duration;
    conditions.push(`now() < ${expirationTimestamp}`);

    return conditions.join(' && ');
  }

  /**
   * Manually revokes a delegation
   */
  async revokeDelegation(
    delegationId: string,
    organizationId: string,
    reason: string
  ): Promise<boolean> {
    try {
      const delegation = this.activeDelegations.get(delegationId);
      if (!delegation) {
        return false;
      }

      // Delete the API key
      await this.apiClient.deleteApiKey({
        organizationId,
        apiKeyId: delegationId,
      });

      // Delete the policy
      await this.policyService.deletePolicy(organizationId, delegation.policyId);

      // Remove from active delegations
      this.activeDelegations.delete(delegationId);

      // Log the revocation
      console.info(`Delegation ${delegationId} revoked: ${reason}`);

      return true;
    } catch (error) {
      console.error('Failed to revoke delegation:', error);
      return false;
    }
  }

  /**
   * Emergency kill-switch to revoke all delegations
   */
  async emergencyRevokeAll(
    organizationId: string,
    userId: string,
    reason: string
  ): Promise<{ revoked: number; failed: number }> {
    let revoked = 0;
    let failed = 0;

    for (const [delegationId] of this.activeDelegations) {
      const success = await this.revokeDelegation(delegationId, organizationId, reason);
      if (success) {
        revoked++;
      } else {
        failed++;
      }
    }

    // Log emergency action
    console.info(`Emergency revocation by ${userId}: ${revoked} revoked, ${failed} failed. Reason: ${reason}`);

    return { revoked, failed };
  }

  /**
   * Gets all active delegations for a user/organization
   */
  getActiveDelegations(organizationId?: string): DelegatedKey[] {
    const delegations = Array.from(this.activeDelegations.values());

    if (organizationId) {
      // Would need to filter by organization if stored
      return delegations;
    }

    return delegations.filter(d => d.isActive && d.expiresAt > new Date());
  }

  /**
   * Updates quota usage for a delegation
   */
  updateQuotaUsage(
    delegationId: string,
    amount: number,
    period: 'daily' | 'weekly' | 'monthly'
  ): boolean {
    const delegation = this.activeDelegations.get(delegationId);
    if (!delegation) {
      return false;
    }

    delegation.quotaUsed[period] += amount;
    return true;
  }

  /**
   * Checks if a delegation has exceeded its quota
   */
  isQuotaExceeded(delegationId: string, limits: TransactionLimits): boolean {
    const delegation = this.activeDelegations.get(delegationId);
    if (!delegation) {
      return true;
    }

    return (
      delegation.quotaUsed.daily >= limits.daily ||
      delegation.quotaUsed.weekly >= limits.weekly ||
      (limits.monthly !== undefined && delegation.quotaUsed.monthly >= limits.monthly)
    );
  }

  /**
   * Verifies agent identity and reputation
   */
  private async verifyAgent(agentId: string): Promise<{ isValid: boolean; reputation?: number }> {
    // In a real implementation, this would:
    // - Check agent certificates
    // - Verify domain ownership
    // - Check reputation scores
    // - Validate against whitelist/blacklist

    // Simplified verification
    if (agentId.length < 10) {
      return { isValid: false };
    }

    return {
      isValid: true,
      reputation: 85, // Mock reputation score
    };
  }


  /**
   * Generates a public key for the delegation
   */
  private async generatePublicKey(): Promise<string> {
    // In a real implementation, this would generate an actual key
    // For now, return a mock key
    return 'mock-public-key-' + Date.now();
  }

  /**
   * Cleans up expired delegations
   */
  async cleanupExpiredDelegations(): Promise<void> {
    const now = new Date();
    const expired: string[] = [];

    for (const [id, delegation] of this.activeDelegations) {
      if (delegation.expiresAt <= now) {
        expired.push(id);
      }
    }

    for (const id of expired) {
      this.activeDelegations.delete(id);
      console.info(`Cleaned up expired delegation: ${id}`);
    }
  }
}