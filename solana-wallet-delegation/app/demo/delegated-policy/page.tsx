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
  const defaultTransferAmount = parseInt(process.env.NEXT_PUBLIC_TRANSFER_AMOUNT || '1000000000');
  const [formData, setFormData] = useState({
    organizationId: '',
    delegatedUserId: '',
    endUserId: '',
    allowedAddresses: [] as string[],
    maxTransactionAmount: defaultTransferAmount,
    instructionLimit: 20,
    updateRootQuorum: true,
    enableJupiterSwaps: true,
    uploadJupiterIdl: true,
  });
  const [longTermStorageAddress, setLongTermStorageAddress] = useState<string>('');
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState<string>('');

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

  // Fetch long-term storage address when organization ID is available
  useEffect(() => {
    const fetchLongTermStorageAddress = async () => {
      if (!formData.organizationId) {
        setLongTermStorageAddress('');
        setFormData(prev => ({ ...prev, allowedAddresses: [] }));
        return;
      }

      setLoadingAddress(true);
      try {
        const response = await fetch(`/api/wallet/get-storage-address?organizationId=${formData.organizationId}`);
        const data = await response.json();

        if (response.ok && data.address) {
          setLongTermStorageAddress(data.address);
          // Automatically add long-term storage address to allowed addresses
          setFormData(prev => ({
            ...prev,
            allowedAddresses: [data.address]
          }));
        } else {
          setLongTermStorageAddress('');
          setFormData(prev => ({ ...prev, allowedAddresses: [] }));
        }
      } catch (error) {
        console.error('Failed to fetch storage address:', error);
        setLongTermStorageAddress('');
        setFormData(prev => ({ ...prev, allowedAddresses: [] }));
      } finally {
        setLoadingAddress(false);
      }
    };

    fetchLongTermStorageAddress();
  }, [formData.organizationId]);

  const handleCreatePolicy = async () => {
    setIsCreating(true);
    setError(null);

    try {
      // Upload Jupiter IDL first if enabled
      if (formData.enableJupiterSwaps && formData.uploadJupiterIdl) {
        console.log('Uploading Jupiter IDL...');
        const idlResponse = await fetch('/api/smart-contract/upload-idl', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ organizationId: formData.organizationId }),
        });

        const idlData = await idlResponse.json();

        if (!idlResponse.ok) {
          console.warn('IDL upload failed (may already exist):', idlData.error);
          // Continue anyway - IDL might already be uploaded
        } else {
          console.log('Jupiter IDL uploaded successfully');
        }
      }

      // Create the policy
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

  const handleAddAddress = () => {
    if (!newAddress.trim()) return;
    
    // Check if address already exists
    if (formData.allowedAddresses.includes(newAddress.trim())) {
      alert('This address is already in the list');
      return;
    }

    setFormData(prev => ({
      ...prev,
      allowedAddresses: [...prev.allowedAddresses, newAddress.trim()]
    }));
    setNewAddress('');
  };

  const handleRemoveAddress = (addressToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      allowedAddresses: prev.allowedAddresses.filter(addr => addr !== addressToRemove)
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
          Create restrictive policies for delegated users
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
                    Allowed Addresses
                  </label>
                  
                  {loadingAddress ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <p className="text-sm text-gray-600">Loading long-term storage address...</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Display current allowed addresses */}
                      <div className="space-y-2 mb-3">
                        {formData.allowedAddresses.length === 0 ? (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                            <p className="text-sm text-yellow-700">
                              {formData.organizationId 
                                ? 'No addresses configured. At least one address must be added to create the policy.'
                                : 'Enter an organization ID to automatically load the long-term storage address.'}
                            </p>
                          </div>
                        ) : (
                          formData.allowedAddresses.map((address, index) => (
                            <div key={index} className="flex items-center justify-between bg-white border border-gray-200 rounded-md p-3">
                              <div className="flex-1 mr-3">
                                {address === longTermStorageAddress && (
                                  <p className="text-xs text-blue-600 font-medium mb-1">Long-term storage (default)</p>
                                )}
                                <p className="text-sm font-mono break-all">{address}</p>
                              </div>
                              <button
                                onClick={() => handleRemoveAddress(address)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium px-2"
                                title="Remove address"
                              >
                                Remove
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add new address input */}
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newAddress}
                          onChange={(e) => setNewAddress(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddAddress()}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                          placeholder="Add additional Solana address (base58)"
                        />
                        <button
                          onClick={handleAddAddress}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                          Add
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        The delegated user will only be able to send transactions to these addresses.
                      </p>
                    </>
                  )}
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
                  max="30"
                  min="1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Jupiter swaps typically need 10-20 instructions
                </p>
              </div>

              <div className="mt-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enableJupiterSwaps"
                    checked={formData.enableJupiterSwaps}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      enableJupiterSwaps: e.target.checked,
                      uploadJupiterIdl: e.target.checked ? prev.uploadJupiterIdl : false
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enableJupiterSwaps" className="ml-2 block text-sm text-gray-900">
                    Enable Jupiter Swap Transactions
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Allow transactions to Jupiter aggregator program (JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4)
                </p>
              </div>

              {formData.enableJupiterSwaps && (
                <div className="mt-4 ml-6">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="uploadJupiterIdl"
                      checked={formData.uploadJupiterIdl}
                      onChange={(e) => setFormData(prev => ({ ...prev, uploadJupiterIdl: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="uploadJupiterIdl" className="ml-2 block text-sm text-gray-900">
                      Upload Jupiter IDL to Turnkey
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Required for policy to parse Jupiter instruction names (route, exact_out_route, etc.)
                  </p>
                </div>
              )}

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

          <button
            onClick={handleCreatePolicy}
            disabled={isCreating || !formData.organizationId || !formData.delegatedUserId || formData.allowedAddresses.length === 0}
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