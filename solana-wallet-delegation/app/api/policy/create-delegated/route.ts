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

    const policyService = new PolicyService();
    const walletService = new WalletService();

    // Get wallet IDs in the organization
    const walletIds = await walletService.getWalletIds(organizationId);
    if (walletIds.length === 0) {
      return NextResponse.json(
        { error: 'No wallets found in organization' },
        { status: 404 }
      );
    }

    // Get the first wallet with full account details
    const wallet = await walletService.getWallet(walletIds[0], organizationId);
    if (!wallet) {
      return NextResponse.json(
        { error: 'Failed to get wallet details' },
        { status: 404 }
      );
    }

    // Find the long-term storage account address
    const longTermStorageAccount = wallet.accounts?.find(
      account => account.accountType === 'LONG_TERM_STORAGE'
    );

    if (!longTermStorageAccount) {
      return NextResponse.json(
        { error: 'Long-term storage account not found' },
        { status: 404 }
      );
    }

    // Use the long-term storage address as the default allowed address
    // If allowedAddresses were provided, use them; otherwise use the long-term storage address
    const finalAllowedAddresses = allowedAddresses && allowedAddresses.length > 0
      ? allowedAddresses
      : [longTermStorageAccount.address];

    // Create the delegated access policy with restrictions
    const policy = await policyService.createDelegatedAccessPolicy(
      organizationId,
      delegatedUserId,
      finalAllowedAddresses, // Pass array of addresses
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