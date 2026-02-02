import { NextRequest, NextResponse } from 'next/server';
import { PolicyService } from '@/services/policy/PolicyService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, policyName, effect, consensus, condition, notes } = body;

    if (!organizationId || !policyName || !effect || !consensus || !condition) {
      return NextResponse.json(
        { error: 'organizationId, policyName, effect, consensus, and condition are required' },
        { status: 400 }
      );
    }

    if (effect !== 'EFFECT_ALLOW' && effect !== 'EFFECT_DENY') {
      return NextResponse.json(
        { error: 'effect must be EFFECT_ALLOW or EFFECT_DENY' },
        { status: 400 }
      );
    }

    const policyService = new PolicyService();

    const policy = await policyService.createPolicy(
      organizationId,
      policyName,
      effect,
      consensus,
      condition,
      notes || ''
    );

    return NextResponse.json({
      success: true,
      policy: {
        id: policy.id,
        name: policy.name,
        effect: policy.effect,
        consensus: policy.consensus,
        condition: policy.condition,
        organizationId: policy.organizationId,
        createdAt: policy.createdAt.toISOString()
      }
    });

  } catch (error) {
    console.error('Error creating policy:', error);
    return NextResponse.json(
      {
        error: 'Failed to create policy',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, policyId, policyName, effect, consensus, condition } = body;

    if (!organizationId || !policyId) {
      return NextResponse.json(
        { error: 'organizationId and policyId are required' },
        { status: 400 }
      );
    }

    if (effect && effect !== 'EFFECT_ALLOW' && effect !== 'EFFECT_DENY') {
      return NextResponse.json(
        { error: 'effect must be EFFECT_ALLOW or EFFECT_DENY' },
        { status: 400 }
      );
    }

    const policyService = new PolicyService();

    const updates: {
      policyName?: string;
      effect?: 'EFFECT_ALLOW' | 'EFFECT_DENY';
      consensus?: string;
      condition?: string;
    } = {};

    if (policyName) updates.policyName = policyName;
    if (effect) updates.effect = effect;
    if (consensus) updates.consensus = consensus;
    if (condition) updates.condition = condition;

    const policy = await policyService.updatePolicy(organizationId, policyId, updates);

    return NextResponse.json({
      success: true,
      policy: {
        id: policy.id,
        name: policy.name,
        effect: policy.effect,
        consensus: policy.consensus,
        condition: policy.condition,
        organizationId: policy.organizationId,
        updatedAt: policy.updatedAt.toISOString()
      }
    });

  } catch (error) {
    console.error('Error updating policy:', error);
    return NextResponse.json(
      {
        error: 'Failed to update policy',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const policyId = searchParams.get('policyId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    const policyService = new PolicyService();

    if (policyId) {
      const policy = await policyService.getPolicy(organizationId, policyId);
      if (!policy) {
        return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
      }
      return NextResponse.json({ policy });
    }

    const policies = await policyService.listPolicies(organizationId);
    return NextResponse.json({ policies });

  } catch (error) {
    console.error('Error fetching policies:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch policies',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
