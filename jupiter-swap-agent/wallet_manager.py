"""
Wallet Manager for Delegated Wallet Operations

This module handles all interactions with the delegated wallet system,
including API key management, transaction signing, and Jupiter swap execution.
"""

import json
import base64
import hashlib
import time
import os
import requests
from typing import Dict, Any, Optional
import logging
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.backends import default_backend

from generate_api_keys import create_api_stamp

logger = logging.getLogger(__name__)

class WalletManager:
    """Manages delegated wallet operations directly through Turnkey."""

    def __init__(
        self,
        delegated_wallet_address: str,
        turnkey_organization_id: str,
        turnkey_api_public_key: str = None,
        turnkey_api_private_key: str = None,
        main_turnkey_api_public_key: str = None,
        main_turnkey_api_private_key: str = None,
        turnkey_api_base_url: str = "https://api.turnkey.com",
        solana_rpc_url: str = "https://api.mainnet-beta.solana.com"
    ):
        self.delegated_wallet_address = delegated_wallet_address
        self.turnkey_organization_id = turnkey_organization_id
        self.turnkey_api_public_key = turnkey_api_public_key
        self.turnkey_api_private_key = turnkey_api_private_key
        self.main_turnkey_api_public_key = main_turnkey_api_public_key
        self.main_turnkey_api_private_key = main_turnkey_api_private_key
        self.turnkey_api_base_url = turnkey_api_base_url.rstrip('/')
        self.solana_rpc_url = solana_rpc_url

    def create_api_stamp_instance(self, request_body: Dict[str, Any]) -> str:
        """
        Create an API key stamp for Turnkey requests using delegated keys.

        Args:
            request_body: The request body to sign

        Returns:
            Base64URL encoded stamp
        """
        if not self.turnkey_api_private_key or not self.turnkey_api_public_key:
            raise ValueError("Turnkey API keys not configured")

        return create_api_stamp(request_body, self.turnkey_api_private_key, self.turnkey_api_public_key)

    def create_api_keys_for_user(
        self,
        user_id: str,
        api_key_name: str = "Delegated Access Key",
        expiration_seconds: int = None
    ) -> Dict[str, Any]:
        """
        Create API keys for a delegated user using the generate_api_keys module.

        Args:
            user_id: The ID of the delegated user
            api_key_name: Name for the API key
            expiration_seconds: Optional expiration time in seconds (None for no expiration)

        Returns:
            Response from Turnkey API
        """
        if not self.turnkey_api_public_key:
            raise ValueError("Turnkey API public key not configured")
        if not self.main_turnkey_api_private_key or not self.main_turnkey_api_public_key:
            raise ValueError("Main Turnkey API keys not configured for creating user API keys")

        from generate_api_keys import create_api_keys_for_user as create_keys
        
        success = create_keys(
            delegated_public_key=self.turnkey_api_public_key,
            user_id=user_id,
            organization_id=self.turnkey_organization_id,
            main_private_key=self.main_turnkey_api_private_key,
            main_public_key=self.main_turnkey_api_public_key,
            api_key_name=api_key_name,
            expiration_seconds=expiration_seconds
        )
        
        if success:
            return {"status": "success", "userId": user_id}
        else:
            raise Exception("API key creation failed")

    def sign_transaction(
        self,
        unsigned_transaction: str,
        transaction_type: str = "TRANSACTION_TYPE_SOLANA"
    ) -> Dict[str, Any]:
        """
        Sign a transaction using the delegated wallet.

        Args:
            unsigned_transaction: The unsigned transaction data
            transaction_type: Type of transaction (SOLANA or ETHEREUM)

        Returns:
            Signed transaction result
        """
        if not self.turnkey_api_private_key or not self.turnkey_api_public_key:
            raise ValueError("Turnkey API keys not configured for signing")

        request_body = {
            "type": "ACTIVITY_TYPE_SIGN_TRANSACTION_V2",
            "timestampMs": str(int(time.time() * 1000)),
            "organizationId": self.turnkey_organization_id,
            "parameters": {
                "type": transaction_type,
                "signWith": self.delegated_wallet_address,
                "unsignedTransaction": unsigned_transaction
            }
        }

        stamp = self.create_api_stamp_instance(request_body)

        headers = {
            "Content-Type": "application/json",
            "X-Stamp": stamp
        }

        response = requests.post(
            f"{self.turnkey_api_base_url}/public/v1/submit/sign_transaction",
            json=request_body,
            headers=headers,
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            activity = result.get("activity", {})

            if activity.get("status") == "ACTIVITY_STATUS_PENDING":
                return self._poll_activity(activity.get("id"))

            return result
        else:
            logger.error(f"Transaction signing failed: {response.text}")
            raise Exception(f"Transaction signing failed: {response.status_code}")

    def _poll_activity(self, activity_id: str, max_attempts: int = 30) -> Dict[str, Any]:
        """Poll for activity completion."""
        for _ in range(max_attempts):
            time.sleep(1)

            request_body = {
                "organizationId": self.turnkey_organization_id
            }

            stamp = self.create_api_stamp_instance(request_body)

            response = requests.get(
                f"{self.turnkey_api_base_url}/public/v1/activity/{activity_id}",
                headers={"X-Stamp": stamp},
                params={"organizationId": self.turnkey_organization_id},
                timeout=10
            )

            if response.status_code == 200:
                result = response.json()
                activity = result.get("activity", {})

                if activity.get("status") == "ACTIVITY_STATUS_COMPLETED":
                    return result
                elif activity.get("status") == "ACTIVITY_STATUS_FAILED":
                    raise Exception(f"Activity failed: {activity}")

        raise Exception("Activity polling timeout")

    def _make_solana_rpc_request(self, method: str, params: list = None) -> Dict[str, Any]:
        """
        Make a JSON-RPC request to Solana.

        Args:
            method: RPC method name
            params: Method parameters

        Returns:
            RPC response
        """
        headers = {"Content-Type": "application/json"}
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params or []
        }

        try:
            response = requests.post(
                self.solana_rpc_url,
                headers=headers,
                json=payload,
                timeout=10
            )

            if response.status_code == 200:
                result = response.json()
                if "error" in result:
                    raise Exception(f"RPC error: {result['error']}")
                return result.get("result")
            else:
                raise Exception(f"RPC request failed: {response.status_code}")

        except requests.exceptions.RequestException as e:
            logger.error(f"Solana RPC request failed: {e}")
            raise Exception(f"Failed to connect to Solana RPC: {e}")

    def execute_swap(self, swap_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a Jupiter swap directly through Jupiter and Turnkey APIs.

        Args:
            swap_params: Swap parameters including mints, amount, slippage

        Returns:
            Swap execution result
        """
        try:
            # Step 1: Get quote from Jupiter
            quote_params = {
                "inputMint": swap_params["inputMint"],
                "outputMint": swap_params["outputMint"],
                "amount": str(swap_params["amount"]),
                "slippageBps": swap_params.get("slippageBps", 50)
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

            if quote_response.status_code != 200:
                raise Exception(f"Failed to get quote: {quote_response.text}")

            quote = quote_response.json()

            # Step 2: Get swap transaction from Jupiter
            swap_request = {
                "quoteResponse": quote,
                "userPublicKey": self.delegated_wallet_address,
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

            if swap_response.status_code != 200:
                raise Exception(f"Failed to get swap transaction: {swap_response.text}")

            swap_data = swap_response.json()
            unsigned_transaction_b64 = swap_data["swapTransaction"]

            logger.info(f"Received base64 transaction from Jupiter: {unsigned_transaction_b64[:100]}...")

            import base64
            transaction_bytes = base64.b64decode(unsigned_transaction_b64)
            unsigned_transaction_hex = transaction_bytes.hex()

            logger.info(f"Converted to hex for Turnkey: {unsigned_transaction_hex[:100]}...")

            # Step 3: Sign transaction with Turnkey
            signed_result = self.sign_transaction(
                unsigned_transaction=unsigned_transaction_hex,
                transaction_type="TRANSACTION_TYPE_SOLANA"
            )

            activity = signed_result.get("activity", {})
            result = activity.get("result", {})
            sign_result = result.get("signTransactionResult", {})
            signed_transaction = sign_result.get("signedTransaction")

            if not signed_transaction:
                raise Exception("Failed to get signed transaction from Turnkey")

            logger.info(f"Signed transaction from Turnkey: {signed_transaction[:100]}...")

            try:
                signed_bytes = bytes.fromhex(signed_transaction)
                signed_transaction_b64 = base64.b64encode(signed_bytes).decode()
                logger.info(f"Converted signed transaction to base64: {signed_transaction_b64[:100]}...")
            except Exception as e:
                logger.error(f"Error converting signed transaction: {e}")
                raise Exception(f"Failed to convert signed transaction: {e}")

            # Step 4: Submit transaction
            send_result = self._make_solana_rpc_request(
                "sendTransaction",
                [signed_transaction_b64, {"encoding": "base64", "skipPreflight": False}]
            )

            return {
                "success": True,
                "transactionHash": send_result,
                "inputAmount": swap_params["amount"],
                "outputAmount": quote.get("outAmount"),
                "route": quote.get("routePlan")
            }

        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            logger.error(f"Swap execution failed: {e}\nDetails: {error_details}")
            return {
                "success": False,
                "error": str(e),
                "error_details": error_details
            }

    def get_sol_balance(self) -> float:
        """
        Get the SOL balance of the delegated wallet directly from Solana.

        Returns:
            SOL balance as float
        """
        try:
            result = self._make_solana_rpc_request(
                "getBalance",
                [self.delegated_wallet_address]
            )
            # Convert lamports to SOL (1 SOL = 10^9 lamports)
            return result.get("value", 0) / 1_000_000_000
        except Exception as e:
            logger.error(f"Failed to get balance: {e}")
            return 0.0

    def health_check(self) -> bool:
        """
        Check if the Turnkey and Solana connections are healthy.

        Returns:
            True if connections are healthy
        """
        try:
            health = self._make_solana_rpc_request("getHealth")

            has_main_keys = bool(self.main_turnkey_api_public_key and self.main_turnkey_api_private_key)
            has_delegated_keys = bool(self.turnkey_api_public_key and self.turnkey_api_private_key)

            if not (has_main_keys or has_delegated_keys):
                logger.warning("No Turnkey API keys configured")
                return False

            return health == "ok"
        except:
            return False

    def setup_delegated_user(
        self,
        user_id: str = None,
        create_new_user: bool = False
    ) -> Dict[str, Any]:
        """
        Setup or verify delegated user configuration.

        Args:
            user_id: Existing user ID or None to create new
            create_new_user: Whether to create a new delegated user

        Returns:
            User setup information
        """
        if create_new_user or not user_id:
            logger.info("Using existing delegated user configuration")

        if user_id and self.turnkey_api_public_key and self.turnkey_api_private_key:
            try:
                result = self.create_api_keys_for_user(user_id)
                logger.info(f"API keys configured for user: {user_id}")
                return result
            except Exception as e:
                logger.warning(f"Could not create API keys: {e}")

        return {"status": "configured", "userId": user_id}
