(function() {
  'use strict';

  angular.module('ether-wheel', [
    'ngRoute',
    'rzModule',
    'oitozero.ngSweetAlert',
    'angularMoment'
  ]).
  config(['$routeProvider', function($routeProvider) {
    $routeProvider.otherwise({redirectTo: '/'});
  }]);
})();
