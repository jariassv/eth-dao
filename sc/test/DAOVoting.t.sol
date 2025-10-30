// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {DAOVoting} from "../src/DAOVoting.sol";
import {MinimalForwarder} from "../src/MinimalForwarder.sol";

contract DAOVotingTest is Test {
    DAOVoting dao;
    MinimalForwarder forwarder;
    address alice;
    address bob;
    address carol;

    function setUp() public {
        forwarder = new MinimalForwarder();
        dao = new DAOVoting(address(forwarder));
        alice = address(0xA11CE);
        bob = address(0xB0B);
        carol = address(0xCA701);

        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(carol, 100 ether);
    }

    function _fund(address user, uint256 amount) internal {
        vm.prank(user);
        dao.fundDAO{value: amount}();
    }

    function test_FundIncreasesBalances() public {
        _fund(alice, 10 ether);
        _fund(bob, 5 ether);

        assertEq(dao.getUserBalance(alice), 10 ether);
        assertEq(dao.getUserBalance(bob), 5 ether);
        assertEq(address(dao).balance, 15 ether);
    }

    function test_CreateProposalRequires10PercentShare() public {
        _fund(alice, 10 ether); // total 10, 10% => 1 ether; alice tiene 10
        _fund(bob, 5 ether);    // total 15, 10% => 1.5 ether

        // Alice puede crear
        vm.prank(alice);
        dao.createProposal(bob, 1 ether, block.timestamp + 1 days);

        // Bob también puede (tiene 5 de 15 = 33%)
        vm.prank(bob);
        dao.createProposal(alice, 1 ether, block.timestamp + 1 days);
    }

    function test_RevertWhen_CreateProposalInsufficientShare() public {
        _fund(alice, 9 ether); // total 9, 10% => 0.9; alice tiene 9 (ok)
        _fund(bob, 1 ether);   // total 10, 10% => 1; bob tiene 1 (ok)
        // carol 0 -> no puede crear
        vm.prank(carol);
        vm.expectRevert(bytes("INSUFFICIENT_SHARE"));
        dao.createProposal(alice, 1 ether, block.timestamp + 1 days);
    }

    function test_VoteAndChangeBeforeDeadline() public {
        _fund(alice, 10 ether);
        _fund(bob, 5 ether);

        vm.prank(alice);
        dao.createProposal(carol, 1 ether, block.timestamp + 1 days);

        // proposalId = 1
        vm.prank(alice);
        dao.vote(1, DAOVoting.VoteType.For);
        vm.prank(bob);
        dao.vote(1, DAOVoting.VoteType.Against);

        // Cambiar voto de bob a For
        vm.prank(bob);
        dao.vote(1, DAOVoting.VoteType.For);

        DAOVoting.Proposal memory p = dao.getProposal(1);
        assertEq(p.votesFor, 2);
        assertEq(p.votesAgainst, 0);
        assertEq(p.votesAbstain, 0);
    }

    function test_ExecuteAfterDeadlineAndDelay() public {
        _fund(alice, 10 ether);
        _fund(bob, 5 ether);
        uint256 recipientStart = carol.balance;

        vm.prank(alice);
        dao.createProposal(carol, 3 ether, block.timestamp + 1 days);

        vm.prank(alice);
        dao.vote(1, DAOVoting.VoteType.For);
        vm.prank(bob);
        dao.vote(1, DAOVoting.VoteType.For);

        // avanzar a después del deadline y delay
        vm.warp(block.timestamp + 1 days + dao.EXECUTION_DELAY());

        dao.executeProposal(1);

        assertEq(carol.balance, recipientStart + 3 ether);
    }
}


