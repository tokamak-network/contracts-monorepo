// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "../proxy/BaseProxy.sol";
import "../storages/StakingStorage.sol";
import "../storages/OptimismSequencerStorage.sol";

// import "hardhat/console.sol";

contract OptimismSequencerProxy is BaseProxy, StakingStorage, OptimismSequencerStorage {
    /* ========== DEPENDENCIES ========== */

    /* ========== CONSTRUCTOR ========== */

    /* ========== onlyOwner ========== */
    function initialize(
        address _ton,
        address _seigManagerV2,
        address _layer2Manager,
        address _fwReceipt
    )
        external onlyOwner
        nonZeroAddress(_ton)
        nonZeroAddress(_seigManagerV2)
        nonZeroAddress(_layer2Manager)
        nonZeroAddress(_fwReceipt)
    {
        require(address(ton) == address(0), "already initialize");

        seigManagerV2 = _seigManagerV2;
        ton = _ton;
        layer2Manager =_layer2Manager;
        fwReceipt = _fwReceipt;

        _registerInterface(ERC20_ONAPPROVE);
        _registerInterface(InterfaceId_ERC165);
    }

    function _registerInterface(bytes4 interfaceId) internal   {
        require(interfaceId != 0xffffffff, "ERC165: invalid interface id");
        _supportedInterfaces[interfaceId] = true;
    }

    function supportsInterface(bytes4 interfaceId) public view   override returns (bool) {
        return _supportedInterfaces[interfaceId] || super.supportsInterface(interfaceId);
    }

    /* ========== only TON ========== */


    /* ========== Anyone can execute ========== */


    /* ========== VIEW ========== */


    /* ========== internal ========== */


}