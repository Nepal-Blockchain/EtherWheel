(function() {
  'use strict';

  angular.module('ether-spinner', [
    'ngRoute',
    'rzModule',
    'oitozero.ngSweetAlert'
  ]).
  config(['$routeProvider', function($routeProvider) {
    $routeProvider.otherwise({redirectTo: '/'});
  }]);
})();
