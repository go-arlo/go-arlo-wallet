'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type PolicyEffect = 'EFFECT_ALLOW' | 'EFFECT_DENY';

interface Policy {
  id: string;
  name: string;
  effect: PolicyEffect;
  consensus: string;
  condition: string;
  organizationId: string;
}

interface ApiResponse {
  success?: boolean;
  policy?: Policy;
  policies?: Policy[];
  error?: string;
  details?: string;
}

export default function PolicyManagement() {
  const [mode, setMode] = useState<'create' | 'update' | 'list'>('create');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);

  const [formData, setFormData] = useState({
    organizationId: '',
    policyId: '',
    policyName: '',
    effect: 'EFFECT_ALLOW' as PolicyEffect,
    consensus: '',
    condition: '',
    notes: '',
  });

  // Load defaults from env on client side (would be passed via API in production)
  useEffect(() => {
    // These would typically come from a config endpoint
    const urlParams = new URLSearchParams(window.location.search);
    const orgId = urlParams.get('organizationId');
    const polId = urlParams.get('policyId');
    const userId = urlParams.get('userId');

    if (orgId) setFormData(prev => ({ ...prev, organizationId: orgId }));
    if (polId) {
      setFormData(prev => ({ ...prev, policyId: polId }));
      setMode('update');
    }
    if (userId) {
      setFormData(prev => ({
        ...prev,
        consensus: `approvers.any(user, user.id == '${userId}')`
      }));
    }
  }, []);

  const handleCreate = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/policy/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: formData.organizationId,
          policyName: formData.policyName,
          effect: formData.effect,
          consensus: formData.consensus,
          condition: formData.condition,
          notes: formData.notes,
        }),
      });

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to create policy');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create policy');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/policy/manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: formData.organizationId,
          policyId: formData.policyId,
          policyName: formData.policyName || undefined,
          effect: formData.effect,
          consensus: formData.consensus || undefined,
          condition: formData.condition || undefined,
        }),
      });

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to update policy');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update policy');
    } finally {
      setIsLoading(false);
    }
  };

  const handleListPolicies = async () => {
    if (!formData.organizationId) {
      setError('Organization ID is required to list policies');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/policy/manage?organizationId=${formData.organizationId}`
      );
      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch policies');
      }

      setPolicies(data.policies || []);
      setMode('list');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch policies');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadPolicy = async (policyId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/policy/manage?organizationId=${formData.organizationId}&policyId=${policyId}`
      );
      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch policy');
      }

      if (data.policy) {
        setFormData(prev => ({
          ...prev,
          policyId: data.policy!.id,
          policyName: data.policy!.name,
          effect: data.policy!.effect,
          consensus: data.policy!.consensus,
          condition: data.policy!.condition,
        }));
        setMode('update');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch policy');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  const setAdminPolicyDefaults = () => {
    setFormData(prev => ({
      ...prev,
      policyName: 'Admin Policy Management',
      effect: 'EFFECT_ALLOW',
      condition: "activity.type in ['ACTIVITY_TYPE_CREATE_POLICY_V2', 'ACTIVITY_TYPE_UPDATE_POLICY_V2', 'ACTIVITY_TYPE_DELETE_POLICY', 'ACTIVITY_TYPE_CREATE_POLICY', 'ACTIVITY_TYPE_UPDATE_POLICY']",
      notes: 'Admin policy for managing other policies',
    }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Policy Management</h1>
        <p className="text-gray-600 mt-2">
          Create and update Turnkey policies with raw field values
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => { setMode('create'); handleReset(); }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'create'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Create Policy
        </button>
        <button
          onClick={() => { setMode('update'); handleReset(); }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'update'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Update Policy
        </button>
        <button
          onClick={handleListPolicies}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'list'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          List Policies
        </button>
      </div>

      {/* Policy List View */}
      {mode === 'list' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">
            Policies in Organization
          </h2>
          {policies.length === 0 ? (
            <p className="text-gray-500">No policies found</p>
          ) : (
            <div className="space-y-3">
              {policies.map((policy) => (
                <div
                  key={policy.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleLoadPolicy(policy.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{policy.name}</h3>
                      <p className="text-sm text-gray-500 font-mono">{policy.id}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${
                      policy.effect === 'EFFECT_ALLOW'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {policy.effect}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 font-mono truncate">
                    {policy.condition}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create/Update Form */}
      {(mode === 'create' || mode === 'update') && !result && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {mode === 'create' ? 'Create New Policy' : 'Update Existing Policy'}
            </h2>
            {mode === 'create' && (
              <button
                onClick={setAdminPolicyDefaults}
                className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200"
              >
                Load Admin Policy Template
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Organization ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization ID *
              </label>
              <input
                type="text"
                value={formData.organizationId}
                onChange={(e) => setFormData(prev => ({ ...prev, organizationId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="e.g., e4404550-c5c8-4300-ae0a-f095a40548a7"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use TURNKEY_ORGANIZATION_ID from your .env.local
              </p>
            </div>

            {/* Policy ID (for update mode) */}
            {mode === 'update' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Policy ID *
                </label>
                <input
                  type="text"
                  value={formData.policyId}
                  onChange={(e) => setFormData(prev => ({ ...prev, policyId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="e.g., 5da4d6d4-16ee-4884-bae0-1f8278a49815"
                />
              </div>
            )}

            {/* Policy Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Policy Name {mode === 'create' ? '*' : '(optional)'}
              </label>
              <input
                type="text"
                value={formData.policyName}
                onChange={(e) => setFormData(prev => ({ ...prev, policyName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Admin Policy Management"
              />
            </div>

            {/* Effect */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Effect *
              </label>
              <select
                value={formData.effect}
                onChange={(e) => setFormData(prev => ({ ...prev, effect: e.target.value as PolicyEffect }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EFFECT_ALLOW">EFFECT_ALLOW</option>
                <option value="EFFECT_DENY">EFFECT_DENY</option>
              </select>
            </div>

            {/* Consensus */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Consensus {mode === 'create' ? '*' : '(optional)'}
              </label>
              <textarea
                value={formData.consensus}
                onChange={(e) => setFormData(prev => ({ ...prev, consensus: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={2}
                placeholder="e.g., approvers.any(user, user.id == 'eb6c9418-f838-42ad-a438-d9e9034a0c84')"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use DELEGATED_USER_ID for the user.id value
              </p>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condition {mode === 'create' ? '*' : '(optional)'}
              </label>
              <textarea
                value={formData.condition}
                onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={4}
                placeholder="e.g., activity.type in ['ACTIVITY_TYPE_UPDATE_POLICY_V2', ...]"
              />
            </div>

            {/* Notes (create only) */}
            {mode === 'create' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Description of the policy"
                />
              </div>
            )}
          </div>

          <button
            onClick={mode === 'create' ? handleCreate : handleUpdate}
            disabled={isLoading || !formData.organizationId || (mode === 'update' && !formData.policyId)}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            {isLoading
              ? (mode === 'create' ? 'Creating...' : 'Updating...')
              : (mode === 'create' ? 'Create Policy' : 'Update Policy')
            }
          </button>
        </div>
      )}

      {/* Success Result */}
      {result?.success && result.policy && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="text-green-600 text-2xl mr-3">OK</div>
              <div>
                <h3 className="text-lg font-semibold text-green-800">
                  Policy {mode === 'create' ? 'Created' : 'Updated'} Successfully!
                </h3>
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
                <span className="text-sm font-medium text-gray-600">Name:</span>
                <p className="text-sm mt-1">{result.policy.name}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Effect:</span>
                <span className={`ml-2 px-2 py-1 text-xs rounded ${
                  result.policy.effect === 'EFFECT_ALLOW'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {result.policy.effect}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Consensus:</span>
                <p className="font-mono text-xs bg-gray-50 p-2 rounded mt-1 break-all">
                  {result.policy.consensus}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Condition:</span>
                <p className="font-mono text-xs bg-gray-50 p-2 rounded mt-1 whitespace-pre-wrap break-all">
                  {result.policy.condition}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            {mode === 'create' ? 'Create Another Policy' : 'Update Another Policy'}
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mt-6">
          <div className="flex items-center">
            <div className="text-red-600 text-2xl mr-3">X</div>
            <div>
              <h3 className="text-lg font-semibold text-red-800">Error</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={() => setError(null)}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3">Quick Reference</h3>
        <div className="space-y-3 text-sm">
          <div>
            <span className="font-medium">Admin Policy Condition:</span>
            <code className="block bg-white p-2 rounded mt-1 text-xs overflow-x-auto">
              {`activity.type in ['ACTIVITY_TYPE_CREATE_POLICY_V2', 'ACTIVITY_TYPE_UPDATE_POLICY_V2', 'ACTIVITY_TYPE_DELETE_POLICY', 'ACTIVITY_TYPE_CREATE_POLICY', 'ACTIVITY_TYPE_UPDATE_POLICY']`}
            </code>
          </div>
          <div>
            <span className="font-medium">Consensus (by user ID):</span>
            <code className="block bg-white p-2 rounded mt-1 text-xs">
              {`approvers.any(user, user.id == '<USER_ID>')`}
            </code>
          </div>
          <div>
            <span className="font-medium">Full Access Condition:</span>
            <code className="block bg-white p-2 rounded mt-1 text-xs">
              true
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
