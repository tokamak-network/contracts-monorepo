pragma solidity ^0.5.12;

import { SeigCoinageToken } from "../tokens/SeigCoinageToken.sol";
import { CoinageFactoryI } from "../interfaces/CoinageFactoryI.sol";

contract CoinageFactory2 is CoinageFactoryI {
  address public seigManager;

  function deploy() external returns (address) {
    require(seigManager != address(0), "SeigManager address is zero");
    SeigCoinageToken c = new SeigCoinageToken();

    c.transferOwnership(seigManager);

    return address(c);
  }

  function setSeigManager(address seigManager_) external {
    seigManager = seigManager_;
  }
}
