// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "../storages/SeigManagerV2Storage.sol";
import "../proxy/BaseProxy.sol";

contract SeigManagerV2Proxy is BaseProxy, SeigManagerV2Storage {

    event Snapshot(uint256 id);

    /* ========== onlyOwner ========== */

    function initialize(
        address _ton,
        address _wton,
        address _tot,
        address[4] calldata addr, // _seigManagerV1, _layer2Manager, _optimismSequencer, _candidate
        uint256 _seigPerBlock,
        uint32 _minimumBlocksForUpdateSeig,
        uint16[4] calldata _rates   // ratesTonStakers, ratesDao, ratesStosHolders,ratesUnits
    )
        external onlyOwner
    {
        require(
            _ton != address(0) &&
            _wton != address(0) &&
            _tot != address(0) &&
            addr[0] != address(0) &&
            addr[1] != address(0) &&
            addr[2] != address(0) &&
            addr[3] != address(0) &&
            _seigPerBlock != 0
            , "P1");

        require(address(ton) == address(0), "already initialize");

        require(_rates[3] != 0, "wrong ratesUnits");
        require((_rates[0] + _rates[1] + _rates[2]) ==  _rates[3], 'sum of ratio is wrong');

        ratesUnits = _rates[3];
        ratesTonStakers = _rates[0];
        ratesDao = _rates[1];
        ratesStosHolders = _rates[2];

        seigManagerV1 = addr[0];
        ton = IERC20(_ton);
        wton = _wton;
        tot = _tot;
        layer2Manager =addr[1];
        optimismSequencer = addr[2];
        candidate = addr[3];

        seigPerBlock = _seigPerBlock;
        minimumBlocksForUpdateSeig = _minimumBlocksForUpdateSeig;
        _indexLton = 1 ether;

        // _indexLtonSnapshots.ids.push(_currentSnapshotId);
        // _indexLtonSnapshots.values.push(1 ether);

        // _snapshot();
    }

    /* ========== internal ========== */
    function _snapshot() internal virtual returns (uint256) {
        _currentSnapshotId += 1;
        snapshotTime.push(uint32(block.timestamp));
        emit Snapshot(_currentSnapshotId);
        return _currentSnapshotId;
    }

}