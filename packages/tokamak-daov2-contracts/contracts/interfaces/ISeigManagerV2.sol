// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

/**
 * @title   SeigManagerV2
 * @dev     Responsible for issuing seigniorage.
 *          Manages indexLton, which applies seigniorage to staked amount.
 */
interface ISeigManagerV2 {

    /**
     * @dev                     an event that occurs when snapshot is executed
     * @param id                the snapshot id
     * @param snapshotTime      the snapshot timestamp
     */
    event Snapshot(uint256 id, uint256 snapshotTime);

    /**
     * @dev                         an event that occurs when updateSeigniorage is executed
     * @param lastSeigBlock_        last block executed
     * @param increaseSeig_         issued seigniorage
     * @param totalSupplyOfTon_     total supply of TON
     * @param amount_               [ amountOfstaker : seignorage issued to stakers,
     *                                amountOfsequencer : seignorage issued to sequencers,
     *                                amountOfDao : seignorage issued to DAO,
     *                                amountOfStosHolders : seignorage issued to sTOS holders]
     * @param prevIndex_            previous index
     * @param index_                updated index
     */
    event UpdatedSeigniorage(
                    uint256 lastSeigBlock_,
                    uint256 increaseSeig_,
                    uint256 totalSupplyOfTon_,
                    uint256[4] amount_,
                    uint256 prevIndex_,
                    uint256 index_
                    );

    /**
     * @dev                 an event that occurs when claim is executed by layer2Manager, optimismSequencer, and candidate contracts.
     * @param caller        the caller address (layer2Manager, optimismSequencer, or candidate contracts.)
     * @param to            the to address
     * @param amount        the amount sended
     */
    event Claimed(address caller, address to, uint256 amount);

    /* ========== onlyOwner ========== */

    /**
     * @dev                 set _seigPerBlock
     * @param _seigPerBlock Amount of seigniroage issued per block
     */
    function setSeigPerBlock(uint256 _seigPerBlock) external ;

    /**
     * @dev                                 set _minimumBlocksForUpdateSeig
     * @param _minimumBlocksForUpdateSeig   Block period set when seignorage is to be issued for each block period
     */
    function setMinimumBlocksForUpdateSeig(uint32 _minimumBlocksForUpdateSeig) external;

    /**
     * @dev                     set _lastSeigBlock
     * @param _lastSeigBlock    The most recent block number issued by seigniorage
     */
    function setLastSeigBlock(uint256 _lastSeigBlock) external;

    /**
     * @dev                         Setting seigniorage distribution ratio used when issuing seignorage
     *                              set _ratesDao, _ratesStosHolders, _ratesTonStakers
     *                              must be (_ratesDao + _ratesStosHolders + _ratesTonStakers = _ratesUnits )
     * @param _ratesDao             Rate given to Dao
     * @param _ratesStosHolders     Rate given to StosHolder
     * @param _ratesTonStakers      Rate given to TonStakers
     * @param _ratesUnits           10000
     */
    function setDividendRates(uint16 _ratesDao, uint16 _ratesStosHolders, uint16 _ratesTonStakers, uint16 _ratesUnits) external;

    /**
     * @dev                     set _dao, _stosDistribute
     * @param _dao              dao address
     * @param _stosDistribute   stosDistributer address
     */
    function setAddress(address _dao, address _stosDistribute) external;

    /* ========== only Layer2Manager Or Optimism Or Candidate ========== */

    /**
     * @dev             Send {amount} TON to {to} address
     *                  Can be executed by layer2Manager, optimismSequencer, and candidate contracts.
     * @param _to       to address
     * @param _amount   amount of TON
     */
    function claim(address _to, uint256 _amount) external;

    /* ========== Anyone can execute ========== */

    /**
     * @dev                 execute snapshot
     * @return  snapshotId  snapshotId
     */
    function snapshot() external returns (uint256);

    /**
     * @dev          update Seigniorage
     * @return  res  true
     */
    function updateSeigniorage() external returns (bool res);

    /**
     * @dev          update Seigniorage right now
     * @return  res  true
     */
    function runUpdateSeigniorage() external returns (bool res);

    /* ========== VIEW ========== */

    /**
     * @dev             get mintable seigniorage amount
     * @return  amount  mintableSeigsAmount
     */
    function mintableSeigsAmount() external view returns (uint256 amount);

    /**
     * @dev                 Calculate the amount converted from TON to LTON
     * @param   _tonAmount  amount of TON
     * @return  ltonAmount  amount of LTON
     */
    function getTonToLton(uint256 _tonAmount) external view returns (uint256 ltonAmount);

    /**
     * @dev                 Calculate the amount converted from TON to LTON at specific snapshotId
     * @param   _tonAmount  amount of TON
     * @param   _snapshotId snapshotId
     * @return  ltonAmount  amount of LTON
     */
    function getTonToLtonAt(uint256 _tonAmount, uint256 _snapshotId) external view returns (uint256 ltonAmount);

    /**
     * @dev                 Calculate the amount converted from LTON to TON
     * @param   ltonAmount  amount of LTON
     * @return  tonAmount   amount of TON
     */
    function getLtonToTon(uint256 ltonAmount) external view returns (uint256 tonAmount) ;

    /**
     * @dev                 Calculate the amount converted from LTON to TON at specific snapshotId
     * @param   ltonAmount  amount of LTON
     * @param   _snapshotId snapshotId
     * @return  tonAmount  amount of TON
     */
    function getLtonToTonAt(uint256 ltonAmount, uint256 _snapshotId) external view returns (uint256 tonAmount) ;

    /**
     * @dev                         get currentBlockNumber
     * @return  currentBlockNumber  currentBlockNumber
     */
    function getCurrentBlockNumber() external view returns (uint256);

    /**
     * @dev                     calculate index
     * @param   curIndex        current index
     * @param   curTotal        current total amount
     * @param   increaseAmount  increasing amount
     * @return  nextIndex       calculated index
     */
    function calculateIndex(uint256 curIndex, uint256 curTotal, uint256 increaseAmount) external pure returns (uint256 nextIndex);

    /**
     * @dev             get total supply amount of TON
     * @return  amount  totalSupplyTON amount
     */
    function totalSupplyTON() external view returns (uint256 amount);

    /**
     * @dev             get total LTON amount
     * @return  amount  totalLton
     */
    function getTotalLton() external view returns (uint256 amount);

    /**
     * @dev                     get total LTON amount  at specific snapshotId
     * @param   _snapshotId     snapshotId
     * @return  amount          totalLton
     */
    function getTotalLtonAt(uint256 _snapshotId) external view returns (uint256 amount);

    /**
     * @dev                     get current snapshotId
     * @return  _snapshotId     snapshotId
     */
    function getCurrentSnapshotId() external view returns (uint256);

    /**
     * @dev                     get snapshot time
     * @return  _snapshotIds    arrays of [_snapshotIds, _snapshotTime]
     */
    function getSnapshotTime() external view returns (uint32[] memory);

    /**
     * @dev                 get indexLton
     * @return  _indexLton  indexLton
     */
    function indexLton() external view returns (uint256);

    /**
     * @dev                 get indexLton at specific snapshotId
     * @return  _indexLton  indexLton
     */
    function indexLtonAt(uint256 snapshotId) external view returns (uint256);

    /**
     * @dev                     get snapshotted and value of indexLton at specific snapshotId
     * @return  snapshotted     Whether or not snapshots were taken
     * @return  value           snapshotted value of indexLton
     */
    function indexLtonAtSnapshot(uint256 snapshotId) external view returns (bool snapshotted, uint256 value);


}