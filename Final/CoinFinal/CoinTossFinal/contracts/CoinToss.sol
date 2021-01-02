pragma solidity 0.5.12;

import "./Ownable.sol";
import "./Destroyable.sol";
import "./provableAPI.sol";
import "./SafeMath.sol";

contract CoinToss is Ownable, usingProvable, Destroyable {

  using SafeMath for uint256;

  uint256 public balance;

  modifier betFunding(uint256 minAmount){
    require(msg.value >= minAmount,"Not enough ETH sent!");
        _;
    }

  modifier contractFunding(uint256 minAmount){
    require(msg.value >= minAmount,"Not enough ETH sent!");
        _;
    }
//@State of game
  struct State {
    address payable player;
    uint256 value;
    uint256 result;
    bytes32 queryId;
  }
  //@Information about player
  struct Play {
    address payable uAddress;
    uint256 uBalance;
    bool inGame;
  }

  uint256 public constant MAX_INT_FROM_BYTE = 256;
  uint256 public constant NUM_RANDOM_BYTES_REQUESTED = 1;

  mapping(bytes32 => State) public stateInfo;
  mapping(address => Play) public playInfo;

  event PlayerDepositDone(address fromAcc, uint256 newBal);
  event BalanceBefore (uint256 balBef);
  event PlayPlaced(address indexed player, bytes32 indexed _queryId, uint256 value);
  event LogNewProvableQuery(string description, bytes32 _queryId);
  event callBackFailed(string description);
  event callBackPassed(bytes32 _queryId, uint8 result);
  event BalanceAfter(uint256 balAft);
  event GeneratedNumber(uint256 result);
  event Withdrawn(address toAcc, uint256 amount);
  event DepositDone(address fromAcc,uint256 amount);
  event ContractBalWithdrawn(address toAcc, uint256 amount);

  constructor() payable public {
     provable_setProof(proofType_Ledger);
     }
//@Add funds and create Play struct
  function addPlayerFunds() public payable betFunding (0.1 ether) {
    require (msg.value <= balance, "Wait for contract funding");
    Play memory newPlay;
    newPlay.uAddress = msg.sender;
    newPlay.uBalance = playInfo[msg.sender].uBalance;
    newPlay.inGame = playInfo[msg.sender].inGame;
    playInfo[msg.sender] = newPlay;
    playInfo[msg.sender].uBalance += msg.value;
    emit PlayerDepositDone(playInfo[msg.sender].uAddress, playInfo[msg.sender].uBalance);
  }
//@Put value and initiate bet after checks
  function bet(uint256 value) public {
    uint256 qPrice = provable_getPrice("Random");
    require(playInfo[msg.sender].uBalance > value + qPrice, "Increase user balance");
    require(playInfo[msg.sender].inGame == false, "Wait for function to process");
    playInfo[msg.sender].inGame = true;

    uint256 balBefore = playInfo[msg.sender].uBalance;
    emit BalanceBefore(balBefore);
    uint256 yfvalue = value + qPrice;
    playInfo[msg.sender].uBalance = playInfo[msg.sender].uBalance.sub(yfvalue);
    balance = balance.add(yfvalue);



    oracleRandom(msg.sender, value);
  }
  //@Request number and create State struct
   function oracleRandom(address payable player, uint256 value) public payable {

     uint256 QUERY_EXECUTION_DELAY = 0;
     uint256 GAS_FOR_CALLBACK = 200000;
     // bytes32 _queryId = testRandom();
      bytes32 _queryId = provable_newRandomDSQuery(
            QUERY_EXECUTION_DELAY,
            NUM_RANDOM_BYTES_REQUESTED,
            GAS_FOR_CALLBACK
     );

    State memory newState;
    newState.player = msg.sender;
    newState.value = value;
    newState.result;
    newState.queryId = _queryId;

    stateInfo[_queryId] = newState;

    emit PlayPlaced(player, _queryId, newState.value);
    emit LogNewProvableQuery("Provable query was sent, standing by for the answer...", _queryId);
   }
//@Call back with random number from infura.io
  function __callback(bytes32 _queryId,string memory _result,bytes memory _proof) public {
    require(msg.sender == provable_cbAddress());

    if (provable_randomDS_proofVerify__returnCode(
                _queryId,
                _result,
                _proof
            ) != 0
        ) {
            emit callBackFailed("Callback failed");
        } else {


    uint256 firstResult = uint256(keccak256(abi.encodePacked(_result)));
    uint8 result = uint8(firstResult.mod(2));
    stateInfo[_queryId].result = result;
    processResult(result, _queryId);
    emit callBackPassed(_queryId, result);
    delete stateInfo[_queryId];
  }
}
//@Processing result of the game
  function processResult(uint8 result, bytes32 _queryId) public {

    address payable _player = stateInfo[_queryId].player;
    playInfo[_player].inGame = false;
    uint256 _value = stateInfo[_queryId].value;
    uint256 payout = _value.mul(2);

    if (result == 1){
      playInfo[_player].uBalance = playInfo[_player].uBalance.add(payout);
      balance.sub(payout);
      assert(result == 0 || result == 1);
    } else {
      assert(result == 0 || result == 1);
    }

    uint256 balAfter = playInfo[_player].uBalance;
    emit BalanceAfter(balAfter);
    emit GeneratedNumber(result);
  }
  //@Only for testing
  function reset() public onlyOwner returns (bool){
    playInfo[msg.sender].inGame = false;
  }
  //@Balance of contract by default
  function getBalance() public view returns (uint256){
    return address(this).balance;
  }
  //@Balance of user, saved in Play struct
  function getUserBalance() public view returns (uint256){
    return playInfo[msg.sender].uBalance;
  }
  //@Withdraw all user Balance from Smart Contract
  function withdrawUserBalance() public returns (uint256){
    require(playInfo[msg.sender].inGame == false);
    require(playInfo[msg.sender].uBalance > 0, "Nothing to withdraw.");
    uint256 u = playInfo[msg.sender].uBalance;
    playInfo[msg.sender].uBalance = 0;
    msg.sender.transfer(u);
    emit Withdrawn(msg.sender, u);
  }
  //@Fund initial balance
  function fund() public payable onlyOwner contractFunding (0.5 ether){
    balance += msg.value;
    emit DepositDone(owner, msg.value);
  }
  //@Withdraw all contact balance
  function withdrawAll() public onlyOwner returns (uint256){
    uint256 toTransfer = balance;
    balance = 0;
    msg.sender.transfer(toTransfer);
    emit ContractBalWithdrawn(owner, toTransfer);
  }
//@Only for testing
  // function testRandom() private returns (bytes32){
  //   bytes32 _queryId = bytes32(keccak256(abi.encodePacked(msg.sender)));
  //   __callback(_queryId, "1", bytes("test"));
  //   emit LogNewProvableQuery("Provable query was sent, standing by for the answer...", _queryId);
  //   return _queryId;
  // }
  // function testRandom() private view returns (uint8) {
	// 	uint256 firstRes = uint256(keccak256(abi.encodePacked()));
	// 	uint8 result = uint8(firstRes.mod(251));
	// 	return result;
  //   }
}
