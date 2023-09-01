// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./BytesLib.sol";

library LibOperator
{
    using BytesLib for bytes;
    struct Info {
        address operator;
        uint32 sequencerIndex;
        uint16 commission;  // denomitor 10000
    }

    function getKey(
        address operator,
        uint32 sequencerIndex
    ) external pure returns (bytes32 key_) {
        key_ = bytes32(keccak256(abi.encodePacked(operator, sequencerIndex)));
    }


    function getKey(
        address addressManager,
        address l1Messenger,
        address l1Bridge,
        address l2ton
    ) external pure returns (bytes32 key_) {
        key_ = bytes32(keccak256(abi.encodePacked(addressManager, l1Messenger, l1Bridge, l2ton)));
    }

    function parseKey(bytes memory data) public pure returns (Info memory info){
         if (data.length > 25) {
            info = Info({
                operator : data.toAddress(0),
                sequencerIndex : data.toUint32(20),
                commission : data.toUint16(24)
            });
         }
    }
}