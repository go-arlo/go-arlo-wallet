#!/usr/bin/env python3
"""
Script to update a Turnkey policy directly.

Required environment variables:
- POLICY_ID: The policy ID to update
- DELEGATED_USER_ID: User ID for the consensus rule
- TRANSFER_ADDRESS_1: First allowed transfer address
- TRANSFER_ADDRESS_2: Second allowed transfer address
- TRANSFER_AMOUNT: Maximum transfer amount (in lamports/smallest unit)
"""

import os
from dotenv import load_dotenv
from wallet_manager import WalletManager

load_dotenv()

wallet_manager = WalletManager(
    delegated_wallet_address=os.getenv("DELEGATED_WALLET_ADDRESS"),
    turnkey_organization_id=os.getenv("TURNKEY_ORGANIZATION_ID"),
    turnkey_api_public_key=os.getenv("DELEGATED_TURNKEY_API_PUBLIC_KEY"),
    turnkey_api_private_key=os.getenv("DELEGATED_TURNKEY_API_PRIVATE_KEY"),
    main_turnkey_api_public_key=os.getenv("MAIN_TURNKEY_API_PUBLIC_KEY"),
    main_turnkey_api_private_key=os.getenv("MAIN_TURNKEY_API_PRIVATE_KEY"),
    turnkey_api_base_url=os.getenv("TURNKEY_API_BASE_URL", "https://api.turnkey.com"),
    solana_rpc_url=os.getenv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com")
)

# Policy ID to update - get this from Turnkey dashboard
POLICY_ID = os.getenv("POLICY_ID", "")
DELEGATED_USER_ID = os.getenv("DELEGATED_USER_ID", "")
TRANSFER_ADDRESS_1 = os.getenv("TRANSFER_ADDRESS_1", "")
TRANSFER_ADDRESS_2 = os.getenv("TRANSFER_ADDRESS_2", "")
TRANSFER_AMOUNT = os.getenv("TRANSFER_AMOUNT", "")

# Validate required env vars
missing = []
if not POLICY_ID:
    missing.append("POLICY_ID")
if not DELEGATED_USER_ID:
    missing.append("DELEGATED_USER_ID")
if not TRANSFER_ADDRESS_1:
    missing.append("TRANSFER_ADDRESS_1")
if not TRANSFER_ADDRESS_2:
    missing.append("TRANSFER_ADDRESS_2")
if not TRANSFER_AMOUNT:
    missing.append("TRANSFER_AMOUNT")

if missing:
    print("Error: Missing required environment variables:")
    for var in missing:
        print(f"  - {var}")
    exit(1)

# New policy values
new_effect = "EFFECT_ALLOW"
new_consensus = f"approvers.any(user, user.id == '{DELEGATED_USER_ID}')"
new_condition = (
    "solana.tx.instructions.count() <= 20 && "
    "((solana.tx.spl_transfers.any(transfer, "
    f"(transfer.to == '{TRANSFER_ADDRESS_1}' || "
    f"transfer.to == '{TRANSFER_ADDRESS_2}') && "
    f"transfer.amount <= {TRANSFER_AMOUNT})) || "
    "(solana.tx.instructions.any(i, "
    "i.program_key == 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4')))"
)

print(f"Updating policy: {POLICY_ID}")
print(f"Effect: {new_effect}")
print(f"Consensus: {new_consensus}")
print(f"Condition: {new_condition[:100]}...")

try:
    result = wallet_manager.update_policy(
        policy_id=POLICY_ID,
        policy_effect=new_effect,
        policy_consensus=new_consensus,
        policy_condition=new_condition
    )

    activity = result.get("activity", {})
    print(f"\n✅ Policy updated successfully!")
    print(f"Activity ID: {activity.get('id')}")
    print(f"Status: {activity.get('status')}")

except Exception as e:
    print(f"\n❌ Failed to update policy: {e}")
