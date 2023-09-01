// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
pragma abicoder v2;

// import "@openzeppelin/contracts/access/AccessControl.sol";
import "../AccessControl/AccessControl.sol";
import "./StorageStateCommittee.sol";
import "./StorageStateCommitteeV2.sol";


import { SafeMath } from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import { IERC20 } from  "../../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ILayer2 } from "../interfaces/ILayer2.sol";

import { LibAgenda } from "../lib/Agenda.sol";
import { ERC165Checker } from "../../node_modules/@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import { ILayer2Manager } from "../interfaces/ILayer2Manager.sol";
import { ISeigManagerV2 } from "../interfaces/ISeigManagerV2.sol";
import { ICandidateV2 } from "../interfaces/ICandidateV2.sol";
import { IOptimismSequencer } from "../interfaces/IOptimismSequencer.sol";

import {BaseProxyStorageV2} from "../proxy/BaseProxyStorageV2.sol";

import "hardhat/console.sol";

contract DAOv2CommitteeV1 is
    StorageStateCommittee,
    AccessControl,
    BaseProxyStorageV2,
    StorageStateCommitteeV2
{
    using SafeMath for uint256;
    using LibAgenda for *;

    //////////////////////////////
    // Events
    //////////////////////////////

    event AgendaCreated(
        address indexed from,
        uint256 indexed id,
        address[] targets,
        uint128 noticePeriodSeconds,
        uint128 votingPeriodSeconds,
        bool atomicExecute
    );

    event AgendaExecuted(
        uint256 indexed id,
        address[] target
    );

    event CandidateContractCreated(
        address indexed candidate,
        address indexed candidateContract,
        string memo
    );

    event Layer2Registered(
        address indexed candidate,
        address indexed candidateContract,
        string memo
    );

    event ChangedMemo(
        address candidate,
        string newMemo
    );

    event ActivityRewardChanged(
        uint256 newReward
    );

    event ClaimedActivityReward(
        address indexed candidate,
        address receiver,
        uint256 amount
    );

    modifier onlyOwner() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "DAO: NA");
        _;
    }

    modifier validMemberIndex(uint256 _index) {
        require(_index < maxMember, "DAO: VI");
        _;
    }

    modifier nonZero(address _addr) {
        require(_addr != address(0), "DAO: ZA");
        _;
    }

    //////////////////////////////////////////////////////////////////////
    // V1 Owner

    /// @notice Set SeigManager contract address
    /// @param _seigManager New SeigManager contract address
    function setSeigManager(address _seigManager) external onlyOwner nonZero(_seigManager) {
        seigManager = ISeigManager(_seigManager);
    }

    /// @notice Set SeigManager contract address on candidate contracts
    /// @param _candidateContracts Candidate contracts to be set
    /// @param _seigManager New SeigManager contract address
    function setCandidatesSeigManager(
        address[] calldata _candidateContracts,
        address _seigManager
    )
        external
        onlyOwner
        nonZero(_seigManager)
    {
        for (uint256 i = 0; i < _candidateContracts.length; i++) {
            ICandidate(_candidateContracts[i]).setSeigManager(_seigManager);
        }
    }

    /// @notice Set DAOCommitteeProxy contract address on candidate contracts
    /// @param _candidateContracts Candidate contracts to be set
    /// @param _committee New DAOCommitteeProxy contract address
    function setCandidatesCommittee(
        address[] calldata _candidateContracts,
        address _committee
    )
        external
        onlyOwner
        nonZero(_committee)
    {
        for (uint256 i = 0; i < _candidateContracts.length; i++) {
            ICandidate(_candidateContracts[i]).setCommittee(_committee);
        }
    }

    /// @notice Set DAOVault contract address
    /// @param _daoVault New DAOVault contract address
    function setDaoVault(address _daoVault) external onlyOwner nonZero(_daoVault) {
        daoVault = IDAOVault(_daoVault);
    }

    /// @notice Set Layer2Registry contract address
    /// @param _layer2Registry New Layer2Registry contract address
    function setLayer2Registry(address _layer2Registry) external onlyOwner nonZero(_layer2Registry) {
        layer2Registry = ILayer2Registry(_layer2Registry);
    }

    /// @notice Set DAOAgendaManager contract address
    /// @param _agendaManager New DAOAgendaManager contract address
    function setAgendaManager(address _agendaManager) external onlyOwner nonZero(_agendaManager) {
        agendaManager = IDAOAgendaManager(_agendaManager);
    }

    /// @notice Set CandidateFactory contract address
    /// @param _candidateFactory New CandidateFactory contract address
    function setCandidateFactory(address _candidateFactory) external onlyOwner nonZero(_candidateFactory) {
        candidateFactory = ICandidateFactory(_candidateFactory);
    }

    /// @notice Set TON contract address
    /// @param _ton New TON contract address
    function setTon(address _ton) external onlyOwner nonZero(_ton) {
        ton = _ton;
    }

    /// @notice Set activity reward amount
    /// @param _value New activity reward per second
    function setActivityRewardPerSecond(uint256 _value) external onlyOwner {
        activityRewardPerSecond = _value;
        emit ActivityRewardChanged(_value);
    }

    /// @notice Set fee amount of creating an agenda
    /// @param _fees Fee amount on TON
    function setCreateAgendaFees(
        uint256 _fees
    )
        external
        onlyOwner
        validAgendaManager
    {
        agendaManager.setCreateAgendaFees(_fees);
    }

    /// @notice Set the minimum notice period
    /// @param _minimumNoticePeriod New minimum notice period in second
    function setMinimumNoticePeriodSeconds(
        uint256 _minimumNoticePeriod
    )
        external
        onlyOwner
        validAgendaManager
    {
        agendaManager.setMinimumNoticePeriodSeconds(_minimumNoticePeriod);
    }

    /// @notice Set the minimum voting period
    /// @param _minimumVotingPeriod New minimum voting period in second
    function setMinimumVotingPeriodSeconds(
        uint256 _minimumVotingPeriod
    )
        external
        onlyOwner
        validAgendaManager
    {
        agendaManager.setMinimumVotingPeriodSeconds(_minimumVotingPeriod);
    }

    /// @notice Set the executing period
    /// @param _executingPeriodSeconds New executing period in second
    function setExecutingPeriodSeconds(
        uint256 _executingPeriodSeconds
    )
        external
        onlyOwner
        validAgendaManager
    {
        agendaManager.setExecutingPeriodSeconds(_executingPeriodSeconds);
    }

    /// @notice Set status and result of specific agenda
    /// @param _agendaID Agenda ID
    /// @param _status New status
    /// @param _result New result
    function setAgendaStatus(uint256 _agendaID, uint256 _status, uint256 _result) external onlyOwner {
        agendaManager.setResult(_agendaID, LibAgenda.AgendaResult(_result));
        agendaManager.setStatus(_agendaID, LibAgenda.AgendaStatus(_status));
    }

    //////////////////////////////////////////////////////////////////////
    // Managing members

    /// @notice Creates a candidate contract and register it on SeigManager
    /// @param _memo A memo for the candidate
    function createCandidate(string calldata _memo)
        external
        validSeigManager
        validLayer2Registry
        validCommitteeL2Factory
    {
        require(!isExistCandidate(msg.sender), "DAO: AR");

        // Candidate
        address candidateContract = candidateFactory.deploy(
            msg.sender,
            false,
            _memo,
            address(this),
            address(seigManager)
        );

        require(
            candidateContract != address(0),
            "DAO: CZ"
        );
        require(
            _candidateInfos[msg.sender].candidateContract == address(0),
            "DAO: AC"
        );
        require(
            layer2Registry.registerAndDeployCoinage(candidateContract, address(seigManager)),
            "DAO: FR"
        );

        _candidateInfos[msg.sender] = CandidateInfo({
            candidateContract: candidateContract,
            memberJoinedTime: 0,
            indexMembers: 0,
            rewardPeriod: 0,
            claimedTimestamp: 0
        });

        candidates.push(msg.sender);
       
        emit CandidateContractCreated(msg.sender, candidateContract, _memo);
    }

    /// @notice Registers the exist layer2 on DAO
    /// @param _layer2 Layer2 contract address to be registered
    /// @param _memo A memo for the candidate
    function registerLayer2Candidate(address _layer2, string memory _memo)
        external
        validSeigManager
        validLayer2Registry
        validCommitteeL2Factory
    {
        _registerLayer2Candidate(msg.sender, _layer2, _memo);
    }

    /// @notice Registers the exist layer2 on DAO by owner
    /// @param _operator Operator address of the layer2 contract
    /// @param _layer2 Layer2 contract address to be registered
    /// @param _memo A memo for the candidate
    function registerLayer2CandidateByOwner(address _operator, address _layer2, string memory _memo)
        external
        onlyOwner
        validSeigManager
        validLayer2Registry
        validCommitteeL2Factory
    {
        _registerLayer2Candidate(_operator, _layer2, _memo);
    }

    /// @notice Set memo
    /// @param _candidate candidate address
    /// @param _memo New memo on this candidate
    function setMemoOnCandidate(
        address _candidate,
        string calldata _memo
    )
        external
    {
        address candidateContract = candidateContract(_candidate);
        setMemoOnCandidateContract(candidateContract, _memo);
    }

    /// @notice Set memo
    /// @param _candidateContract candidate contract address
    /// @param _memo New memo on this candidate
    function setMemoOnCandidateContract(
        address _candidateContract,
        string calldata _memo
    )
        public
    {
        address candidate = ICandidate(_candidateContract).candidate();
        address contractOwner = candidate;
        if (ICandidate(_candidateContract).isLayer2Candidate()) {
            contractOwner = ILayer2(candidate).operator();
        }
        require(
            msg.sender == contractOwner,
            "DAO: NC"
        );

        ICandidate(_candidateContract).setMemo(_memo);
        emit ChangedMemo(candidate, _memo);
    }

    //////////////////////////////////////////////////////////////////////
    // Managing 

    /// @notice Call updateSeigniorage on SeigManager
    /// @param _candidate Candidate address to be updated
    /// @return Whether or not the execution succeeded
    function updateSeigniorage(address _candidate) public returns (bool) {
        address candidateContract = _candidateInfos[_candidate].candidateContract;
        return ICandidate(candidateContract).updateSeigniorage();
    }

    /// @notice Call updateSeigniorage on SeigManager
    /// @param _candidates Candidate addresses to be updated
    /// @return Whether or not the execution succeeded
    function updateSeigniorages(address[] calldata _candidates) external returns (bool) {
        for (uint256 i = 0; i < _candidates.length; i++) {
            require(
                updateSeigniorage(_candidates[i]),
                "DAO: FS"
            );
        }

        return true;
    }

    //////////////////////////////////////////////////////////////////////
    // Managing agenda

    function onApprove(
        address owner,
        address,
        uint256,
        bytes calldata data
    ) external returns (bool) {
        LibDaoV2.AgendaCreatingData memory agendaData = _decodeAgendaData(data);

        _createAgenda(
            owner,
            agendaData.target,
            agendaData.noticePeriodSeconds,
            agendaData.votingPeriodSeconds,
            agendaData.atomicExecute,
            agendaData.functionBytecode
        );

        return true;
    }

    /// @notice Set the agenda status as ended(denied or dismissed)
    /// @param _agendaID Agenda ID
    function endAgendaVoting(uint256 _agendaID) external {
        agendaManager.endAgendaVoting(_agendaID);
    }

    /// @notice Execute the accepted agenda
    /// @param _agendaID Agenda ID
    function executeAgenda(uint256 _agendaID) external validAgendaManager {
        require(
            agendaManager.canExecuteAgenda(_agendaID),
            "DAO: CA"
        );

         (address[] memory target,
             bytes[] memory functionBytecode,
             bool atomicExecute,
             uint256 executeStartFrom
         ) = agendaManager.getExecutionInfo(_agendaID);

        if (atomicExecute) {
            agendaManager.setExecutedAgenda(_agendaID);
            for (uint256 i = 0; i < target.length; i++) {
                (bool success, ) = address(target[i]).call(functionBytecode[i]);
                require(success, "DAO: FA");
            }
        } else {
            uint256 succeeded = 0;
            for (uint256 i = executeStartFrom; i < target.length; i++) {
                bool success = _call(target[i], functionBytecode[i].length, functionBytecode[i]);
                if (success) {
                    succeeded = succeeded.add(1);
                } else {
                    break;
                }
            }

            agendaManager.setExecutedCount(_agendaID, succeeded);
            if (executeStartFrom.add(succeeded) == target.length) {
                agendaManager.setExecutedAgenda(_agendaID);
            }
        }

        emit AgendaExecuted(_agendaID, target);
    }


    //////////////////////////////////////////////////////////////////////
    // internal

    function _decodeAgendaData(bytes calldata input)
        internal
        pure
        returns (LibDaoV2.AgendaCreatingData memory data)
    {
        (data.target, data.noticePeriodSeconds, data.votingPeriodSeconds, data.atomicExecute, data.functionBytecode) =
            abi.decode(input, (address[], uint128, uint128, bool, bytes[]));
    }

    function payCreatingAgendaFee(address _creator) internal {
        uint256 fee = agendaManager.createAgendaFees();

        require(IERC20(ton).transferFrom(_creator, address(this), fee), "DAO: FT");
        require(IERC20(ton).transfer(address(1), fee), "DAO: FB");
    }

    function _createAgenda(
        address _creator,
        address[] memory _targets,
        uint128 _noticePeriodSeconds,
        uint128 _votingPeriodSeconds,
        bool _atomicExecute,
        bytes[] memory _functionBytecodes
    )
        internal
        validAgendaManager
        returns (uint256)
    {
        // pay to create agenda, burn ton.
        payCreatingAgendaFee(_creator);

        uint256 agendaID = agendaManager.newAgenda(
            _targets,
            _noticePeriodSeconds,
            _votingPeriodSeconds,
            _atomicExecute,
            _functionBytecodes
        );

        emit AgendaCreated(
            _creator,
            agendaID,
            _targets,
            _noticePeriodSeconds,
            _votingPeriodSeconds,
            _atomicExecute
        );

        return agendaID;
    }

     function _call(address target, uint256 paramLength, bytes memory param) internal returns (bool) {
        bool result;
        assembly {
            let data := add(param, 32)
            result := call(sub(gas(), 40000), target, 0, data, paramLength, 0, 0)
        }

        return result;
    }

    function _registerLayer2Candidate(address _operator, address _layer2, string memory _memo)
        internal
        validSeigManager
        validLayer2Registry
        validCommitteeL2Factory
    {
        require(!isExistCandidate(_layer2), "DAO: not registerd");

        require(
            _layer2 != address(0),
            "DAO: CZ"
        );
        require(
            _candidateInfos[_layer2].candidateContract == address(0),
            "DAO: AC"
        );
        ILayer2 layer2 = ILayer2(_layer2);
        require(
            layer2.isLayer2(),
            "DAO: IL"
        );
        require(
            layer2.operator() == _operator,
            "DAO: IO"
        );

        address candidateContract = candidateFactory.deploy(
            _layer2,
            true,
            _memo,
            address(this),
            address(seigManager)
        );

        require(
            candidateContract != address(0),
            "DAO: CZ"
        );

        _candidateInfos[_layer2] = CandidateInfo({
            candidateContract: candidateContract,
            memberJoinedTime: 0,
            indexMembers: 0,
            rewardPeriod: 0,
            claimedTimestamp: 0
        });

        candidates.push(_layer2);
       
        emit Layer2Registered(_layer2, candidateContract, _memo);
    }

    //////////////////////////////////////////////////////////////////////
    // view

    function isCandidate(address _candidate) external view returns (bool) {
        CandidateInfo storage info = _candidateInfos[_candidate];

        if (info.candidateContract == address(0)) {
            return false;
        }

        bool supportIsCandidateContract = ERC165Checker.supportsInterface(
            info.candidateContract,
            ICandidate(info.candidateContract).isCandidateContract.selector
        );

        if (supportIsCandidateContract == false) {
            return false;
        }

        return ICandidate(info.candidateContract).isCandidateContract();
    }

    function totalSupplyOnCandidate(
        address _candidate
    )
        external
        view
        returns (uint256 totalsupply)
    {
        address candidateContract = candidateContract(_candidate);
        return totalSupplyOnCandidateContract(candidateContract);
    }

    function balanceOfOnCandidate(
        address _candidate,
        address _account
    )
        external
        view
        returns (uint256 amount)
    {
        address candidateContract = candidateContract(_candidate);
        return balanceOfOnCandidateContract(candidateContract, _account);
    }

    function totalSupplyOnCandidateContract(
        address _candidateContract
    )
        public
        view
        returns (uint256 totalsupply)
    {
        require(_candidateContract != address(0), "not a candidate");

        return ICandidate(_candidateContract).totalStaked();
    }

    function balanceOfOnCandidateContract(
        address _candidateContract,
        address _account
    )
        public
        view
        returns (uint256 amount)
    {
        require(_candidateContract != address(0), "not a candidate");

        return ICandidate(_candidateContract).stakedOf(_account);
    }

    function candidatesLength() external view returns (uint256) {
        return candidates.length;
    }

    function isExistCandidate(address _candidate) public view returns (bool isExist) {
        return _candidateInfos[_candidate].candidateContract != address(0);
    }

    // function getClaimableActivityReward(address _candidate) public view returns (uint256) {
    //     CandidateInfo storage info = _candidateInfos[_candidate];
    //     uint256 period = info.rewardPeriod;

    //     if (info.memberJoinedTime > 0) {
    //         period = (info.memberJoinedTime > info.claimedTimestamp) ? period.add(block.timestamp.sub(info.memberJoinedTime)) : period.add(block.timestamp.sub(info.claimedTimestamp));
    //     }

    //     return period.mul(activityRewardPerSecond);
    // }
}