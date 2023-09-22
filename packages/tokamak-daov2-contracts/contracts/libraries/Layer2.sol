// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

library Layer2
{

    struct Layer2Info {
        address layers;
        uint32 index;
    }

    struct Layer2Holdings {
        uint256 securityDeposit;     // ton unit
        uint256 seigs;               // ton unit
    }

}