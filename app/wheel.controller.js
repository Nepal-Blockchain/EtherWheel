(function() {
  'use strict';

  angular.module('ether-wheel').controller('WheelCtrl', WheelCtrl);

  /*@ngInject*/
  function WheelCtrl($route, $scope, SweetAlert, ethereum, Wheel) {
    var emptyBarColor = '#dce6e9';
    var emptyBarLabel = "Empty";
    var contractAddresses = ['0x53891ef3793d8534Ad42312BcC77dFAd51Bb5F1C', '0x27C0aFc960FbeaB1c6BbA6bE3837d40E948B2250', '0x1107BD232640434008b8ce1FD058837E141f754B'];
    var chart = null;

    var vm = this;

    vm.web3 = ethereum.web3;
    vm.moment = moment;
    vm.selectWheel = selectWheel;
    vm.getAccountBalance = getAccountBalance;
    vm.onAccountChanged = onAccountChanged;
    vm.setContribution = setContribution;
    vm.onSliderChanged = updateChartContributionPreview;

    activate();

    ///////////////////

    function activate() {
      vm.isConnected = ethereum.isConnected(); // Not using 2-way binding because for some reason it was DESTROYING performance. I'd like to look into this more later.
      if(!vm.isConnected) { return; }

      createChart();
      chart.addData({
        value: 1.0,
        color: emptyBarColor,
        label: emptyBarLabel
      });

      vm.wheels = [];
      contractAddresses.forEach(function(address) {
        var newWheel = new Wheel(address, onContributionChanged, onRoundEnded);
        vm.wheels.push(newWheel);
      });
      selectWheel(vm.wheels[0]);

      vm.accounts = ethereum.web3.eth.accounts;
      vm.selectedAccount = ethereum.web3.eth.defaultAccount;
      if(!vm.selectedAccount) {
        vm.selectedAccount = ethereum.web3.eth.coinbase;
      }
      onAccountChanged();
    }

    function createChart() {
      if(!!chart) { chart.destroy(); }

      var chartOptions = {
        animationEasing: 'easeInOut',
        segmentStrokeWidth: 3,
        animationSteps: 20,
        segmentStrokeColor: '#EBF0F1',
        percentageInnerCutout: 75,
        responsive: true,
        tooltipTemplate: getTooltipTemplate
      };

      function getTooltipTemplate(valueObject) {
        var name = (valueObject.label === vm.selectedAccount) ? 'You' : valueObject.label;
        var tooltip = name + ': ' + valueObject.value.toFixed(2) + ' Ξ';
        if(!!vm.goal) {
          var percentage = (valueObject.value / vm.goal * 100);
          tooltip += ' (' + Math.round(percentage * 100) / 100 + '%)'
        }
        return tooltip;
      }

      var ctx = document.getElementById("wheel").getContext("2d");
      chart = new Chart(ctx).Doughnut([], chartOptions);
    }

    function populateChart(wheel) {
      var contributorsData = wheel.contributorsData;
      for(var address in contributorsData)
      {
        var contributor = contributorsData[address];
        var chartData = {
          label: contributor.address,
          value: contributor.contribution,
          color: getChartColorForAccount(contributor.address)
        };

        chart.addData(chartData, contributor.index);
      }

      chart.addData({
        label: emptyBarLabel,
        color: emptyBarColor,
        value: (vm.selectedWheel.goal - vm.selectedWheel.getAdjustedBalance(vm.selectedAccount))
      });

      chart.update();
    }

    function updateChartEmptySlot() {
      chart.segments[chart.segments.length - 1].value = (vm.selectedWheel.goal - vm.selectedWheel.getAdjustedBalance(vm.selectedAccount));
      chart.update();
    }

    function updateChartContributionPreview() {
      var contributorsData = vm.selectedWheel.contributorsData;
      if(vm.selectedAccount in contributorsData) {
        var index = contributorsData[vm.selectedAccount].index;
        chart.segments[index].value = vm.selectedWheel.desiredContribution;

      } else {
        var index = Object.keys(contributorsData).length;
        vm.selectedWheel.addContributor(vm.selectedAccount, index);
        var data = {
          label: vm.selectedAccount,
          value: vm.selectedWheel.desiredContribution,
          color: getChartColorForAccount(vm.selectedAccount)
        };
        chart.addData(data, index - 2);
      }

      updateChartEmptySlot();
    }

    function getChartColorForAccount(account) {
      return (account === vm.selectedAccount) ? '#5cb85c' : '#3D3E3F';
    }

    function selectWheel(wheel) {
      if(vm.selectedWheel === wheel) { return; }

      vm.selectedWheel = wheel;
      vm.selectedWheel.desiredContribution = vm.selectedWheel.getContribution(vm.selectedAccount);
      createChart();
      populateChart(vm.selectedWheel);
      updateChartContributionPreview();
    }

    function setContribution() {
      vm.selectedWheel.setContribution(vm.selectedAccount, vm.selectedWheel.desiredContribution, onContributionSet);

      function onContributionSet(error, result) {
        if(error) {
          var errorMessage = error;
          errorMessage += "<br><br>Make sure you've unlocked your account to make transactions (e.g. using the --unlock command with geth). If you're having trouble, you can also set your contribution by sending ether directly to the wheel at:<br><code>" + vm.selectedWheel.address + "</code><br>(<i class=\"fa fa-lock\" style=\"font-size: 0.8em; margin-right: 2px;\"></i> <a href=\"https://live.ether.camp/account/" + vm.selectedWheel.address.substring(2) + "/contract\">view verified source code</a>)";

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

          vm.selectedWheel.desiredContribution = vm.selectedWheel.getContribution(vm.selectedAccount);
          chart.segments[vm.selectedWheel.contributorsData[vm.selectedAccount].index].value = vm.selectedWheel.getContribution(vm.selectedAccount);
          updateChartEmptySlot();
        }
      }
    }

    function getAccountBalance(account) {
      return ethereum.web3.fromWei(ethereum.web3.eth.getBalance(account), 'ether');
    }

    function onAccountChanged() {
      vm.wheels.forEach(function(wheel) {
        wheel.desiredContribution = wheel.getContribution(vm.selectedAccount);
      });

      createChart();
      populateChart(vm.selectedWheel);
    }

    function onContributionChanged(wheel, contributorAccount, newContribution, isNewContributor) {
      if(contributorAccount == vm.selectedAccount) {
        vm.selectedWheel.desiredContribution = newContribution;
      }

      if(wheel == vm.selectedWheel) {
        var contributorsData = vm.selectedWheel.contributorsData;
        var index = contributorsData[contributorAccount].index;

        if(isNewContributor) {
          var data = {
            label: contributorAccount,
            value: newContribution,
            color: getChartColorForAccount(contributorAccount)
          };
          chart.addData(data, index);
        } else {
          chart.segments[contributorsData[contributorAccount].index].value = newContribution;
        }

        updateChartEmptySlot();
      }

      $scope.$apply();
    }

    function onRoundEnded(wheel, winnerAddress) {
      vm.selectedWheel.desiredContribution = vm.selectedWheel.getContribution(vm.selectedAccount);
      $scope.$apply();
    }
  }
})();
