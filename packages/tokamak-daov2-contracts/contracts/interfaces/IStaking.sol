// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;
import "../libraries/LibStake.sol";

/**
 * @title   Staking
 * @dev     There are stake, unsatke, withdraw, fast withdraw functions.
 */
interface IStaking {

    /**
     * @dev                     event that occur when staking
     * @param _index            the sequencer index or candidate index
     * @param sender            sender address
     * @param amount            the TON amount of staking
     * @param lton              the lton amount
     * @param commissionTo      address receiving commission
     * @param commission        commission
     */
    event Staked(uint32 _index, address sender, uint256 amount, uint256 lton, address commissionTo, uint16 commission);

    /**
     * @dev                     event that occur when unstaking
     * @param _index            the sequencer index or candidate index
     * @param sender            sender address
     * @param amount            the TON amount of unstaking
     * @param lton              the lton amount
     */
    event Unstaked(uint32 _index, address sender, uint256 amount, uint256 lton);

    /**
     * @dev                     event that occur when restaking
     * @param _index            the sequencer index or candidate index
     * @param sender            sender address
     * @param amount            the TON amount of restaking
     * @param lton              the lton amount
     */
    event Restaked(uint32 _index, address sender, uint256 amount, uint256 lton);

    /**
     * @dev                     event that occur when withdrawal
     * @param _index            the sequencer index or candidate index
     * @param sender            sender address
     * @param amount            the TON amount of withdrawal
     */
    event Withdrawal(uint32 _index, address sender, uint256 amount);

    /**
     * @dev                     an event that occurs when the liquidity provided amount is sended to requestor when liquidity is provided
     * @param hashMessage       hashMessage of fast withdrawal
     * @param layerIndex        the sequencer index
     * @param from              the from address (liquidity provider)
     * @param to                the to address (requestor of fast withdrawal)
     * @param amount            the sending amount to requestor
     */
    event FastWithdrawalClaim(bytes32 hashMessage, uint32 layerIndex, address from, address to, uint256 amount);

    /**
     * @dev                     an event that occurs when the liquidity provided amount is staked at finalizing after liquidity is provided to fast withdrawal
     * @param hashMessage       hashMessage of fast withdrawal
     * @param layerIndex        the sequencer index
     * @param staker            the staker address (liquidity provider)
     * @param amount            the TON amount
     * @param lton              the lton amount
     */
    event FastWithdrawalStaked(bytes32 hashMessage, uint32 layerIndex, address staker, uint256 amount, uint256 lton);


    /* ========== only Receipt ========== */

    /**
     * @dev                     the liquidity provided amount is sended to requestor when liquidity is provided
     * @param hashMessage       hashMessage of fast withdrawal
     * @param layerIndex        the sequencer index
     * @param from              the from address (liquidity provider)
     * @param to                the to address (requestor of fast withdrawal)
     * @param amount            the sending amount to requestor
     * @return result           result
     */
    function fastWithdrawClaim(bytes32 hashMessage, uint32 layerIndex, address from, address to, uint256 amount) external returns (bool);

    /**
     * @dev                     the liquidity provided amount is staked at finalizing after liquidity is provided to fast withdrawal
     * @param hashMessage       hashMessage of fast withdrawal
     * @param layerIndex        the sequencer index
     * @param staker            the staker address (liquidity provider)
     * @param amount            the TON amount
     * @return result           result
     */
    function fastWithdrawStake(bytes32 hashMessage, uint32 layerIndex, address staker, uint256 amount) external returns (bool);


    /* ========== Anyone can execute ========== */

    /**
     * @dev                     restaking
     * @param _index            the sequencer index or candidate index
     */
    function restake(uint32 _index) external;

    /**
     * @dev                     multi-restaking
     * @param _index            the sequencer index or candidate index
     * @param n                 hashMessage of fast withdrawal
     */
    function restakeMulti(uint32 _index, uint256 n) external;

    /**
     * @dev                     withdrawal
     * @param _index            the sequencer index or candidate index
     */
    function withdraw(uint32 _index) external ;

    /* ========== VIEW ========== */

    /**
     * @dev                     view the number of pending withdrawals after unstaking
     * @param layerIndex        the sequencer index or candidate index
     * @param account           account address
     * @return totalRequests    the number of total requests
     * @return withdrawIndex    the start index of pending withdraw request
     * @return pendingLength    the length of pending
     */
    function numberOfPendings(uint32 layerIndex, address account)
        external view returns (uint256 totalRequests, uint256 withdrawIndex, uint256 pendingLength);

    /**
     * @dev                                 view the amount of pending withdrawals after unstaking
     * @param layerIndex                    the sequencer index or candidate index
     * @param account                       account address
     * @return amount                       the amount of pending withdraw request
     * @return startIndex                   the start index of pending withdraw request
     * @return len                          the length of pending
     * @return nextWithdrawableBlockNumber  the next withdrawable blockNumber
     */
    function amountOfPendings(uint32 layerIndex, address account)
        external view returns (uint256 amount, uint32 startIndex, uint32 len, uint32 nextWithdrawableBlockNumber);

    /**
     * @dev                     view the amount available for withdrawal
     * @param _index            the sequencer index or candidate index
     * @param account           account address
     * @return amount           the amount available for withdrawal
     * @return startIndex       the start index of available withdrawal
     * @return len              the length of available withdrawal
     */
    function availableWithdraw(uint32 _index, address account)
        external view returns (uint256 amount, uint32 startIndex, uint32 len);

    /**
     * @dev                     the total amount of lton staked of all sequencer or all candidate
     * @return amount           the total amount of lton
     */
    function totalStakedLton() external view returns (uint256 amount);

    /**
     * @dev                     the total amount of lton staked of all sequencer or all candidate at special snapshot id
     * @param snapshotId        snapshot id
     * @return amount           the total amount of lton
     */
    function totalStakedLtonAt(uint256 snapshotId) external view returns (uint256 amount) ;

    /**
     * @dev                     whether it was snapshotted and the total amount of lton staked of all sequencer or all candidate at special snapshot id
     * @param snapshotId        snapshot id
     * @return snapshotted      whether it was snapshotted
     * @return amount           the total amount of lton
     */
    function totalStakedLtonAtSnapshot(uint256 snapshotId) external view returns (bool snapshotted, uint256 amount) ;

    /**
     * @dev                     the amount of lton staked of special sequencer or candidate
     * @param _index            the sequencer index or candidate index
     * @return amount           the amount of lton
     */
    function balanceOfLton(uint32 _index) external view returns (uint256 amount) ;

    /**
     * @dev                     the amount of lton staked of special sequencer or candidate  at special snapshot id
     * @param _index            the sequencer index or candidate index
     * @param snapshotId        snapshot id
     * @return amount           the amount of lton
     */
    function balanceOfLtonAt(uint32 _index, uint256 snapshotId) external view returns (uint256 amount) ;

    /**
     * @dev                     whether it was snapshotted and the amount of lton staked of special sequencer or candidate  at special snapshot id
     * @param _index            the sequencer index or candidate index
     * @param snapshotId        snapshot id
     * @return snapshotted      whether it was snapshotted
     * @return amount           the amount of lton
     */
    function balanceOfLtonAtSnapshot(uint32 _index, uint256 snapshotId) external view returns (bool snapshotted, uint256 amount) ;

    /**
     * @dev                     the amount of lton staked of special sequencer's account or candidate's account
     * @param _index            the sequencer index or candidate index
     * @param account           the account address
     * @return amount           the amount of lton
     */
    function balanceOfLton(uint32 _index, address account) external view returns (uint256 amount);

    /**
     * @dev                     the amount of lton staked of special sequencer's account or candidate's account at special snapshot id
     * @param _index            the sequencer index or candidate index
     * @param account           the account address
     * @param snapshotId        snapshot id
     * @return amount           the amount of lton
     */
    function balanceOfLtonAt(uint32 _index, address account, uint256 snapshotId) external view returns (uint256 amount);

    /**
     * @dev                     whether it was snapshotted and the amount of lton staked of special sequencer's account or candidate's account at special snapshot id
     * @param _index            the sequencer index or candidate index
     * @param account           the account address
     * @param snapshotId        snapshot id
     * @return snapshotted      whether it was snapshotted
     * @return amount           the amount of lton
     */
    function balanceOfLtonAtSnapshot(uint32 _index, address account, uint256 snapshotId) external view returns (bool snapshotted, uint256 amount) ;

    /**
     * @dev                     view the stake infomation of sequencer or canddiate
     * @param _index            the sequencer index or candidate index
     * @param account           the account address
     * @return info             stakePrincipal : the TON amount of staked principal
     *                          stakelton : the ltonamount of staked
     *                          stake : whether account has ever staked
     */
    function getLayerStakes(uint32 _index, address account) external view returns (LibStake.StakeInfo memory info) ;

    /**
     * @dev                     view the amount staked in TON
     * @param _index            the sequencer index or candidate index
     * @param account           the account address
     * @return amount           the amount staked in TON
     */
    function balanceOf(uint32 _index, address account) external view returns (uint256 amount);

    /**
     * @dev                     view the amount staked in TON at special snapshot id
     * @param _index            the sequencer index or candidate index
     * @param account           the account address
     * @param snapshotId        snapshot id
     * @return amount           the amount staked in TON
     */
    function balanceOfAt(uint32 _index, address account, uint256 snapshotId) external view returns (uint256 amount);

    /**
     * @dev                     view the current total layer2's deposit amount
     * @return amount           the amount staked in TON of all layer2's
     */
    function totalLayer2Deposits() external view returns (uint256 amount) ;

    /**
     * @dev                     view the deposit amount of special layer2(sequencer)
     * @param _index            the sequencer index
     * @return amount           the TON amount staked of special layer2(sequencer)
     */
    function layer2Deposits(uint32 _index) external view returns (uint256 amount) ;

    /**
     * @dev                     view the number of staked addresses
     * @return total            the number of staked addresses
     */
    function totalStakeAccountList() external view returns (uint256) ;

    /**
     * @dev                     the total amount of lton staked of all sequencer or all candidate
     * @return amount           the total amount of lton staked
     */
    function getTotalLton() external view returns (uint256);

    /**
     * @dev                     view the list of staked addresses
     * @return accounts         the array of staked addresses
     */
    function getStakeAccountList() external view returns (address[] memory) ;

    /**
     * @dev                     view pending amount for withdrawal after unstaking
     * @param _index            the sequencer index or candidate index
     * @param account           the account address
     * @return amount           the pending amount in TON
     */
    function getPendingUnstakedAmount(uint32 _index, address account) external view returns (uint256) ;

    /**
     * @dev                     view the current snapshot id
     * @return snapshotId       the snapshot id
     */
    function getCurrentSnapshotId() external view returns (uint256);

}