import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'wallet-delegation-api',
    timestamp: new Date().toISOString(),
  });
}