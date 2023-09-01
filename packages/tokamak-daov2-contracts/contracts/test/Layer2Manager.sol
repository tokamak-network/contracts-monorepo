// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "../storages/Layer2ManagerStorage.sol";
import "../proxy/BaseProxyStorage.sol";
import "../common/AccessibleCommon.sol";
import "../libraries/SafeERC20.sol";
import "../libraries/Layer2.sol";
import "../libraries/LibOptimism.sol";
import "../interfaces/ILayer2Manager.sol";

import "hardhat/console.sol";

interface AddressManagerI {
    function getAddress(string memory _name) external view returns (address);
}

interface SeigManagerV2I {
    function claim(address to, uint256 amount) external;
}

interface StakingLayer2I {
    function balanceOfLton(uint32 layerKey, address account) external view returns (uint256 amount);
}

interface SequencerI {
    function create(uint32 _index, bytes memory _layerInfo) external returns (bool);
    function getTvl(uint32 _index) external view returns (uint256);
    function getTvl(address l1Bridge, address l2ton) external view returns (uint256 amount);
    function sequencer(uint32 _index) external view returns (address);
    function sequencer(address addressManager) external view returns (address);
    function layerInfo(uint32 _index) external view returns (bytes memory);
    function getLayerInfo(uint32 _index) external view returns (LibOptimism.Info memory _layerInfo );
    function L1StandardBridge(address addressManager) external view returns (address);

}

interface CandidateI {
    function create (uint32 _candidateIndex, bytes memory _data) external returns (bool);
    function layerInfo (uint32 _index) external view returns (bytes memory);
}

interface DAOv2I {

}

contract  Layer2Manager is AccessibleCommon, BaseProxyStorage, Layer2ManagerStorage, ILayer2Manager {
    /* ========== DEPENDENCIES ========== */
    using SafeERC20 for IERC20;

    /* ========== CONSTRUCTOR ========== */
    constructor() {
    }

    /* ========== onlyOwner ========== */

    /// @inheritdoc ILayer2Manager
    function setMaxLayer2Count(uint256 _maxLayer2Count)
        external override nonZero(_maxLayer2Count)
        onlyOwner
    {
        require(maxLayer2Count != _maxLayer2Count, "same");
        maxLayer2Count = _maxLayer2Count;
    }

    /// @inheritdoc ILayer2Manager
    function setMinimumDepositForSequencer(uint256 _minimumDepositForSequencer)
        external override
        onlyOwner
    {
        require(minimumDepositForSequencer != _minimumDepositForSequencer, "same");
        minimumDepositForSequencer = _minimumDepositForSequencer;
    }

    /// @inheritdoc ILayer2Manager
    function setRatioSecurityDepositOfTvl(uint16 _ratioSecurityDepositOfTvl)
        external override
        onlyOwner
    {
        require(ratioSecurityDepositOfTvl != _ratioSecurityDepositOfTvl, "same");
        ratioSecurityDepositOfTvl = _ratioSecurityDepositOfTvl;
    }

    /// @inheritdoc ILayer2Manager
    function setMinimumDepositForCandidate(uint256 _minimumDepositForCandidate)
        external override
        onlyOwner
    {
        require(minimumDepositForCandidate != _minimumDepositForCandidate, "same");
        minimumDepositForCandidate = _minimumDepositForCandidate;
    }

    /// @inheritdoc ILayer2Manager
    function setDelayBlocksForWithdraw(uint256 _delayBlocksForWithdraw)
        external override
        onlyOwner
    {
        require(delayBlocksForWithdraw != _delayBlocksForWithdraw, "same");
        delayBlocksForWithdraw = _delayBlocksForWithdraw;
    }

    function setDAOCommittee(address _dao)
        external
        onlyOwner
    {
        DAOCommittee = _dao;
    }

    /* ========== only SeigManagerV2 ========== */

    /// @inheritdoc ILayer2Manager
    function addSeigs(uint256 amount) external override returns (bool)
    {
        require(msg.sender == seigManagerV2, "caller is not SeigManagerV2");
        if (amount > 0) totalSeigs += amount;
        return true;
    }

    /* ========== Sequncer can execute ========== */

    /// @inheritdoc ILayer2Manager
    function createOptimismSequencer(
        bytes32 _name,
        address addressManager,
        address l1Bridge,
        address l2Bridge,
        address l2ton,
        uint256 amount
    )
        external override ifFree returns (uint32)
    {   
        require(msg.sender == AddressManagerI(addressManager).getAddress('OVM_Sequencer'), 'NOT Sequencer');
        require(indexSequencers < maxLayer2Count, 'exceeded maxLayer2Count');

        require(
            addressManager != address(0) &&
            l2ton != address(0), "zero address"
        );

        bytes32 _key = LibOptimism.getKey(addressManager, l1Bridge, l2Bridge, l2ton);
        require(!layerKeys[_key], 'already created');

        address _l1Bridge = SequencerI(optimismSequencer).L1StandardBridge(addressManager);
        require(l1Bridge == _l1Bridge, 'different l1Bridge');

        require(amount >= minimumSecurityDepositAmount(l1Bridge, l2ton), 'security deposit is insufficent');

        layerKeys[_key] = true;
        uint32 _index = ++indexSequencers;
        totalSecurityDeposit += amount;
        optimismSequencerIndexes.push(_index);

        Layer2.Layer2Holdings storage holding = holdings[_index];
        holding.securityDeposit = amount;
        optimismSequencerNames[_index] = _name;

        require(
            SequencerI(optimismSequencer).create(
                _index,
                abi.encodePacked(addressManager, l1Bridge, l2Bridge, l2ton)),
            "Fail createOptimismSequencer"
        );

        if (amount != 0) ton.safeTransferFrom(msg.sender, address(this), amount);

        (bool success,) = DAOCommittee.call(
            abi.encodeWithSignature(
                "createOptimismSequencer(address,uint32)",
                msg.sender,_index
            )
        );
        require(success, "already candidate");
        
        emit CreatedOptimismSequencer(
            _index, msg.sender, _name, addressManager, l1Bridge, l2Bridge, l2ton, amount);

        return _index;
    }

    /// @inheritdoc ILayer2Manager
    function createCandidate(
        uint32 _sequencerIndex,
        bytes32 _name,
        uint16 _commission,
        uint256 amount
    )   external override nonZeroUint32(_sequencerIndex) ifFree returns (uint32)
    {
        require(_sequencerIndex <= indexSequencers, "wrong index");
        bytes32 _key = LibOperator.getKey(msg.sender, _sequencerIndex);
        require(!layerKeys[_key], 'already created');
        require(amount >= minimumDepositForCandidate, 'security deposit is insufficent');

        layerKeys[_key] = true;

        uint32 _index = ++indexCandidates;

        candidatesIndexes.push(_index);
        candidateNames[_index] = _name;

        if (amount != 0) ton.safeTransferFrom(msg.sender, address(this), amount);

        if (ton.allowance(address(this), candidate) < amount) {
            ton.approve(candidate, ton.totalSupply());
        }

        require(
            CandidateI(candidate).create(
                _index,
                abi.encodePacked(msg.sender, _sequencerIndex, _commission, amount)),
            "Fail createCandidate"
        );

        (bool success,) = DAOCommittee.call(
            abi.encodeWithSignature(
                "createCandidateV2(address,uint32,uint32)",
                msg.sender,_sequencerIndex,_index
            )
        );
        require(success, "already candidate");

        emit CreatedCandidate(_index, msg.sender, _name, _sequencerIndex, _commission, amount);
        return _index;
    }

    /// @inheritdoc ILayer2Manager
    function decreaseSecurityDeposit(uint32 _sequencerIndex, uint256 amount)
        external override ifFree nonZeroUint32(_sequencerIndex) nonZero(amount)
    {
        require(_sequencerIndex <= indexSequencers, "wrong index");

        LibOptimism.Info memory _layerInfo = SequencerI(optimismSequencer).getLayerInfo(_sequencerIndex);
        address _sequencer = SequencerI(optimismSequencer).sequencer(_layerInfo.addressManager);
        require(_sequencer != address(0) && _sequencer == msg.sender, "sequencer is zero or not caller." );

        address l1Bridge = SequencerI(optimismSequencer).L1StandardBridge(_layerInfo.addressManager);
        require(l1Bridge != address(0), 'zero l1Bridge');

        uint256 minDepositAmount = minimumSecurityDepositAmount(l1Bridge, _layerInfo.l2ton);
        Layer2.Layer2Holdings storage holding = holdings[_sequencerIndex];
        require(amount + minDepositAmount <= holding.securityDeposit, "insufficient deposit");

        holding.securityDeposit -= amount;
        totalSecurityDeposit -= amount;
        ton.safeTransfer(msg.sender, amount);

        emit DecreasedSecurityDeposit(_sequencerIndex, msg.sender, amount);
    }

    /* ========== Anyone can execute ========== */

    /// @inheritdoc ILayer2Manager
    function increaseSecurityDeposit(uint32 _sequencerIndex, uint256 amount)
        external override ifFree nonZeroUint32(_sequencerIndex) nonZero(amount)
    {
        require(_sequencerIndex <= indexSequencers, "wrong index");
        ton.safeTransferFrom(msg.sender, address(this), amount);

        Layer2.Layer2Holdings storage holding = holdings[_sequencerIndex];
        holding.securityDeposit += amount;
        totalSecurityDeposit += amount;
        emit IncreasedSecurityDeposit(_sequencerIndex, msg.sender, amount);
    }

    /// @inheritdoc ILayer2Manager
    function distribute() external override {
        require (totalSeigs != 0, 'no distributable amount');
        uint256 len = optimismSequencerIndexes.length;
        uint256 sum = 0;

        uint256[] memory amountLayer = new uint256[](len);
        for(uint256 i = 0; i < len; i++){
            uint32 _layerIndex = optimismSequencerIndexes[i];
            Layer2.Layer2Holdings memory holding = holdings[_layerIndex];

            if (holding.securityDeposit >= minimumDepositForSequencer ) {
                amountLayer[i] += holding.securityDeposit + depositsOf(_layerIndex);
                sum += amountLayer[i];
            } else {
                sum += holding.securityDeposit + depositsOf(_layerIndex);
            }
        }
        uint256 amount1 = 0;
        if (sum > 0) {
            for(uint256 i = 0; i < len; i++){
                if (amountLayer[i] > 0 ) {
                    uint256 amount = totalSeigs * amountLayer[i] / sum;
                    Layer2.Layer2Holdings storage holding = holdings[optimismSequencerIndexes[i]];
                    holding.seigs += amount;
                    amount1 += amount;
                }
            }
            if (amount1 > 0)  totalSeigs -= amount1;
        }

        emit Distributed(totalSeigs, amount1);
    }

    /// @inheritdoc ILayer2Manager
    function claim(uint32 _layerIndex) external override {
        uint256 amount = holdings[_layerIndex].seigs;
        require(amount != 0, 'no amount to claim');
        address sequencer_ = sequencer(_layerIndex);
        require(sequencer_ != address(0), 'zero sequencer');
        holdings[_layerIndex].seigs = 0;
        SeigManagerV2I(seigManagerV2).claim(sequencer_, amount);
        emit Claimed(_layerIndex, sequencer_, amount);
    }

    /* ========== VIEW ========== */

    /// @inheritdoc ILayer2Manager
    function minimumSecurityDepositAmount(address l1Bridge, address l2ton) public view override returns (uint256 amount) {
        if (ratioSecurityDepositOfTvl == 0) amount = minimumDepositForSequencer;
        else {
            amount = Math.max(
                SequencerI(optimismSequencer).getTvl(l1Bridge, l2ton) * ratioSecurityDepositOfTvl / 10000,
                minimumDepositForSequencer);
        }
    }

    /// @inheritdoc ILayer2Manager
    function balanceOfLton(address account) public view override returns (uint256 amount) {
        uint256 len = optimismSequencerIndexes.length;
        for(uint256 i = 0; i < len; i++){
            amount += StakingLayer2I(optimismSequencer).balanceOfLton(optimismSequencerIndexes[i], account);
        }
    }

    /// @inheritdoc ILayer2Manager
    function curTotalLayer2Deposits() public view override returns (uint256 amount) {
        uint256 len = optimismSequencerIndexes.length;
        for(uint256 i = 0; i < len; i++){
            amount += SequencerI(optimismSequencer).getTvl(optimismSequencerIndexes[i]);
        }
    }

    /// @inheritdoc ILayer2Manager
    function sequencer(uint32 _layerIndex) public view override returns (address sequencer_) {
        if (_layerIndex <= indexSequencers ){
            sequencer_ = SequencerI(optimismSequencer).sequencer(_layerIndex);
        }
    }

    /// @inheritdoc ILayer2Manager
    function existedLayer2Index(uint32 _index) external view override returns (bool exist_) {
        if (_index <= indexSequencers) exist_ = true;
    }

    /// @inheritdoc ILayer2Manager
    function existedCandidateIndex(uint32 _index) external view override returns (bool exist_) {
        if (_index <= indexCandidates) exist_ = true;
    }

    /// @inheritdoc ILayer2Manager
    function curTotalAmountsLayer2() external view override returns (uint256 amount) {
        amount = curTotalLayer2Deposits() + totalSecurityDeposit;
    }

    /// @inheritdoc ILayer2Manager
    function totalLayers() external view override returns (uint256 total) {
        total = optimismSequencerIndexes.length;
    }

    /// @inheritdoc ILayer2Manager
    function totalCandidates() external view override returns (uint256 total) {
        total = candidatesIndexes.length;
    }

    /// @inheritdoc ILayer2Manager
    function depositsOf(uint32 _layerIndex) public view override returns (uint256 amount) {
        try
            SequencerI(optimismSequencer).getTvl(_layerIndex) returns (uint256 a) {
                amount = a;
        } catch (bytes memory ) {
            amount = 0;
        }
    }

    /// @inheritdoc ILayer2Manager
    function getAllLayers()
        external view override
        returns (
            bytes32[] memory optimismSequencerNames_,
            uint32[] memory optimismSequencerIndexes_,
            Layer2.Layer2Holdings[] memory holdings_,
            bytes[] memory infos_
            )
    {
        uint256 len = optimismSequencerIndexes.length;

        optimismSequencerNames_ = new bytes32[](len);
        optimismSequencerIndexes_ = optimismSequencerIndexes;
        holdings_ = new Layer2.Layer2Holdings[](len);
        infos_ = new bytes[](len);
        for (uint256 i = 0; i < len ; i++){
            optimismSequencerNames_[i] = optimismSequencerNames[optimismSequencerIndexes[i]];
            holdings_[i] = holdings[optimismSequencerIndexes[i]];
            infos_[i] = SequencerI(optimismSequencer).layerInfo(optimismSequencerIndexes[i]);
        }
    }

    /// @inheritdoc ILayer2Manager
    function getAllCandidates()
        external view override
        returns (
            bytes32[] memory candidateNames_,
            uint32[] memory candidateNamesIndexes_,
            bytes[] memory infos_
            )
    {
        uint256 len = candidatesIndexes.length;

        candidateNames_ = new bytes32[](len);
        candidateNamesIndexes_ = candidatesIndexes;
        infos_ = new bytes[](len);
        for (uint256 i = 0; i < len ; i++){
            candidateNames_[i] = candidateNames[candidatesIndexes[i]];
            infos_[i] = CandidateI(candidate).layerInfo(candidatesIndexes[i]);
        }
    }

    /// @inheritdoc ILayer2Manager
    function layerHoldings(uint32 layerKey_)
        external view override
        returns (Layer2.Layer2Holdings memory)
    {
        return holdings[layerKey_];
    }

    /* ========== internal ========== */
}