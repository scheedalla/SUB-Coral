// Social Directive
// This directive controls the social share button actions.  Twitter, facebook, google plus.

angular.module('socialApp.directives',[])

//Creates FB Like
.directive('fbLike', function ($window,$rootScope,$compile) {
          return {
              restrict: 'A',
              link: function(scope, element, attrs) {
                  if(!$window.FB) {
                    // Load Facebook SDK
                    $.getScript('//connect.facebook.net/en_US/sdk.js', function() {
                        $window.FB.init({
                            appId: "274964949368857",
                            xfbml: true,
                            version: 'v2.1'
                        });
                        renderLikeButton();
                    });
                  } else {
                      renderLikeButton();
                  }

                  scope.openFBShareWindow = function(){
                    $window.open("https://www.facebook.com/sharer/sharer.php?u="+ attrs.shareUrl, "","left=20, width=500, height=400");

                  }
                 
                  function renderLikeButton() {
	              	  element.html('<a ng-click="openFBShareWindow()" href="#"><i style="color: #3b5998" class="fa fa-facebook-square fa-3x"></i></a>');
	                  $compile(element.contents())(scope);
                  }

                  scope.customShare = function customShare() {
				    $window.FB.ui({
				      method: 'share',
				      href: attrs.shareUrl,
				    }, function(response){
				    });
				  }
              }
          };
      }
  )

//Tweets Form
 .directive('tweet', [
      '$window', '$compile', function($window,$compile) {
          return {
              restrict: 'A',
              scope: {
                  tweet: '='
              },
              link: function(scope, element, attrs) {
                  if(!$window.twttr) {
                      // Load Twitter SDK
                      $.getScript('//platform.twitter.com/widgets.js', function() {
                        renderTweetButton();
                      });
                  } else {
                      renderTweetButton();
                  }

                  scope.openTwitterShareWindow = function(){
                    $window.open("https://twitter.com/share?url="+ attrs.shareUrl, "","left=20, width=500, height=400");

                  }

                  function renderTweetButton() {
                    element.html('<a ng-click="openTwitterShareWindow()" data-text="I just did something cool." href="#"><i style="color: #4099FF" class="fa fa-twitter-square fa-3x"></i></a>');
                    $compile(element.contents())(scope);
                    $window.twttr.widgets.load(element.parent()[0]);
                      
                  }
              }
          };
      }
  ])

//Google Pluses form?
 .directive('googlePlus', [
      '$window', '$compile', function($window, $compile) {
          return {
              restrict: 'A',
              link: function(scope, element, attrs) {
                  if(!$window.gapi) {
                      // Load Google SDK
                      $.getScript('//apis.google.com/js/platform.js', function() {
                          renderPlusButton();
                      });
                  } else {
                      renderPlusButton();
                  }

                  scope.openGoogleShareWindow = function(){                    
                    $window.open("https://plus.google.com/share?url="+ attrs.shareUrl, "","left=20, width=500, height=400");

                  }
                   
                  function renderPlusButton() {
                      element.html('<a ng-click="openGoogleShareWindow()" href="#"><i style="color: #d34836" class="fa fa-google-plus-square fa-3x"></i></a>');
                      $compile(element.contents())(scope);                      
                      $window.gapi.plusone.go(element.parent()[0]);
                      
                  }
              }
          };
      }
  ]);