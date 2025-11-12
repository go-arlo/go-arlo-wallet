import { NextRequest, NextResponse } from 'next/server';
import { Turnkey } from '@turnkey/sdk-server';
import { Connection, PublicKey } from '@solana/web3.js';

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params;

    // Validate the address
    try {
      new PublicKey(address);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    // Check Turnkey organization for this wallet
    let turnkeyInfo = null;
    try {
      const turnkey = new Turnkey({
        apiBaseUrl: process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL!,
        apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
        apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
        defaultOrganizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID!,
      });

      // Try to get wallets from the organization
      const walletsResponse = await turnkey.apiClient().listWallets({
        organizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID!,
      });

      const foundWallet = walletsResponse.wallets?.find(wallet =>
        wallet.accounts?.some(account => account.address === address)
      );

      if (foundWallet) {
        turnkeyInfo = {
          walletId: foundWallet.walletId,
          walletName: foundWallet.walletName,
          found: true
        };
      } else {
        turnkeyInfo = {
          found: false,
          message: 'Wallet not found in Turnkey organization'
        };
      }

    } catch (error: any) {
      turnkeyInfo = {
        found: false,
        error: error.message,
        message: 'Error checking Turnkey organization'
      };
    }

    // Check Solana network info
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
    );

    const balanceLamports = await connection.getBalance(new PublicKey(address));
    const accountInfo = await connection.getAccountInfo(new PublicKey(address));

    return NextResponse.json({
      address,
      solana: {
        balance: balanceLamports,
        balanceSOL: balanceLamports / 10**9,
        exists: accountInfo !== null,
        network: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'
      },
      turnkey: turnkeyInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error fetching wallet info:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch wallet info',
        details: error.message
      },
      { status: 500 }
    );
  }
}