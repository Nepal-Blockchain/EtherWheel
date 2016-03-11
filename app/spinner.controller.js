(function() {
  'use strict';

  angular.module('ether-spinner').controller('SpinnerCtrl', SpinnerCtrl);

  /*@ngInject*/
  function SpinnerCtrl($route, $scope, ethereum) {
    var vm = this;
    vm.isConnected = ethereum.isConnected;

    var emptyBarColour = '#dae4e7';
    var contractAddress = '0xaCD9e1e68622285Cc3d339D04b76BA7acEE6FC1C';
    var contract = null;

    var chart;
    var stakeholdersData;
    var emptyDataSlot = {
      value: 5.0,
      color: emptyBarColour,
      label: "Empty"
    };

    activate();

    ///////////////////

    function activate() {
      createChart();
      if(!ethereum.isConnected()) { return; }

      var abi = [{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"stakes","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"stakeholders","outputs":[{"name":"","type":"address"}],"type":"function"},{"constant":true,"inputs":[],"name":"goal","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[],"name":"refundStake","outputs":[],"type":"function"},{"constant":false,"inputs":[],"name":"destroy","outputs":[],"type":"function"},{"constant":true,"inputs":[],"name":"increment","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[],"name":"numStakeholders","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[{"name":"rejectPartialBets","type":"bool"}],"name":"buyStake","outputs":[],"type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"recentWins","outputs":[{"name":"winner","type":"address"},{"name":"timestamp","type":"uint256"},{"name":"stake","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[],"name":"host","outputs":[{"name":"","type":"address"}],"type":"function"},{"inputs":[{"name":"_goalInFinney","type":"uint256"},{"name":"_incrementInFinney","type":"uint256"},{"name":"_recentWinsCount","type":"uint8"}],"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"winner","type":"address"},{"indexed":false,"name":"timestamp","type":"uint256"},{"indexed":false,"name":"stake","type":"uint256"}],"name":"Won","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"stakeholder","type":"address"}],"name":"ChangedStake","type":"event"}];
      var contractBlueprint = ethereum.web3.eth.contract(abi);
      contract = contractBlueprint.at(contractAddress);

      vm.goal = ethereum.web3.fromWei(contract.goal(), 'ether').toString();
      vm.sliderStep = ethereum.web3.fromWei(contract.increment(), 'ether').toString();
      vm.onSliderChanged = onSliderChanged;
      emptyDataSlot.value = vm.goal;

      vm.accounts = ethereum.web3.eth.accounts;
      vm.selectedAccount = ethereum.web3.eth.defaultAccount;
      if(!vm.selectedAccount) {
        vm.selectedAccount = ethereum.web3.eth.coinbase;
      }

      initializeStakeholdersData();
      updateStakes();
      updateBalance();
      updateRecentResults();

      var onStakeChangedEvent = contract.ChangedStake();
      onStakeChangedEvent.watch(onStakeChanged);

      var onWonEvent = contract.Won();
      onWonEvent.watch(onWon);
    }

    function createChart() {
      var startingData = [emptyDataSlot];

      var chartOptions = {
        animationEasing: 'easeInOut',
        segmentStrokeWidth: 3,
        animationSteps: 20,
        segmentStrokeColor: '#EBF0F1',
        percentageInnerCutout: 75,
        responsive: true,
        tooltipTemplate: function(valueObject) {
          var tooltip = valueObject.label + ": " + valueObject.value + " Ξ";
          if(!!vm.goal) {
            tooltip += " (" + (valueObject.value / vm.goal * 100) + "%)";
          }
          return tooltip;
        }
      };

      var ctx = document.getElementById("wheel").getContext("2d");
      chart = new Chart(ctx).Doughnut(startingData, chartOptions);
    }

    function updateBalance() {
      if(!ethereum.isConnected()) { return; }

      var wei = ethereum.web3.eth.getBalance(contractAddress);
      var ether = ethereum.web3.fromWei(wei, 'ether');
      vm.balance = parseFloat(ether.toString());
      chart.segments[chart.segments.length - 1].value = (vm.goal - vm.balance);
      chart.update();
    }

    function updateStakes() {
      if(!ethereum.isConnected()) { return; }
      vm.currentStakes = ethereum.web3.fromWei(contract.stakes(vm.selectedAccount), 'ether').toString();
      vm.desiredStakes = vm.currentStakes;
    }

    function initializeStakeholdersData() {
      if(!ethereum.isConnected()) { return; }

      chart.removeData();
      stakeholdersData = {};
      var numStakeholders = contract.numStakeholders();
      for(var i = 0; i < numStakeholders; ++i) {
        var stakeholderAddress = contract.stakeholders(i).toString();
        stakeholdersData[stakeholderAddress] = {
          label: stakeholderAddress,
          value: ethereum.web3.fromWei(contract.stakes(stakeholderAddress), 'ether'),
          color: (stakeholderAddress === vm.selectedAccount) ? '#C99D66' : '#3D3E3F',
          index: i
        };

        chart.addData(stakeholdersData[stakeholderAddress]);
      }

      chart.addData(emptyDataSlot);
      chart.update();
    }

    function updateRecentResults() {
      if(!ethereum.isConnected()) { return; }
    }

    function onStakeChanged(error, result) {
      // TODO: Check if desired contribution needs to be reduced

      if(!error) {
        var stakeholderAddress = result.args.stakeholder.toString();
        var value = ethereum.web3.fromWei(contract.stakes(stakeholderAddress), 'ether');
        if(stakeholderAddress in stakeholdersData) {
          chart.segments[stakeholdersData[stakeholderAddress].index].value = value;
        } else {
          var index = Object.keys(stakeholdersData).lengthupd;
          stakeholdersData[stakeholderAddress] = {
            label: stakeholderAddress,
            value: value,
            color: (stakeholderAddress === vm.selectedAccount) ? '#C99D66' : '#3D3E3F',
            index: index
          };
          chart.addData(stakeholdersData[stakeholderAddress], index);
        }

        chart.update();
      }

      updateBalance();
      updateStakes();
      $scope.$apply();
    }

    function onWon(error, result) {
      updateBalance();
      updateStakes();
      updateRecentResults();
      $scope.$apply();
    }

    function onSliderChanged(sliderId, modelValue) {
      chart.segments[stakeholdersData[vm.selectedAccount.toString()].index].value = modelValue;
      chart.update();
    }

    function reloadPage() {
      $route.reload();
    }
  }
})();
