// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "../storages/CandidateStorage.sol";
import "./Staking.sol";
import "../libraries/LibOperator.sol";
import "./ICandidate.sol";

contract Candidate is Staking, CandidateStorage, ICandidate {
    using BytesParserLib for bytes;
    using SafeERC20 for IERC20;

    /* ========== DEPENDENCIES ========== */

    /* ========== CONSTRUCTOR ========== */
    constructor() {
    }

    /* ========== onlyOwner ========== */

    /* ========== only TON ========== */

    /// @inheritdoc ICandidate
    function onApprove(
        address sender,
        address spender,
        uint256 amount,
        bytes calldata data
    ) external returns (bool) {
        require(ton == msg.sender, "EA");
        require(existedIndex(data.toUint32(0)), 'non-registered candidate');

        // data : (32 bytes) index
        uint32 _index = data.toUint32(0);
        if (amount != 0) IERC20(ton).safeTransferFrom(sender, address(this), amount);

        LibOperator.Info memory _layerInfo = getCandidateInfo(_index);
        if (_layerInfo.commission == 0 || sender == _layerInfo.operator) {
            _stake(_index, sender, amount, address(0), 0);
        } else {
            _stake(_index, sender, amount, _layerInfo.operator, _layerInfo.commission);
        }

        return true;
    }


    /* ========== only LayerManager ========== */

    /// @inheritdoc ICandidate
    function create(uint32 _candidateIndex, bytes memory _info)
        external onlyLayer2Manager returns (bool)
    {
        require(layerInfo[_candidateIndex].length == 0, "already created");
        require(_info.length > 57, "wrong _info");

        LibOperator.Info memory info = LibOperator.parseKey(_info);
        require(operators[info.sequencerIndex][info.operator] == 0, "alread existed");
        require(info.commission < uint16(10000), "commission err");
        uint256 amount = _info.toUint256(26);

        layerInfo[_candidateIndex] = abi.encodePacked(_info.slice(0,26));
        operators[info.sequencerIndex][info.operator] = _candidateIndex;

        if(amount != 0) {
            IERC20(ton).safeTransferFrom(layer2Manager, address(this), amount);
            _stake(_candidateIndex, info.operator, amount, address(0), 0);
        }

        return true;
    }

    /* ========== Anyone can execute ========== */

    /// @inheritdoc ICandidate
    function stake(uint32 _index, uint256 amount) external
    {
        require(existedIndex(_index), 'non-registered candidate');
        LibOperator.Info memory _layerInfo = getCandidateInfo(_index);

        if (_layerInfo.commission == 0 || msg.sender == _layerInfo.operator) {
            stake_(_index, amount, address(0), 0);
        } else {
            stake_(_index, amount, _layerInfo.operator, _layerInfo.commission);
        }
    }

    /// @inheritdoc ICandidate
    function unstake(uint32 _index, uint256 lton_) external
    {
        uint256 debt_ = FwReceiptI(fwReceipt).debtInStaked(true, _index, msg.sender);
        if(msg.sender == operator(_index)) {
            _unstake(_index, lton_, debt_ + Layer2ManagerI(layer2Manager).minimumDepositForCandidate());
        } else {
            _unstake(_index, lton_, debt_);
        }
    }

    /* ========== VIEW ========== */

    /// @inheritdoc ICandidate
    function existedIndex(uint32 _index) public view returns (bool) {
        require(Layer2ManagerI(layer2Manager).existedCandidateIndex(_index), 'non-registered layer');
        return true;
    }

    /// @inheritdoc ICandidate
    function getCandidateInfo(uint32 _index)
        public view returns (LibOperator.Info memory info)
    {
        info = LibOperator.parseKey(layerInfo[_index]);
    }

    /// @inheritdoc ICandidate
    function getCandidateKey(uint32 _index) public view virtual  returns (bytes32 layerKey_) {
        bytes memory data = layerInfo[_index];
        layerKey_ = bytes32(keccak256(abi.encodePacked(data.slice(0,24), uint16(0))));
    }

    /// @inheritdoc ICandidate
    function operator(uint32 _index) public view returns (address operator_) {
        bytes memory data = layerInfo[_index];

        if(data.length > 23){
            operator_ = data.toAddress(0);
        }
    }

    /* === ======= internal ========== */

}