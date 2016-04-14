'use strict';

// Declare app level module which depends on filters, and services
angular.module('pupApp', [    
  'pupApp.directives',
  'pupApp.controllers',		
  'hostedApp.directives',
  'imgEditor.directives',
]).config(function($httpProvider){
        $httpProvider.interceptors.push(function($q, $rootScope) {
                return {
                    'request': function(config) {
                        $rootScope.$broadcast('loading-started');
                        return config || $q.when(config);
                    },
                    'response': function(response) {
                        $rootScope.$broadcast('loading-complete');
                        return response || $q.when(response);
                    }
                };
            });

    });