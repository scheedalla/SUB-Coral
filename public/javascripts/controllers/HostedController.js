angular.module('hostedApp.controllers',['subPlatformServices','noCAPTCHA', 'ngSanitize', 'loggingModuleServices'])
  
  .config(function($httpProvider){
    $httpProvider.defaults.useXDomain = true;
    delete $httpProvider.defaults.headers.common['X-Requested-With'];
  })

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
