// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "lib/openzeppelin-contracts/contracts/metatx/ERC2771Context.sol";

contract DAOVoting is ERC2771Context {
    enum VoteType {
        Against,
        For,
        Abstain
    }

    struct Proposal {
        uint256 id;
        address recipient;
        uint256 amount;
        uint256 deadline;
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 votesAbstain;
        bool executed;
    }

    // Config
    uint256 public constant CREATOR_PERCENT_BP = 1000; // 10% en basis points
    uint256 public constant EXECUTION_DELAY = 1 hours; // período extra de seguridad

    // Estado
    uint256 public nextProposalId = 1;
    mapping(uint256 => Proposal) private proposals;
    mapping(address => uint256) private userBalances;
    uint256 public totalDaoBalance;

    // proposalId => user => VoteType+presence
    mapping(uint256 => mapping(address => bool)) private hasVoted;
    mapping(uint256 => mapping(address => VoteType)) private userVote;

    // Eventos
    event Funded(address indexed from, uint256 amount);
    event ProposalCreated(uint256 indexed id, address indexed creator, address indexed recipient, uint256 amount, uint256 deadline);
    event Voted(uint256 indexed id, address indexed voter, VoteType voteType);
    event Executed(uint256 indexed id, address indexed recipient, uint256 amount);

    constructor(address trustedForwarder) ERC2771Context(trustedForwarder) {}

    // Fondos
    function fundDAO() external payable {
        require(msg.value > 0, "NO_VALUE");
        userBalances[_msgSender()] += msg.value;
        totalDaoBalance += msg.value;
        emit Funded(_msgSender(), msg.value);
    }

    // Propuestas
    function createProposal(address recipient, uint256 amount, uint256 deadline, string calldata description) external {
        require(recipient != address(0), "BAD_RECIPIENT");
        require(amount > 0, "BAD_AMOUNT");
        require(deadline > block.timestamp, "BAD_DEADLINE");

        // Regla 10% del balance total
        uint256 requiredShare = (totalDaoBalance * CREATOR_PERCENT_BP) / 10000;
        require(userBalances[_msgSender()] >= requiredShare, "INSUFFICIENT_SHARE");

        uint256 id = nextProposalId++;
        proposals[id] = Proposal({
            id: id,
            recipient: recipient,
            amount: amount,
            deadline: deadline,
            description: description,
            votesFor: 0,
            votesAgainst: 0,
            votesAbstain: 0,
            executed: false
        });

        emit ProposalCreated(id, _msgSender(), recipient, amount, deadline);
    }

    // Votación (permite cambiar el voto antes del deadline)
    function vote(uint256 proposalId, VoteType voteType) external {
        Proposal storage p = proposals[proposalId];
        require(p.id != 0, "NOT_FOUND");
        require(block.timestamp < p.deadline, "DEADLINE_PASSED");

        address sender = _msgSender();
        if (hasVoted[proposalId][sender]) {
            // revertir conteo previo
            VoteType prev = userVote[proposalId][sender];
            if (prev == VoteType.For) p.votesFor -= 1;
            else if (prev == VoteType.Against) p.votesAgainst -= 1;
            else p.votesAbstain -= 1;
        }

        hasVoted[proposalId][sender] = true;
        userVote[proposalId][sender] = voteType;

        if (voteType == VoteType.For) p.votesFor += 1;
        else if (voteType == VoteType.Against) p.votesAgainst += 1;
        else p.votesAbstain += 1;

        emit Voted(proposalId, sender, voteType);
    }

    // Ejecución
    function executeProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(p.id != 0, "NOT_FOUND");
        require(!p.executed, "ALREADY_EXECUTED");
        require(block.timestamp >= p.deadline + EXECUTION_DELAY, "TOO_EARLY");
        require(p.votesFor > p.votesAgainst, "NOT_APPROVED");
        require(address(this).balance >= p.amount, "INSUFFICIENT_FUNDS");

        p.executed = true;
        (bool ok, ) = p.recipient.call{value: p.amount}("");
        require(ok, "TRANSFER_FAILED");

        // Mantener tracking agregado del balance del DAO
        if (totalDaoBalance >= p.amount) {
            totalDaoBalance -= p.amount;
        } else {
            totalDaoBalance = 0;
        }

        emit Executed(proposalId, p.recipient, p.amount);
    }

    // Views
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }

    function getUserBalance(address user) external view returns (uint256) {
        return userBalances[user];
    }

    function hasVotedForProposal(uint256 proposalId, address user) external view returns (bool) {
        return hasVoted[proposalId][user];
    }

    function getUserVote(uint256 proposalId, address user) external view returns (VoteType) {
        return userVote[proposalId][user];
    }
}


