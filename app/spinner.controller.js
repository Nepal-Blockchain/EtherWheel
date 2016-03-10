(function() {
  'use strict';

  angular.module('ether-spinner').controller('SpinnerCtrl', SpinnerCtrl);

  /*@ngInject*/
  function SpinnerCtrl($route, $scope, ethereum) {
    var vm = this;
    vm.isConnected = ethereum.isConnected;
    $scope.labels = ["Some", "Demo", "Data"];
    $scope.data = [300, 500, 100];

    var contractAddress = '0xaCD9e1e68622285Cc3d339D04b76BA7acEE6FC1C';
    var contract = null;

    activate();

    ///////////////////

    function activate() {
      var abi = [{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"stakes","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"stakeholders","outputs":[{"name":"","type":"address"}],"type":"function"},{"constant":true,"inputs":[],"name":"goal","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[],"name":"refundStake","outputs":[],"type":"function"},{"constant":false,"inputs":[],"name":"destroy","outputs":[],"type":"function"},{"constant":true,"inputs":[],"name":"increment","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[],"name":"numStakeholders","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[{"name":"rejectPartialBets","type":"bool"}],"name":"buyStake","outputs":[],"type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"recentWins","outputs":[{"name":"winner","type":"address"},{"name":"timestamp","type":"uint256"},{"name":"stake","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[],"name":"host","outputs":[{"name":"","type":"address"}],"type":"function"},{"inputs":[{"name":"_goalInFinney","type":"uint256"},{"name":"_incrementInFinney","type":"uint256"},{"name":"_recentWinsCount","type":"uint8"}],"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"winner","type":"address"},{"indexed":false,"name":"timestamp","type":"uint256"},{"indexed":false,"name":"stake","type":"uint256"}],"name":"Won","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"stakeholder","type":"address"}],"name":"ChangedStake","type":"event"}];
      var contractBlueprint = ethereum.web3.eth.contract(abi);
      contract = contractBlueprint.at(contractAddress);
      updateBalance();

      var onStakeChanged = contract.ChangedStake(null, null, onStakeChanged);
    }

    function updateBalance() {
      if(!ethereum.isConnected()) { return; }

      var wei = ethereum.web3.eth.getBalance(contractAddress);
      var ether = ethereum.web3.fromWei(wei, 'ether');
      vm.balance = parseFloat(ether.toString());
    }

    function onStakeChanged(error, result) {
      console.log('stake changed');
      console.log(error);
      console.log(result);
      updateBalance();
    }

    function reloadPage() {
      $route.reload();
    }
  }
})();
