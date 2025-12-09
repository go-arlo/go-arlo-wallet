#!/usr/bin/env python3
"""
Generate P256 key pair and setup Turnkey API keys for delegated users

This script:
1. Generates a P256 (secp256r1) key pair for delegated user authentication
2. Optionally creates API keys in Turnkey for the delegated user
3. Provides detailed logging for debugging signature issues
"""

import os
import json
import time
import base64
import logging
import argparse
from typing import Dict, Any

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
from dotenv import load_dotenv
import requests

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()


def generate_p256_keypair():
    """Generate a P256 (secp256r1) key pair."""

    private_key = ec.generate_private_key(
        ec.SECP256R1(),
        default_backend()
    )

    private_numbers = private_key.private_numbers()
    private_key_bytes = private_numbers.private_value.to_bytes(32, 'big')
    private_key_hex = private_key_bytes.hex()

    public_key = private_key.public_key()
    public_numbers = public_key.public_numbers()

    x_bytes = public_numbers.x.to_bytes(32, 'big')

    if public_numbers.y % 2 == 0:
        public_key_bytes = b'\x02' + x_bytes
    else:
        public_key_bytes = b'\x03' + x_bytes

    public_key_hex = public_key_bytes.hex()

    return private_key_hex, public_key_hex


def create_api_stamp(request_body: Dict[str, Any], private_key_hex: str, public_key_hex: str) -> str:
    """
    Create an API key stamp for Turnkey requests with detailed logging.

    Args:
        request_body: The request body to sign
        private_key_hex: Private key for signing
        public_key_hex: Public key for the stamp

    Returns:
        Base64URL encoded stamp
    """
    logger.info("Creating API stamp...")

    private_key_bytes = bytes.fromhex(private_key_hex)
    private_number = int.from_bytes(private_key_bytes, 'big')
    private_key = ec.derive_private_key(
        private_number,
        ec.SECP256R1(),
        default_backend()
    )

    request_json = json.dumps(request_body, separators=(',', ':'))
    message_bytes = request_json.encode('utf-8')

    logger.info(f"Request JSON: {request_json}")
    logger.info(f"Message bytes length: {len(message_bytes)}")

    signature = private_key.sign(
        message_bytes,
        ec.ECDSA(hashes.SHA256())
    )

    logger.info(f"Signature (hex): {signature.hex()}")

    stamp = {
        "publicKey": public_key_hex,
        "signature": signature.hex(),
        "scheme": "SIGNATURE_SCHEME_TK_API_P256"
    }

    stamp_json = json.dumps(stamp, separators=(',', ':'))
    stamp_encoded = base64.urlsafe_b64encode(
        stamp_json.encode()
    ).decode().rstrip('=')

    logger.info(f"Stamp JSON: {stamp_json}")
    logger.info(f"Stamp base64: {stamp_encoded}")

    return stamp_encoded


def create_api_keys_for_user(
    delegated_public_key: str,
    user_id: str,
    organization_id: str,
    main_private_key: str,
    main_public_key: str,
    api_key_name: str = "Delegated Access Key",
    expiration_seconds: int = None
) -> bool:
    """
    Create API keys for a delegated user using main account credentials.

    Args:
        delegated_public_key: Public key for the delegated user
        user_id: ID of the delegated user
        organization_id: Turnkey organization ID (sub-org)
        main_private_key: Main account private key for authentication
        main_public_key: Main account public key for authentication
        api_key_name: Name for the API key
        expiration_seconds: Optional expiration time in seconds (None for no expiration)

    Returns:
        True if successful, False otherwise
    """
    logger.info("=" * 60)
    logger.info("CREATING API KEYS FOR DELEGATED USER")
    logger.info("=" * 60)

    logger.info(f"Delegated public key: {delegated_public_key}")
    logger.info(f"User ID: {user_id}")
    logger.info(f"Organization ID: {organization_id}")
    logger.info(f"Main public key: {main_public_key}")
    if expiration_seconds:
        logger.info(f"Expiration: {expiration_seconds} seconds")
    else:
        logger.info("Expiration: None (indefinite)")

    api_key_config = {
        "apiKeyName": api_key_name,
        "publicKey": delegated_public_key,
        "curveType": "API_KEY_CURVE_P256"
    }
    
    if expiration_seconds is not None:
        api_key_config["expirationSeconds"] = str(expiration_seconds)

    request_body = {
        "type": "ACTIVITY_TYPE_CREATE_API_KEYS_V2",
        "timestampMs": str(int(time.time() * 1000)),
        "organizationId": organization_id,
        "parameters": {
            "apiKeys": [api_key_config],
            "userId": user_id
        }
    }

    logger.info(f"Request body: {json.dumps(request_body, indent=2)}")

    try:
        stamp = create_api_stamp(request_body, main_private_key, main_public_key)

        headers = {
            "Content-Type": "application/json",
            "X-Stamp": stamp
        }

        logger.info(f"Request headers: {headers}")

        url = "https://api.turnkey.com/public/v1/submit/create_api_keys"
        logger.info(f"Making request to: {url}")

        response = requests.post(
            url,
            json=request_body,
            headers=headers,
            timeout=30
        )

        logger.info(f"Response status code: {response.status_code}")
        logger.info(f"Response headers: {dict(response.headers)}")
        logger.info(f"Response body: {response.text}")

        if response.status_code == 200:
            result = response.json()
            activity = result.get("activity", {})
            logger.info("✅ API key creation request successful!")
            logger.info(f"Activity ID: {activity.get('id')}")
            logger.info(f"Activity status: {activity.get('status')}")
            return True
        else:
            logger.error(f"❌ API key creation failed: {response.text}")
            return False

    except Exception as e:
        logger.error(f"❌ Error during API key creation: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False


def main():
    """Main function to generate keys and optionally setup API keys."""

    parser = argparse.ArgumentParser(description="Generate P256 keys and setup Turnkey API keys")
    parser.add_argument("--setup", action="store_true", help="Also create API keys in Turnkey")
    parser.add_argument("--user-id", help="Delegated user ID (if not in .env)")
    parser.add_argument("--expiration", type=int, help="API key expiration in seconds (default: no expiration)")
    args = parser.parse_args()

    print("🔑 Generating P256 Key Pair for Turnkey API Authentication")
    print("=" * 60)

    private_key_hex, public_key_hex = generate_p256_keypair()

    print("\n📌 Generated keys:")
    print(f"TURNKEY_API_PUBLIC_KEY={public_key_hex}")
    print(f"TURNKEY_API_PRIVATE_KEY={private_key_hex}")

    print("\n⚠️  IMPORTANT SECURITY NOTES:")
    print("1. Keep your private key SECRET - never commit it to git")
    print("2. Store it securely in your .env file")
    print("3. Use the public key when creating API keys in Turnkey")
    print("4. These keys authenticate your agent with Turnkey API")

    save_to_env = input("\n💾 Append to .env file? (y/n): ").strip().lower()
    if save_to_env == 'y':
        env_file = '.env'
        if os.path.exists(env_file):
            with open(env_file, 'a') as f:
                f.write("\n# Generated Turnkey API Keys\n")
                f.write(f"TURNKEY_API_PUBLIC_KEY={public_key_hex}\n")
                f.write(f"TURNKEY_API_PRIVATE_KEY={private_key_hex}\n")
            print(f"✅ Keys appended to {env_file}")
        else:
            print(f"❌ {env_file} not found. Please create it first.")

    if args.setup:
        print("\n" + "=" * 60)
        print("SETTING UP API KEYS IN TURNKEY")
        print("=" * 60)

        user_id = args.user_id or os.getenv("DELEGATED_USER_ID")
        organization_id = os.getenv("TURNKEY_ORGANIZATION_ID")
        main_private_key = os.getenv("MAIN_TURNKEY_API_PRIVATE_KEY")
        main_public_key = os.getenv("MAIN_TURNKEY_API_PUBLIC_KEY")

        if not all([user_id, organization_id, main_private_key, main_public_key]):
            print("❌ Missing required environment variables:")
            if not user_id:
                print("  - DELEGATED_USER_ID")
            if not organization_id:
                print("  - TURNKEY_ORGANIZATION_ID")
            if not main_private_key:
                print("  - MAIN_TURNKEY_API_PRIVATE_KEY")
            if not main_public_key:
                print("  - MAIN_TURNKEY_API_PUBLIC_KEY")
            print("\nPlease set these in your .env file and try again.")
            return

        success = create_api_keys_for_user(
            delegated_public_key=public_key_hex,
            user_id=user_id,
            organization_id=organization_id,
            main_private_key=main_private_key,
            main_public_key=main_public_key,
            expiration_seconds=args.expiration
        )

        if success:
            print("\n✅ API key setup completed successfully!")
            print("You can now use the swap agent with full automation.")
        else:
            print("\n❌ API key setup failed. Check the logs above for details.")

    print("\n✨ Process complete!")


if __name__ == "__main__":
    main()
