'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Bot, Shield, Zap, Users } from 'lucide-react';

const demos = [
  {
    title: 'Delegated Access',
    description: 'Create a sub-organization with delegated wallet access and policy restrictions',
    href: '/demo/delegated-access',
    icon: Users,
    step: 1,
  },
  {
    title: 'Delegated Policy',
    description: 'Set up and manage policies for delegated users with spending limits',
    href: '/demo/delegated-policy',
    icon: Shield,
    step: 2,
  },
  {
    title: 'Jupiter Swap',
    description: 'Execute token swaps on Solana using Jupiter with policy enforcement',
    href: '/demo/jupiter-swap',
    icon: Zap,
    step: 3,
  },
  {
    title: 'AI Agent Trading',
    description: 'Automated trading using AI agent analysis with delegated wallet execution',
    href: '/demo/agent-trading',
    icon: Bot,
    step: 4,
    isNew: true,
  },
];

export default function DemoIndex() {
  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-4">Wallet Delegation Demos</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Explore different features of the Turnkey wallet delegation system, from basic access control
          to AI-powered automated trading.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {demos.map((demo) => {
          const Icon = demo.icon;
          return (
            <Card key={demo.href} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        Step {demo.step}: {demo.title}
                        {demo.isNew && (
                          <span className="px-2 py-1 text-xs bg-green-500 text-white rounded-full">
                            NEW
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {demo.description}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Link href={demo.href}>
                  <Button className="w-full" variant={demo.isNew ? "default" : "outline"}>
                    Launch Demo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-muted">
        <CardHeader>
          <CardTitle>Demo Flow</CardTitle>
          <CardDescription>
            Complete the demos in order for the best experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold">Create Delegated Access</h4>
                <p className="text-sm text-muted-foreground">
                  Set up a sub-organization with two users: end user and delegated user
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold">Configure Policies</h4>
                <p className="text-sm text-muted-foreground">
                  Apply spending limits and transaction policies to the delegated user
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold">Execute Jupiter Swap</h4>
                <p className="text-sm text-muted-foreground">
                  Perform token swaps with automatic policy enforcement
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                4
              </div>
              <div>
                <h4 className="font-semibold">AI Agent Trading (New!)</h4>
                <p className="text-sm text-muted-foreground">
                  Let the AI trading agent analyze tokens and execute trades automatically
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 border-blue-500 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">Prerequisites</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ul className="list-disc list-inside space-y-1 text-blue-800">
            <li>Turnkey organization configured in .env file</li>
            <li>Solana devnet/mainnet RPC endpoint</li>
            <li>For AI trading: Trading agent service running locally</li>
            <li>Some SOL for transaction fees</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}