'use client';

import { useState } from 'react';
import Link from 'next/link';

interface DelegatedAccessResult {
  subOrganizationId: string;
  walletId: string;
  accounts: {
    address: string;
    path: string;
    type: 'TRADING' | 'LONG_TERM_STORAGE';
  }[];
  delegatedUserId: string;
  endUserId: string;
  createdAt: string;
}


export default function DelegatedAccessDemo() {
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<DelegatedAccessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: 'Delegated Access Demo',
    endUserEmail: 'enduser@example.com',
    delegatedUserPublicKey: '03e0691d059c9c84656931f852360f4b2ae5a72f8b102c30c603f8cb085b4f220e',
    enableTradingAccount: true,
    enableLongTermStorage: true,
  });

  const handleCreateDelegatedAccess = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/wallet/create-delegated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create delegated access');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create delegated access');
    } finally {
      setIsCreating(false);
    }
  };


  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Delegated Access Demo - Step 1</h1>
        <p className="text-gray-600 mt-2">
          Create a sub-organization with two root users (end user and delegated user)
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <h3 className="font-medium text-blue-800 mb-2">Workflow Overview:</h3>
          <div className="text-blue-700 text-sm space-y-1">
            <p><strong>Step 1:</strong> Create sub-organization with two root users</p>
            <p><strong>Step 2:</strong> Create restrictive policy for delegated user</p>
            <p><strong>Step 3:</strong> Update root quorum to exclude delegated user</p>
          </div>
        </div>
      </div>

      {!result && !error && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-6">Configure Sub-Organization</h2>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End User Email
              </label>
              <input
                type="email"
                value={formData.endUserEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, endUserEmail: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="User who will have full control"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delegated User API Public Key
              </label>
              <input
                type="text"
                value={formData.delegatedUserPublicKey}
                onChange={(e) => setFormData(prev => ({ ...prev, delegatedUserPublicKey: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="Public key for backend service"
              />
            </div>


            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableTrading"
                  checked={formData.enableTradingAccount}
                  onChange={(e) => setFormData(prev => ({ ...prev, enableTradingAccount: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="enableTrading" className="ml-2 block text-sm text-gray-900">
                  Enable Trading Account
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableStorage"
                  checked={formData.enableLongTermStorage}
                  onChange={(e) => setFormData(prev => ({ ...prev, enableLongTermStorage: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="enableStorage" className="ml-2 block text-sm text-gray-900">
                  Enable Long-term Storage
                </label>
              </div>
            </div>
          </div>

          <button
            onClick={handleCreateDelegatedAccess}
            disabled={isCreating}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            {isCreating ? 'Creating Sub-Organization...' : 'Create Sub-Organization (Step 1)'}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="text-green-600 text-2xl mr-3">✅</div>
              <div>
                <h3 className="text-lg font-semibold text-green-800">Sub-Organization Created!</h3>
                <p className="text-green-700 mt-1">
                  Sub-organization with two users has been configured.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">Organization Details</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-600">Sub-Organization ID:</span>
                <p className="font-mono text-sm bg-gray-50 p-2 rounded mt-1 break-all">
                  {result.subOrganizationId}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Wallet ID:</span>
                <p className="font-mono text-sm bg-gray-50 p-2 rounded mt-1 break-all">
                  {result.walletId}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">End User ID:</span>
                  <p className="font-mono text-xs bg-gray-50 p-2 rounded mt-1 break-all">
                    {result.endUserId}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Delegated User ID:</span>
                  <p className="font-mono text-xs bg-gray-50 p-2 rounded mt-1 break-all">
                    {result.delegatedUserId}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">Next Step: Create Policy</h3>
            <p className="text-yellow-700 mb-4">
              The sub-organization has been created with two root users. Now you need to create a restrictive policy for the delegated user.
            </p>
            <Link
              href={`/demo/delegated-policy?organizationId=${result.subOrganizationId}&delegatedUserId=${result.delegatedUserId}&endUserId=${result.endUserId}`}
              className="inline-block bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Create Delegated Access Policy →
            </Link>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Setup Complete</h3>
            <div className="text-blue-700 space-y-2 text-sm">
              <p>✅ Sub-organization created</p>
              <p>✅ Delegated user has API key access</p>
              <p>✅ End user has email-based access</p>
              <p>✅ Wallet created with HD derivation</p>
              <p>🔲 Next: Create restrictive policy for delegated user</p>
              <p>🔲 Next: Update root quorum to exclude delegated user</p>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleReset}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Create Another Setup
            </button>
            <Link
              href="/"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-center transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="text-red-600 text-2xl mr-3">❌</div>
            <div>
              <h3 className="text-lg font-semibold text-red-800">Error Creating Delegated Access</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}