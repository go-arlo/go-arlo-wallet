'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PolicyResult {
  policy: {
    id: string;
    name: string;
    effect: string;
    condition: string;
    consensus: string;
    organizationId: string;
    createdAt: string;
  };
  rootQuorumUpdated: boolean;
  createdAt: string;
}

export default function DelegatedPolicyDemo() {
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<PolicyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    organizationId: '',
    delegatedUserId: '',
    endUserId: '',
    allowedAddresses: [], // Empty by default - not needed for swaps
    maxTransactionAmount: 1000000, // 0.001 SOL in lamports
    allowedPrograms: [
      // Core system programs
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',  // SPL Token Program
      'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', // SPL Token-2022 Program
      '11111111111111111111111111111111',               // System Program
      'ComputeBudget111111111111111111111111111111',    // Compute Budget Program
      'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',  // Associated Token Account

      // Jupiter programs
      'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',   // Jupiter Aggregator V6
      'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB',   // Jupiter V4
      'JUP3c2Uh3WA4Ng34tw6kPd2G4C5BB21Xo36Je1s32Ph',   // Jupiter V3
      'JUP2jxvXaqu7NQY1GmNF4m1vodw12LVXYxbFL2uJvfo',   // Jupiter V2

      // Major DEXs
      '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',   // Raydium AMM
      'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',   // Whirlpool
      '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',   // Orca V1
      '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP',   // Orca V2
      'HyaB3W9q6XdA5xwpU4XnSZV94htfmbmqJXZcEbRaJutt',   // Lifinity
      'SSwpkEEcbUqx4vtoEByFjSkhKdCT862DNVb52nZg1UZ',   // Saber
      'MERLuDFBMmsHnsBPZw2sDQZHvXFMwp8EdjudcU2HKky',    // Mercurial
      'Dooar9JkhdZ7J3LHN3A7YCuoGRUggXhQaG4kijfLGU2j'    // Stepn DEX
    ],
    instructionLimit: 30,
    updateRootQuorum: true,
  });

  // Parse URL parameters if they exist (from delegated access creation)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orgId = urlParams.get('organizationId');
    const delegatedId = urlParams.get('delegatedUserId');
    const endId = urlParams.get('endUserId');

    if (orgId) setFormData(prev => ({ ...prev, organizationId: orgId }));
    if (delegatedId) setFormData(prev => ({ ...prev, delegatedUserId: delegatedId }));
    if (endId) setFormData(prev => ({ ...prev, endUserId: endId }));
  }, []);

  const handleCreatePolicy = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/policy/create-delegated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create delegated policy');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create delegated policy');
    } finally {
      setIsCreating(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  const addProgram = () => {
    setFormData(prev => ({
      ...prev,
      allowedPrograms: [...prev.allowedPrograms, '']
    }));
  };

  const updateProgram = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      allowedPrograms: prev.allowedPrograms.map((prog, i) => i === index ? value : prog)
    }));
  };

  const removeProgram = (index: number) => {
    setFormData(prev => ({
      ...prev,
      allowedPrograms: prev.allowedPrograms.filter((_, i) => i !== index)
    }));
  };

  const addAddress = () => {
    setFormData(prev => ({
      ...prev,
      allowedAddresses: [...prev.allowedAddresses, '']
    }));
  };

  const updateAddress = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      allowedAddresses: prev.allowedAddresses.map((addr, i) => i === index ? value : addr)
    }));
  };

  const removeAddress = (index: number) => {
    setFormData(prev => ({
      ...prev,
      allowedAddresses: prev.allowedAddresses.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link href="/demo/delegated-access" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Back to Delegated Access
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Delegated Access Policy Management</h1>
        <p className="text-gray-600 mt-2">
          Create and manage restrictive policies for delegated users with customizable restrictions
        </p>
      </div>

      {!result && !error && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-6">Configure Delegated Access Policy</h2>

          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization ID *
                </label>
                <input
                  type="text"
                  value={formData.organizationId}
                  onChange={(e) => setFormData(prev => ({ ...prev, organizationId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="Sub-organization ID from previous step"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delegated User ID *
                </label>
                <input
                  type="text"
                  value={formData.delegatedUserId}
                  onChange={(e) => setFormData(prev => ({ ...prev, delegatedUserId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="ID of the delegated user"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End User ID (for root quorum update)
              </label>
              <input
                type="text"
                value={formData.endUserId}
                onChange={(e) => setFormData(prev => ({ ...prev, endUserId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="ID of the end user"
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-4">Transaction Restrictions</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allowed Addresses (Optional - Not used for Jupiter swaps)
                  </label>
                  <div className="space-y-2">
                    {formData.allowedAddresses.length === 0 ? (
                      <div className="text-sm text-gray-500 italic">
                        No addresses configured. For Jupiter swaps, addresses are not restricted.
                      </div>
                    ) : (
                      formData.allowedAddresses.map((address, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={address}
                            onChange={(e) => updateAddress(index, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            placeholder="Address for simple SPL transfers (not swaps)"
                          />
                          <button
                            onClick={() => removeAddress(index)}
                            className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                    <button
                      onClick={addAddress}
                      className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Add Address
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Only needed for simple SPL transfers. Jupiter swaps don't use this restriction.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Transaction Amount (lamports)
                  </label>
                  <input
                    type="number"
                    value={formData.maxTransactionAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxTransactionAmount: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Maximum amount per transaction"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    1 SOL = 1,000,000,000 lamports
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Instructions per Transaction
                </label>
                <input
                  type="number"
                  value={formData.instructionLimit}
                  onChange={(e) => setFormData(prev => ({ ...prev, instructionLimit: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  max="50"
                  min="1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Jupiter swaps typically use 10-20 instructions. Set to 30 for complex multi-hop routes.
                </p>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allowed Programs (Reference Only - Not Enforced)
                </label>
                <div className="bg-yellow-50 p-3 rounded-md mb-2 border border-yellow-200">
                  <p className="text-xs text-yellow-800">
                    ⚠️ Note: Turnkey currently doesn't support program validation for Solana. These programs are listed for reference but won't be enforced. Security relies on instruction count limits instead.
                  </p>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {formData.allowedPrograms.map((program, index) => {
                    // Map program IDs to friendly names
                    const programNames: { [key: string]: string } = {
                      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': 'SPL Token Program',
                      'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb': 'SPL Token-2022',
                      '11111111111111111111111111111111': 'System Program',
                      'ComputeBudget111111111111111111111111111111': 'Compute Budget',
                      'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL': 'Associated Token Account',
                      'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'Jupiter V6',
                      'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB': 'Jupiter V4',
                      'JUP3c2Uh3WA4Ng34tw6kPd2G4C5BB21Xo36Je1s32Ph': 'Jupiter V3',
                      'JUP2jxvXaqu7NQY1GmNF4m1vodw12LVXYxbFL2uJvfo': 'Jupiter V2',
                      '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'Raydium AMM',
                      'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc': 'Whirlpool',
                      '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1': 'Orca V1',
                      '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP': 'Orca V2',
                      'HyaB3W9q6XdA5xwpU4XnSZV94htfmbmqJXZcEbRaJutt': 'Lifinity',
                      'SSwpkEEcbUqx4vtoEByFjSkhKdCT862DNVb52nZg1UZ': 'Saber',
                      'MERLuDFBMmsHnsBPZw2sDQZHvXFMwp8EdjudcU2HKky': 'Mercurial',
                      'Dooar9JkhdZ7J3LHN3A7YCuoGRUggXhQaG4kijfLGU2j': 'Stepn DEX'
                    };
                    const programName = programNames[program] || '';

                    return (
                      <div key={index} className="flex gap-2 items-center">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={program}
                            onChange={(e) => updateProgram(index, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                            placeholder="Program ID"
                          />
                          {programName && (
                            <span className="text-xs text-gray-500 ml-2">{programName}</span>
                          )}
                        </div>
                        <button
                          onClick={() => removeProgram(index)}
                          className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                          disabled={formData.allowedPrograms.length <= 1}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                  <button
                    onClick={addProgram}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Add Program
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="updateRootQuorum"
                  checked={formData.updateRootQuorum}
                  onChange={(e) => setFormData(prev => ({ ...prev, updateRootQuorum: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="updateRootQuorum" className="ml-2 block text-sm text-gray-900">
                  Automatically update root quorum to exclude delegated user
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This will remove the delegated user from the root quorum, leaving only the end user with full control
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-blue-800 mb-2">Policy Preview</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>Effect:</strong> ALLOW</p>
              <p><strong>Who can use:</strong> Only the delegated user</p>
              <p><strong>Policy Type:</strong> {formData.allowedPrograms.length === 0 ? 'Jupiter Swap Policy (auto-configured)' : 'Custom Program Policy'}</p>
              <p><strong>Restrictions:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                {formData.allowedAddresses.length > 0 && (
                  <li>SPL transfers restricted to {formData.allowedAddresses.length} whitelisted address{formData.allowedAddresses.length > 1 ? 'es' : ''}</li>
                )}
                {formData.maxTransactionAmount && (
                  <li>Maximum amount per transaction: {formData.maxTransactionAmount.toLocaleString()} lamports</li>
                )}
                <li>Maximum {formData.instructionLimit} instructions per transaction</li>
                <li>Can interact with {formData.allowedPrograms.length > 0 ? `${formData.allowedPrograms.length} specified` : 'all Jupiter swap'} programs</li>
              </ul>
            </div>
          </div>

          <button
            onClick={handleCreatePolicy}
            disabled={isCreating || !formData.organizationId || !formData.delegatedUserId}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            {isCreating ? 'Creating Policy...' : 'Create Delegated Access Policy'}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="text-green-600 text-2xl mr-3">✅</div>
              <div>
                <h3 className="text-lg font-semibold text-green-800">Policy Created Successfully!</h3>
                <p className="text-green-700 mt-1">
                  Delegated access policy has been created and applied.
                  {result.rootQuorumUpdated && ' Root quorum has been updated.'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">Policy Details</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-600">Policy ID:</span>
                <p className="font-mono text-sm bg-gray-50 p-2 rounded mt-1 break-all">
                  {result.policy.id}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Policy Name:</span>
                <p className="text-sm mt-1">{result.policy.name}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Effect:</span>
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                  {result.policy.effect}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Consensus Rule:</span>
                <p className="font-mono text-xs bg-gray-50 p-2 rounded mt-1 break-all">
                  {result.policy.consensus}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Condition:</span>
                <p className="font-mono text-xs bg-gray-50 p-2 rounded mt-1 whitespace-pre-wrap">
                  {result.policy.condition}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Created At:</span>
                <p className="text-sm mt-1">{new Date(result.policy.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {result.rootQuorumUpdated && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className="text-yellow-600 text-2xl mr-3">⚠️</div>
                <div>
                  <h3 className="text-lg font-semibold text-yellow-800">Root Quorum Updated</h3>
                  <p className="text-yellow-700 mt-1">
                    The delegated user has been removed from the root quorum. Only the end user now has full control over the organization.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Next Steps</h3>
            <div className="text-blue-700 space-y-2 text-sm">
              <p>✅ Policy created and active</p>
              <p>✅ Delegated user can only perform allowed actions</p>
              {result.rootQuorumUpdated && <p>✅ Root quorum restricted to end user only</p>}
              <p>🔍 Test the policy by attempting transactions with the delegated user credentials</p>
              <p>📊 Monitor transaction attempts in the Turnkey dashboard</p>
            </div>
            <div className="mt-4 pt-4 border-t border-blue-200">
              <Link
                href={`/demo/jupiter-swap?organizationId=${formData.organizationId}&delegatedUserId=${formData.delegatedUserId}`}
                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
              >
                Test Policy with Jupiter Swap Demo →
              </Link>
              <p className="text-xs text-blue-600 mt-1">
                Execute a token swap to see policy enforcement in action
              </p>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleReset}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Create Another Policy
            </button>
            <Link
              href="/demo/delegated-access"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-center transition-colors"
            >
              Back to Delegated Access Demo
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="text-red-600 text-2xl mr-3">❌</div>
            <div>
              <h3 className="text-lg font-semibold text-red-800">Error Creating Policy</h3>
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