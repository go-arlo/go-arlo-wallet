#!/usr/bin/env python3
"""
Generate P256 key pair and setup Turnkey API keys for delegated users.

This script:
1. Generates a P256 (secp256r1) key pair for API authentication
2. Creates API keys in Turnkey for the specified user

Environment variables required for --setup:
- TURNKEY_ORGANIZATION_ID: The sub-organization ID
- DELEGATED_USER_ID or END_USER_ID: The user ID to add the API key to
- PARENT_TURNKEY_API_PUBLIC_KEY or MAIN_TURNKEY_API_PUBLIC_KEY: Public key for auth
- PARENT_TURNKEY_API_PRIVATE_KEY or MAIN_TURNKEY_API_PRIVATE_KEY: Private key for auth

Usage examples:
  # Interactive mode (prompts to save keys)
  python generate_api_keys.py --setup

  # Non-interactive mode (for scripting)
  python generate_api_keys.py --setup --non-interactive

  # Specify user ID directly
  python generate_api_keys.py --setup --user-id "user-123" --non-interactive
"""

import os
import json
import time
import base64
import logging
import argparse
from typing import Dict, Any, Tuple

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


def generate_p256_keypair() -> Tuple[str, str]:
    """Generate a P256 (secp256r1) key pair."""
    private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())

    private_numbers = private_key.private_numbers()
    private_key_bytes = private_numbers.private_value.to_bytes(32, 'big')
    private_key_hex = private_key_bytes.hex()

    public_key = private_key.public_key()
    public_key_hex = get_compressed_public_key(public_key)

    return private_key_hex, public_key_hex


def get_compressed_public_key(public_key) -> str:
    """Get compressed public key hex from a public key object."""
    public_numbers = public_key.public_numbers()
    x_bytes = public_numbers.x.to_bytes(32, 'big')

    if public_numbers.y % 2 == 0:
        public_key_bytes = b'\x02' + x_bytes
    else:
        public_key_bytes = b'\x03' + x_bytes

    return public_key_bytes.hex()


def derive_public_key_from_private(private_key_hex: str) -> str:
    """Derive the compressed public key from a private key hex string."""
    private_key_bytes = bytes.fromhex(private_key_hex)
    private_number = int.from_bytes(private_key_bytes, 'big')
    private_key = ec.derive_private_key(
        private_number,
        ec.SECP256R1(),
        default_backend()
    )
    return get_compressed_public_key(private_key.public_key())


def verify_keypair(private_key_hex: str, public_key_hex: str) -> bool:
    """Verify that a private key matches its claimed public key."""
    derived_public = derive_public_key_from_private(private_key_hex)
    matches = derived_public.lower() == public_key_hex.lower()
    if not matches:
        logger.error("Key pair mismatch!")
        logger.error(f"  Claimed public key: {public_key_hex}")
        logger.error(f"  Derived public key: {derived_public}")
    return matches


def create_api_stamp(
    request_body: Dict[str, Any],
    private_key_hex: str,
    public_key_hex: str,
    debug: bool = False
) -> str:
    """Create an API key stamp for Turnkey requests."""
    private_key_bytes = bytes.fromhex(private_key_hex)
    private_number = int.from_bytes(private_key_bytes, 'big')
    private_key = ec.derive_private_key(
        private_number,
        ec.SECP256R1(),
        default_backend()
    )

    # JSON encode request body (this is what gets signed)
    request_json = json.dumps(request_body, separators=(',', ':'))
    message_bytes = request_json.encode('utf-8')

    # Sign with ECDSA-SHA256 (returns DER-encoded signature)
    signature = private_key.sign(message_bytes, ec.ECDSA(hashes.SHA256()))

    # Create stamp with exact field order matching Turnkey SDK
    # Order: publicKey, scheme, signature
    stamp_json = json.dumps({
        "publicKey": public_key_hex,
        "scheme": "SIGNATURE_SCHEME_TK_API_P256",
        "signature": signature.hex()
    }, separators=(',', ':'))

    # Base64url encode without padding
    stamp_encoded = base64.urlsafe_b64encode(stamp_json.encode()).decode().rstrip('=')

    if debug:
        logger.info(f"Request JSON being signed: {request_json}")
        logger.info(f"Message bytes length: {len(message_bytes)}")
        logger.info(f"Signature (DER hex): {signature.hex()}")
        logger.info(f"Stamp JSON: {stamp_json}")
        logger.info(f"Stamp base64url: {stamp_encoded}")

    return stamp_encoded


def whoami(
    organization_id: str,
    private_key_hex: str,
    public_key_hex: str,
    debug: bool = False
) -> Dict[str, Any]:
    """Call Turnkey's whoami endpoint to verify credentials."""
    request_body = {"organizationId": organization_id}

    # IMPORTANT: Must send the EXACT same JSON that was signed (compact, no spaces)
    request_json = json.dumps(request_body, separators=(',', ':'))

    try:
        stamp = create_api_stamp(request_body, private_key_hex, public_key_hex, debug=debug)
        headers = {"Content-Type": "application/json", "X-Stamp": stamp}
        url = "https://api.turnkey.com/public/v1/query/whoami"

        if debug:
            logger.info(f"URL: {url}")
            logger.info(f"Headers: {headers}")
            logger.info(f"Body being sent: {request_json}")

        # Send pre-encoded JSON string, not dict (to preserve exact formatting)
        response = requests.post(url, data=request_json, headers=headers, timeout=30)

        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Whoami failed: {response.status_code} - {response.text}")
            return {}
    except Exception as e:
        logger.error(f"Error during whoami: {e}")
        return {}


def create_api_key(
    new_public_key: str,
    user_id: str,
    organization_id: str,
    auth_private_key: str,
    auth_public_key: str,
    api_key_name: str = "Delegated Access Key",
    expiration_seconds: int = None
) -> bool:
    """
    Create an API key for a user.

    Args:
        new_public_key: Public key for the new API key
        user_id: ID of the user to add the API key to
        organization_id: Turnkey organization ID
        auth_private_key: Private key for authentication
        auth_public_key: Public key for authentication
        api_key_name: Name for the API key
        expiration_seconds: Optional expiration time in seconds

    Returns:
        True if successful, False otherwise
    """
    logger.info("=" * 60)
    logger.info("CREATING API KEY")
    logger.info("=" * 60)
    logger.info(f"Organization ID: {organization_id}")
    logger.info(f"User ID: {user_id}")
    logger.info(f"New API key public key: {new_public_key}")
    logger.info(f"Auth public key: {auth_public_key}")

    # Verify the auth key pair
    if not verify_keypair(auth_private_key, auth_public_key):
        logger.error("Auth key pair verification failed!")
        return False
    logger.info("Auth key pair verified")

    # Build API key config
    api_key_config = {
        "apiKeyName": api_key_name,
        "publicKey": new_public_key,
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

    # IMPORTANT: Must send the EXACT same JSON that was signed (compact, no spaces)
    request_json = json.dumps(request_body, separators=(',', ':'))
    logger.info(f"Request body: {json.dumps(request_body, indent=2)}")

    try:
        stamp = create_api_stamp(request_body, auth_private_key, auth_public_key)
        headers = {"Content-Type": "application/json", "X-Stamp": stamp}
        url = "https://api.turnkey.com/public/v1/submit/create_api_keys"

        logger.info(f"Making request to: {url}")
        # Send pre-encoded JSON string, not dict (to preserve exact formatting)
        response = requests.post(url, data=request_json, headers=headers, timeout=30)

        logger.info(f"Response status: {response.status_code}")
        logger.info(f"Response body: {response.text}")

        if response.status_code == 200:
            result = response.json()
            activity = result.get("activity", {})
            logger.info("API key creation successful!")
            logger.info(f"Activity ID: {activity.get('id')}")
            logger.info(f"Activity status: {activity.get('status')}")
            return True
        else:
            logger.error(f"API key creation failed: {response.text}")
            return False

    except Exception as e:
        logger.error(f"Error during API key creation: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False


def main():
    """Main function."""
    parser = argparse.ArgumentParser(
        description="Generate P256 keys and setup Turnkey API keys"
    )
    parser.add_argument(
        "--setup", action="store_true",
        help="Create the API key in Turnkey after generating"
    )
    parser.add_argument(
        "--verify", action="store_true",
        help="Verify MAIN_TURNKEY credentials before creating"
    )
    parser.add_argument(
        "--user-id",
        help="User ID to add API key to (default: DELEGATED_USER_ID from .env)"
    )
    parser.add_argument(
        "--expiration", type=int,
        help="API key expiration in seconds (default: no expiration)"
    )
    parser.add_argument(
        "--key-name", default="Delegated Access Key",
        help="Name for the API key"
    )
    parser.add_argument(
        "--debug", action="store_true",
        help="Enable debug output for API calls"
    )
    parser.add_argument(
        "--parent-org",
        help="Also try authenticating against parent org ID"
    )
    parser.add_argument(
        "--non-interactive", action="store_true",
        help="Run without prompts (for scripting)"
    )
    args = parser.parse_args()

    # Load credentials (support PARENT_TURNKEY_API_* with fallback to MAIN_TURNKEY_API_*)
    organization_id = os.getenv("TURNKEY_ORGANIZATION_ID")
    user_id = args.user_id or os.getenv("DELEGATED_USER_ID") or os.getenv("END_USER_ID")
    auth_private_key = (
        os.getenv("PARENT_TURNKEY_API_PRIVATE_KEY") or
        os.getenv("MAIN_TURNKEY_API_PRIVATE_KEY")
    )
    auth_public_key = (
        os.getenv("PARENT_TURNKEY_API_PUBLIC_KEY") or
        os.getenv("MAIN_TURNKEY_API_PUBLIC_KEY")
    )

    print("=" * 60)
    print("P256 Key Generator for Turnkey API")
    print("=" * 60)

    # Generate new key pair
    private_key_hex, public_key_hex = generate_p256_keypair()

    print("\nGenerated keys:")
    print(f"  Public:  {public_key_hex}")
    print(f"  Private: {private_key_hex}")

    print("\nSECURITY: Keep your private key secret!")

    # Save to .env (skip prompt in non-interactive mode)
    if not args.non_interactive:
        save = input("\nAppend to .env file? (y/n): ").strip().lower()
        if save == 'y':
            if os.path.exists('.env'):
                with open('.env', 'a') as f:
                    f.write(f"\n# Generated Turnkey API Keys - {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
                    f.write(f"# TURNKEY_API_PUBLIC_KEY={public_key_hex}\n")
                    f.write(f"# TURNKEY_API_PRIVATE_KEY={private_key_hex}\n")
                print("Keys appended to .env (commented out)")
            else:
                print(".env file not found")

    # Verify credentials if requested
    if args.verify:
        print("\n" + "=" * 60)
        print("VERIFYING CREDENTIALS")
        print("=" * 60)

        if not all([organization_id, auth_private_key, auth_public_key]):
            print("Missing environment variables for verification:")
            if not organization_id:
                print("  - TURNKEY_ORGANIZATION_ID")
            if not auth_private_key:
                print("  - PARENT_TURNKEY_API_PRIVATE_KEY or MAIN_TURNKEY_API_PRIVATE_KEY")
            if not auth_public_key:
                print("  - PARENT_TURNKEY_API_PUBLIC_KEY or MAIN_TURNKEY_API_PUBLIC_KEY")
        else:
            print(f"Organization ID: {organization_id}")
            print(f"Auth public key (compressed): {auth_public_key}")

            if verify_keypair(auth_private_key, auth_public_key):
                print("Key pair verified locally")

                # Test against sub-organization
                print("\n--- Testing against sub-organization ---")
                result = whoami(organization_id, auth_private_key, auth_public_key, debug=args.debug)
                if result:
                    print(f"SUCCESS! Authenticated as: {result.get('username')} ({result.get('userId')})")
                else:
                    print("Authentication failed")

                # Try parent org if provided
                if args.parent_org:
                    print(f"\n--- Testing against parent organization ({args.parent_org}) ---")
                    result = whoami(args.parent_org, auth_private_key, auth_public_key, debug=args.debug)
                    if result:
                        print(f"SUCCESS on parent! User: {result.get('username')} ({result.get('userId')})")
                    else:
                        print("Failed on parent org too")
            else:
                print("Key pair mismatch!")

    # Create API key in Turnkey
    if args.setup:
        print("\n" + "=" * 60)
        print("CREATING API KEY IN TURNKEY")
        print("=" * 60)

        missing = []
        if not organization_id:
            missing.append("TURNKEY_ORGANIZATION_ID")
        if not user_id:
            missing.append("DELEGATED_USER_ID or END_USER_ID")
        if not auth_private_key:
            missing.append("PARENT_TURNKEY_API_PRIVATE_KEY or MAIN_TURNKEY_API_PRIVATE_KEY")
        if not auth_public_key:
            missing.append("PARENT_TURNKEY_API_PUBLIC_KEY or MAIN_TURNKEY_API_PUBLIC_KEY")

        if missing:
            print("Missing required environment variables:")
            for var in missing:
                print(f"  - {var}")
            print("\nPlease set these in your .env file.")
            return

        success = create_api_key(
            new_public_key=public_key_hex,
            user_id=user_id,
            organization_id=organization_id,
            auth_private_key=auth_private_key,
            auth_public_key=auth_public_key,
            api_key_name=args.key_name,
            expiration_seconds=args.expiration
        )

        if success:
            print("\nAPI key created successfully!")
            print("Update your .env with the new keys to use them.")
        else:
            print("\nAPI key creation failed. Check logs above.")

    print("\nDone!")


if __name__ == "__main__":
    main()
