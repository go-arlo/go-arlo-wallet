#!/usr/bin/env python3
"""
Script to upload Jupiter IDL to Turnkey as a smart contract interface.

This script uses the MAIN_TURNKEY_API keys (End User credentials) because
the delegated user doesn't have permission to create smart contract interfaces.
The End User is still a root user with full administrative access.
"""

import os
from dotenv import load_dotenv
from wallet_manager import WalletManager

load_dotenv()

wallet_manager = WalletManager(
    delegated_wallet_address=os.getenv("DELEGATED_WALLET_ADDRESS"),
    turnkey_organization_id=os.getenv("TURNKEY_ORGANIZATION_ID"),
    turnkey_api_public_key=os.getenv("TURNKEY_API_PUBLIC_KEY"),
    turnkey_api_private_key=os.getenv("TURNKEY_API_PRIVATE_KEY"),
    main_turnkey_api_public_key=os.getenv("MAIN_TURNKEY_API_PUBLIC_KEY"),
    main_turnkey_api_private_key=os.getenv("MAIN_TURNKEY_API_PRIVATE_KEY"),
    turnkey_api_base_url=os.getenv("TURNKEY_API_BASE_URL", "https://api.turnkey.com"),
    solana_rpc_url=os.getenv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com")
)

# Path to Jupiter IDL
IDL_PATH = os.path.join(os.path.dirname(__file__), "idl.json")

print("=" * 60)
print("Upload Jupiter IDL to Turnkey")
print("=" * 60)
print(f"Organization ID: {wallet_manager.turnkey_organization_id}")
print(f"IDL Path: {IDL_PATH}")
print(f"Using: MAIN_TURNKEY_API keys (End User with root access)")

if not wallet_manager.main_turnkey_api_public_key or not wallet_manager.main_turnkey_api_private_key:
    print("\n❌ Error: MAIN_TURNKEY_API keys not configured!")
    print("These keys belong to the End User who has root access.")
    print("Set MAIN_TURNKEY_API_PUBLIC_KEY and MAIN_TURNKEY_API_PRIVATE_KEY in .env")
    exit(1)

print(f"MAIN public key: {wallet_manager.main_turnkey_api_public_key[:20]}...")

try:
    result = wallet_manager.create_smart_contract_interface(
        idl_path=IDL_PATH,
        label="Jupiter Aggregator",
        notes="Jupiter swap program IDL for policy validation",
        use_main_keys=True
    )

    activity = result.get("activity", {})
    print(f"\n✅ Jupiter IDL uploaded successfully!")
    print(f"Activity ID: {activity.get('id')}")
    print(f"Status: {activity.get('status')}")

except Exception as e:
    print(f"\n❌ Failed to upload Jupiter IDL: {e}")
