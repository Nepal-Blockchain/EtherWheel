(function() {
  'use strict';

  angular.module('ether-wheel', [
    'ngRoute',
    'rzModule',
    'oitozero.ngSweetAlert',
    'angularMoment'
  ]).
  config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $routeProvider.otherwise({redirectTo: '/'});
    $locationProvider.html5Mode(true);
  }]);
})();
