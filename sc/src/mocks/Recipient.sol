// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "lib/openzeppelin-contracts/contracts/metatx/ERC2771Context.sol";

contract Recipient is ERC2771Context {
    uint256 private storedNumber;
    address private lastSender;

    event NumberUpdated(uint256 newNumber, address sender, address originalSender);

    constructor(address trustedForwarder) ERC2771Context(trustedForwarder) {}

    function setNumber(uint256 newNumber) external {
        storedNumber = newNumber;
        lastSender = _msgSender();
        emit NumberUpdated(newNumber, msg.sender, _msgSender());
    }

    function getNumber() external view returns (uint256) {
        return storedNumber;
    }

    function getLastSender() external view returns (address) {
        return lastSender;
    }
}


