// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {MinimalForwarder} from "../src/MinimalForwarder.sol";
import {Recipient} from "../src/mocks/Recipient.sol";

contract MinimalForwarderTest is Test {
    MinimalForwarder forwarder;
    Recipient recipient;

    uint256 userPrivateKey;
    address user;

    function setUp() public {
        forwarder = new MinimalForwarder();
        recipient = new Recipient(address(forwarder));

        userPrivateKey = 0xA11CE;
        user = vm.addr(userPrivateKey);
        vm.deal(user, 10 ether);
    }

    function _domainSeparator() internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("MinimalForwarder")),
                keccak256(bytes("0.0.1")),
                block.chainid,
                address(forwarder)
            )
        );
    }

    function _typeHash() internal pure returns (bytes32) {
        return keccak256(
            bytes(
                "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data)"
            )
        );
    }

    function _structHash(MinimalForwarder.ForwardRequest memory req) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                _typeHash(),
                req.from,
                req.to,
                req.value,
                req.gas,
                req.nonce,
                keccak256(req.data)
            )
        );
    }

    function _eip712Hash(bytes32 structHash) internal view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", _domainSeparator(), structHash));
    }

    function test_ExecuteMetaTxUpdatesRecipientAndNonce() public {
        MinimalForwarder.ForwardRequest memory req = MinimalForwarder.ForwardRequest({
            from: user,
            to: address(recipient),
            value: 0,
            gas: 150000,
            nonce: 0,
            data: abi.encodeWithSelector(Recipient.setNumber.selector, uint256(42))
        });

        bytes32 digest = _eip712Hash(_structHash(req));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        bool verified = forwarder.verify(req, signature);
        assertTrue(verified, "signature should verify");

        (bool success, ) = forwarder.execute(req, signature);
        assertTrue(success, "execute should succeed");

        assertEq(recipient.getNumber(), 42, "number should be updated");
        assertEq(recipient.getLastSender(), user, "last sender should be original signer");

        assertEq(forwarder.getNonce(user), 1, "nonce should increment");
    }
}


