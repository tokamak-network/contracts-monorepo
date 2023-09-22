// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

contract MockL1Messenger  {

    mapping(bytes32 => bool) public successfulMessages;

    constructor() {
    }

    function setSuccessfulMessages(bytes32 _hashMessages, bool _bool) external {
        successfulMessages[_hashMessages] = _bool;
    }
}
