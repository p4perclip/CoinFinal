const CoinToss = artifacts.require("CoinToss");
const Ownable = artifacts.require("Ownable");
const Destroyable = artifacts.require("Destroyable");
const truffleAssert = require('truffle-assertions');
const safemath = require('safemath');
const ethers = require('ethers');
const { before } = require("lodash");

contract("CoinToss", async function([accounts,uAddress,owner]){



      const contract_balance = web3.utils.toWei("1", 'ether');
      const contract_balance0 = web3.utils.toWei("0", 'ether');
      const contract_balance2 = web3.utils.toWei("2", 'ether');
      const value = web3.utils.toWei("1", 'ether');
      const toss_value = web3.utils.toWei('0.05', 'ether');
      const toss_value0 = web3.utils.toWei("0", 'ether');
      const toss_value2 = web3.utils.toWei("1", 'ether');
      const toss_min = web3.utils.toWei("0.1", 'ether');
      const sc_addr = accounts[0];
      const wallet1 = accounts[0];
      const wallet2 = accounts[1];
      const revert_error = "Returned error: VM Exception while processing transaction: revert";



    describe('Contract functions and security', async () =>{
      let balanceBefore;
      let balanceAfter;
      let instance;

      beforeEach('New instance', async() =>{
        CoinTossInstance = await CoinToss.new({from: owner, value: contract_balance});
      });
      afterEach('Destroy the contract to get back funds', async() =>{
        await truffleAssert.passes(CoinTossInstance.close({from: owner}),
          "Destruction of contract failed");
      });


      it("Bet should be not more then contract balance", async()=>{
        let instance = await CoinToss.new({from: owner, value: contract_balance});
        let initial_value = await instance.getBalance();
        assert.equal(initial_value.toString(), contract_balance.toString(),"Contract isn't initiated with correct value");
      });
      it("Only owner can fund contract", async()=>{
        let instance = await CoinToss.new({from: owner, value: contract_balance});
        await truffleAssert.passes(instance.fund({from: owner, value: value}),
        "You are not owner");
      });
      it("Owner should be account[0]", async()=>{
        let instance = await CoinToss.new({from: owner, value: contract_balance});
        assert(sc_addr == wallet1, "This is not a Owner");
      });
      it("Only owner can destroy contract", async()=>{
        let instance = await CoinToss.new({from: owner, value: contract_balance});
        await truffleAssert.passes(instance.close({from: owner}),
        "Destruction of contract Failed");
      });
      it("Only owner can withdraw all balance", async()=>{
        let instance = await CoinToss.new({from: owner, value: contract_balance});
        await truffleAssert.passes(instance.withdrawAll({from: owner}),
        "You are not the owner");
      });
      it("You shoudn't be able to withdraw if balance is 0", async()=>{
        let instance = await CoinToss.new({from: uAddress, value: contract_balance0});
        truffleAssert.fails(instance.withdrawUserBalance({from: uAddress}));
      });
      it("You should be able to add to your balance", async () =>{
        let instance = await CoinToss.new({from: owner, value: contract_balance});
        await instance.addPlayerFunds({value: web3.utils.toWei("1", "ether"), from: uAddress});
      });
    });

  describe("User interaction", async () => {

    beforeEach('New contract for each test', async() =>{
      CoinTossInstance = await CoinToss.new({from: owner, value: contract_balance});
      balanceBefore = await web3.eth.getBalance(owner);
      await CoinTossInstance.addPlayerFunds({value: web3.utils.toWei("1", "ether"), from: owner});
      balanceAfter = await web3.eth.getBalance(owner);
    });
    afterEach('Destroy the contract to get back funds', async() =>{
      await truffleAssert.passes(CoinTossInstance.close({from: owner}),
        "Destruction of contract failed");
    });
    it("Should set contract balance to 0 after withdrawal", async()=>{
      const accBalBefore = await web3.eth.getBalance(owner);
      let balBefore = await web3.eth.getBalance(CoinTossInstance.address);
      let result = await CoinTossInstance.withdrawAll({from: owner});
      const accBalAfter = await web3.eth.getBalance(owner);
      let balAfter = await web3.eth.getBalance(CoinTossInstance.address);
      let tx_price = await web3.eth.getTransaction(result.tx);
      let gas_price = result.receipt.gasUsed * tx_price.gasPrice;

      const diff_value = safemath.safeSub(parseInt(balBefore) , parseInt(balAfter)); - parseInt(gas_price);
      const balExp = parseInt(accBalBefore) + parseInt(diff_value);
      assert.equal(parseInt(accBalBefore).toString(),balExp.toString(),
      "Value should be equal between old and new value");
    });
  });
});


// TODO sort bet events and tests
  //   describe("Contract bet function and events", async () => {
  //
  //     beforeEach('New contract for each test', async() =>{
  //     CoinTossInstance = await CoinToss.new({from: owner, value: contract_balance});
  //   });
  //   afterEach('Destroy the contract to get back funds', async() =>{
  //     await truffleAssert.passes(CoinTossInstance.close({from: owner}),
  //       "Destruction of contract failed");
  //   });
  //
  //   it("Bet should be biger then 0.1 ether", async()=>{
  //     await truffleAssert.fails(CoinTossInstance.bet((toss_min), {from: uAddress, gas: 700000}),
  //     revert_error);
  //   });
  //
  //   it("Bet should failed when no bet value", async()=>{
  //       await truffleAssert.fails(CoinTossInstance.bet((0),{from: uAddress, gas: 700000}),
  //       revert_error);
  //   });
  //
  //   it("Contract should emit LogNewProvableQuery", async()=>{
  //     await truffleAssert.eventEmitted(result, 'LogNewProvableQuery',(ev) =>{
  //       return ev.description, ev.queryId;}, 'LogNewProvableQuery should be emited');
  //   });
  //
  //   it("Contract should emit PlayerDepositDone", async()=>{
  //     await truffleAssert.eventEmitted(result, 'PlayerDepositDone',(ev) =>{
  //       return ev.fromAcc, ev.newBal;}, 'PlayerDepositDone should be emited');
  //   });
  //
  //   it("Contract should emit GeneratedNumber", async()=>{
  //     await truffleAssert.passes(CoinTossInstance.bet((toss_value), {from:wallet1}));
  //     try {
  //       let result = await CoinTossInstance.__callback();
  //       await truffleAssert.eventEmitted(result, 'GeneratedNumber', (ev) =>{
  //         return ev.result;}, 'GeneratedNumber should be emited');
  //       }  catch {
  //         console.log("Cant catch emit");
  //     }
  //   });
  //
  //
  // // change to get values from TestCoinToss and feed in to bet function such as value result _callback queryId
  // // then it should work fine with the big numbers
  //       it("After flip balance should increase and decrease", async()=>{
  //         const amount_bet = toss_value;
  //         const initial_value = await web3.eth.getBalance(uAddress);
  //         let number;
  //         try{
  //           let result = await CoinTossInstance.bet((amount_bet), {from: uAddress, gas: 70000});
  //           try {
  //             truffleAssert.eventEmitted(result, 'GeneratedNumber', (ev) => {
  //               number = ev[0];
  //               return number;});
  //             } catch{
  //               console.log("Cant catch this");
  //             }
  //           } catch {
  //             console.log("...")
  //           }
  //         let rst = 0;
  //         (number == 1) ? rst = (amount_bet * 2 ) : rst = -amount_bet;
  //     // not reading events as a numbers
  //         const initial_value2 = ethers.utils.parseEther(initial_value) - ethers.utils.parseEther(rst);
  //         const current_value = await web3.eth.getBalance(uAddress);
  //         const current_value2 = ethers.utils.parseEther(current_value);
  //         //assert.equal(parseInt(initial_value), safemath.safeSub(parseInt(current_value) , rst), "Value of user balance is not equal to result of flip");
  //         assert.equal(ethers.utils.parseEther(current_value2).toString(), ethers.utils.parseEther(initial_value2).toString() , "Balance is not equal to initial value minus result of flip");
  //       });
  //     });
  //   describe("User interaction", async () => {
  //
  //     beforeEach('New contract for each test', async() =>{
  //     CoinTossInstance = await CoinToss.new({from: uAddress, value: contract_balance});
  //   });
  //   afterEach('Destroy the contract to get back funds', async() =>{
  //     await truffleAssert.passes(CoinTossInstance.close({from: uAddress}),
  //       "Destruction of contract failed");
  //   });
  // });
