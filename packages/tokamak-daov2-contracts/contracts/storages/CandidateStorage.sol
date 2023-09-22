// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

contract CandidateStorage {
    // layerIndex - candidator - candidateIndex
    mapping (uint32 => mapping(address => uint32)) public operators;

}