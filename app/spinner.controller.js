(function() {
  'use strict';

  angular.module('ether-spinner').controller('SpinnerCtrl', SpinnerCtrl);

  /*@ngInject*/
  function SpinnerCtrl($route, $scope, SweetAlert, ethereum) {
    var vm = this;
    vm.isConnected = ethereum.isConnected;
    vm.setContribution = setContribution;
    vm.onAccountChanged = onAccountChanged;
    vm.getBalance = getBalance;
    vm.fromWei = ethereum.web3.fromWei;
    vm.moment = moment;

    var emptyBarColour = '#dce6e9';
    var contractAddress = '0x53891ef3793d8534Ad42312BcC77dFAd51Bb5F1C';
    var contract = null;

    var chart;
    var contributorsData;
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

      var abi = [{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"contributors","outputs":[{"name":"","type":"address"}],"type":"function"},{"constant":true,"inputs":[],"name":"goal","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"contributions","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[{"name":"newHost","type":"address"}],"name":"changeHost","outputs":[],"type":"function"},{"constant":false,"inputs":[],"name":"destroy","outputs":[],"type":"function"},{"constant":false,"inputs":[{"name":"amount","type":"uint256"}],"name":"setContribution","outputs":[],"type":"function"},{"constant":true,"inputs":[],"name":"numWinners","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[],"name":"numContributors","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[],"name":"addToContribution","outputs":[],"type":"function"},{"constant":true,"inputs":[],"name":"increment","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[{"name":"amount","type":"uint256"}],"name":"removeFromContribution","outputs":[],"type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"recentWins","outputs":[{"name":"winner","type":"address"},{"name":"timestamp","type":"uint256"},{"name":"contribution","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[],"name":"host","outputs":[{"name":"","type":"address"}],"type":"function"},{"inputs":[{"name":"_goalInFinney","type":"uint256"},{"name":"_incrementInFinney","type":"uint256"},{"name":"_recentWinsCount","type":"uint8"}],"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"winner","type":"address"},{"indexed":false,"name":"timestamp","type":"uint256"},{"indexed":false,"name":"contribution","type":"uint256"}],"name":"Won","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"contributor","type":"address"}],"name":"ChangedContribution","type":"event"}];
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

      initializeContributorsData();
      updateContributions();
      vm.desiredContribution = vm.currentContribution;

      updateBalance();
      updateNewBalance();
      updateRecentResults();

      var onContributionChangedEvent = contract.ChangedContribution();
      onContributionChangedEvent.watch(onContributionChanged);

      var onWonEvent = contract.Won();
      onWonEvent.watch(onWon);
    }

    function setContribution() {
      var deltaContribution = ethereum.web3.toWei(vm.desiredContribution, 'ether') - ethereum.web3.toWei(vm.currentContribution, 'ether');
      var desiredContributionInWei = ethereum.web3.toWei(vm.desiredContribution, 'ether');

      var valueToSend = 0;
      if(deltaContribution > 0) {
        valueToSend = deltaContribution;
      }

      var transaction = { value: valueToSend, from: vm.selectedAccount, to: contractAddress };
      transaction.gas = ethereum.web3.eth.estimateGas(transaction) + 100000;
      console.log(transaction.gas.toString());
      contract.setContribution(desiredContributionInWei, transaction, onContributionSet);

      function onContributionSet(error, result) {
        if(error) {
          var errorMessage = error;
          if(errorMessage.toString().indexOf('unlock signer account') >= 0) {
              errorMessage += "<br><br>Make sure you're accessing this page through the <a href=\"https://github.com/ethereum/mist/releases/tag/0.3.6\">early developer release</a> of Mist, the official Ethereum browser.";
          }

          SweetAlert.swal({
            title: "Error Setting Contribution",
            text: errorMessage,
            type: "error",
            html: true
          });
        } else {
          SweetAlert.swal({
            title: "Success!",
            text: "Your request has been successfully sent to the Ethereum network for processing. You'll see your account balance updated soon.<br><br><strong>This may take a minute or two</strong>.",
            type: "success",
            html: true
          })

          vm.desiredContribution = vm.currentContribution;
          chart.segments[contributorsData[vm.selectedAccount].index].value = vm.currentContribution;
          updateNewBalance();
        }
      }
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
          var name = (valueObject.label === vm.selectedAccount) ? 'You' : valueObject.label;
          var tooltip = name + ': ' + valueObject.value.toFixed(2) + ' Ξ';
          if(!!vm.goal) {
            var percentage = (valueObject.value / vm.goal * 100);
            tooltip += ' (' + Math.round(percentage * 100) / 100 + '%)'
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
    }

    function updateNewBalance() {
      var deltaContribution = (vm.desiredContribution - vm.currentContribution);
      vm.newBalance = vm.balance + deltaContribution;
      chart.segments[chart.segments.length - 1].value = (vm.goal - vm.newBalance);
      chart.update();
    }

    function updateContributions() {
      if(!ethereum.isConnected()) { return; }

      updateBalance();
      vm.currentContribution = parseFloat(ethereum.web3.fromWei(contract.contributions(vm.selectedAccount), 'ether').toString());
      vm.desiredContribution = Math.min(vm.desiredContribution, vm.goal - vm.balance + vm.currentContribution);
      updateNewBalance();
    }

    function initializeContributorsData() {
      if(!ethereum.isConnected()) { return; }

      chart.removeData();
      contributorsData = {};
      var numContributors = contract.numContributors();
      for(var i = 0; i < numContributors; ++i) {
        var contributorAddress = contract.contributors(i).toString();
        contributorsData[contributorAddress] = {
          label: contributorAddress,
          value: ethereum.web3.fromWei(contract.contributions(contributorAddress), 'ether'),
          color: (contributorAddress === vm.selectedAccount) ? '#5cb85c' : '#3D3E3F',
          index: i
        };

        chart.addData(contributorsData[contributorAddress]);
      }

      var currentAccount = vm.selectedAccount.toString();
      if(!(currentAccount in contributorsData)) {
        var index = Object.keys(contributorsData).length;
        contributorsData[currentAccount] = {
          label: currentAccount,
          value: 0,
          color: '#5cb85c',
          index: index
        };
        chart.addData(contributorsData[currentAccount], index);
      }

      chart.addData(emptyDataSlot);
      chart.update();
    }

    function updateRecentResults() {
      if(!ethereum.isConnected()) { return; }

      vm.recentWins = [];
      var numRecentWins = contract.numWinners();
      for(var i = 0; i < numRecentWins; ++i) {
        vm.recentWins.push(contract.recentWins(i));
      }
    }

    function onAccountChanged() {
      chart.destroy();
      createChart();
      initializeContributorsData();
      updateContributions();
      vm.desiredContribution = vm.currentContribution;

      updateBalance();
      updateNewBalance();
    }

    function onContributionChanged(error, result) {
      if(!error) {
        var contributorAddress = result.args.contributor.toString();
        var value = ethereum.web3.fromWei(contract.contributions(contributorAddress), 'ether');

        if(result.args.contributor == vm.selectedAccount) {
          updateContributions();
          vm.desiredContribution = vm.currentContribution;
        }

        if(contributorAddress in contributorsData) {
          chart.segments[contributorsData[contributorAddress].index].value = value;
        } else {
          var index = Object.keys(contributorsData).length;
          contributorsData[contributorAddress] = {
            label: contributorAddress,
            value: value,
            color: (contributorAddress === vm.selectedAccount) ? '#5cb85c' : '#3D3E3F',
            index: index
          };
          chart.addData(contributorsData[contributorAddress], index);
        }

        chart.update();
      }

      updateBalance();
      updateContributions();
      updateNewBalance();
      $scope.$apply();
    }

    function onWon(error, result) {
      chart.destroy();
      createChart();
      initializeContributorsData();
      updateContributions();

      updateBalance();
      updateNewBalance();
      updateRecentResults();
      $scope.$apply();
    }

    function onSliderChanged(sliderId, modelValue) {
      var currentAccount = vm.selectedAccount.toString();
      chart.segments[contributorsData[currentAccount].index].value = modelValue;
      updateNewBalance();
    }

    function getBalance(account) {
      if(!ethereum.isConnected()) { return; }
      return ethereum.web3.fromWei(ethereum.web3.eth.getBalance(account), 'ether');
    }
  }
})();
