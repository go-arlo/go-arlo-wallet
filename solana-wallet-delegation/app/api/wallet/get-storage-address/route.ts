import { NextRequest, NextResponse } from 'next/server';
import { WalletService } from '@/services/wallet/WalletService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

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

    return NextResponse.json({
      success: true,
      address: longTermStorageAccount.address,
      walletId: wallet.id,
      walletName: wallet.name
    });

  } catch (error) {
    console.error('Error fetching storage address:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch storage address',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
