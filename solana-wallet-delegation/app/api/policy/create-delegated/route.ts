import { NextRequest, NextResponse } from 'next/server';
import { PolicyService } from '@/services/policy/PolicyService';
import { WalletService } from '@/services/wallet/WalletService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId,
      delegatedUserId,
      endUserId,
      allowedAddresses,
      maxTransactionAmount,
      allowedPrograms,
      instructionLimit,
      updateRootQuorum
    } = body;

    // Validate required fields
    if (!organizationId || !delegatedUserId) {
      return NextResponse.json(
        { error: 'Organization ID and delegated user ID are required' },
        { status: 400 }
      );
    }

    // Set default dummy address if none provided (needed for backwards compatibility)
    const addresses = allowedAddresses && allowedAddresses.length > 0
      ? allowedAddresses
      : ['11111111111111111111111111111111']; // System program as dummy

    const policyService = new PolicyService();
    const walletService = new WalletService();

    // Create the Jupiter swap policy if no specific programs are provided
    // Otherwise create the standard delegated access policy
    let transferPolicy;
    if (!allowedPrograms || allowedPrograms.length === 0) {
      // Use Jupiter swap policy for better compatibility with DEX swaps
      transferPolicy = await policyService.createJupiterSwapPolicy(
        organizationId,
        delegatedUserId,
        maxTransactionAmount
      );
    } else {
      // Use standard delegated access policy with custom programs
      transferPolicy = await policyService.createDelegatedAccessPolicy(
        organizationId,
        delegatedUserId,
        addresses, // Pass array of addresses (with default if needed)
        maxTransactionAmount,
        allowedPrograms,
        instructionLimit
      );
    }

    // No need for separate program policy since it's now integrated
    let programPolicy = null;

    let rootQuorumUpdated = false;

    // If requested, update root quorum to exclude delegated user
    if (updateRootQuorum && endUserId) {
      try {
        await walletService.updateRootQuorum(organizationId, endUserId, 1);
        rootQuorumUpdated = true;
      } catch (error) {
        console.warn('Failed to update root quorum:', error);
        // Continue even if root quorum update fails
      }
    }

    return NextResponse.json({
      success: true,
      policy: {
        id: transferPolicy.id,
        name: transferPolicy.name,
        effect: transferPolicy.effect,
        condition: transferPolicy.condition,
        consensus: transferPolicy.consensus,
        organizationId: transferPolicy.organizationId,
        createdAt: transferPolicy.createdAt.toISOString()
      },
      programPolicy: programPolicy ? {
        id: programPolicy.id,
        name: programPolicy.name,
        effect: programPolicy.effect,
        condition: programPolicy.condition,
        consensus: programPolicy.consensus,
        organizationId: programPolicy.organizationId,
        createdAt: programPolicy.createdAt.toISOString()
      } : null,
      rootQuorumUpdated,
      createdAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error creating delegated policy:', error);

    return NextResponse.json(
      {
        error: 'Failed to create delegated policy',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}