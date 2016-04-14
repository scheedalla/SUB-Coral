angular.module("subPlatformServices", ['ngResource'])
       .factory('subService', ["$resource", function($resource){
         return $resource('/:action/:id',
          {
            action:'@action'
          },
          {
            //gets
            getSingleSub:{
              method:'GET',
              params:{action:'sub'}
            },
            getSubs:{  //not being used anywhere currently
              method:'GET',
              params:{action:'subs'}
            },
            //deletes
            deleteSub:{
              method:'DELETE',
              params:{action:'sub'}
            },
            deleteAllSubs:{
              method:'DELETE',
              params:{action:'subs'}
            },    
            //insert new form        
            submitForm:{
              method:'POST',
              params:{action:'submission'}
            },
            //create empty submission to hold mediasets
            createEmptySubmission:{
              method: 'Post',
              params:{action:'createEmptySubmission'}
            },
            //updates
            updateSub:{
              method:'POST',
              params:{action:'updateSub'}
            },
            updateSubTags:{
              method:'POST',
              params:{action:'updateSubTags'}
            },
            bulkAddTags:{
              method:'POST',
              params:{action:'bulkAddSubTags'}
            },
            bulkRemoveTags:{
              method:'POST',
              params:{action:'bulkRemoveSubTags'}
            },
            bulkDeleteSubs:{
              method:'POST',
              params:{action:'bulkDeleteSubs'}
            },
            updateSubandMed:{
              method:'POST',
              params:{action:'updateSubAndMed'}
            },
            updatePupSub:{
              method:'POST',
              params:{action:'updatePupSub'}
            },
            updateEndUser:{
              method:'POST',
              params:{action:'updateEndUser'}
            },
            updateApproval:{
              method:'POST',
              params:{action:'updateApproval'}
            },
            saveSearch:{
              method:'POST',
              params:{action:'saveSearch'}
            },
            importSubs:{
              method:'POST',
              params:{action:'import'}
            }
          }
        );
       }])

       .factory('formService', ["$resource", function($resource){
         return $resource('/:action/:id',
          {
            action:'@action'
          },
            {
              //gets
            getForm:{
              method:'GET',
              params:{action:'form'}
            },
            getFormNames:{ //no idea where this is getting used, not in app.js
              method:'GET',
              params:{action:'appNames.json'}
            },
            //insert new form
            addForm:{
              method:'POST',
              params:{action:'form'}
            },
            //updates
            updateForm:{
              method:'POST',
              params:{action:'updateApp'}
            },
            //deletes
            deleteForm:{
              method:'DELETE',
              params:{action:'form'}
            },
            deleteCategoryFromForms:{
              method:'DELETE',
              params:{action:'categories'}
            }
          }
        );
       }])

       .factory('userService', ["$resource", function($resource){
         return $resource('/:action/:id',
          {
            action:'@action'
          },
          //gets
          {
            getUser:{  
              method:'GET',
              params:{action:'user'}
            },
            getUserForms:{
              method:'GET',
              params:{action:'userForms'}
            },
            getUserSubs:{ //not being used
              method:'GET',
              params:{action:'customerSubs.json'}
            },
            getAllUsers:{  
              method:'GET',
              params:{action:'users'}
            },
            //updates
            updateUserStatus:{
              method:'POST',
              params:{action:'updateUserStatus'}
            },
            updateUser:{
              method:'POST',
              params:{action:'updateUser'}
            },
            updateUserLastActiveDate:{
              method:'POST',
              params:{action:'updateUserLastActiveDate'}
            },
            //miscellaneous
            register:{
              method:'POST',
              params:{action:'register'}
            },
            checkUsername:{
              method:'POST',
              params:{action:'check', id:'username'}
            },
            checkEmail:{
              method:'POST',
              params:{action:'check', id:'email'}
            }
          }
        );
       }])

           .factory('acctService', ["$resource", function($resource){
         return $resource('/:action/:id',
          {
            action:'@action'
          },
          {
            getAcct:{
              method:'GET',
              params:{action:'account'}
            },
            getAcctForms:{
              method:'GET',
              params:{action:'accountForms'}
            },
            getAcctSubs:{
              method:'GET',
              params:{action:'accountSubs'}
            },
            updateAccount:{  
              method:'POST',
              params:{action:'updateAccount'}
            }
          }
        );
       }])

angular.module("loggingModuleServices", [])
   .factory( "subLogService", ["$log","$window",function($log, $window){ 
    return({ error: function(message, response){ 
        $log.error.apply($log, arguments); 
          // send logs to the server side 
          $.ajax({ 
            type: "POST", 
            url: "/clientErrorlogger", 
            contentType: "application/json", 
            data: angular.toJson({ 
              url: $window.location.href, 
              message: message, type: "error" 
              }) 
          }); 
        }, 
        debug: function(message, response){ 
        $log.log.apply($log, arguments); 
          $.ajax({ 
            type: "POST", 
            url: "/clientDebuglogger", 
            contentType: "application/json", 
            data: angular.toJson({
              url: $window.location.href, 
              message: message, 
              response: response,
              type: "debug"
            })
          }); 
        } 
    }); 
  }] 
  );
'use strict';

// Hosted app level module directives and controller dependencies.
angular.module('hostedApp', [
  'hostedApp.directives',
  'hostedApp.controllers',
  'socialApp.directives'
]);
angular.module('hostedApp.controllers',['subPlatformServices','noCAPTCHA', 'ngSanitize', 'loggingModuleServices'])
  
  .config(["$httpProvider", function($httpProvider){
    $httpProvider.defaults.useXDomain = true;
    delete $httpProvider.defaults.headers.common['X-Requested-With'];
  }])

  .controller('HostedController', ['$scope','$http', '$sce','$window','$location', 'formService', 'subService', 'subLogService', function ($scope, $http, $sce, $window, $location, formService, subService, subLogService) {
    $scope.appId = null;
    $scope.submission = {
        formData: [],
        'mediasets': [],
        'documentSets': [],
        'videoSets': [],
        customerId : '',
        appId: '',
        accountId: '',
        paramObject: '',
        isDraft: false,
        approvalNotification: false,
        createdDate : new Date()
    };

    // Catch all 500 Errors 
    // Need to Expand to 400 etc
    // $httpProvider.responseInterceptors.push([ '$rootScope', '$q', '$injector','$location','applicationLoggingService', 
    //  function($rootScope, $q, $injector, $location, applicationLoggingService)
    //  { return function(promise)
    //     { return promise.then(function(response){ 
    //     // http on success 
    //     return response; }, function (response) {
    //       // http on failure 
    //       if(response.status === null || response.status === 500){ 
    //         var error = 
    //         { method: response.config.method, 
    //           url: response.config.url, 
    //           message: response.data, 
    //           status: response.status }; 
    //          applicationLoggingService.error(JSON.stringify(error)); } 
    //       return $q.reject(response); 
    //     }); 
    //     }; 
    //   } 
    // ])

    $scope.hasError = false;

    var paramObject = $location.search();
    $scope.submission.paramObject = paramObject;

    $scope.hostedOutput = {
       
    };


     $scope.submission.formData = $scope.hostedOutput;

        //Temporary until we switch to factories
        var assetBase, thisDomain = window.location.hostname;

        //Temporary until http factory is used
        //localhost
        if(thisDomain == 'localhost'){       

              assetBase = '//localhost:3000'
        }
        //DEV
        else if(thisDomain == 'wp-sub.wpprivate.com'){            
            assetBase = '//wp-sub.wpprivate.com'
        }
        
        //QA
        else if(thisDomain == 'wp-sub-qa.digitalink.com'){            
            assetBase = '//wp-sub-qa.digitalink.com'
        }

        //STAGE
        else if(thisDomain == 'wp-sub-stage.digitalink.com'){            
            assetBase = '//wp-sub-stage.digitalink.com'
        }

        //Prod
        else if(thisDomain == 'sub.washingtonpost.com'){            
            assetBase = '//sub.washingtonpost.com'
        }
        //Prod
        else{            
            assetBase = '//sub.washingtonpost.com'
        } 


      $scope.init = function(value, subId, token) {

        //reject ie 8 and below browsers
        $.reject({
          reject:{
            msie:8//,
            //chrome:true  //this is to test in chrome
          },
          display: ['firefox','chrome','safari'], // Displays only firefox, chrome, and opera  
          imagePath:'../javascripts/resources/jReject/images/',
          close: false // Prevent closing of window  
        // paragraph1: 'You will not be able to close this window.', // Warning about closing  
        // paragraph2: 'To exit, you must '+  
        // '<a href="javascript:window.location=window.location.pathname;">refresh the page</a>'  
        })

        $scope.appId = value;

        $scope.tokenTrue = true;

        $scope.submission.appId = value;       

        $scope.subId = subId;

        formService.getForm({id:$scope.appId+'.json'}, function(data){

          $scope.application = data.applicationInfo;

          $scope.submission.approvalNotification = data.applicationInfo.approvalNotification;

          subLogService.debug({ message: "retrieved data successfully" + $scope.application }); 

             // window.console.log(data.applicationInfo.appFormFields);
             // $scope.checkForParameter(data.applicationInfo.appFormFields);

             //populate fields if they are defined as query params
             if($scope.submission.paramObject){
              for(var key in $scope.submission.paramObject){
                if($scope.submission.paramObject.hasOwnProperty(key)){ 
                  var paramVal = $scope.submission.paramObject[key];
                  if($.isNumeric(paramVal)) $scope.submission.formData[key] = Number(paramVal);
                  else $scope.submission.formData[key] = $scope.submission.paramObject[key];
                }
              }
             }

             //populate fields if submission is editable
             if($scope.application.submissionEdit == true && $scope.subId !== ""){
              subService.getSingleSub({id:subId+'.json'}, function(sub){                
                  if(sub.editToken == token){
                    //retain values set by hosted directive (ie: empty objects for check boxes)
                    angular.forEach($scope.submission.formData, function(value,key){
                      if(!sub.formData[key]){
                        sub.formData[key] = value;
                      }
                    })
                    $scope.submission = sub;
                    $scope.hostedOutput = sub.formData;

                    //Broadcast checkDraftForUploads event so hosted directive can run close modal for every mediaset form field. That will give us the appropriate thumbnails and check marks
                    $scope.$broadcast("checkDraftForUploads",$scope.submission);

                    console.log($scope.submission.isDraft);
                    //loop through formData and map it to $scope.application.appFormFields
                    angular.forEach(sub.formData, function(value,key){
                      for(var f=0;f<$scope.application.appFormFields.length;f++){
                        //map key to uniqueId
                        if(key == $scope.application.appFormFields[f].uniqueId){
                          //find out the field type
                          if($scope.application.appFormFields[f].fieldType == 'firstAndLastName'){
                            var names = value.split('|');                            
                            $scope.application.appFormFields[f].fandLName_first = names[0];
                            $scope.application.appFormFields[f].fandLName_last =  names[1];

                          }
                          else if($scope.application.appFormFields[f].fieldType == 'address'){
                            var addresses = value.split(',');
                            $scope.application.appFormFields[f].address_address1 = addresses[0];
                            $scope.application.appFormFields[f].address_address2 =  addresses[1];
                            $scope.application.appFormFields[f].address_city = addresses[2];
                            $scope.application.appFormFields[f].address_usState.abbreviation =  addresses[3];
                            $scope.application.appFormFields[f].address_state =  addresses[3]; //bind both state fields
                            $scope.application.appFormFields[f].address_postalcode = addresses[4];
                            $scope.application.appFormFields[f].address_country.name =  addresses[5];

                          }
                          else if($scope.application.appFormFields[f].fieldType == 'phoneNumber'){
                            var numbers = value.split('-');
                            $scope.application.appFormFields[f].phNum_areacode = numbers[0];
                            $scope.application.appFormFields[f].phNum_prefix =  numbers[1];
                            $scope.application.appFormFields[f].phNum_linenum = numbers[2];
                            
                          }
                          else if($scope.application.appFormFields[f].fieldType == 'radio' && $scope.application.appFormFields[f].isConditional){                             
                            for (var z=0;z<$scope.application.appFormFields[f].fieldTypeOptionsArray.length;z++){
                              if($scope.application.appFormFields[f].fieldTypeOptionsArray[z].optionValue==value.optionValue){
                                $scope.hostedOutput[key]=$scope.application.appFormFields[f].fieldTypeOptionsArray[z];
                              }
                              
                            }                                                                                 
                          }
                          else{
                            //do nothing
                          }
                          
                        }
                      }
                    });

                    $scope.tokenTrue = true;
                  }
                  else{
                    $scope.tokenTrue = false;
                  }
                
              })
             }

             //letting angular display 'unsafe' html
             $scope.application.appDescriptionSafe = $sce.trustAsHtml($scope.application.appDescription);
             $scope.application.messageNextToDraftBtnSafe = $sce.trustAsHtml($scope.application.messageNextToDraftBtn);

             $scope.submission.customerId = data.applicationInfo.customerId;
             $scope.submission.accountId = data.applicationInfo.accountId;
             $scope.submission.approved = data.applicationInfo.autoApproved;
             window.document.title = "SUB | " + $scope.application.appName;

             //Check if form is active
             var today = new Date()
              if($scope.application.activeStartDate > today.toISOString() || $scope.application.activeEndDate < today.toISOString()  ){
                $scope.application.active = false;
              }

              // Get Application SUB Count + Sub Limit
             if($scope.application.submissionLimit === true){
               $http({method: 'GET', url: "/accountSubs/"+$scope.submission.accountId}).
                  success(function(data) {                    
                    $scope.accountSubs = data.Results;
                    $scope.appSubs = $scope.accountSubs[$scope.appId];

                    // Check Submission Limit
                    if($scope.appSubs >= $scope.application.submissionLimitAmount){
                      $scope.application.active = false;
                    }
                });
              }

             if($scope.application.tinyUrl){
                $scope.shareUrl = "https://sub.washingtonpost.com/hosted/" + $scope.application._id;
              }
              else {
                
                $scope.shareUrl = "https://sub.washingtonpost.com/hosted/" + $scope.application._id;
              }

        })
        

  }


  $scope.checkForPrivateFields = function(fields){
    var hasPrivateFields = false;
    if(fields){
      for(var i = 0; i<fields.length;i++){
      if(!fields[i].isPublic){
        hasPrivateFields = true;
      }
      else{
        hasPrivateFields = false;
      }
    }
    }
    
    return hasPrivateFields;
  }

    
  // POST Application to DB
    $scope.submitForm = function() {

      if($scope.application.hasCaptcha){
        $scope.captchaFulfilled = grecaptcha.getResponse();
      }

    //ensure that no drafts can be saved on a form with no draft workflow
    console.log("app is draft ", $scope.application.submissionEdit)
    console.log("sub is draft ", $scope.submission.isDraft)
    if($scope.submission.isDraft && !$scope.application.submissionEdit){
      $scope.submission.isDraft = false;
      $scope.submission.submitted = true;
    }  

    if($scope.hosted.$invalid && $scope.submission.isDraft == false){
      $scope.hasError = true;
      $scope.submitted = true;
      if($scope.application.hasCaptcha && !$scope.captchaFulfilled){
        $scope.captchaNotChecked = true;
      }
      return false;      
    }
    else{
      $scope.hasError = false;
    }

    
    if($scope.application.hasCaptcha && !$scope.captchaFulfilled){
      $scope.hasError = true;
      $scope.captchaNotChecked = true;
      return false;
    }
    else{
      $scope.hasError = false;
    }
    
    var submitUrl = '/submission';
    if ($scope.submission._id != null){
      submitUrl = '/updateSub';
    }

    
    if ($scope.submission.submitted != false){      
        
      subService.updateEndUser($scope.submission, function(data){
           $scope.userResponse = data;
        }, function(){
           
        });  
    }

    // window.console &&  console.debug('submit hosted submission');
    // $scope.submission.submitted = true;  
    $scope.submission.cookies = validateLoginId();  
    $scope.submission.userAgent = navigator.userAgent;

    $http({method: 'POST', url: submitUrl, data: $scope.submission}).success(function(data)
        {
          // window.console.log(data.submissionInfo);
        $scope.htmlConfirmationMessage =  $sce.trustAsHtml($scope.application.confirmation);
        $scope.response = data.submissionInfo;
        $scope.shareUrl = "https://sub.washingtonpost.com/hosted/" + $scope.application._id;
        $scope.editSubmissionLink = window.location.protocol+assetBase+"/edit/" + $scope.application._id + "/" + data.submissionInfo._id + "/" + data.submissionInfo.editToken;
        // window.console &&  console.debug('success - saved', $scope.response);
        $scope.formSubmitted = true;
        $scope.errorMsg = false;
        $window._gaq.push(['_trackEvent', 'hostedSubmission', 'Sucess', 'Successful Submission', $location.path(), $scope.appId]);
        }).
        error(function(data,status){
          $window._gaq.push(['_trackEvent', 'hostedSubmission', 'Error', 'Could Not Submit', $location.path(), $scope.appId]);
        // window.console && console.debug('error - unsaved', $scope.submission);
        });
   
  };

  
  //Adapted from Javascript: The Definitive Guide by David Flanagan
    function getCookies() {
    var cookies = {};           // The object we will return
    var all = document.cookie;  // Get all cookies in one big string
    if (all === "")             // If the property is the empty string
        return cookies;         // return an empty object
    var list = all.split("; "); // Split into individual name=value pairs
    for(var i = 0; i < list.length; i++) {  // For each cookie
        var cookie = list[i];
        var p = cookie.indexOf("=");        // Find the first = sign
        var name = cookie.substring(0,p);   // Get cookie name
        var value = cookie.substring(p+1);  // Get cookie value
        value = decodeURIComponent(value);  // Decode the value
        cookies[name] = value;              // Store name and value in object
    }    
    return cookies;
}

//http://www.quirksmode.org/js/cookies.html
function getCookiebyName(name){
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
      var c = ca[i];
      while (c.charAt(0)==' ') c = c.substring(1,c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}



function validateLoginId(){
//QA
//var verifyLoginIdUrl = "https://subscribe.digitalink.com/person/verify-login";

//PROD
var verifyLoginIdUrl = "https://subscribe.washingtonpost.com/person/verify-login";

  var cookies = {
        wapoLoginID:getCookiebyName('wapo_login_id'),
        wapoSecureID:getCookiebyName('wapo_secure_login_id'),
        userAgent:navigator.userAgent
       };

  if(cookies.wapoLoginID != null){
    $http({method: 'POST', url: verifyLoginIdUrl, data: cookies})
    .success(function(data){
        if(data.status == "SUCCESS"){
            //do nothing
          }
          else {cookies = {};}
    })
    .error(function(data,status){        
        });
    
  }
  return cookies;
}


  
}]);  

// Hosted Directive
// This Directive is for the hosted form.  It creates each field type for the loaded form and prints on the page.

	angular.module('hostedApp.directives',['ui.bootstrap', 'ngResource', 'subPlatformServices'])
	//Creates Form Fields for Hosted Form
	.directive('subFormfield', ["$compile", "$filter", "$http", "$sce", "subService", "formService", function ($compile,$filter,$http, $sce, subService, formService) {
		// Templates included here to reduce HTTP requests for hosted form
		var subFormTemplates = {
			// To reduce HTTP requests
			radioTemplate : '<div class="form-group"><label>{{content.fieldName}}</label><span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="content.isMandatory && model==null && submitted" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p>  <div class="radio" ng-repeat="field in content.fieldTypeOptions.split(\',\') track by $index" ng-hide="content.isConditional"><label for="{{content.uniqueId}}_{{$index}}"><input type="radio" name="{{content.uniqueId}}" ng-value="field" ng-model="$parent.model" id="{{content.uniqueId}}_{{$index}}" ng-required="content.isMandatory"/> {{field}}</label> </div><div class="" ng-show="content.isConditional"><div class="radio" ng-repeat="option in content.fieldTypeOptionsArray"><label><input type="radio" name="{{content.uniqueId}}" ng-value="option" id="{{option.optionId}}" ng-model="$parent.model" ng-required="content.isMandatory">{{option.optionValue}}</label></div><div ng-repeat="option in content.fieldTypeOptionsArray"><sub-formfield form-id="formId" content="condField" model="submission.formData[condField.uniqueId]" submission="submission" application="application" ng-repeat="condField in option.conditionalFields" submitted="submitted" ng-if="$parent.model==option"> </sub-formfield></div></div></div>',
			hiddenTemplate : '<input type="hidden" class="sub_{{content.fieldType}}" name="{{content.uniqueId}}" placeholder="{{content.placeholder}}">',
			textTemplate : '<ng-form name="form"><div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="(form.text.$error.required && !form.text.$pristine) || (form.text.$error.required && submitted)" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p>  <input type="text" ng-model="model" name="text" class="form-control" ng-required="content.isMandatory" placeholder="{{content.placeholder}}" id="{{content.uniqueId}}"/> </div></ng-form>',
			numberTemplate : '<ng-form name="form"><div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}} </label><span ng-if="content.min || content.max">  (Between {{content.min}} - {{content.max}})</span> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="(form.number.$error.required && !form.number.$pristine)||(form.number.$error.required && submitted)" class="text-danger">This field is required.</span> <span ng-show="(form.number.$error.number && !form.number.$pristine)||(form.number.$error.number && submitted)" class="text-danger">This field must be a number.</span> <span ng-show="(form.number.$error.min && !form.number.$pristine)||(form.number.$error.min && submitted)" class="text-danger">This number must be greater than or equal to {{content.min}}.</span><span ng-show="(form.number.$error.max && !form.number.$pristine)||(form.number.$error.max && submitted)" class="text-danger">This number must be less than or equal to {{content.max}}.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p> <input type="number" ng-model="model" min="{{content.min}}" max="{{content.max}}" name="number" id="{{content.uniqueId}}"  class="form-control" ng-required="content.isMandatory" placeholder="{{content.placeholder}}"/> </div></ng-form>',
			dateTemplate :
			'<ng-form name="form"><div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label><span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="(form.date.$error.required && !form.date.$pristine)||(form.date.$error.required && submitted)" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p> <p class="input-group">'+
			'<input type="text" id="{{content.uniqueId}}"  class="form-control" datepicker-popup="{{format}}" ng-model="model" is-open="opened" show-weeks="false" datepicker-options="dateOptions" ng-required="content.isMandatory" placeholder="{{content.placeholder}}" close-text="Close" name="date" />'+
			'<span class="input-group-btn">'+
			'<button class="btn btn-default" ng-click="opened = true;$event.preventDefault();$event.stopPropagation();"><i class="fa fa-calendar"></i></button>'+
			'</span></p></div></ng-form>',
			pastDateTemplate : '<ng-form name="form"><div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label><span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="(form.pastdate.$error.required && !form.pastdate.$pristine)||(form.pastdate.$error.required && submitted)" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p>  <p class="input-group">'+
			'<input type="text" id="{{content.uniqueId}}"  class="form-control" datepicker-popup="{{format}}" ng-model="model" is-open="opened" max-date="now" show-weeks="false" datepicker-options="dateOptions" ng-required="content.isMandatory" placeholder="{{content.placeholder}}" close-text="Close" name="pastdate"/>'+
			'<span class="input-group-btn">'+
			'<button class="btn btn-default" ng-click="opened = true;$event.preventDefault();$event.stopPropagation();"><i class="fa fa-calendar"></i></button>'+
			'</span></p></div></ng-form>',
			futureDateTemplate : '<ng-form name="form"><div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label><span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="(form.futuredate.$error.required && !form.futuredate.$pristine)||(form.futuredate.$error.required && submitted)" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p>  <p class="input-group">'+
			'<input type="text" id="{{content.uniqueId}}"  class="form-control" datepicker-popup="{{format}}" ng-model="model" is-open="opened" min-date="now" show-weeks="false" datepicker-options="dateOptions" ng-required="content.isMandatory" placeholder="{{content.placeholder}}" close-text="Close" name="futuredate"/>'+
			'<span class="input-group-btn">'+
			'<button class="btn btn-default" ng-click="opened = true;$event.preventDefault();$event.stopPropagation();"><i class="fa fa-calendar"></i></button>'+
			'</span></p></div></ng-form>',
			dobCheckTemplate : '<ng-form name="form"><div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label><span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="(form.dobCheck.$error.required && !form.dobCheck.$pristine)||(form.dobCheck.$error.required && submitted)" class="text-danger">This field is required.</span><span class="text-danger" ng-show="form.dobCheck.$error.dobcheck"> You must be {{content.minAge}} years or older.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p>  <p class="input-group">'+
			'<input type="text" id="{{content.uniqueId}}"  class="form-control" datepicker-popup="{{format}}" ng-model="model" is-open="opened" dobcheck="{{maxDate}}" max-date="now" show-weeks="false" datepicker-options="dateOptions" ng-required="content.isMandatory" placeholder="{{content.placeholder}}" close-text="Close" name="dobCheck"/>'+
			'<span class="input-group-btn">'+
			'<button class="btn btn-default" ng-click="opened = true;$event.preventDefault();$event.stopPropagation();"><i class="fa fa-calendar"></i></button>'+
			'</span></p></div></ng-form>',
			sectionHeaderTemplate : '<h3 class="section-header">{{content.fieldName}}<small><p class="help-block" ng-bind-html="content.descriptionSafe"></p></small></h3> ',
			subSectionHeaderTemplate : '<h4 class="sub-section-header">{{content.fieldName}}<small><p class="help-block" ng-bind-html="content.descriptionSafe"></p></small></h4> ',
			subNameTemplate : '<h4>{{content.fieldName}}</h4> ',
			subDescTemplate : '<h5>{{content.fieldName}}</h5> ',
			trueFalseTemplate : '<div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="content.isMandatory && model==null && submitted" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p> <div class="radio"> <label><input type="radio" name="{{content.uniqueId}}" value="true" ng-model="model" ng-required="content.isMandatory" placeholder="{{content.placeholder}}"/> True </label> </div><div class="radio"><label><input type="radio" name="{{content.uniqueId}}" value="false" ng-required="content.isMandatory"/> False </label> </div></div>',
			yesNoTemplate : '<div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="content.isMandatory && model==null && submitted" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p> <div class="radio"> <label><input type="radio" name="{{content.uniqueId}}" value="yes" ng-model="model" ng-required="content.isMandatory" placeholder="{{content.placeholder}}"/> Yes </label> </div><div class="radio"><label><input type="radio" name="{{content.uniqueId}}" value="no" ng-model="model" ng-required="content.isMandatory"/> No </label> </div></div>',
			dropdownTemplate : '<div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span><span ng-show="content.isMandatory && model==null && submitted" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p>  <select ng-hide="content.isConditional" ng-model="model" ng-options="option for option in content.fieldTypeOptions.split(\',\')" name="dropdown" id="{{content.uniqueId}}"  class="form-control" ng-required="content.isMandatory" > <option value="">-- Select an option --</option> </select><select ng-show="content.isConditional" ng-model="model" ng-options="option.optionValue as option.optionValue for option in content.fieldTypeOptionsArray" name="{{content.uniqueId}}" id="{{content.uniqueId}}"  class="form-control" ng-required="content.isMandatory" > <option value="">-- Select an option --</option> </select><div ng-repeat="option in content.fieldTypeOptionsArray"><sub-formfield form-id="formId" content="condField" model="submission.formData[condField.uniqueId]" submission="submission" application="application" ng-repeat="condField in option.conditionalFields" submitted="submitted" ng-if="model==option.optionValue"> </sub-formfield></div></div>',
			emailTemplate : '<ng-form name="form"><div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="(form.email.$error.required && !form.email.$pristine)||(form.email.$error.required && submitted)" class="text-danger">This field is required.</span> <span ng-show="(form.email.$error.pattern && !form.email.$pristine)||(form.email.$error.pattern && submitted)" class="text-danger">This is not a valid email.</span> <p class="help-block" ng-bind-html="content.descriptionSafe"></p><input type="email" ng-pattern="/^[a-z0-9!#$%&\'*+/=?^_`{|}~.-]+@[a-z0-9-]+\\.[a-z0-9-]/i" ng-model="model" name="email" id="{{content.uniqueId}}"  class="form-control" ng-required="content.isMandatory" placeholder="{{content.placeholder}}" /> </div></ng-form>',
			checkboxTemplate : '<ng-form name="form"><div class="form-group"><label>{{content.fieldName}}</label><span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="cblength > 0 && content.isMandatory && submitted" class="text-danger">Please check at least one.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p>  <div class="checkbox" ng-repeat="field in content.fieldTypeOptions.split(\',\')" ng-init="$parent.model = $parent.model || {}"><label><input ng-model="$parent.model[field]" type="checkbox" name="{{content.uniqueId}}"/> {{field}} <input type="text" class="form-control" ng-show="$last && content.hasOtherField" ng-model="$parent.model[\'otherVal\']" ng-disabled="!$parent.model[\'Other\']"></label> </div></div></ng-form>',
			textareaTemplate : '<ng-form name="form"><div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="(form.textarea.$error.required && !form.textarea.$pristine)||(form.textarea.$error.required && submitted)" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p> <textarea ng-model="model" name="textarea" id="{{content.uniqueId}}"  class="form-control" ng-required="content.isMandatory" placeholder="{{content.placeholder}}" maxlength="{{content.textareaCharLimit}}"></textarea> <span ng-show="content.textareaCharLimit" class="textarea-char-limit">Max Number of Characters: {{content.textareaCharLimit}}</span></div></ng-form>',
			mediaSetDocTemplate : '<ng-form name="form"><div class="form-group mediaset-box"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="form.mediasetDoc.$error.required && submitted" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p> <br><button class="btn btn-success" type="button" ng-click="createMediaSetModal()">Attach Document</button> <span ng-show="docNotUploaded"><em>Please upload a document</em></span><span ng-show="isDocUploaded"><i class="fa fa-check"></i></span><br><br><div media-preview="timestamp" submission-id="{{submission._id}}" mediaset-id="{{content.mediaSetId}}" num-of-media="{{numOfMedia}}"></div></div>' +
			'<input type="hidden" ng-model="model" name="uniqueUploadId.{{content.fieldType}}" value="{{uuId}}"/>' +
			'<input type="hidden" name="transfered.{{content.fieldType}}" value="false"><input type="hidden" name="mediasetId.{{content.fieldType}}" value="false">' +
			'<input type="hidden" ng-model="isDocUploaded" name="mediasetDoc" ng-required="content.isMandatory" />'+
			'<div class="modal fade hosted-modal" id="{{uuId}}_hostedModal"><div class="modal-dialog"><div class="modal-content"><button type="button" ng-click="modalClosed()" class="close" data-dismiss="modal" aria-hidden="true">Close</button><iframe></iframe></div></div></div><hr></ng-form>',
			mediaSetVidTemplate : '<ng-form name="form"><div class="form-group mediaset-box"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="form.mediasetVid.$error.required && submitted" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p> <br><button class="btn btn-success" type="button" ng-click="createMediaSetModal()">Attach Video</button> <span ng-show="vidNotUploaded"><em>Please upload a video</em></span><span ng-show="isVidUploaded"><i class="fa fa-check"></i></span><br><br><div media-preview="timestamp" submission-id="{{submission._id}}" mediaset-id="{{content.mediaSetId}}" num-of-media="{{numOfMedia}}"></div></div>' +
			'<input type="hidden" ng-model="model" name="uniqueUploadId.{{content.fieldType}}" value="{{uuId}}"/>' +
			'<input type="hidden" name="transfered.{{content.fieldType}}" value="false"><input type="hidden" name="mediasetId.{{content.fieldType}}" value="false">' +
			'<input type="hidden" ng-model="isVidUploaded" name="mediasetVid" ng-required="content.isMandatory" />'+
			'<div class="modal fade hosted-modal" id="{{uuId}}_hostedModal"><div class="modal-dialog"><div class="modal-content"><button type="button" ng-click="modalClosed()" class="close" data-dismiss="modal" aria-hidden="true">Close</button><iframe></iframe></div></div></div><hr></ng-form>',
			mediaSetAudioTemplate : '<ng-form name="form"><div class="form-group mediaset-box"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="form.mediasetAudio.$error.required && submitted" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p> <br><button class="btn btn-success" type="button" ng-click="createMediaSetModal()">Attach Audio File</button> <span ng-show="audioNotUploaded"><em>Please upload a video</em></span><span ng-show="isAudioUploaded"><i class="fa fa-check"></i></span><br><br><div media-preview="timestamp" submission-id="{{submission._id}}" mediaset-id="{{content.mediaSetId}}" num-of-media="{{numOfMedia}}"></div></div>' +
			'<input type="hidden" ng-model="model" name="uniqueUploadId.{{content.fieldType}}" value="{{uuId}}"/>' +
			'<input type="hidden" name="transfered.{{content.fieldType}}" value="false"><input type="hidden" name="mediasetId.{{content.fieldType}}" value="false">' +
			'<input type="hidden" ng-model="isAudioUploaded" name="mediasetAudio" ng-required="content.isMandatory" />'+
			'<div class="modal fade hosted-modal" id="{{uuId}}_hostedModal"><div class="modal-dialog"><div class="modal-content"><button type="button" ng-click="modalClosed()" class="close" data-dismiss="modal" aria-hidden="true">Close</button><iframe></iframe></div></div></div><hr></ng-form>',
			mediaSetTemplate : '<ng-form name="form"><div class="form-group mediaset-box"><label for="{{formId}}_{{content.fieldName}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="numOfMedia==1"><em>You can upload {{numOfMedia}} image</em></span><span ng-show="numOfMedia>1"><em>You can attach up to {{numOfMedia}} images</em></span> <span ng-show="form.mediaset.$error.required && submitted" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p> <br><button class="btn btn-success" type="button" ng-click="createMediaSetModal()">Attach Photo(s)</button><br><br><div media-preview="timestamp" submission-id="{{submission._id}}" mediaset-id="{{content.mediaSetId}}" num-of-media="{{numOfMedia}}"></div></div>' +
			'<input type="hidden" ng-model="model" name="uniqueUploadId.{{content.fieldType}}" value="{{uuId}}"/>' +
			'<input type="hidden" name="mediaset" ng-model="isPhotoUploaded" ng-required="content.isMandatory" />' +
			'<input type="hidden" name="transfered.{{content.fieldType}}" value="false"><input type="hidden" name="mediasetId.{{content.fieldType}}" value="false">'+
			'<div class="modal fade hosted-modal" id="{{uuId}}_hostedModal"><div class="modal-dialog"><div class="modal-content"><button type="button" ng-click="modalClosed()" class="close" data-dismiss="modal" aria-hidden="true">Close</button><iframe></iframe></div></div></div><hr></ng-form>',
			firstAndLastNameTemplate :'<ng-form name="form"><div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="(form.name_first.$error.required && !form.name_first.$pristine)|| (form.name_last.$error.required && !form.name_last.$pristine)||(form.name_first.$error.required && submitted)|| (form.name_last.$error.required && submitted)" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p>  <br><div class="row"><div class="col-sm-6"><input type="text" name="name_first" class="form-control" ng-required="content.isMandatory" ng-model="content.fandLName_first" ng-change="concatName()"/><p class="help-block">First</p></div><div class="col-sm-6"><input type="text" name="name_last" class="form-control" ng-required="content.isMandatory" ng-model="content.fandLName_last" ng-change="concatName()"/><p class="help-block">Last</p></div></div></div></ng-form>',
			phoneNumberTemplate:'<ng-form name="form"><div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="(form.phnum_areacode.$error.required && !form.phnum_areacode.$pristine)|| (form.phnum_prefix.$error.required && !form.phnum_prefix.$pristine) || (form.phnum_linenum.$error.required && !form.phnum_linenum.$pristine)||(form.phnum_areacode.$error.required && submitted)|| (form.phnum_prefix.$error.required && submitted) || (form.phnum_linenum.$error.required && submitted)" class="text-danger">This field is required.</span> <span ng-show="(form.phnum_areacode.$error.pattern )|| (form.phnum_prefix.$error.pattern) || (form.phnum_linenum.$error.pattern)" class="text-danger">This field must be a number and the correct length.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p><br><div class="row"><div class="col-sm-2 phone-num"><input type="text" ng-model="content.phNum_areacode" name="phnum_areacode" id="{{content.uniqueId}}" class="form-control" ng-required="content.isMandatory" ng-change="concatPhNum()" min="0" max="999" ng-pattern="/^[0-9]{3,3}$/"/  ng-maxlength="3" tabindex="{{index*1000}}" auto-next><p class="help-block">###</p></div><div class="col-sm-1 em-dash">&#8212;</div><div class="col-sm-2 phone-num"><input type="text" ng-model="content.phNum_prefix" name="phnum_prefix" id="{{content.uniqueId}}" class="form-control" ng-required="content.isMandatory" ng-change="concatPhNum()" min="0" max="999" ng-pattern="/^[0-9]{3,3}$/"/  ng-maxlength="3"  tabindex="{{(index*1000)+1}}" auto-next><p class="help-block">###</p></div><div class="col-sm-1 em-dash">&#8212;</div><div class="col-sm-2 phone-num"><input type="text" ng-model="content.phNum_linenum" name="phnum_linenum" id="{{content.uniqueId}}" class="form-control" ng-required="content.isMandatory" ng-change="concatPhNum()" min="0" max="9999" ng-pattern="/^[0-9]{4,4}$/"/ ng-maxlength="4"  tabindex="{{(index*1000)+2}}" auto-next><p class="help-block">####</p></div></div></div></ng-form>',
			addressTemplate:'<ng-form name="form"><div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="(form.address1.$error.required && !form.address1.$pristine)|| (form.city.$error.required && !form.city.$pristine) || (form.postalcode.$error.required && !form.postalcode.$pristine)||(form.address1.$error.required && submitted)|| (form.city.$error.required && submitted) || (form.postalcode.$error.required && submitted)" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p><br><div class="row"><div class="col-sm-12"><input type="text" class="form-control" ng-model="content.address_address1" ng-change="concatAddress()" ng-required="content.isMandatory" name="address1"><p class="help-block">Street Address</p></div></div><div class="row"><div class="col-sm-12"><input type="text" class="form-control" ng-model="content.address_address2" ng-change="concatAddress()"><p class="help-block">Address Line 2</p></div></div><div class="row"><div class="col-sm-6"><input type="text" name="city" class="form-control" ng-model="content.address_city" ng-change="concatAddress()" ng-required="content.isMandatory"><p class="help-block">City</p></div><div class="col-sm-6"><input type="text" class="form-control"  ng-model="content.address_state" ng-change="concatAddress()" ng-hide="isUS"><select class="form-control" ng-model="content.address_usState" ng-options="state.name for state in states track by state.abbreviation" ng-show="isUS" ng-change="concatAddress()" ng-init="content.address_usState.abbreviation=defaultState"><option value="">--choose--</option></select><p class="help-block">State/Province/Region</p></div></div><div class="row"><div class="col-sm-6"><input type="text" name="postalcode" class="form-control" ng-model="content.address_postalcode" ng-change="concatAddress()" ng-required="content.isMandatory"><p class="help-block">Postal Code</p></div><div class="col-sm-6"><select class="form-control" ng-options="country.name for country in countries track by country.name" ng-model="content.address_country" ng-change="concatAddress()" ng-init="content.address_country.name=defaultCountry" ng-required="content.isMandatory"><option value="">--choose--</option></select><p class="help-block">Country</p></div></div></div></ng-form>',
			timeTemplate:'<div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label><span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="(form.time.$error.required && !form.time.$pristine)||(form.time.$error.required && submitted)" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p><p class="input-group"><timepicker ng-model="model" id="{{content.uniqueId}}" name="time"></timepicker></p></div>',
			parameterTemplate: '<ng-form name="form"><div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="(form.text.$error.required && !form.text.$pristine) || (form.text.$error.required && submitted)" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p>  <input type="text" ng-model="model" name="text" class="form-control" ng-required="content.isMandatory" placeholder="{{content.placeholder}}" id="{{content.uniqueId}}"/> </div></ng-form>',
		};

		var getTemplate = function(content) {
			var template = {};
			if(!content.isPublic) {
				template = subFormTemplates['hiddenTemplate'];
			}
			else{
				template = subFormTemplates[content.fieldType+'Template'];
			}
			if(typeof template != 'undefined' && template != null) {
				return template;
			}
			else {
				return '';
			}
		}

		var linker = function(scope, element, attrs, form) {
			scope.formInfo = form;
			scope.content.descriptionSafe = $sce.trustAsHtml(scope.content.description);
			if(!scope.content.isPublic) {
				element.html(getTemplate('hidden')).show();
			}
			else {
				if(scope.content.fieldType === 'futureDate' || scope.content.fieldType === 'pastDate' ) { scope.now = new Date(); }
				else if(scope.content.fieldType === 'time'){scope.model = new Date();}
				else if(scope.content.fieldType == 'checkbox'){
					if(scope.content.hasOtherField){
						scope.content.fieldTypeOptions = scope.content.fieldTypeOptions+",Other";
					}
					scope.cblength = scope.content.fieldTypeOptions.split(",").length;
				}
				else if(scope.content.fieldType == "phoneNumber"){
					scope.concatPhNum = function concatPhNum(){
						var areacode = (scope.content.phNum_areacode)?scope.content.phNum_areacode:'';
						var prefix = (scope.content.phNum_prefix)?scope.content.phNum_prefix:'';
						var linenum = (scope.content.phNum_linenum)?scope.content.phNum_linenum:'';
						scope.submission.formData[scope.content.uniqueId] = areacode + '-' + prefix + '-' + linenum;
					}
				}
				else if (scope.content.fieldType == "firstAndLastName"){
					scope.concatName = function concatName(){
						var firstName = (scope.content.fandLName_first)?scope.content.fandLName_first:'';
						var lastName = (scope.content.fandLName_last)?scope.content.fandLName_last:'';
						scope.submission.formData[scope.content.uniqueId] = firstName + '|' + lastName;
					}
				}
				else if(scope.content.fieldType === 'address'){
					$http.get('/javascripts/vendors/countries.json')
					.success(function(data,err){
						scope.countries = data;
					})
					.error(function(){
	            	})
	            	$http.get('/javascripts/vendors/us-states.json')
					.success(function(data,err){
						scope.states = data;
					})
					.error(function(){
	            	})
	            	//default as US
	            	scope.defaultCountry = "United States";
	            	scope.defaultState = "DC";
	            	scope.isUS = true;
					scope.concatAddress = function concatAddress(){
						var address1 = (scope.content.address_address1)?scope.content.address_address1:'';
						var address2 = (scope.content.address_address2)?scope.content.address_address2:'';
						var city = (scope.content.address_city)?scope.content.address_city:'';
						var state;
						var postalcode = (scope.content.address_postalcode)?scope.content.address_postalcode:'';
						var country = scope.content.address_country.name;
						if(country == "United States") {
							scope.isUS = true;
							state = (scope.content.address_usState)?scope.content.address_usState.abbreviation:"";
						}
						else {
							scope.isUS = false;
							state = (scope.content.address_state)?scope.content.address_state:'';
						}
						scope.submission.formData[scope.content.uniqueId] = address1 + ', ' + address2 + ', ' + city + ',' + state + ', ' + postalcode + ',' + country;
					}

				}
				else if((scope.content.fieldType ==='radio' || scope.content.fieldType === 'dropdown')){
					if(scope.content.isConditional){
							scope.condFields = scope.$parent.model = {};
					}
					else{
						if(scope.content.hasOtherField){
						scope.content.fieldTypeOptions = scope.content.fieldTypeOptions+",Other";

					}
					}
				}
				else if(scope.content.fieldType === 'dobCheck'){
					var date = new Date();
					date = new Date(date.getFullYear() - scope.content.minAge, date.getMonth(), date.getDate());
					scope.maxDate = date.toISOString();
					scope.now = new Date();
				}
				else if(scope.content.fieldType === 'mediaSet' || scope.content.fieldType === 'mediaSetDoc' || scope.content.fieldType === 'mediaSetVid' || scope.content.fieldType === 'mediaSetAudio') {
					//listen for close modal broadcast from hosted controller
					scope.$on("checkDraftForUploads", function (event, args) {
		                scope.checkDraftForUploads(args);
		            });
					if(scope.content.fieldType === 'mediaSet'){
						var id = scope.content.mediaSetId;
						for(var i=0;i<scope.application.mediaSets.length;i++){
							if(id == scope.application.mediaSets[i]._id){
								scope.numOfMedia = scope.application.mediaSets[i].numOfMedia;
							}
						}
					}
					else{scope.numOfMedia = 1;}
					if (scope.uuId == null){
						if(scope.submission.mediasets[scope.content.mediaSetId] && scope.submission.mediasets[scope.content.mediaSetId].uniqueUploadId){
							scope.uuId = scope.submission.mediasets[scope.content.mediaSetId].uniqueUploadId;
						}
						scope.uuId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
						var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
						return v.toString(16);});
					}
					// var ms = jQuery.grep(scope.application.mediaSets, function(e){ return e.mediaSetName === scope.content.fieldType; })[0];
					// scope.mediaSetId = ms.formId;
					// scope.createMediaSet =
					// function createMediaset(){
						var mediasetHref = "/" + scope.formId + "/" + scope.content.mediaSetId + "/" + scope.uuId + "/pup";
					// 	window.open(mediasetHref, 'targetWindow','width=600');
					// }
					scope.checkDraftForUploads = function(args){
						scope.timestamp = new Date().getTime();
						$http.get("/"+args._id+"/"+scope.content.mediaSetId+"/mediaset.json", {})
			            	.success(function(data, err){
			            		if(data[0].mediasets[0].media != null && data[0].mediasets[0].media.length > 0){
			            			if(scope.content.fieldType == 'mediaSetVid'){
			            				scope.isVidUploaded = true;
			            				scope.vidNotUploaded = false;
				            		}
				            		else if(scope.content.fieldType == 'mediaSetDoc'){
										scope.isDocUploaded = true;
										scope.docNotUploaded = false;
				            		}
				            		else if(scope.content.fieldType == 'mediaSetAudio'){
										scope.isAudioUploaded = true;
										scope.docAudioUploaded = false;
				            		}
				            	}
			            		else{
			            			if(scope.content.fieldType == 'mediaSetVid'){
			            				if(scope.content.isMandatory) scope.vidNotUploaded = true;
			            				scope.isVidUploaded = "";
				            		}
				            		else if(scope.content.fieldType == 'mediaSetDoc'){
										if(scope.content.isMandatory) scope.docNotUploaded = true;
										scope.isDocUploaded = "";
				            		}
				            		else if(scope.content.fieldType == 'mediaSetAudio'){
										if(scope.content.isMandatory) scope.audioNotUploaded = true;
										scope.isAudioUploaded = "";
				            		}
			            		}

				            })
					}
					scope.modalClosed = function modalClosed(){
						scope.timestamp = new Date().getTime();
				$http.get("/"+scope.submission._id+"/"+scope.content.mediaSetId+"/mediaset.json", {})
            	.success(function(data, err){

            		if(data[0].mediasets[0].media != null && data[0].mediasets[0].media.length > 0){
            			if(scope.content.fieldType == 'mediaSetVid'){
            				scope.isVidUploaded = true;
            				scope.vidNotUploaded = false;
	            		}
	            		else if(scope.content.fieldType == 'mediaSetDoc'){
							scope.isDocUploaded = true;
							scope.docNotUploaded = false;
	            		}
	            		else if(scope.content.fieldType == 'mediaSetAudio'){
							scope.isAudioUploaded = true;
							scope.docAudioUploaded = false;
	            		}
            		}
            		else{
            			if(scope.content.fieldType == 'mediaSetVid'){
            				if(scope.content.isMandatory) scope.vidNotUploaded = true;
            				scope.isVidUploaded = "";
	            		}
	            		else if(scope.content.fieldType == 'mediaSetDoc'){
							if(scope.content.isMandatory) scope.docNotUploaded = true;
							scope.isDocUploaded = "";
	            		}
	            		else if(scope.content.fieldType == 'mediaSetAudio'){
							if(scope.content.isMandatory) scope.audioNotUploaded = true;
							scope.isAudioUploaded = "";
	            		}
            		}
	            })
	            .error(function(){

	            })
					}
					scope.createMediaSetModal =
					function createMediaSetModal(){
						scope.timestamp = new Date().getTime();
						var mediasetIdIndex;
						//numOfMedia should equal the object in the mediasets array with the matching mediasetid
						for(var i=0; i<scope.application.mediaSets.length;i++){

							if(scope.application.mediaSets[i].hasOwnProperty("_id")){
								if(scope.application.mediaSets[i]._id == scope.content.mediaSetId){
									scope.numOfMedia = scope.application.mediaSets[i].numOfMedia;
									mediasetIdIndex = i;
								}
							}
						}
						scope.submission.mediasets[scope.content.mediaSetId] = {};
						scope.submission.mediasets[scope.content.mediaSetId].uniqueUploadId = scope.uuId;
		                scope.submission.mediasets[scope.content.mediaSetId].transfered = false;
		                scope.submission.mediasets[scope.content.mediaSetId].mediasetId = scope.content.mediaSetId;
						//scope.$apply(attrs.enter);
						if(scope.submission._id == null){
								subService.createEmptySubmission(scope.submission, function(data){
								scope.submission._id = data.submissionInfo._id;
				                mediasetHref =  "/" + scope.formId + "/" + scope.content.mediaSetId + "/" + scope.uuId + "/" + scope.submission._id + "/pup";
				                //open modal
				                var parentDocHeight = getDocumentHeight();//parent.getDocumentHeight();
				                if (parentDocHeight > 800) parentDocHeight = 800;
								//this is jQUERY need to rewrite!!!!
								$("#"+scope.uuId+"_hostedModal iframe").css('height', parentDocHeight).attr('src', mediasetHref);
								$("#"+scope.uuId+"_hostedModal").modal();
								$(window).on('message', receiveMessage);
						        function receiveMessage(e){
						          if(e.originalEvent.origin === e.originalEvent.data){
						            scope.modalClosed();
						            $("#"+scope.uuId+"_hostedModal").modal('hide');
						          }
						        }
					        }, function(){
					        });
						} else {
							subService.updateSub(scope.submission, function(data){
					           var mediasetHref = "/" + scope.formId + "/" + scope.content.mediaSetId + "/" + scope.uuId + "/" + scope.submission._id + "/pup";
								var parentDocHeight = getDocumentHeight();//parent.getDocumentHeight();
								//this is jQUERY need to rewrite!!!!
								$("#"+scope.uuId+"_hostedModal iframe").css('height', parentDocHeight).attr('src', mediasetHref);
								$("#"+scope.uuId+"_hostedModal").modal();
					        }, function(){
					        });
						}
					}
					function getDocumentHeight(){
						return $(document).height() - 80;
					}
				}
				element.html(getTemplate(scope.content)).show();
			}
			$compile(element.contents())(scope);
		}
		return {
			restrict: "E",
			require:"^form",
			replace: true,
			link: linker,
			scope: {
				content:'=',
				formId:'=?',
				submission:'=',
				application:'=',
				model: '=?',
				submitted:'=?',
				index:'=?'
			}
		};
	}])

//If error when creating form field.
	.directive('errSrc', function() {
	  return {
	    link: function(scope, element, attrs) {
	      element.bind('error', function() {
	        if (attrs.src != attrs.errSrc) {
	          attrs.$set('src', attrs.errSrc);
	        }
	      });
	    }
	  }
	})

// Preview Photo in Hosted Form
	.directive('photoPreview', ["$timeout", "$http", "$compile", function($timeout,$http,$compile){
        return function(scope, element, attr){
        	var mediasetDir = "";
        	if(parseInt(attr.mediasetId) > 0 ){
        		mediasetDir = "/" + attr.mediasetId;
        	}
        	var thumbnail = "//noname.com/" + attr.submissionId +mediasetDir + "/0_thumb";
            // Add a watch on the `focus-input` attribute.
            // Whenever the `focus-input` statement changes this callback function will be executed.
            scope.$watch(attr.photoPreview, function(value){
        		var i = 0
        		var imageHtml = "<br><div class='row' ><ul class='list-unstyled'>";
        		while (i < attr.numOfMedia) {
				    imageHtml += "<li class='col-md-3'><br><img src='" + "//noname.com/" + attr.submissionId + mediasetDir + "/"+i+"_thumb?" + value + "' err-src='/images/no-image-available.png' alt='image'/></li>";
		            i++;
				}
				imageHtml = imageHtml + "</ul></div>";

				$http.get("//no-name.com/" + attr.submissionId + mediasetDir+ "/0_thumb", {})
            	.success(function(data, err){
            		scope.isPhotoUploaded = true;
            		var clonedElement = $compile(imageHtml)(scope, function(clonedElement, scope) {
					    //attach the clone to DOM document at the right place
					    element.html(clonedElement);
					  });
	            })
	            .error(function(){
	            })
            });

        };
    }])

// Preview Media in Hosted Form
	.directive('mediaPreview', ["$timeout", "$http", "$compile", function($timeout,$http,$compile){
        return function(scope, element, attr){
        	scope.$watch(attr.mediaPreview, function(value){
        		if(attr.submissionId){
        			$http.get("/"+attr.submissionId+"/"+attr.mediasetId+"/mediaset.json").success(function(data){
							var media = data[0].mediasets[0].media;
							var fileHTML = "";
							for(var i=0;i<media.length;i++){
					        	if(media[i].hasOwnProperty('mediaUrlThumb')){
					        		fileHTML +="<li><img class='photo-preview' src='"+media[i].mediaUrlThumb+"'></li>"
					        	}
					        	else{
					        		fileHTML +="<li>"+media[i].originalName+": <a href='"+media[i].mediaUrl +"' target='_blank'>http:"+media[i].mediaUrl+"</a></li>";
					        	}
										console.log("mediasetType is " + media[i].mediaSetType);
										if(media[i].mediaSetType == "image"){
												scope.isPhotoUploaded = true;
										}
					        }
					        var clonedElement = $compile("<ul class='list-unstyled'>"+fileHTML+"</ul>")(scope, function(clonedElement, scope) {
					    //attach the clone to DOM document at the right place
					    element.html(clonedElement);
					  });
						});
        		}

        	})






        };
    }])

//Special validation for "dobCheck" field type
.directive('dobcheck', function (){
   return {
      require: 'ngModel',
      link: function(scope, elem, attr, ngModel) {
          ngModel.$parsers.unshift(function (value) {
          	 //convert ngmodel value to iso string and compare to max allowed dob
          	 var dob = new Date(value).toISOString();
             ngModel.$setValidity('dobcheck', attr.dobcheck >= dob);
             return value;
          });
      }
   };
})

//Auto tab to next field in Hosted Form
.directive('autoNext', function() {
            return {
               restrict: 'A',
               link: function(scope, element, attr, form) {
                   var tabindex = parseInt(attr.tabindex);
                   var maxLength = parseInt(attr.ngMaxlength);
                   element.on('keyup', function(e) {
                       if (element.val().length > maxLength-1) {
                          var next = angular.element(document.body).find('[tabindex=' + (tabindex+1) + ']');
                          if (next.length > 0) {
                              next.focus();
                              return next.triggerHandler('keyup', { which: e.which});
                          }
                          else  {
                              return false;
                          }
                       }
                       return true;
                   });

               }
            }
        })

    ;

// Social Directive
// This directive controls the social share button actions.  Twitter, facebook, google plus.

angular.module('socialApp.directives',[])

//Creates FB Like
.directive('fbLike', ["$window", "$rootScope", "$compile", function ($window,$rootScope,$compile) {
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
      }]
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
// Google Analytics Directive
// This Directive has the required GA Code

(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-6350795-19', 'auto');
ga('send', 'pageview');