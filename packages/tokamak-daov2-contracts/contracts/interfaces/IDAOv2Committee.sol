// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
pragma abicoder v2;

interface IDAOv2Committee {
    //--owner
    function setSeigManagerV2(address _seigManagerV2) external;
    function setDaoVault(address _daoVault) external;
    function setLayer2Manager(address _layer2Manager) external;
    function setAgendaManager(address _agendaManager) external;
    function setCandidates(address _candidate) external;
    function setOptimismSequencer(address _sequencer) external;
    function setTon(address _ton) external;
    function setActivityRewardPerSecond(uint256 _value) external;

    function increaseMaxMember(uint256 _newMaxMember, uint256 _quorum) external;
    function decreaseMaxMember(uint256 _reducingMemberIndex, uint256 _quorum) external;

    function setQuorum(uint256 _quorum) external;
    function setCreateAgendaFees(uint256 _fees) external;
    function setMinimumNoticePeriodSeconds(uint256 _minimumNoticePeriod) external;
    function setMinimumVotingPeriodSeconds(uint256 _minimumVotingPeriod) external;
    function setExecutingPeriodSeconds(uint256 _executingPeriodSeconds) external;
    function setAgendaStatus(uint256 _agendaID, uint256 _status, uint256 _result) external;

    //--candidate
    function createCandidateV2(
        uint32 _sequencerIndex,
        bytes32 _name,
        uint16 _commission,
        uint256 amount
    )
        external
        returns (bool);
    function createOptimismSequencer(
        bytes32 _name,
        address addressManager,
        address l2ton,
        uint256 amount 
    )
        external
        returns (bool);
    
    //--anyone
    function changeMember(uint256 _memberIndex) external returns (bool);
    function setNameOnRegistrant(
        bytes32 _name
    )
        external;
    function updateSeigniorage() external returns (bool);    


    //--member
    function retireMember() external returns (bool);

    //--manage Agenda(anyone)
    function onApprove(
        address owner,
        address spender,
        uint256 tonAmount,
        bytes calldata data
    )
        external
        returns (bool);

    function castVote(uint256 _AgendaID, uint256 _vote, string calldata _comment) external;
    function endAgendaVoting(uint256 _agendaID) external;
    function executeAgenda(uint256 _AgendaID) external;
    function claimActivityReward(address _receiver) external;

    //--view
    function isCandidate(address _candidate) external view returns (bool);
    function totalSupplyOnCandidate(
        uint32 _index
    )
        external
        view
        returns (uint256 amount);

    function totalSupplyOnSequencer(
        uint32 _index
    )  
        external
        view
        returns (uint256 amount);
    
    function balanceOfOnCandidate(
        uint32 _index,
        address _account
    )   
        external
        view
        returns (uint256 amount);

    function balanceOfOnSequencer(
        uint32 _index,
        address _account
    )   
        external
        view
        returns (uint256 amount);

    function candidatesLength() external view returns (uint256);
    function isExistCandidate(address _candidate) external view returns (bool);
    function getClaimableActivityReward(address _candidate) external view returns (uint256);
}

