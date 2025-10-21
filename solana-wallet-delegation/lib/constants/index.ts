// Solana HD wallet paths
export const SOLANA_DERIVATION_PATHS = {
  TRADING: "m/44'/501'/0'/0'",
  LONG_TERM_STORAGE: "m/44'/501'/0'/1'",
} as const;

// Account types
export const ACCOUNT_TYPES = {
  TRADING: 'TRADING',
  LONG_TERM_STORAGE: 'LONG_TERM_STORAGE',
} as const;

// User tags
export const USER_TAGS = {
  ADMIN: 'admin',
  TRADER: 'trader',
  VIEWER: 'viewer',
} as const;

// Policy effects
export const POLICY_EFFECTS = {
  ALLOW: 'EFFECT_ALLOW',
  DENY: 'EFFECT_DENY',
} as const;

// Delegation status
export const DELEGATION_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
} as const;

// Transaction status
export const TRANSACTION_STATUS = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  POLICY_VIOLATION: 'POLICY_VIOLATION',
  PENDING: 'PENDING',
} as const;

// Permission actions
export const PERMISSION_ACTIONS = {
  TRANSFER: 'TRANSFER',
  SWAP: 'SWAP',
  STAKE: 'STAKE',
  MINT_NFT: 'MINT_NFT',
  BURN: 'BURN',
  DELEGATE: 'DELEGATE',
} as const;

// Risk levels
export const RISK_LEVELS = {
  LOW: { threshold: 25, label: 'LOW', color: '#4CAF50' },
  MEDIUM: { threshold: 50, label: 'MEDIUM', color: '#FFC107' },
  HIGH: { threshold: 75, label: 'HIGH', color: '#FF9800' },
  CRITICAL: { threshold: 100, label: 'CRITICAL', color: '#F44336' },
} as const;

// Session defaults
export const SESSION_DEFAULTS = {
  DURATION: 15 * 60 * 1000, // 15 minutes in milliseconds
  MAX_IDLE_TIME: 5 * 60 * 1000, // 5 minutes
  REFRESH_THRESHOLD: 2 * 60 * 1000, // Refresh when 2 minutes left
} as const;

// Rate limits
export const RATE_LIMITS = {
  DEFAULT_REQUESTS_PER_MINUTE: 60,
  DEFAULT_TRANSACTIONS_PER_DAY: 100,
  EMERGENCY_COOLDOWN: 60 * 1000, // 1 minute
} as const;

// Solana program IDs (devnet)
export const SOLANA_PROGRAMS = {
  TOKEN_PROGRAM: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  ASSOCIATED_TOKEN_PROGRAM: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  SYSTEM_PROGRAM: '11111111111111111111111111111111',
  MEMO_PROGRAM: 'MemoSq4gqABAXKb96qnH8TysNcVxMyYK7rRUmdZJ5h',
} as const;

// Notification types
export const NOTIFICATION_TYPES = {
  DELEGATION_REQUEST: 'DELEGATION_REQUEST',
  TRANSACTION: 'TRANSACTION',
  POLICY_VIOLATION: 'POLICY_VIOLATION',
  EMERGENCY: 'EMERGENCY',
  QUOTA_WARNING: 'QUOTA_WARNING',
  SESSION_EXPIRY: 'SESSION_EXPIRY',
} as const;

// Error codes
export const ERROR_CODES = {
  // Authentication errors
  AUTH_FAILED: 'AUTH_FAILED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  MFA_REQUIRED: 'MFA_REQUIRED',

  // Policy errors
  POLICY_VIOLATION: 'POLICY_VIOLATION',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',

  // Transaction errors
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',

  // Delegation errors
  DELEGATION_NOT_FOUND: 'DELEGATION_NOT_FOUND',
  DELEGATION_EXPIRED: 'DELEGATION_EXPIRED',
  INVALID_AGENT: 'INVALID_AGENT',

  // System errors
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

// API endpoints
export const API_ENDPOINTS = {
  // Wallet endpoints
  CREATE_WALLET: '/api/wallet/create',
  GET_WALLET: '/api/wallet',
  LIST_WALLETS: '/api/wallet/list',

  // Policy endpoints
  CREATE_POLICY: '/api/policy/create',
  UPDATE_POLICY: '/api/policy/update',
  DELETE_POLICY: '/api/policy/delete',
  LIST_POLICIES: '/api/policy/list',

  // Delegation endpoints
  REQUEST_DELEGATION: '/api/delegation/request',
  APPROVE_DELEGATION: '/api/delegation/approve',
  REJECT_DELEGATION: '/api/delegation/reject',
  REVOKE_DELEGATION: '/api/delegation/revoke',
  LIST_DELEGATIONS: '/api/delegation/list',

  // Transaction endpoints
  SIGN_TRANSACTION: '/api/transaction/sign',
  BROADCAST_TRANSACTION: '/api/transaction/broadcast',
  GET_TRANSACTION: '/api/transaction',
  LIST_TRANSACTIONS: '/api/transaction/list',

  // Authentication endpoints
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  REFRESH_SESSION: '/api/auth/refresh',
  VERIFY_OTP: '/api/auth/verify-otp',

  // User endpoints
  CREATE_USER: '/api/user/create',
  UPDATE_USER: '/api/user/update',
  DELETE_USER: '/api/user/delete',
  LIST_USERS: '/api/user/list',
} as const;

// UI Routes
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  WALLET: '/wallet',
  DELEGATIONS: '/delegations',
  POLICIES: '/policies',
  TRANSACTIONS: '/transactions',
  SETTINGS: '/settings',
  LOGIN: '/login',
  LOGOUT: '/logout',
  OAUTH_CALLBACK: '/oauth/callback',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  SESSION: 'wallet_session',
  USER_PREFERENCES: 'user_preferences',
  RECENT_ADDRESSES: 'recent_addresses',
  NOTIFICATION_SETTINGS: 'notification_settings',
} as const;

// IndexedDB configuration
export const INDEXED_DB = {
  NAME: 'SolanaWalletDB',
  VERSION: 1,
  STORES: {
    SESSIONS: 'sessions',
    KEYS: 'keys',
    CACHE: 'cache',
    AUDIT_LOGS: 'audit_logs',
  },
} as const;