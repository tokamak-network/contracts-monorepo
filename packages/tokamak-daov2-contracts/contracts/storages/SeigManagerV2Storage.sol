// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import {IERC20} from "../interfaces/IERC20.sol";

contract SeigManagerV2Storage {

    struct Snapshots {
        uint256[] ids;
        uint256[] values;
    }

    IERC20 public ton;
    address public wton;
    address public dao;
    address public stosDistribute;
    address public seigManagerV1;
    address public tot;
    address public layer2Manager;
    address public optimismSequencer;
    address public candidate;

    /// Amount of seigniorage issued per block
    uint256 public seigPerBlock;  // 3920000000000000000000000000

    /// Block number that was last seignorage issued
    uint256 public lastSeigBlock;

    /// seigniorage issuance start block
    uint256 public startBlock;

    ///  ratesTonStakers + ratesDao + ratesStosHolders = ratesUnits
    uint16 public ratesTonStakers; // divided ratesUnits when using
    uint16 public ratesDao;   // divided ratesUnits when using
    uint16 public ratesStosHolders; // divided ratesUnits when using

    uint16 public ratesUnits; // 10000
    uint32 public minimumBlocksForUpdateSeig; // the number of block
    bool internal free = true;

    uint256 internal _currentSnapshotId;
    uint256 internal _indexLton; // for staker
    Snapshots internal _indexLtonSnapshots;
    uint32[] public snapshotTime;

    modifier nonZero(uint256 value) {
        require(value != 0, "Z1");
        _;
    }

    modifier nonZeroAddress(address account) {
        require(account != address(0), "Z2");
        _;
    }

    modifier ifFree {
        require(free, "lock");
        free = false;
        _;
        free = true;
    }

}