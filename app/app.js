(function() {
  'use strict';

  angular.module('ether-spinner', [
    'ngRoute',
    'rzModule'
  ]).
  config(['$routeProvider', function($routeProvider) {
    $routeProvider.otherwise({redirectTo: '/'});
  }]);
})();
