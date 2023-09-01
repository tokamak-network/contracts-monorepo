// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import {IERC20} from "../interfaces/IERC20.sol";
import {Layer2} from "../libraries/Layer2.sol";
import {LibOperator} from "../libraries/LibOperator.sol";

contract Layer2ManagerStorage {

    IERC20 public ton;
    address public seigManagerV2;
    address public optimismSequencer;
    address public candidate;
    
    address public DAOCommittee;

    uint256 public minimumDepositForSequencer;  // 초기 시퀀서의 최소 디파짓 금액,
    uint256 public minimumDepositForCandidate;  // candidate의 최소 스테이킹 금액,

    uint256 public delayBlocksForWithdraw;
    uint256 public maxLayer2Count;

    uint256 public totalSecurityDeposit; //시퀀서의 담보금
    uint256 public totalSeigs; //아직 배분되지 않은 시뇨리지

    //====================
    uint32[] public optimismSequencerIndexes ;
    mapping (uint32 => bytes32) public optimismSequencerNames;
    mapping (uint32 => bytes32) public candidateNames;

    // 레이어2의 담보금(시퀀서가 입금한다.)
    mapping (uint32 => Layer2.Layer2Holdings) public holdings;

    mapping (bytes32 => bool) public layerKeys;

    //==================
    uint32[] public candidatesIndexes ; // 길이가 총 개수
    uint32 public indexSequencers ;  // 계속 증가만 함. 인덱스로 사용
    uint32 public indexCandidates ;  // 계속 증가만 함. 인덱스로 사용

    uint16 public ratioSecurityDepositOfTvl;

    // minimumSecurityDeposit = max(minimumDepositForSequencer, tvl*ratioSecurityDepositOfTvl/10000)

    bool internal free = true;

    // 등록된 레이어를 삭제하는 기능: 슬래싱 기능이 필요하다

    modifier nonZero(uint256 value) {
        require(value != 0, "Z1");
        _;
    }

    modifier nonZeroUint32(uint32 value) {
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