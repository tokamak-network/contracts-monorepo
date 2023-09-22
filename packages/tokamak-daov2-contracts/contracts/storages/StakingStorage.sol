// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import {Layer2} from "../libraries/Layer2.sol";
import "../libraries/LibStake.sol";

contract StakingStorage {

    struct Snapshots {
        uint256[] ids;
        uint256[] values;
    }

    bytes4 constant ERC20_ONAPPROVE = 0x4273ca16;
     // As per the EIP-165 spec, no interface should ever match 0xffffffff
    bytes4 internal constant InterfaceId_Invalid = 0xffffffff;
    bytes4 internal constant InterfaceId_ERC165 = 0x01ffc9a7;
    mapping(bytes4 => bool) internal _supportedInterfaces;

    bool internal free = true;
    // bool public up;

    address public ton;
    address public seigManagerV2;
    address public layer2Manager;
    address public fwReceipt;
    uint256 internal _totalStakedLton;
    Snapshots internal _totalStakedLtonSnapshot;

    mapping (uint32 => uint256) public layerStakedLton;
    mapping (uint32 => Snapshots) internal _layerStakedLtonSnapshot;

    // layer2Index => account => StakeInfo
    mapping (uint32 => mapping(address => LibStake.StakeInfo)) public layerStakes; // ltos uint
    mapping (uint32 => mapping(address => Snapshots)) internal _layerStakesSnapshot;

    // layer2Index => msg.sender => withdrawal requests (언스테이크시 등록 )
    mapping (uint32 => mapping (address => LibStake.WithdrawalReqeust[])) public withdrawalRequests;
    // layer2Index => msg.sender => index
    mapping (uint32 => mapping (address => uint256)) public withdrawalRequestIndex;

    // pending unstaked amount
    // layer2Index => msg.sender => ton amount
    mapping (uint32 => mapping (address => uint256)) public pendingUnstaked;
    // layer2Index => ton amount
    mapping (uint32 => uint256) public pendingUnstakedLayer2;
    // msg.sender =>  ton amount
    mapping (address => uint256) public pendingUnstakedAccount;

    // layer2Index - info
    mapping (uint32 => bytes) public layerInfo;

    address[] public stakeAccountList;

    modifier nonZero(uint256 value) {
        require(value != 0, "Z1");
        _;
    }

    modifier nonZeroAddress(address account) {
        require(account != address(0), "Z2");
        _;
    }

    modifier onlyLayer2Manager() {
        require(msg.sender == layer2Manager, "not Layer2Manager");
        _;
    }

    modifier ifFree {
        require(free, "lock");
        free = false;
        _;
        free = true;
    }

}