// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;
import "../libraries/LibOptimism.sol";

/**
 * @title   OptimismSequencer
 * @dev     create sequencer, stake , get sequencer address and tvl
 */
interface IOptimismSequencer {

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


    /* ========== only Layer2Manager ========== */

    /**
     * @dev                 create the sequencer contract
     * @param _index        the sequencer index
     * @param _layerInfo    the layer2(sequencer) information (80 bytes)
     *                      addressManager address (20bytes), l1Bridge address (20bytes), l2Bridge address (20bytes), l2ton address (20bytes)
     * @return result       true
     */
    function create(uint32 _index, bytes memory _layerInfo) external returns (bool);

    /* ========== Anyone can execute ========== */

    /**
     * @dev                 stake TON
     * @param _index        the sequencer index
     * @param amount        the amount of TON what want to stake
     */
    function stake(uint32 _index, uint256 amount) external ;

    /**
     * @dev                 unstake TON
     * @param _index        the sequencer index
     * @param lton_         the amount of LTON what want to unstake
     */
    function unstake(uint32 _index, uint256 lton_) external ;

    /* ========== VIEW ========== */

    /**
     * @dev                 whether the sequencer index existed
     * @param _index        the sequencer index
     * @return result       if exist, true , otherwise false
     */
    function existedIndex(uint32 _index) external view returns (bool) ;

     /**
     * @dev                 view the sequencer information
     * @param _index        the sequencer index
     * @return _layerInfo   addressManager, l1Bridge, l2Bridge , l2ton
     */
    function getLayerInfo(uint32 _index) external view returns (LibOptimism.Info memory _layerInfo);

    /**
     * @dev                 view the layer(sequencer) key
     * @param _index        the sequencer index
     * @return layerKey_    the keccak256 of layerInfo bytes
     */
    function getLayerKey(uint32 _index) external view returns (bytes32 layerKey_);

    /**
     * @dev                 view the layer(sequencer)'s total value locked
     * @param _index        the sequencer index
     * @return amount       the amount of deposited at sequencer (TVL)
     */
    function getTvl(uint32 _index) external view returns (uint256 amount) ;

    /**
     * @dev                 view the layer(sequencer)'s total value locked
     * @param l1Bridge      the sequencer's l1bridge address
     * @param l2ton         the sequencer's l2 TON address
     * @return amount       the amount of deposited at sequencer (TVL)
     */
    function getTvl(address l1Bridge, address l2ton) external view returns (uint256 amount) ;

    /**
     * @dev                 view the sequencer address
     * @param _index        the sequencer index
     * @return sequencer_   the sequencer address
     */
    function sequencer(uint32 _index) external view returns (address sequencer_) ;

    /**
     * @dev                     view the sequencer address
     * @param addressManager    the sequencer index
     * @return sequencer_       the sequencer address
     */
    function sequencer(address addressManager) external view returns (address sequencer_);

    /**
     * @dev                     view the L1 crossDomainMessenger address
     * @param addressManager    the addressManager address
     * @return account_         the L1 crossDomainMessenger address
     */
    function L1CrossDomainMessenger(address addressManager) external view returns (address account_) ;

    /**
     * @dev                     view the L1 bridge address
     * @param addressManager    the addressManager address
     * @return account_         the L1 bridge address
     */
    function L1StandardBridge(address addressManager) external view returns (address account_);

    /**
     * @dev                     view the bridge addresses
     * @param _index            the sequencer index
     * @return l1bridge         the L1 bridge address
     * @return l21bridge        the L2 bridge address
     */
    function bridges(uint32 _index) external view returns (address, address);
}