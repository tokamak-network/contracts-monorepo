// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "../storages/OptimismSequencerStorage.sol";
import "./Staking.sol";
import "./Sequencer.sol";
import "../libraries/LibOptimism.sol";
import "../interfaces/IOptimismSequencer.sol";
// import "hardhat/console.sol";

contract OptimismSequencer is Staking, Sequencer, OptimismSequencerStorage, IOptimismSequencer {
    using BytesParserLib for bytes;
    using SafeERC20 for IERC20;

    /* ========== DEPENDENCIES ========== */

    /* ========== CONSTRUCTOR ========== */
    constructor() {
    }

    /* ========== onlyOwner ========== */


    /* ========== only TON ========== */

    /// @inheritdoc IOptimismSequencer
    function onApprove(
        address sender,
        address spender,
        uint256 amount,
        bytes calldata data
    ) external override(Sequencer, IOptimismSequencer) returns (bool) {
        require(ton == msg.sender, "EA");
        require(existedIndex(data.toUint32(0)), 'non-registered layer');

        // data : (32 bytes) index
        uint32 _index = data.toUint32(0);
        if(amount != 0) IERC20(ton).safeTransferFrom(sender, address(this), amount);
        _stake(_index, sender, amount, address(0), 0);

        return true;
    }

    /* ========== only LayerManager ========== */

    /// @inheritdoc IOptimismSequencer
    function create(uint32 _index, bytes memory _layerInfo)
        external onlyLayer2Manager override(Sequencer, IOptimismSequencer) returns (bool)
    {
        require(_layerInfo.length == 80, "wrong layerInfo");
        require(layerInfo[_index].length == 0, "already created");
        layerInfo[_index] = _layerInfo;

        return true;
    }

    /* ========== Anyone can execute ========== */

    /// @inheritdoc IOptimismSequencer
    function stake(uint32 _index, uint256 amount) external override(Sequencer, IOptimismSequencer)
    {
        require(existedIndex(_index), 'non-registered layer');
        stake_(_index, amount, address(0), 0);
    }

    /// @inheritdoc IOptimismSequencer
    function unstake(uint32 _index, uint256 lton_) external override
    {
        _unstake(_index, lton_, FwReceiptI(fwReceipt).debtInStaked(false, _index, msg.sender));
    }

    /// @inheritdoc IOptimismSequencer
    function existedIndex(uint32 _index) public view override(Sequencer, IOptimismSequencer) returns (bool) {
        require(Layer2ManagerI(layer2Manager).existedLayer2Index(_index), 'non-registered layer');
        return true;
    }

    /// @inheritdoc IOptimismSequencer
    function getLayerInfo(uint32 _index)
        public view override returns (LibOptimism.Info memory _layerInfo)
    {
        _layerInfo = LibOptimism.parseKey(layerInfo[_index]);
    }

    function getLayerKey(uint32 _index) public view virtual override(Sequencer, IOptimismSequencer) returns (bytes32 layerKey_) {
        layerKey_ = keccak256(layerInfo[_index]);
    }

    /// @inheritdoc IOptimismSequencer
    function getTvl(uint32 _index) public view override(Sequencer, IOptimismSequencer) returns (uint256 amount) {

        LibOptimism.Info memory _layerInfo = getLayerInfo(_index);
        try
            L1BridgeI(L1StandardBridge(_layerInfo.addressManager)).deposits(ton, _layerInfo.l2ton) returns (uint256 a) {
                amount = a;
        } catch (bytes memory ) {
            amount = 0;
        }
    }

    /// @inheritdoc IOptimismSequencer
    function getTvl(address l1Bridge, address l2ton) public view override returns (uint256 amount) {
        try
            L1BridgeI(l1Bridge).deposits(ton, l2ton) returns (uint256 a) {
                amount = a;
        } catch (bytes memory ) {
            amount = 0;
        }
    }

    /// @inheritdoc IOptimismSequencer
    function sequencer(uint32 _index) public view override(Sequencer, IOptimismSequencer) returns (address sequencer_) {
        address manager = LibOptimism.getAddressManager(layerInfo[_index]);
        if (manager == address(0)) return address(0);
        try
            AddressManagerI(LibOptimism.getAddressManager(layerInfo[_index])).getAddress('OVM_Sequencer') returns (address a) {
                sequencer_ = a;
        } catch (bytes memory ) {
            sequencer_ = address(0);
        }
    }

    /// @inheritdoc IOptimismSequencer
    function sequencer(address addressManager) public view override returns (address sequencer_) {
        try
            AddressManagerI(addressManager).getAddress('OVM_Sequencer') returns (address a) {
                sequencer_ = a;
        } catch (bytes memory ) {
            sequencer_ = address(0);
        }
    }

    /// @inheritdoc IOptimismSequencer
    function L1CrossDomainMessenger(address addressManager) public view returns (address account_) {
        try
            AddressManagerI(addressManager).getAddress('OVM_L1CrossDomainMessenger') returns (address a) {
                account_ = a;
        } catch (bytes memory ) {
            account_ = address(0);
        }
    }

    /// @inheritdoc IOptimismSequencer
    function L1StandardBridge(address addressManager) public view override returns (address account_) {
        if (addressManager == address(0)) return address(0);
        try
            AddressManagerI(addressManager).getAddress('Proxy__OVM_L1StandardBridge') returns (address a) {
                account_ = a;
        } catch (bytes memory ) {
            account_ = address(0);
        }
    }

    /// @inheritdoc IOptimismSequencer
    function bridges(uint32 _index) public view override returns (address, address) {
        LibOptimism.Info memory _layerInfo = LibOptimism.parseKey(layerInfo[_index]);
        return (_layerInfo.l1Bridge, _layerInfo.l2Bridge) ;
    }

    /* ========== internal ========== */


}