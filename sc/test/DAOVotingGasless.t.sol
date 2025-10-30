// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {DAOVoting} from "../src/DAOVoting.sol";
import {MinimalForwarder} from "../src/MinimalForwarder.sol";

contract DAOVotingGaslessTest is Test {
    DAOVoting dao;
    MinimalForwarder forwarder;

    uint256 alicePk;
    address alice;
    uint256 bobPk;
    address bob;

    function setUp() public {
        forwarder = new MinimalForwarder();
        dao = new DAOVoting(address(forwarder));

        alicePk = 0xA11CE;
        alice = vm.addr(alicePk);
        bobPk = 0xB0B;
        bob = vm.addr(bobPk);

        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);

        // Fund DAO (normal txs)
        vm.prank(alice);
        dao.fundDAO{value: 10 ether}();
        vm.prank(bob);
        dao.fundDAO{value: 5 ether}();

        // Alice creates proposal
        vm.prank(alice);
        dao.createProposal(bob, 1 ether, block.timestamp + 1 days);
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

    function _signForwardRequest(uint256 pk, MinimalForwarder.ForwardRequest memory req) internal view returns (bytes memory) {
        bytes32 digest = _eip712Hash(_structHash(req));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    function test_GaslessVoteViaForwarder() public {
        // Bob votes For via meta-tx
        bytes memory callData = abi.encodeWithSelector(DAOVoting.vote.selector, uint256(1), DAOVoting.VoteType.For);
        MinimalForwarder.ForwardRequest memory req = MinimalForwarder.ForwardRequest({
            from: bob,
            to: address(dao),
            value: 0,
            gas: 200000,
            nonce: 0,
            data: callData
        });

        bytes memory sig = _signForwardRequest(bobPk, req);
        bool ok = forwarder.verify(req, sig);
        assertTrue(ok, "signature verify failed");

        (bool success, ) = forwarder.execute(req, sig);
        assertTrue(success, "forwarder execute failed");

        DAOVoting.Proposal memory p = dao.getProposal(1);
        assertEq(p.votesFor, 1);
        assertEq(p.votesAgainst, 0);
        assertEq(p.votesAbstain, 0);
    }
}
