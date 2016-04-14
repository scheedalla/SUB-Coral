// Profile Directive
// This Directive checks for a unique username and email on register.

angular.module('profile.directives', [])

//???
.directive('errSrc', function() {
  return {
    link: function(scope, element, attrs) {
      element.bind('error', function() {
        element.attr('src', attrs.errSrc);
      });
    }
  }
})

//Make sure user registers a unique user name
.directive('uniqueUsername', ['$http', function($http){
	return{
		require:'ngModel',
		link: function(scope,elem,attrs,ctrl){
			scope.$watch(attrs.ngModel, function(value){
				ctrl.$setValidity('isTaken', true);
				ctrl.$setValidity('invalidChars', true);

				if(!value){
					// don't send undefined to the server during dirty check
          			// empty username is caught by required directive
					return;
				}
				
				$http.post('/check/username', {username:value})
				.success(function(data){
					//do nothing
				})
				.error(function(data){
					if(data.isTaken){
						ctrl.$setValidity('isTaken', false);
					} else if (data.invalidChars) {
              			ctrl.$setValidity('invalidChars', false);

            }
				});
			})
		}
	}

}])

//Make sure user registers a unique Email Address
.directive('uniqueEmail', ['$http', '$sce', function($http, $sce){
	return{
		require:'ngModel',
		link: function(scope,elem,attrs,ctrl){
			scope.$watch(attrs.ngModel, function(value){
				ctrl.$setValidity('isTaken', true);

				if(!value){
					// don't send undefined to the server during dirty check
          			// empty username is caught by required directive
					return;
				}
				
				$http.post('/check/email', {email:value})
				.success(function(data){
					//do nothing
				})
				.error(function(data){
					if(data.isTaken){
						ctrl.$setValidity('isTaken', false);
					} else if(data.isSpecialDomain){
						console.log("is special domain")
						ctrl.$setValidity('isSpecialDomain', false);
						scope.specialDomain = data.specialDomain;
						scope.redirectMessage = $sce.trustAsHtml(data.redirectMessage);
					}
				});
			})
		}
	}

}])

//???
.directive('match', [function () {
  return {
    require: 'ngModel',
    link: function (scope, elem, attrs, ctrl) {
    	

      scope.$watch('[' + attrs.ngModel + ', ' + attrs.match + ']', function(value){
      	
        ctrl.$setValidity('match', value[0] === value[1] );
      }, true);

    }
  }
}]);