import { NextRequest, NextResponse } from 'next/server';
import { executeJupiterSwap } from '@/app/actions/jupiter';
import { TurnkeySigner } from '@turnkey/solana';
import { Connection } from '@solana/web3.js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate required fields
    const {
      inputMint,
      outputMint,
      amount,
      slippageBps,
      userPublicKey,
      tradingDecision,
      priorityFee = 0.0001,
    } = body;

    if (!inputMint || !outputMint || !amount || !userPublicKey) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Validate API key
    const apiKey = req.headers.get('X-API-Key');
    if (apiKey !== process.env.AGENT_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid API key' },
        { status: 401 }
      );
    }

    // Log trading decision for audit
    console.log('Agent Trade Request:', {
      action: tradingDecision?.action,
      tokenSymbol: tradingDecision?.tokenSymbol,
      confidence: tradingDecision?.confidence,
      riskScore: tradingDecision?.riskScore,
      timestamp: new Date().toISOString(),
    });

    // Check trading decision meets policy requirements
    if (tradingDecision) {
      // Enforce minimum confidence
      if (tradingDecision.confidence < 75) {
        return NextResponse.json(
          {
            error: 'Trade rejected: Confidence too low',
            details: `Confidence ${tradingDecision.confidence}% is below minimum 75%`
          },
          { status: 403 }
        );
      }

      // Enforce maximum risk score
      if (tradingDecision.riskScore > 30) {
        return NextResponse.json(
          {
            error: 'Trade rejected: Risk too high',
            details: `Risk score ${tradingDecision.riskScore} exceeds maximum 30`
          },
          { status: 403 }
        );
      }
    }

    // Convert amount to proper units (assuming lamports for SOL)
    const swapAmount = parseInt(amount.toString());

    // Execute the swap using the existing Jupiter integration
    const result = await executeJupiterSwap({
      inputMint,
      outputMint,
      amount: swapAmount,
      slippageBps: slippageBps || 50,
      userPublicKey,
      priorityFee,
    });

    // Return success response
    return NextResponse.json({
      success: true,
      transactionHash: result.transactionHash,
      executedAmount: swapAmount,
      receivedAmount: result.receivedAmount || 'N/A',
      tradingDecision: tradingDecision,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Agent trade error:', error);

    // Check for policy violations
    if (error.message?.includes('policy')) {
      return NextResponse.json(
        {
          error: 'Policy violation',
          details: error.message
        },
        { status: 403 }
      );
    }

    // Check for insufficient balance
    if (error.message?.includes('insufficient')) {
      return NextResponse.json(
        {
          error: 'Insufficient balance',
          details: error.message
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to execute trade',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Health check endpoint for the agent
  return NextResponse.json({
    status: 'healthy',
    service: 'agent-trade-api',
    timestamp: new Date().toISOString(),
  });
}