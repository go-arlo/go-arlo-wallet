declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TURNKEY_API_PUBLIC_KEY: string;
      TURNKEY_API_PRIVATE_KEY: string;
      NEXT_PUBLIC_TURNKEY_API_BASE_URL: string;
      NEXT_PUBLIC_ORGANIZATION_ID: string;
      NEXT_PUBLIC_RPID: string;
      NEXT_PUBLIC_GOOGLE_CLIENT_ID?: string;
      NEXT_PUBLIC_APPLE_CLIENT_ID?: string;
      NEXT_PUBLIC_FACEBOOK_CLIENT_ID?: string;
      NEXT_PUBLIC_SOLANA_NETWORK: 'mainnet-beta' | 'testnet' | 'devnet';
      NEXT_PUBLIC_SOLANA_RPC_URL: string;
      NEXT_PUBLIC_SESSION_DURATION: string;
      NEXT_PUBLIC_IMPORT_IFRAME_URL: string;
      NEXT_PUBLIC_EXPORT_IFRAME_URL: string;
      NEXT_PUBLIC_AUTH_IFRAME_URL: string;
      NEXT_PUBLIC_OAUTH_REDIRECT_URI: string;
      WEBHOOK_URL?: string;
      WEBHOOK_SECRET?: string;
      RATE_LIMIT_REQUESTS_PER_MINUTE: string;
    }
  }
}

export {};