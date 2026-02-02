import { NextRequest, NextResponse } from 'next/server';
import { Turnkey } from '@turnkey/sdk-server';
import jupiterIdl from '@/lib/jupiter-idl.json';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    const client = new Turnkey({
      apiBaseUrl: process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL!,
      apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
      apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
      defaultOrganizationId: organizationId,
    });

    const idl = jupiterIdl as Record<string, unknown>;
    const smartContractAddress = (idl.address as string) || 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4';

    const response = await client.apiClient().createSmartContractInterface({
      organizationId,
      smartContractAddress,
      smartContractInterface: JSON.stringify(idl),
      type: 'SMART_CONTRACT_INTERFACE_TYPE_SOLANA',
      label: 'Jupiter Aggregator',
      notes: 'Jupiter swap program IDL for policy validation',
    });

    return NextResponse.json({
      success: true,
      activityId: response.activity?.id,
      status: response.activity?.status,
      smartContractAddress,
    });

  } catch (error) {
    console.error('Error uploading smart contract IDL:', error);

    return NextResponse.json(
      {
        error: 'Failed to upload smart contract IDL',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
