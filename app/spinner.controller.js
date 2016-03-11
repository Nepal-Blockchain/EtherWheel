(function() {
  'use strict';

  angular.module('ether-spinner').controller('SpinnerCtrl', SpinnerCtrl);

  /*@ngInject*/
  function SpinnerCtrl($route, $scope, ethereum) {
    var vm = this;
    vm.isConnected = ethereum.isConnected;

    var emptyBarColour = '#3D3E3F';
    vm.wheelLabels = ["Empty"];
    vm.wheelData = [5.0];
    vm.wheelColours = [emptyBarColour];

    var contractAddress = '0xaCD9e1e68622285Cc3d339D04b76BA7acEE6FC1C';
    var contract = null;

    activate();

    ///////////////////

    function activate() {
      if(!ethereum.isConnected()) { return; }

      var abi = [{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"stakes","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"stakeholders","outputs":[{"name":"","type":"address"}],"type":"function"},{"constant":true,"inputs":[],"name":"goal","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[],"name":"refundStake","outputs":[],"type":"function"},{"constant":false,"inputs":[],"name":"destroy","outputs":[],"type":"function"},{"constant":true,"inputs":[],"name":"increment","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[],"name":"numStakeholders","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[{"name":"rejectPartialBets","type":"bool"}],"name":"buyStake","outputs":[],"type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"recentWins","outputs":[{"name":"winner","type":"address"},{"name":"timestamp","type":"uint256"},{"name":"stake","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[],"name":"host","outputs":[{"name":"","type":"address"}],"type":"function"},{"inputs":[{"name":"_goalInFinney","type":"uint256"},{"name":"_incrementInFinney","type":"uint256"},{"name":"_recentWinsCount","type":"uint8"}],"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"winner","type":"address"},{"indexed":false,"name":"timestamp","type":"uint256"},{"indexed":false,"name":"stake","type":"uint256"}],"name":"Won","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"stakeholder","type":"address"}],"name":"ChangedStake","type":"event"}];
      var contractBlueprint = ethereum.web3.eth.contract(abi);
      contract = contractBlueprint.at(contractAddress);

      vm.goal = ethereum.web3.fromWei(contract.goal(), 'ether').toString();
      vm.sliderStep = ethereum.web3.fromWei(contract.increment(), 'ether').toString();
      vm.onSliderChanged = onSliderChanged;

      vm.accounts = ethereum.web3.eth.accounts;
      vm.selectedAccount = ethereum.web3.eth.defaultAccount;
      if(!vm.selectedAccount) {
        vm.selectedAccount = ethereum.web3.eth.coinbase;
      }

      updateStakes();
      updateBalance();
      updateChart();
      updateRecentResults();

      var onStakeChangedEvent = contract.ChangedStake();
      onStakeChangedEvent.watch(onStakeChanged);

      var onWonEvent = contract.Won();
      onWonEvent.watch(onWon);
    }

    function updateBalance() {
      if(!ethereum.isConnected()) { return; }

      var wei = ethereum.web3.eth.getBalance(contractAddress);
      var ether = ethereum.web3.fromWei(wei, 'ether');
      vm.balance = parseFloat(ether.toString());
    }

    function updateStakes() {
      if(!ethereum.isConnected()) { return; }
      vm.currentStakes = ethereum.web3.fromWei(contract.stakes(vm.selectedAccount), 'ether').toString();
      vm.desiredStakes = vm.currentStakes;
    }

    function updateChart() {
      if(!ethereum.isConnected()) { return; }

      vm.stakeIndices = {};
      vm.wheelLabels.length = 0;
      vm.wheelData.length = 0;
      vm.wheelColours.length = 0;

      var numStakeholders = contract.numStakeholders();
      for(var i = 0; i < numStakeholders; ++i) {
        var stakeholder = contract.stakeholders(i);
        vm.wheelLabels.push(stakeholder.toString());
        vm.wheelData.push(ethereum.web3.fromWei(contract.stakes(stakeholder), 'ether'));
        vm.wheelColours.push('#C99D66');
        vm.stakeIndices[stakeholder.toString()] = i;
      }

      vm.wheelLabels.push('Empty');
      vm.wheelData.push(ethereum.web3.fromWei(contract.goal() - ethereum.web3.eth.getBalance(contractAddress), 'ether'));
      vm.wheelColours.push(emptyBarColour);
    }

    function updateRecentResults() {
      if(!ethereum.isConnected()) { return; }
    }

    function onStakeChanged(error, result) {
      updateBalance();
      updateStakes();
      updateChart();
      $scope.$apply();
    }

    function onWon(error, result) {
      updateBalance();
      updateStakes();
      updateChart();
      updateRecentResults();
      $scope.$apply();
    }

    function onSliderChanged(sliderId, modelValue) {
      vm.wheelData[vm.stakeIndices[vm.selectedAccount.toString()]] = modelValue;
    }

    function reloadPage() {
      $route.reload();
    }
  }
})();
