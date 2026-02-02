import { NextRequest, NextResponse } from 'next/server';
import { PolicyService } from '@/services/policy/PolicyService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId,
      delegatedUserId,
      maxInstructions,
      maxTransferAmount,
      fullAccess
    } = body;

    if (!organizationId || !delegatedUserId) {
      return NextResponse.json(
        { error: 'Organization ID and delegated user ID are required' },
        { status: 400 }
      );
    }

    const policyService = new PolicyService();

    let policy;
    if (fullAccess) {
      // Create full access policy (use with caution)
      policy = await policyService.createFullAccessPolicy(
        organizationId,
        delegatedUserId
      );
    } else {
      // Create Jupiter swap policy with instruction limit
      policy = await policyService.createJupiterSwapPolicy(
        organizationId,
        delegatedUserId,
        maxInstructions ?? 20,
        maxTransferAmount
      );
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
      createdAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error creating Jupiter policy:', error);

    return NextResponse.json(
      {
        error: 'Failed to create Jupiter policy',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
