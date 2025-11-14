#!/usr/bin/env python3
"""
Test what Jupiter returns to understand transaction format
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

def test_jupiter_response():
    """Test Jupiter API to see the transaction format."""

    delegated_wallet = os.getenv("DELEGATED_WALLET_ADDRESS")

    print("🧪 Testing Jupiter API response format...")
    print(f"Wallet address: {delegated_wallet}")

    # Step 1: Get quote
    quote_params = {
        "inputMint": "So11111111111111111111111111111111111111112",  # SOL
        "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",  # USDC
        "amount": "1000000",  # 0.001 SOL
        "slippageBps": "100"
    }

    headers = {
        "Accept": "application/json",
        "User-Agent": "Jupiter-Swap-Agent/1.0"
    }

    quote_response = requests.get(
        "https://lite-api.jup.ag/swap/v1/quote",
        params=quote_params,
        headers=headers,
        timeout=10
    )

    print(f"Quote response status: {quote_response.status_code}")
    if quote_response.status_code != 200:
        print(f"Quote failed: {quote_response.text}")
        return

    quote = quote_response.json()
    print(f"Quote successful for {quote.get('outAmount')} output tokens")

    # Step 2: Get swap transaction
    swap_request = {
        "quoteResponse": quote,
        "userPublicKey": delegated_wallet,
        "wrapAndUnwrapSol": True,
        "computeUnitPriceMicroLamports": 1000,
        "dynamicComputeUnitLimit": True
    }

    swap_headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Jupiter-Swap-Agent/1.0"
    }

    swap_response = requests.post(
        "https://lite-api.jup.ag/swap/v1/swap",
        json=swap_request,
        headers=swap_headers,
        timeout=30
    )

    print(f"Swap response status: {swap_response.status_code}")
    if swap_response.status_code != 200:
        print(f"Swap failed: {swap_response.text}")
        return

    swap_data = swap_response.json()
    unsigned_transaction = swap_data["swapTransaction"]

    print(f"Transaction type: {type(unsigned_transaction)}")
    print(f"Transaction length: {len(unsigned_transaction)}")
    print(f"First 100 chars: {unsigned_transaction[:100]}")
    print(f"Last 50 chars: {unsigned_transaction[-50:]}")

    # Check if it's base64
    import base64
    try:
        decoded = base64.b64decode(unsigned_transaction)
        print(f"✅ Transaction is valid base64, decoded length: {len(decoded)}")

        # Convert to hex for Turnkey
        hex_transaction = decoded.hex()
        print(f"Hex transaction length: {len(hex_transaction)}")
        print(f"First 100 chars of hex: {hex_transaction[:100]}")

    except Exception as e:
        print(f"❌ Not valid base64: {e}")

    # Check encoding
    if unsigned_transaction.startswith('Q'):
        print("🔍 Transaction starts with 'Q' - likely base64 encoded")
    elif len(unsigned_transaction) % 2 == 0:
        try:
            bytes.fromhex(unsigned_transaction)
            print("🔍 Transaction appears to be hex encoded")
        except:
            print("🔍 Transaction is not hex encoded")

if __name__ == "__main__":
    test_jupiter_response()