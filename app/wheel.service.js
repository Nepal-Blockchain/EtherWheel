(function() {
  'use strict';

  angular.module('ether-wheel').factory('Wheel', WheelFactory);

  /* @ngInject */
  function WheelFactory(ethereum) {
    var abi = [{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"contributors","outputs":[{"name":"","type":"address"}],"type":"function"},{"constant":true,"inputs":[],"name":"goal","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"contributions","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[{"name":"newHost","type":"address"}],"name":"changeHost","outputs":[],"type":"function"},{"constant":false,"inputs":[],"name":"destroy","outputs":[],"type":"function"},{"constant":false,"inputs":[{"name":"amount","type":"uint256"}],"name":"setContribution","outputs":[],"type":"function"},{"constant":true,"inputs":[],"name":"numWinners","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[],"name":"numContributors","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[],"name":"addToContribution","outputs":[],"type":"function"},{"constant":true,"inputs":[],"name":"increment","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[{"name":"amount","type":"uint256"}],"name":"removeFromContribution","outputs":[],"type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"recentWins","outputs":[{"name":"winner","type":"address"},{"name":"timestamp","type":"uint256"},{"name":"contribution","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[],"name":"host","outputs":[{"name":"","type":"address"}],"type":"function"},{"inputs":[{"name":"_goalInFinney","type":"uint256"},{"name":"_incrementInFinney","type":"uint256"},{"name":"_recentWinsCount","type":"uint8"}],"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"winner","type":"address"},{"indexed":false,"name":"timestamp","type":"uint256"},{"indexed":false,"name":"contribution","type":"uint256"}],"name":"Won","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"contributor","type":"address"}],"name":"ChangedContribution","type":"event"}];

    var Wheel = function(contactAddress, contributionChangedCallback, roundEndedCallback) {
      this.address = contactAddress;
      this.contributionChangedCallback = contributionChangedCallback;
      this.roundEndedCallback = roundEndedCallback;

      var contractBlueprint = ethereum.web3.eth.contract(abi);
      this.contract = contractBlueprint.at(contactAddress);

      this.goal = ethereum.web3.fromWei(this.contract.goal(), 'ether').toString();
      this.increment = ethereum.web3.fromWei(this.contract.increment(), 'ether').toString();

      this.contributorsData = {};
      this.desiredContribution = 0;

      this.contract.ChangedContribution().watch(this.onContributionChanged.bind(this));
      this.contract.Won().watch(this.onWon.bind(this));

      this.initializeContributorsData();
      this.updateContractData();
      this.refreshRecentWinsList();
    }

    ///////////////////

    Wheel.prototype.updateContractData = function(){
      // Contract balance
      var wei = ethereum.web3.eth.getBalance(this.address);
      var ether = ethereum.web3.fromWei(wei, 'ether');
      this.balance = parseFloat(ether.toString());
    }

    Wheel.prototype.initializeContributorsData = function() {
      if(!ethereum.isConnected()) { return; }

      this.contributorsData = {};
      var numContributors = this.contract.numContributors().toString();
      for(var i = 0; i < numContributors; ++i) {
        var contributorAddress = this.contract.contributors(i).toString();
        this.addContributor(contributorAddress, i);
      }
    };

    Wheel.prototype.addContributor = function(address, index) {
      this.contributorsData[address] = {
        address: address,
        contribution: parseFloat(ethereum.web3.fromWei(this.contract.contributions(address), 'ether').toString()),
        index: index
      };
    }

    Wheel.prototype.refreshRecentWinsList = function() {
      this.recentWins = [];
      var numRecentWins = this.contract.numWinners();
      for(var i = 0; i < numRecentWins; ++i) {
        this.recentWins.push(this.contract.recentWins(i));
      }
    };

    Wheel.prototype.getContribution = function(account) {
      var currentContribution = 0;
      if(account in this.contributorsData) {
        currentContribution = this.contributorsData[account].contribution;
      }
      return currentContribution;
    };

    Wheel.prototype.getAdjustedBalance = function(account) {
      var deltaContribution = (this.desiredContribution - this.getContribution(account));
      return this.balance + deltaContribution;
    };

    Wheel.prototype.setContribution = function(account, value, callback) {
      var deltaContribution = ethereum.web3.toWei(value, 'ether') - ethereum.web3.toWei(this.getContribution(account), 'ether');
      var desiredContributionInWei = ethereum.web3.toWei(value, 'ether');
      var valueToSend = 0;
      if(deltaContribution > 0) {
        valueToSend = deltaContribution;
      }

      var callData = this.contract.setContribution.getData(desiredContributionInWei);
      var transaction = { value: valueToSend, from: account, to: this.address, data: callData };
      transaction.gas = ethereum.web3.eth.estimateGas(transaction) + 100000;
      this.contract.setContribution(desiredContributionInWei, transaction, callback);
    };

    Wheel.prototype.onContributionChanged = function(error, result) {
      if(error) {
        console.log(error);
        return;
      }

      var address = result.args.contributor;
      var newContribution = parseFloat(ethereum.web3.fromWei(this.contract.contributions(address), 'ether').toString());

      var isNewContributor = !(address in this.contributorsData);
      if(isNewContributor) {
        this.addContributor(address, newContribution);
      } else {
        this.contributorsData[address].contribution = newContribution;
      }

      this.updateContractData();

      if(!!this.contributionChangedCallback) {
        this.contributionChangedCallback(this, address, newContribution, isNewContributor);
      }
    };

    Wheel.prototype.onWon = function(error, result) {
      if(error) {
        console.log(error);
        return;
      }

      this.desiredContribution = 0;
      this.updateContractData();

      this.refreshRecentWinsList();
      if(!!this.roundEndedCallback) {
        this.roundEndedCallback(this, result.args.winner);
      }
    };

    ///////////////////

    return Wheel;
  }
})();
