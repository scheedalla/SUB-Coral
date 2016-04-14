// 'use strict';

// Admin app level module directives and controller dependencies.
angular.module('admin', [
		'admin.controllers',
		'admin.directives'
	])
	.config(function($locationProvider){
		// $locationProvider.html5Mode(true);
	})
;
