// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "../storages/Layer2ManagerStorage.sol";
import "../proxy/BaseProxy.sol";

contract Layer2ManagerProxy is BaseProxy, Layer2ManagerStorage {

    function initialize(
        address _ton,
        address _seigManagerV2,
        address _optimismSequencer,
        address _candidate,
        uint256 _minimumDepositForSequencer,
        uint256 _minimumDepositForCandidate,
        uint32 _delayBlocksForWithdraw
    )
        external onlyOwner
        nonZeroAddress(_ton)
        nonZeroAddress(_seigManagerV2)
        nonZeroAddress(_optimismSequencer)
        nonZeroAddress(_candidate)
        nonZero(_delayBlocksForWithdraw)
    {
        require(address(ton) == address(0), "already initialize");

        ton = IERC20(_ton);
        seigManagerV2 = _seigManagerV2;
        optimismSequencer = _optimismSequencer;
        candidate = _candidate;

        minimumDepositForSequencer = _minimumDepositForSequencer;
        minimumDepositForCandidate = _minimumDepositForCandidate;
        delayBlocksForWithdraw = _delayBlocksForWithdraw;

        maxLayer2Count = 5;
    }
}