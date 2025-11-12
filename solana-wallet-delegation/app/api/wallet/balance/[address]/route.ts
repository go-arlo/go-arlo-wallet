import { NextRequest, NextResponse } from 'next/server';
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

    // Connect to Solana
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
    );

    // Get balance in lamports
    const balanceLamports = await connection.getBalance(new PublicKey(address));

    return NextResponse.json({
      address,
      balance: balanceLamports,
      balanceSOL: balanceLamports / 10**9,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error fetching wallet balance:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch wallet balance',
        details: error.message
      },
      { status: 500 }
    );
  }
}