(function() {
  'use strict';

  angular.module('ether-spinner', [
    'ngRoute',
    'chart.js',
    'rzModule'
  ]).
  config(['$routeProvider', function($routeProvider) {
    $routeProvider.otherwise({redirectTo: '/'});
  }]);
})();
