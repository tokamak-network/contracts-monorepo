// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;
import "../libraries/LibOperator.sol";

/**
 * @title   Candidate
 * @dev     create candidate, stake , unstake
 */
interface ICandidate {


    /* ========== only TON ========== */

    /**
     * @dev                 The stake function is executed through the approveAndCall function of TON.
     * @param sender        sender address
     * @param spender       the calling address
     * @param amount        approved amount, amount to be used
     * @param data          data bytes needed when calling a function
     * @return result       true
     */
    function onApprove(
        address sender,
        address spender,
        uint256 amount,
        bytes calldata data
    ) external returns (bool);


    /* ========== LayerManager ========== */

    /**
     * @dev                     create the candidate contract
     * @param _candidateIndex   the candidate index
     * @param _info             the candidate information (26 bytes)
     *                          operator address (20 bytes), sequencer index (4 bytes),  commission (2 bytes)
     * @return result           true
     */
    function create(uint32 _candidateIndex, bytes memory _info) external returns (bool);


    /* ========== Anyone can execute ========== */

     /**
     * @dev                 stake TON
     * @param _index        the candidate index
     * @param amount        the amount of TON what want to stake
     */
    function stake(uint32 _index, uint256 amount) external;

    /**
     * @dev                 unstake TON
     * @param _index        the candidate index
     * @param lton_         the amount of LTON what want to unstake
     */
    function unstake(uint32 _index, uint256 lton_) external;

    /* ========== VIEW ========== */

    /**
     * @dev                 whether the candidate index existed
     * @param _index        the candidate index
     * @return result       if exist, true , otherwise false
     */
    function existedIndex(uint32 _index) external view returns (bool);

    /**
     * @dev                 view the candidate information
     * @param _index        the candidate index
     * @return info         operator address, sequencer index,  commission
     */
    function getCandidateInfo(uint32 _index)
        external view returns (LibOperator.Info memory info);

    /**
     * @dev                     view the candidate key
     * @param _index            the candidate index
     * @return candidateKey    the keccak256 of candidate information's bytes
     */
    function getCandidateKey(uint32 _index) external view returns (bytes32 candidateKey);

    /**
     * @dev                 view the operator address of candidate
     * @param _index        the candidate index
     * @return operator_    the operator address
     */
    function operator(uint32 _index) external view returns (address operator_);
}