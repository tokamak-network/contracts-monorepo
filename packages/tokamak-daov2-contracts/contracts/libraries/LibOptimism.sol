// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./BytesParserLib.sol";

library LibOptimism
{
    using BytesParserLib for bytes;

    struct Info {
        address addressManager;
        address l1Bridge;
        address l2Bridge;
        address l2ton;
    }

    function getKey(
        address addressManager,
        address l1Bridge,
        address l2Bridge,
        address l2ton
    ) external pure returns (bytes32 key_) {
        key_ = bytes32(keccak256(abi.encodePacked(addressManager, l1Bridge, l2Bridge, l2ton)));
    }

    function parseKey(bytes memory data) public pure returns (Info memory info){
         if (data.length > 79) {
            info = Info({
                addressManager : data.toAddress(0),
                l1Bridge : data.toAddress(20),
                l2Bridge : data.toAddress(40),
                l2ton : data.toAddress(60)
            });
         }
    }

    function getAddressManager(bytes memory data) public pure returns (address addr){
         if (data.length > 20) {
            addr = data.toAddress(0);
         }
    }

}