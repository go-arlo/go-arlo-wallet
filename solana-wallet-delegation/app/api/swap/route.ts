import { NextResponse } from 'next/server';
import { TurnkeySigner } from '@turnkey/solana';
import { Connection, VersionedTransaction } from '@solana/web3.js';
import { createJupiterSwap } from '@/app/actions/jupiter';
import { Turnkey } from '@turnkey/sdk-server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      inputMint,
      outputMint,
      amount,
      walletAddress,
      organizationId,
      slippageBps = 50,
      delegatedUserId,
    } = body;

    // Validate required parameters
    if (!inputMint || !outputMint || !amount || !walletAddress || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Initialize Turnkey SDK
    const turnkey = new Turnkey({
      apiBaseUrl: process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL!,
      apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
      apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
      defaultOrganizationId: organizationId,
    });

    // Create TurnkeySigner with the organization and wallet
    const turnkeySigner = new TurnkeySigner({
      organizationId,
      client: turnkey.apiClient(),
    });

    // Step 1: Create Jupiter swap transaction
    console.log('Creating Jupiter swap transaction...');
    const swapResult = await createJupiterSwap({
      inputMint,
      outputMint,
      amount,
      userPublicKey: walletAddress,
      slippageBps,
    });

    if (!swapResult.swapTransaction) {
      throw new Error('Failed to create Jupiter swap - missing transaction');
    }

    // Step 2: Deserialize the transaction
    const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
    const txBuffer = Buffer.from(swapResult.swapTransaction, 'base64');
    const versionedTx = VersionedTransaction.deserialize(txBuffer);

    // Step 3: Sign the transaction with Turnkey signer
    console.log('Signing transaction with Turnkey...');

    // Sign the transaction - this enforces policies
    const signedTx = await turnkeySigner.signTransaction(versionedTx, walletAddress, organizationId);

    // Step 4: Send the transaction
    console.log('Sending signed transaction...');
    const txSignature = await connection.sendTransaction(signedTx as VersionedTransaction);

    // Step 5: Wait for confirmation
    const confirmation = await connection.confirmTransaction(txSignature);

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    // Return success with transaction details
    return NextResponse.json({
      success: true,
      txSignature: txSignature,
      inputMint,
      outputMint,
      amount,
      expectedOutput: swapResult.outAmount || amount,
      priceImpact: swapResult.priceImpactPct || '0',
      explorerUrl: `https://solscan.io/tx/${txSignature}`,
    });

  } catch (error: any) {
    console.error('Swap error:', error);

    // Check if it's a policy violation
    if (error.message?.includes('policy') || error.message?.includes('denied')) {
      return NextResponse.json(
        {
          error: 'Transaction denied by policy',
          details: error.message,
          policyViolation: true,
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: error.message || 'Failed to execute swap',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}