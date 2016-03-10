(function() {
  'use strict';

  angular.module('etherSpinner', [
    'ngRoute',
    'chart.js'
  ]).
  config(['$routeProvider', function($routeProvider) {
    $routeProvider.otherwise({redirectTo: '/'});
  }]);
})();
