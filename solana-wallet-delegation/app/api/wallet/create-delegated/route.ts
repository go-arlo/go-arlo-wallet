import { NextRequest, NextResponse } from 'next/server';
import { WalletService } from '@/services/wallet/WalletService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      endUserEmail,
      delegatedUserPublicKey,
      enableTradingAccount,
      enableLongTermStorage,
      defaultSessionDuration,
      enableWebhooks,
      rateLimit
    } = body;

    if (!name || !endUserEmail || !delegatedUserPublicKey) {
      return NextResponse.json(
        { error: 'Name, end user email, and delegated user public key are required' },
        { status: 400 }
      );
    }

    const walletService = new WalletService();

    const config = {
      name,
      enableTradingAccount: enableTradingAccount ?? true,
      enableLongTermStorage: enableLongTermStorage ?? true,
      defaultSessionDuration: defaultSessionDuration ?? 900000,
      enableWebhooks: enableWebhooks ?? false,
      rateLimit: rateLimit ?? {
        requestsPerMinute: 60,
        transactionsPerDay: 100
      }
    };

    const result = await walletService.createSubOrganizationWithDelegatedAccess(
      config,
      endUserEmail,
      delegatedUserPublicKey
    );

    return NextResponse.json({
      success: true,
      subOrganizationId: result.subOrganization.id,
      walletId: result.wallet.id,
      accounts: result.accounts.map(account => ({
        address: account.address,
        path: account.path,
        type: account.accountType
      })),
      delegatedUserId: result.delegatedUserId,
      endUserId: result.endUserId,
      createdAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error creating delegated access:', error);

    return NextResponse.json(
      {
        error: 'Failed to create delegated access',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
