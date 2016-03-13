(function() {
  'use strict';

  angular.module('ether-spinner', [
    'ngRoute',
    'rzModule',
    'oitozero.ngSweetAlert',
    'angularMoment'
  ]).
  config(['$routeProvider', function($routeProvider) {
    $routeProvider.otherwise({redirectTo: '/'});
  }]);
})();
