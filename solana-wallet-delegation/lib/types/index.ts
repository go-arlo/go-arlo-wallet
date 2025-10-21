import type { PublicKey } from '@solana/web3.js';

// User and organization types
export interface User {
  id: string;
  name: string;
  email?: string;
  tags: string[];
  isRoot: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserTag {
  id: string;
  name: string;
  description?: string;
}

export interface SubOrganization {
  id: string;
  name: string;
  rootUsers: string[];
  rootQuorumThreshold: number;
  wallets: Wallet[];
  users: User[];
  policies: Policy[];
  createdAt: Date;
}

// Wallet types
export interface Wallet {
  id: string;
  name: string;
  organizationId: string;
  accounts: WalletAccount[];
  createdAt: Date;
}

export interface WalletAccount {
  address: string;
  publicKey: string;
  curve: 'CURVE_ED25519';
  path: string;
  pathFormat: 'PATH_FORMAT_BIP32';
  addressFormat: 'ADDRESS_FORMAT_SOLANA';
  accountType: 'TRADING' | 'LONG_TERM_STORAGE';
}

// Policy types
export interface Policy {
  id: string;
  name: string;
  effect: 'EFFECT_ALLOW' | 'EFFECT_DENY';
  consensus: string;
  condition: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyTemplate {
  name: string;
  description: string;
  effect: 'EFFECT_ALLOW' | 'EFFECT_DENY';
  consensusTemplate: string;
  conditionTemplate: string;
  requiredParams: string[];
}

// Delegation types
export interface DelegationRequest {
  id: string;
  agentId: string;
  agentName?: string;
  scope: DelegationScope;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  requestedAt: Date;
  decidedAt?: Date;
  expiresAt?: Date;
}

export interface DelegationScope {
  permissions: Permission[];
  programs: string[]; // Solana program IDs
  tokens: string[]; // SPL token mint addresses
  limits: TransactionLimits;
  duration: number; // seconds
}

export interface Permission {
  action: 'TRANSFER' | 'SWAP' | 'STAKE' | 'MINT_NFT' | 'BURN' | 'DELEGATE';
  targetAccount?: 'TRADING' | 'LONG_TERM_STORAGE' | 'ANY';
}

export interface TransactionLimits {
  perTransaction: number;
  daily: number;
  weekly: number;
  monthly?: number;
}

export interface DelegatedKey {
  id: string;
  policyId: string;
  agentId: string;
  publicKey: string;
  permissions: Permission[];
  expiresAt: Date;
  isActive: boolean;
  quotaUsed: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

// Authentication types
export interface AuthMethod {
  type: 'PASSKEY' | 'EMAIL' | 'SMS' | 'OAUTH';
  provider?: 'GOOGLE' | 'APPLE' | 'FACEBOOK';
  isEnabled: boolean;
  isPrimary: boolean;
}

export interface Session {
  id: string;
  userId: string;
  organizationId: string;
  publicKey: string;
  privateKey?: CryptoKey; // Unextractable key stored in IndexedDB
  createdAt: number;
  expiresAt: number;
  isActive: boolean;
}

export interface AuthResult {
  success: boolean;
  session?: Session;
  user?: User;
  error?: string;
}

// Transaction types
export interface TransactionRequest {
  from: string;
  to: string;
  amount: number;
  token?: string; // SPL token mint address
  programId?: string;
  data?: Uint8Array;
  delegatedKeyId?: string;
}

export interface TransactionResult {
  signature: string;
  status: 'SUCCESS' | 'FAILED' | 'POLICY_VIOLATION';
  error?: string;
  policyViolations?: string[];
  timestamp: Date;
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  organizationId: string;
  resourceType: 'WALLET' | 'POLICY' | 'DELEGATION' | 'TRANSACTION' | 'USER';
  resourceId: string;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

// Notification types
export interface Notification {
  id: string;
  type: 'DELEGATION_REQUEST' | 'TRANSACTION' | 'POLICY_VIOLATION' | 'EMERGENCY';
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  userId: string;
  isRead: boolean;
  createdAt: Date;
  data?: Record<string, any>;
}

// Risk assessment types
export interface RiskAssessment {
  score: number; // 0-100
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: RiskFactor[];
  recommendation: string;
}

export interface RiskFactor {
  name: string;
  weight: number;
  value: number;
  description: string;
}

// Emergency types
export interface EmergencyAction {
  type: 'KILL_SWITCH' | 'FREEZE_ACCOUNT' | 'REVOKE_ALL_DELEGATIONS';
  initiatedBy: string;
  reason: string;
  affectedResources: string[];
  timestamp: Date;
  status: 'PENDING' | 'EXECUTED' | 'CANCELLED';
}

// Configuration types
export interface WalletConfig {
  name: string;
  enableTradingAccount: boolean;
  enableLongTermStorage: boolean;
  defaultSessionDuration: number;
  enableWebhooks: boolean;
  webhookUrl?: string;
  rateLimit: {
    requestsPerMinute: number;
    transactionsPerDay: number;
  };
}

export interface SecurityConfig {
  requireMFA: boolean;
  allowedAuthMethods: AuthMethod[];
  sessionTimeout: number;
  maxFailedAttempts: number;
  ipWhitelist?: string[];
  enableEmergencyKillSwitch: boolean;
}