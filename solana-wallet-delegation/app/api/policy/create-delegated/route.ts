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
    if (!organizationId || !delegatedUserId || !allowedAddresses || allowedAddresses.length === 0) {
      return NextResponse.json(
        { error: 'Organization ID, delegated user ID, and at least one allowed address are required' },
        { status: 400 }
      );
    }

    const policyService = new PolicyService();
    const walletService = new WalletService();

    // Create the delegated access policy with restrictions
    const policy = await policyService.createDelegatedAccessPolicy(
      organizationId,
      delegatedUserId,
      allowedAddresses, // Pass array of addresses
      maxTransactionAmount
    );

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
        id: policy.id,
        name: policy.name,
        effect: policy.effect,
        condition: policy.condition,
        consensus: policy.consensus,
        organizationId: policy.organizationId,
        createdAt: policy.createdAt.toISOString()
      },
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