// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "lib/openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";

/**
 * Minimal EIP-2771 Forwarder inspirado en OpenZeppelin (v4.x)
 */
contract MinimalForwarder {
    using ECDSA for bytes32;

    struct ForwardRequest {
        address from;
        address to;
        uint256 value;
        uint256 gas;
        uint256 nonce;
        bytes data;
    }

    bytes32 private constant TYPEHASH = keccak256(
        "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data)"
    );

    mapping(address => uint256) private nonces;

    function getNonce(address from) external view returns (uint256) {
        return nonces[from];
    }

    function verify(ForwardRequest calldata req, bytes calldata signature) public view returns (bool) {
        address signer = _hashTypedDataV4(_hashForwardRequest(req)).recover(signature);
        return nonces[req.from] == req.nonce && signer == req.from;
    }

    function execute(ForwardRequest calldata req, bytes calldata signature)
        external
        payable
        returns (bool, bytes memory)
    {
        require(verify(req, signature), "FORWARDER_INVALID_SIGNATURE");
        nonces[req.from] = req.nonce + 1;

        // Append the sender to the calldata for ERC2771Context recipients
        bytes memory callData = abi.encodePacked(req.data, req.from);

        (bool success, bytes memory returndata) = req.to.call{value: req.value, gas: req.gas}(callData);
        // If the call used less than `req.gas`, then the forwarder has enough gas to finish the execution.
        assert(gasleft() > req.gas / 63);
        return (success, returndata);
    }

    // EIP-712 domain separator hashing compatible con OZ MinimalForwarder
    function _hashTypedDataV4(bytes32 structHash) internal view returns (bytes32) {
        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("MinimalForwarder")),
                keccak256(bytes("0.0.1")),
                block.chainid,
                address(this)
            )
        );
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }

    function _hashForwardRequest(ForwardRequest calldata req) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                TYPEHASH,
                req.from,
                req.to,
                req.value,
                req.gas,
                req.nonce,
                keccak256(req.data)
            )
        );
    }
}


