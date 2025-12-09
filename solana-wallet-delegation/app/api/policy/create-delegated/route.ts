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

    console.info('Creating policy with addresses:', allowedAddresses);

    if (!organizationId || !delegatedUserId) {
      return NextResponse.json(
        { error: 'Organization ID and delegated user ID are required' },
        { status: 400 }
      );
    }

    const policyService = new PolicyService();
    const walletService = new WalletService();

    const walletIds = await walletService.getWalletIds(organizationId);
    if (walletIds.length === 0) {
      return NextResponse.json(
        { error: 'No wallets found in organization' },
        { status: 404 }
      );
    }

    const wallet = await walletService.getWallet(walletIds[0], organizationId);
    if (!wallet) {
      return NextResponse.json(
        { error: 'Failed to get wallet details' },
        { status: 404 }
      );
    }

    const longTermStorageAccount = wallet.accounts?.find(
      account => account.accountType === 'LONG_TERM_STORAGE'
    );

    if (!longTermStorageAccount) {
      return NextResponse.json(
        { error: 'Long-term storage account not found' },
        { status: 404 }
      );
    }

    if (!allowedAddresses || allowedAddresses.length === 0) {
      return NextResponse.json(
        { error: 'At least one allowed address must be provided' },
        { status: 400 }
      );
    }

    console.info('Final allowed addresses:', allowedAddresses);

    const policy = await policyService.createDelegatedAccessPolicy(
      organizationId,
      delegatedUserId,
      allowedAddresses,
      maxTransactionAmount,
      instructionLimit
    );

    let rootQuorumUpdated = false;

    if (updateRootQuorum && endUserId) {
      try {
        await walletService.updateRootQuorum(organizationId, endUserId, 1);
        rootQuorumUpdated = true;
      } catch (error) {
        console.warn('Failed to update root quorum:', error);
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
