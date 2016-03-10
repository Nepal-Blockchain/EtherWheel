(function() {
  'use strict';

  angular.module('etherSpinner').controller('SpinnerCtrl', SpinnerCtrl);

  /*@ngInject*/
  function SpinnerCtrl($scope) {
    var vm = this;
    $scope.labels = ["Some", "Demo", "Data"];
    $scope.data = [300, 500, 100];

    activate();

    ///////////////////

    function activate() {
      var web3 = new Web3();
      web3.setProvider(new web3.providers.HttpProvider("http://localhost:8545"));
      vm.provider = web3.currentProvider;
      vm.boop = 3;
    }
  }
})();
