// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
pragma abicoder v2;

library LibDaoV2
{
    enum ApplyResult { NONE, SUCCESS, NOT_ELECTION, ALREADY_COMMITTEE, SLOT_INVALID, ADDMEMBER_FAIL, LOW_BALANCE }

    struct AgendaCreatingData {
        address[] target;
        uint128 noticePeriodSeconds;
        uint128 votingPeriodSeconds;
        bool atomicExecute;
        bytes[] functionBytecode;
    }

    struct CandidateInfoV2 {
        uint32 sequencerIndex;
        uint32 candidateIndex;
        uint256 indexMembers;
        uint128 memberJoinedTime;
        uint128 rewardPeriod;
        uint128 claimedTimestamp;
    }

}