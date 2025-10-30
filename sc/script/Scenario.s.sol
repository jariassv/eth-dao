// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "lib/forge-std/src/Script.sol";
import {DAOVoting} from "../src/DAOVoting.sol";
import {MinimalForwarder} from "../src/MinimalForwarder.sol";

contract Scenario is Script {
    function run() external {
        uint256 aPk = vm.envUint("A_PK");
        uint256 bPk = vm.envUint("B_PK");
        uint256 cPk = vm.envUint("C_PK");

        address daoAddr;
        address fwdAddr;

        address maybeDao = vm.envAddress("DAO_ADDRESS");
        address maybeFwd = vm.envAddress("FORWARDER_ADDRESS");

        if (maybeDao == address(0) || maybeFwd == address(0)) {
            // Desplegar si no se suministran direcciones
            vm.startBroadcast(aPk);
            MinimalForwarder fwd = new MinimalForwarder();
            DAOVoting dao = new DAOVoting(address(fwd));
            vm.stopBroadcast();
            daoAddr = address(dao);
            fwdAddr = address(fwd);
        } else {
            daoAddr = maybeDao;
            fwdAddr = maybeFwd;
        }

        console2.log("DAO:", daoAddr);
        console2.log("Forwarder:", fwdAddr);

        DAOVoting dao = DAOVoting(daoAddr);

        // A deposita 10 ETH
        vm.startBroadcast(aPk);
        dao.fundDAO{value: 10 ether}();
        vm.stopBroadcast();

        // B deposita 5 ETH
        vm.startBroadcast(bPk);
        dao.fundDAO{value: 5 ether}();
        vm.stopBroadcast();

        // A crea propuesta para enviar 3 ETH a C
        address cAddr = vm.addr(cPk);
        uint256 deadline = block.timestamp + 1 days;
        vm.startBroadcast(aPk);
        dao.createProposal(cAddr, 3 ether, deadline);
        vm.stopBroadcast();

        // Votos (tx normales para simplificar integración)
        vm.startBroadcast(aPk);
        dao.vote(1, DAOVoting.VoteType.For);
        vm.stopBroadcast();

        vm.startBroadcast(bPk);
        dao.vote(1, DAOVoting.VoteType.Against);
        vm.stopBroadcast();

        // C deposita 20 ETH y vota a favor
        vm.startBroadcast(cPk);
        dao.fundDAO{value: 20 ether}();
        dao.vote(1, DAOVoting.VoteType.For);
        vm.stopBroadcast();

        console2.log("Scenario set. Advance time past deadline and execute with relayer/daemon or script.");
    }
}


