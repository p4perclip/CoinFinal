var web3 = new Web3(Web3.givenProvider);
var contractInstance;
var myAccount;
var userAccount;
var blockNumber;

$(document).ready(async function() {
  window.ethereum.autoRefreshOnNetworkChange = false;
    console.log("Ready");
    window.ethereum.enable().then(function(accounts){
      contractInstance = new web3.eth.Contract(abi, "0xdd53113115701Fe1ea167d64e9cC5e4698488Bd6", {from:accounts[0]});
      console.log(contractInstance);

      // This line is for separation owner / user accounts
      // Chnage for window.ethereum.on
      contractInstance.methods.owner().call().then(function(result){
        myAccount = accounts[0];
        userAccount = contractInstance.options.from;
      }).catch(function(error){
        notify("Destroy")
      });

      updateContractBalance();
      getBalances();
      getUserBalance();
    });

    $("#toss_button").click(bet);
    $("#fund_button").click(fund);
    $("#withdraw_button").click(withdrawAll);
    $("#press_to_destroy").click(destroy);
    $("#add_balance_button").click(addPlayerFunds);
    $("#withdrawBalance_button").click(withdrawUserBalance);
    $("#reset_button").click(reset);

});

function neatlyBalance(arg) {
  return web3.utils.fromWei(arg,"ether")+" ether";
}
function reset() {
  contractInstance.methods.reset().send()
  console.log("inGame = false");
}
function getBalances() {
  contractInstance.methods.getBalance().call().then(function(res) {
    var amount = neatlyBalance(res);
    console.log("Contract balance: "+amount);
    $("#balance_output").text(amount);
});
}
function getUserBalance(){
  contractInstance.methods.getUserBalance().call().then(function(res){
    var amount = neatlyBalance(res);
    console.log("User balance: "+amount);
    $("#user_balance_output").text(amount);
  });
}
async function updateContractBalance(){
  var contractBalance = await contractInstance.methods.getBalance().call();
  var balance = neatlyBalance(contractBalance);
  $("#balance_output").text(balance);
  return balance;
}
async function updateUserBalance(){
  var userBalance = await contractInstance.methods.getUserBalance().call();
  var ubalance = neatlyBalance(userBalance);
  $("#user_balance_output").text(ubalance);
  return ubalance;
}
async function bet() {
  var amount = $("#bet_size_input").val();
  $("#message").text("Sign your transaction...");
    contractInstance.methods.bet(web3.utils.toWei(amount,"ether")).send({gas : 1500000})
    .on("transactionHash",function(hash){
      $("#message").text("Coin tossed..... wait!");
      $("#coin_fliped").show();
      $("#big_win").hide();
      $("#big_loose").hide();
      console.log("Transaction hash: "+hash);
    })
    .on("receipt", function(receipt) {
      console.log("Transaction receipt:"+(receipt));
    })

    contractInstance.events.PlayPlaced(
    {fromBlock: blockNumber, toBlock: 'latest'}, async function (errorr, eventt){
      var msg = "You are now in the game";
      $("#message").text(msg);
    })
    .on('errorr', console.error);

    contractInstance.events.LogNewProvableQuery(
      {fromBlock: blockNumber, toBlock: 'latest'}, async function (erro, even){
        var msg = "Provable query was sent, standing by...";
        $("#message").text(msg);
    })
    .on('erro', console.error);

    contractInstance.events.callBackPassed(
    {fromBlock: blockNumber, toBlock: 'latest'}, async function (err, eve){
      var msg = "Waiting for responce";
      $("#message").text(msg);
    })
    .on('err', console.error);

    contractInstance.events.GeneratedNumber(
    {fromBlock: blockNumber, toBlock: 'latest'}, async function (error, event){
            // console.log("Received event:",event);
            var result = event.returnValues["result"];

                 var msg;
                 if (result == 1) {
                   msg = "You won: "+ (amount) + " Ether";
                   console.log("You won: "+(amount)+"Ether");
                   $("#big_win").show();
                   $("#coin_fliped").hide();
                   $("#big_loose").hide();
                 } else if (result == 0) {
                   msg = "You lost";
                   console.log("You lost");
                   $("#big_loose").show();
                   $("#coin_fliped").hide();
                   $("#big_win").hide();
                 } else {
                   console.log(error);
                 }

                 $("#message").text(msg);
                 getBalances();
                 getUserBalance()
            })
       .on('error', console.error);
       await updateUserBalance();
       await updateContractBalance();
      }
async function addPlayerFunds(){
  var amount = $("#add_balance_input").val();
  var config = {value:web3.utils.toWei( amount, "ether")}
 contractInstance.methods.addPlayerFunds().send(config)
 .on ("transactionHash", function( hash) {
  console.log (hash);
  $("#message").text("You added "+ amount +" ether to your balance");
})
  contractInstance.events.PlayerDepositDone(
  {fromBlock: blockNumber, toBlock: 'latest'}, function (error, event){
    var msg = "Deposit Succesful";
    $("#message").text(msg);
  })
  .on("error", console.error);
  await updateUserBalance();
  await updateContractBalance();
}
async function withdrawUserBalance(){
  contractInstance.methods.withdrawUserBalance().send()
  console.log("Withdraw All user Balance")
  $("#message").text("You withdraw all ether");
  // contractInstance.events.Withdrawn(
  // {fromBlock: blockNumber, toBlock: 'latest'}, function (error, event){
  //   var value = event.returnValues["u"];
  //   $("#message").text("You Withdrawn all user balance" ); //+ {value:web3.utils.toWei(parseInt(value).toString(),"ether").toString()}
  // })
  // .on("error", console.error);
  await updateUserBalance();
  await updateContractBalance();
}
async function withdrawAll(){
  contractInstance.methods.withdrawAll().send()
  console.log("Withdraw All Contract Balance")
  $("#message").text("You withdraw all ether");
  // contractInstance.events.ContractBalWithdrawn(
  // {fromBlock: blockNumber, toBlock: 'latest'}, function (error, event){
  //   var value = event.returnValues["toTransfer"];
  //   $("#message").text("You Withdrawn all balance" ); //+ {value:web3.utils.toWei(parseInt(value).toString(),"ether").toString()}
  // })
  // .on("error", console.error);
  await updateUserBalance();
  await updateContractBalance();
}
async function fund(){
  var amount = $("#add_balance_input").val();
  var config = {value: web3.utils.toWei(amount,"ether")};
 contractInstance.methods.fund().send(config)
 .on ("transactionHash", function( hash) {
  console.log (hash);
  $("#message").text("You added "+ amount + " ether to Contract Balance");
})
  contractInstance.events.DepositDone(
  {fromBlock: blockNumber, toBlock: 'latest'}, function (error, event){
    var msg = "Deposit Succesful";
    $("#message").text(msg);
})
.on("error", console.error);
await updateContractBalance();
}
function destroy(){
	contractInstance.methods.close().send()
  $("#destroy_alert").show();
}
