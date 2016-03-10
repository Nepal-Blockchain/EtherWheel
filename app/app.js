(function() {
  'use strict';

  angular.module('ether-spinner', [
    'ngRoute',
    'chart.js'
  ]).
  config(['$routeProvider', function($routeProvider) {
    $routeProvider.otherwise({redirectTo: '/'});
  }]);
})();
