//
angular.module('admin.controllers', [
  'ui.bootstrap',
  'localytics.directives',
  'admin.filters',
  'admin.directives',
  'imgEditor.directives',
  'ngSanitize',
  'uuids',
  'angularFileUpload',
  'ui.sortable',
  'ngResource',
  'subPlatformServices',
  'modalServices',
  'mentio',
  'pasvaz.bindonce',
  'loggingModuleServices',
  ]
  )

.config(function($httpProvider){
  $httpProvider.defaults.useXDomain = true;
  delete $httpProvider.defaults.headers.common['X-Requested-With'];
  $httpProvider.interceptors.push(function($q, $rootScope){
    return {
      'request': function(config) {
        // $rootScope.$broadcast('loading-started');
        return config || $q.when(config);
      },
      'response': function(response) {
        // $rootScope.$broadcast('loading-complete');
        return response || $q.when(response);
      }
    };
  });
})

.controller('SettingsCtrl', ['$scope',  function ($scope) {
  $scope.predicate = '-_id';
  $scope.filterText = {};
  $scope.filterKey = "";
  $scope.filterVal = "";
  $scope.filterActive = false;
  $scope.status = null;
  $scope.simple = true;
  $scope.advanced = false;
  $scope.dateSearch = false;
  $scope.info = {}; //object to store miscellaneous information

  $scope.quotes = [
  { value: "Hello" }
  ];
  $scope.randomQuote = $scope.quotes[Math.floor(Math.random() * $scope.quotes.length)];


}])


.controller('AppCtrl', ['$scope', '$filter', '$http', '$location', '$window', '$anchorScroll','$rootScope', 'rfc4122', '$fileUploader','subService', 'formService', 'userService', 'acctService', 'modals', '$q', 'subLogService', function ($scope, $filter, $http, $location, $window, $anchorScroll, $rootScope, rfc4122, $fileUploader, subService, formService, userService, acctService, modals, $q, subLogService) {

      // // Catch all 500 Errors
      // // Need to Expand to 400 etc
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

      // $scope.subTime = function(value) {,
      //   $scope.dateFromObjectId = parseInt(value.substring(0, 8), 16) * 1000;
      //   $scope.createdDate = new Date($scope.dateFromObjectId)
      //   console.log($scope.createdDate);
      // }

      //set up replyToOptions
      $scope.replyToOptions = [];
      //force an update of all replyToOptions in replyToOptions array
      $scope.updateReplyToOptions = function(){
        // console.log("updateReplyToOptions");
        $scope.replyToOptions.push({forceUpdate:""})
      }

      //remove formField from replyToOptions based on unique id
      $scope.removeReplyToOption = function(formField){
        for(var c=0; c<$scope.replyToOptions.length;c++){
            if(formField.uniqueId == $scope.replyToOptions[c].uniqueId){
              $scope.replyToOptions.splice(c, 1);
            }
          }
      }

      //Empty scope for comparable submissions
      $scope.comparedSubmissions = [];
      $scope.compareSubmission = false;
      $scope.compare = false;
      $scope.isPreview = true;

      window.onload = function() {
       setTimeout (function () {
        scrollTo(0,0);
       }, 5000);
      }


      //Call Modal Service - Compare Submissions
      $scope.compareSubmissionsModal = function() {
        var modalOptions = {
            closeButtonText: '',
            actionButtonText: 'Okay',
            headerText: 'Compare Submissions',
            bodyText: 'Such a good looking modal.',

        };
        modals.showModal({templateUrl: 'compare.html', scope:$scope}, modalOptions).then(function (result) {
        });
      };

      //Call Modal Service - Tags!
      $scope.manageTagsModal = function() {
        var modalOptions = {
            closeButtonText: 'Cancel',
            actionButtonText: 'Finish',
            headerText: 'Add or remove tags',
            bodyText: '',
            close: $scope.manageTags.error = ''
        };
        modals.showModal({templateUrl: 'tags.html', scope:$scope}, modalOptions).then(function (result) {
        });
      };

      //Call Modal Service - Save Search!
      $scope.saveSearchModal = function() {
        var modalOptions = {
            closeButtonText: 'Cancel',
            actionButtonText: 'Save Search',
            headerText: 'Save Search',
            bodyText: ''
        };
        modals.showModal({templateUrl: 'saveSearch.html', scope:$scope}, modalOptions).then(function (result) {
        });
      };

      //Call Modal Service - Use a Savee Search!
      $scope.useSaveSearchModal = function() {
        var modalOptions = {
            closeButtonText: 'Close',
            actionButtonText: 'Save Search',
            headerText: 'Use a Save Search',
            bodyText: ''
        };
        modals.showModal({templateUrl: 'useSaveSearch.html', scope:$scope}, modalOptions).then(function (result) {
        });
      };

      //Call Modal Service - Document View Search!
      $scope.documentViewModal = function(photo, submission, sequenceNumber) {
        var modalOptions = {
            closeButtonText: '',
            actionButtonText: 'Finish',
            headerText: 'View Document',
            bodyText: '',
            photo : photo,
            sequenceNumber : sequenceNumber,
            submission : submission
        };
        modals.showModal({templateUrl: 'viewDocument.html', scope:$scope}, modalOptions).then(function (result) {
        });
      };

      //Call Modal Service - Image Edit!
      $scope.imgEditModal = function(photo, mediaset, submission) {
        var modalOptions = {
            closeButtonText: 'Cancel',
            actionButtonText: 'Save Changes',
            headerText: 'Edit Image',
            bodyText: '',
            photo : photo,
            mediaset : mediaset,
            submission : submission

        };
        modals.showModal({templateUrl: 'imgEdit.html', scope:$scope}, modalOptions).then(function (result) {
        });
      };

      //Call Modal Service - Add User!
      $scope.addUserModal = function(photo, mediaset, submission) {
        var modalOptions = {
            closeButtonText: 'Cancel',
            actionButtonText: 'Finished',
            headerText: 'Add A User',
            bodyText: '',
            photo : photo,
            mediaset : mediaset,
            submission : submission

        };
        modals.showModal({templateUrl: 'userManagement.html', scope:$scope}, modalOptions).then(function (result) {
        });
      };


      //comment this out or set to false if your localhost is localhost:8080
      var digitalinkDomain = false;

      var pupScan, thisDomain = window.location.hostname;

        //localhost
        if(thisDomain == 'localhost'){
           pupScan = '//pupscantest.digitalink.com/photo-uploader/newuploader/';
           // pupScan = (digitalinkDomain)?'//localhost.digitalink.com/photo-uploader/newuploader/':'//localhost:8080/photo-uploader/newuploader/';
           //pupScan = '//internal-wp-sub-dev-glassfish-1248513819.us-east-1.elb.amazonaws.com/photo-uploader/newuploader/'
           //pupScan = '//localhost:8080/photo-uploader/newuploader/';
              //comment out digitalinkDomain or set to false if your localhost is localhost:8080
              $scope.embedEnvVar = "local";
            }
        //QA
        else if(thisDomain == 'wp-sub-qa.digitalink.com'){
          pupScan = '//pupscantest.digitalink.com/photo-uploader/newuploader/';
          $scope.embedEnvVar = "qa";
        }
        //Prod
        else{
          pupScan = '//pupscan.washingtonpost.com/photo-uploader/newuploader/';
          $scope.embedEnvVar = "prod";
        }

//Begin import. May want to move this to its own controller
function csvParser(csv){
  strDelimiter = ",";
    // Regular expression to parse the CSV values.
    var objPattern = new RegExp(
      (
            // Delimiters.
            "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
            // Quoted fields.
            "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
            // Standard fields.
            "([^\"\\" + strDelimiter + "\\r\\n]*))"
      ), "gi" );

        // Arrays to hold our data and pattern matching groups.
        var arrData = [[]];
        var arrMatches = null;

        // Loop over the regex matches
        while (arrMatches = objPattern.exec( strData )){
            // Get the delimiter that was found.
            var strMatchedDelimiter = arrMatches[ 1 ];

            // Check to see if the given delimiter has a length
            // (is not the start of string) and if it matches
            // field delimiter. If id does not, then we know
            // that this delimiter is a row delimiter.
            if (
              strMatchedDelimiter.length &&
              strMatchedDelimiter !== strDelimiter
              ){

                // This is a new row. Add a new row to arrData.
              arrData.push( [] );
            }
            var strMatchedValue;
            //look at the value after the delimeter
            if (arrMatches[ 2 ]){
                // This is a quoted value. Unescape any double quotes.
                strMatchedValue = arrMatches[ 2 ].replace(
                  new RegExp( "\"\"", "g" ),
                  "\""
                  );

              } else {
                // This is a non-quoted value.
                strMatchedValue = arrMatches[ 3 ];

              }

            // Add the value to arrData
            arrData[ arrData.length - 1 ].push( strMatchedValue );
          }

        // Return the parsed data.
        return( arrData );
      }

//End import


var data = '{"group": {"operator": "&","rules": []}}';

function htmlEntities(str) {
  return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function computed(group) {
  if (!group) return "";
  for (var str = "", i = 0; i < group.rules.length; i++) {
    i > 0 && (str += "&");
      var elasticData = group.rules[i].data;
      var elasticKey = group.rules[i].field.key
      // console.log(elasticData);
      // console.log(group.rules[i].field)
      if(group.rules[i].field.type=='pastDate' || group.rules[i].field.type=='futureDate' || group.rules[i].field.type=='date'){
        var date = new Date (elasticData);
        //if this is a date, parse it into a valid format for elastic search
        //TODO: this will work for now but change the string at the end to an actual time adjusted for our time zone, instead of just adding 5 hours
        if(group.rules[i].condition == "lt"){
          elasticData = $filter('date')(date,"yyyy'-'MM'-'dd'T00:00:00'");
        } else if(group.rules[i].condition == "gt"){
          elasticData = $filter('date')(date,"yyyy'-'MM'-'dd'T23:59:59'");
        } else {
          elasticData = $filter('date')(date,"yyyy'-'MM'-'dd'T05:00:00'");
        }
        // console.log(elasticData);
      } else if(group.rules[i].field.type=='checkbox'){
        //if this is a checkbox look for a field name that matches the user input search string whose value is true and use a * to pick up categories with and without space
        elasticKey = group.rules[i].field.key + ". " + elasticData;
        elasticData = true;
      }
    str += group.rules[i].group ?
    computed(group.rules[i].group) :
      // group.rules[i].field.name + " " + htmlEntities(group.rules[i].condition) + " " + group.rules[i].data;
      // group.rules[i].field.key + " " + htmlEntities(group.rules[i].condition) + " " + group.rules[i].data;
      // $scope.thisDomain + "/" + $scope.approvalApp + "/subs.json?" +
      elasticKey + "" + group.rules[i].condition + "" + elasticData;
  }

  return str + "";
}

    $scope.json = null;

    $scope.filter = JSON.parse(data);

    $scope.searchOptions = {};
    $scope.$watchCollection('filter', function (newValue) {
      $scope.json = JSON.stringify(newValue, null, 2);
      $scope.searchOptions = newValue;
      $scope.output = computed(newValue.group);
      $scope.operator = newValue.group.operator
    }, true);

    $scope.clearSearch = function(){
      $scope.searchOptions = {};
      //$scope.filter = {};
    }


    $scope.searchToApply = {}

    //apply saved search to scope
    $scope.applySearch = function(){
      $scope.searchOptions = $scope.searchToApply.search.searchOptions;
      $scope.filter = $scope.searchToApply.search.filter;
      $scope.filterActive = true;
      // $scope.filterKey = "approved";
      $scope.filterVal = $scope.searchToApply.search.approved;

      //$scope.filter.group.rules[0].field = 1;
      $scope.advSearch = $scope.searchToApply.search.isAdvanced;
      $scope.basicSearch = !$scope.searchToApply.search.isAdvanced;
      $scope.searchAll();
      //$modalInstance.dismiss('cancel');

    }

    $scope.searchToSave = {}
    //save current search to the app for the admin user to use later
    $scope.saveSearch = function(overwrite){
      //if overwrite is not on, check to see if this search name has already been used
      if(!overwrite){
        for(var key in $scope.app.savedSearches){
          if($scope.searchToSave.name === $scope.app.savedSearches[key].name){
            //$scope.searchToOverwrite = $scope.app.savedSearches[key];
            //show warning message
            $scope.searchToSave.overwriteWarning = true;
          }
        }
      }

      //If there are no warnings, go ahead and save this search
      if(!$scope.searchToSave.overwriteWarning){
        //Create a saved search object, and a static copy of that object.
        $scope.savedSearch = {name: $scope.searchToSave.name, searchOptions: $scope.searchOptions, filter: $scope.filter, isAdvanced: $scope.advSearch, approved: $scope.filterVal};
        var searchCopy = angular.copy($scope.savedSearch)
        var searchInfo = {appId:$scope.approvalApp,overwrite: overwrite, search: searchCopy};
        // window.console.log(searchInfo);
        //update application with new saved search
        subService.saveSearch(searchInfo, function(data){
          console.log(data);
           if(!$scope.app.savedSearches || !$scope.app.savedSearches.length){
            $scope.app.savedSearches = []
          }
          //add new saved searches to current scope so no refresh is required
            $scope.app.savedSearches = data.application.savedSearches;
          //show success message
          $scope.searchToSave.success = true;
          $scope.searchToSave.name = null;
        }, function(){
          $scope.searchToSave.error = err;
          console.log("can't save search: " + err);
        });


      }
    }

    $scope.advSearch = false;
    $scope.searchAll = function(tags, approved, page){
        window.console.log('start search');
        $scope.subs=[];
        //get approval counts
        $http({method: 'GET', url: "/elasticSearch/countApproved/" + $scope.approvalApp}).
        success(function(acResults) {
          window.console.log(acResults);
          $scope.info.totalApproved = acResults.approvedCount;
          $scope.info.totalUnapproved = acResults.unapprovedCount;

        });

         //save all the subs into a temporary variable
         $scope.showSearchCond = true;
         var filters = {};
         var allFilters = [];
         var fuzzyFilters = {};
         var rangeFilters = {};

         var rules = $scope.searchOptions.group.rules;
         for(var key in rules){
          // console.log("rule ", rules[key])
          var condition = rules[key].condition;
          var field = rules[key].field.key;
          // $scope.rule.field = 1;

          if(rules[key].field.type=='pastDate' || rules[key].field.type=='futureDate' || rules[key].field.type=='date'||rules[key].field.type=='createdDate'){
            //handle dates
            var date = new Date (rules[key].data);
            //if this is a date, parse it into a valid format for elastic search and set time of day based on condition
            if(rules[key].condition == "lt"){
              rules[key].data = $filter('date')(date,"yyyy'-'MM'-'dd'T00:00:00'");
            } else if(rules[key].condition == "gt"){
              rules[key].data = $filter('date')(date,"yyyy'-'MM'-'dd'T23:59:59'");
            } else {
              rules[key].data = $filter('date')(date,"yyyy'-'MM'-'dd'T05:00:00'");
            }
          }

          if(field.indexOf("mediasets.") == 0){
            //handle mediaset form field
            field = "mediasets.media.mediasetFormData." + field.substring(10);
          } else if (rules[key].field.type=='createdDate'){
            //normal form field
            field = field;
          } else if(field != "_all"){
            //normal form field
            field = "formData." + $scope.approvalApp + "." + field;
          }
          if(field == "_all"){
            allFilters.push(rules[key].data);
          }
          else{
            if(condition == "="){
              filters[field] = rules[key].data;
            } else if(condition == "f"){
              fuzzyFilters[field] = rules[key].data;
            } else{
              if(!rangeFilters[field]){
                rangeFilters[field] = {};
              }
              rangeFilters[field][condition] = rules[key].data;
            }
          }
         }


         // console.log("filters ", filters);
         // console.log("fuzzyfilters ", fuzzyFilters);

        $scope.searchQuery = "/elasticSearch/" + $scope.approvalApp + "/subs.json"
        var data = {};
        if($scope.searchOptions.group.operator == "OR"){
          data.shouldMatch = filters;
          data.shouldFuzzyMatch = fuzzyFilters;
          data.shouldRange = rangeFilters;
          data.shouldAllMatch = allFilters;
        } else{
          data.mustMatch = filters;
          data.mustFuzzyMatch = fuzzyFilters;
          data.mustRange = rangeFilters;
          data.mustAllMatch = allFilters;
        }

        //apply filters
        if(tags){
          if(!data.mustMatch){
            data.mustMatch={};
          }
          data.mustMatch.tags=tags;
        }

        if(approved){
          if(!data.mustMatch){
            data.mustMatch={};
          }
          data.mustMatch.approved=approved.approved
        }

        if(page){
          $scope.pag.bigCurrentPage = page;
        }
        data.pageSize = $scope.pag.itemsPerPage;
        data.page = $scope.pag.bigCurrentPage;

      config ={};
      $http({method: 'POST', url: $scope.searchQuery, data: data}).
      success(function(data) {
        $scope.subs = data.Submissions;
        $scope.pag.bigTotalItems = data.Total;
          });
    }

    $scope.searchDate = function(minDate, maxDate){
      //save all the subs into a temporary variable
      $scope.showSearchCond = true;

      //TODO: this will work for now but change the string at the end to an actual time adjusted for our time zone, instead of just adding 5 hours
      minDate = $filter('date')(minDate, "yyyy'-'MM'-'dd'T00:00:00'");
      maxDate = $filter('date')(maxDate, "yyyy'-'MM'-'dd'T23:59:59'");

      //$scope.searchQueryDate = "/elasticSearch/" + $scope.approvalApp + "/subDate.json?" + "min=" + minDate + "&" + "max=" + maxDate;

      $scope.searchQuery = "/elasticSearch/" + $scope.approvalApp + "/subs.json"
        var data = {};
        data.mustRange = {"createdDate" : {
          "gte" : minDate,
          "lte" : maxDate
        }};

        data.pageSize = $scope.pag.itemsPerPage;
        data.page = $scope.pag.bigCurrentPage;

      $http({method: 'POST', url: $scope.searchQuery, data: data}).
      success(function(data) {
        $scope.subs = data.Submissions;
            // window.console.log($scope.subsSearch);

         $scope.pag.bigTotalItems = data.Total
          });


    }

    //when user is on adv search, and goes back to basic search clean up rules
    $scope.cleanupRules = function(rules){
      if(rules.length > 1){
        for(var i = rules.length - 1;i>=1;i--){
        rules.splice(i, 1);
      }
      }

    }

    //clear the rules on search when user clears search
    $scope.clearRules = function(rules){

        if(!$scope.subsTemp){
          $scope.subsTemp = $scope.subs;
         }


        for(var i = rules.length - 1;i>=0;i--){
         if(i > 0){
          rules.splice(i, 1);
         }
         else{
          rules[i].field = "";
          rules[i].data = "";
         }

        }

        $scope.showSearchCond=false;

    }


    //get a single submission
    $scope.getSubmission = function(value){
      config ={};
      $scope.submissionId = value;

      subService.getSingleSub({id:$scope.submissionId+'.json'}, function(sub){

        $scope.submission = sub;

      formService.getForm({id:sub.appId+'.json'}, function(data){
        $scope.app = data.applicationInfo;

      });




      })
    }

    $scope.getApp = function(value){
      config ={};
      formService.getForm({action:value}, function(data){
        $scope.app = data.applicationInfo;

      });
    }

    $scope.today = new Date();
    $scope.minActiveEndDate = $scope.today;
    $scope.updateMinActiveEndDate = function(){
      if($scope.newSchema.activeStartDate){
        $scope.minActiveEndDate = $scope.newSchema.activeStartDate;
      }
      if ($scope.newSchema.activeEndDate < $scope.newSchema.activeStartDate){
        $scope.newSchema.activeEndDate = null;
      }
    }

    $scope.handleRequireAll = function(isRequired){
      if(!isRequired){
        $scope.newSchema.requireAll = false;
      }
    }

    $scope.auth = {};

    $scope.thisDomain = window.location.hostname;
    if ($scope.thisDomain == 'localhost') $scope.thisDomain = 'localhost:3000'


      $scope.editApp = null;

    $scope.bitly = {isBitly:true};
    //Change bitly link
    $scope.changeBitly = function(){
      $scope.bitly.success = null;
      $scope.bitly.error = null;
      if($scope.bitly.customKeyWord){
      $http.post("/" + $scope.app._id + "/changeTinyUrl",{customKeyWord: $scope.bitly.customKeyWord}).
        success(function(data) {
          console.log("data")
          console.log(data)
          if(!data.error){
            $scope.app.tinyUrl = data.applicationInfo.tinyUrl
            $scope.bitly.success = "Your short url has been updated."
            console.log("Changed tinyurl to " + data.applicationInfo.tinyUrl);
            $scope.bitly.editBitly=false;
            $scope.bitly.customKeyWord = null;
          } else{
            console.log("failed to update tinyurl ");
            console.log(data.error);
              $scope.bitly.error = data.error

          }
        }).
        error(function(data,status){
          console.log("failed to change tinyurl to " + data.url);
          $scope.bitly.error = "Sorry, we encountered an error while trying to change your short URL"
        })
      } else{
        console.log("No custom link keyword defined")
        $scope.bitly.error = "Please enter a custom short URL"
      }
    }

    //Set Compare Flag to True
    $scope.compareFlag = function() {
      if ($scope.compare == false) {
          $scope.compare = true;
      }else{
          $scope.compare = false;
      }
    }

    //Add and Remove submissions IDs to be compared
    $scope.compareSubmissions = function(submissionId, value) {
      if (value == true) {
        var index = $scope.comparedSubmissions.indexOf(submissionId);
        $scope.comparedSubmissions.splice(index, 1);
        $scope.compareSubmission = false;
        // window.console.log('removed', index);
      }else{
        $scope.thisSubmission = submissionId;
        $scope.comparedSubmissions.push($scope.thisSubmission);
        // $scope.compareSubmission = true;
        // window.console.log('added');
      }
    }

    //Filter Submissions in Approval tool to show compared submissions only
    $scope.comparedSubFilter = function(value) {
     return ($scope.comparedSubmissions.indexOf(value._id) !== -1);
    };

    //when admin clicks approved or unapproved
    $scope.setApprovedStatus = function(filterActive, filterKey, filterVal){

      $scope.filterActive = filterActive;
      $scope.filterKey = filterKey;
      $scope.filterVal = filterVal;
      $scope.pag.bigCurrentPage = 1;
      //$scope.setPagTotalItems();


    }

    $scope.appEdit = function(value) {
      if ($scope.edit == 'true') {
        $scope.editApp = value;
        config ={};

        // formService.getForm({action:$scope.editApp},function(data){
        //     $scope.newSchema = data.applicationInfo;

        //       //if wufoo form, set wufooImport to false by default
        //       if($scope.newSchema.importSource == "wufoo"){
        //         $scope.fieldType.types.push({
        //          'name': 'wufooUpload',
        //          'readable': 'Wufoo File Upload',
        //          'description': 'Use this to import photos from Wufoo.'
        //        });
        //       }

        //       for (var i = 0; i < $scope.newSchema.appFormFields.length; i++){
        //         $scope.newSchema.appFormFields[i].isExistingField = true;
        //         if ($scope.newSchema.appFormFields[i].sequenceNumber == undefined){
        //           var sortID = rfc4122.newuuid();
        //           $scope.newSchema.appFormFields[i].sequenceNumber = sortID;
        //         }
        //       }
        // });

                $http.get("/"+$scope.editApp+"/app.json", config, {}).
        success(function(data) {
          $scope.newSchema = data.applicationInfo;

            //if wufoo form, set wufooImport to false by default
            if($scope.newSchema.importSource == "wufoo"){
              $scope.fieldType.types.push({
               'name': 'wufooUpload',
               'readable': 'Wufoo File Upload',
               'description': 'Use this to import photos from Wufoo.'
             });
              // console.log($scope.fieldType);
            }

            for (var i = 0; i < $scope.newSchema.appFormFields.length; i++){
              $scope.newSchema.appFormFields[i].isExistingField = true;
              if ($scope.newSchema.appFormFields[i].sequenceNumber == undefined){
                var sortID = rfc4122.newuuid();
                $scope.newSchema.appFormFields[i].sequenceNumber = sortID;
              }
              //populate replyToOptions
              if($scope.newSchema.appFormFields[i].fieldType == "email"){
                $scope.replyToOptions.push($scope.newSchema.appFormFields[i]);
              }
            }
          });




      } else {
      }
    }

    $scope.validateLabel = function(label) {
      for (index in $scope.newSchema.appFormFields){
        if (label === $scope.newSchema.appFormFields[index].fieldName){
        }

      }
    }

   $scope.requireAll = function() {
      angular.forEach($scope.newSchema.appFormFields, function(obj){

      obj["isMandatory"] = true;

      });
    }


    $scope.requireAllUndo = function() {
      angular.forEach($scope.newSchema.appFormFields, function(obj){

      obj["isMandatory"] = false;

      });
    }

    //Validate Search by Date Range
    $scope.checkSearchDate = function(minDate, maxDate){
      // window.console.log(minDate + maxDate);
      if(minDate >= null && maxDate >= null){
        // window.console.log('all dates');
        if(minDate <= maxDate){
          // window.console.log('move along');
        }
        else{
          // window.console.log('stop!');
        }
      }
      else {
        // window.console.log('no dates');
      }
    }


    $scope.createUniqueId = function(formField,index, ismsFormField, msId, iscondField, optionId){
      if(formField && formField.isExistingField){
        //do nothing
      }
      else{
        if(ismsFormField){
        formField.uniqueId = $filter('nospace')(formField.fieldName) + "_ms_" + msId + "_"+index;
      }
      else if(iscondField){
        formField.uniqueId = $filter('nospace')(formField.fieldName) + "_cond_" + optionId + "_"+index;
      }
      else{
        formField.uniqueId = $filter('nospace')(formField.fieldName) + "_" + index;
      }

      if(formField.fieldType == "mediaSet" || formField.fieldType == "mediaSetDoc" || formField.fieldType == "mediaSetVid" || formField.fieldType == 'mediaSetAudio'){

        var mediasetIndex;
        for (var i = 0;i<$scope.newSchema.mediaSets.length;i++){
          if($scope.newSchema.mediaSets[i] != null && parseInt(formField.mediaSetId)==parseInt($scope.newSchema.mediaSets[i]._id)){
            mediasetIndex = i;
          }
        }
        $scope.newSchema.mediaSets[mediasetIndex].mediaSetName = formField.uniqueId;
      }

      }
    }

    $scope.isAuthenticated = function() {
      var nameEQ = "auth=";
      var ca = document.cookie.split(';');
      for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) {
          var auth = c.substring(nameEQ.length, c.length);
          if (auth == "true"){
            return true
          }
        }
      }
      return false;
    }

    $scope.logout = function() {
    //Since all cookies are session cookies, we only need to remove the data.
    createCookie("auth", "");
  }

  $scope.isCollapsed = true;

  $scope.reset = function() {
    $scope.newSchema.appFormFields = [];
    $scope.newSchema.mediaSets = [];
    $scope.newSchema.tags = [];
    $scope.newSchema.appName = "";
    $scope.newSchema.appDescription = "";
    $scope.newSchema.appUrl = "";
    $scope.newSchema.confirmation = "";
    $scope.newSchema.platformTitle = "";
    $scope.newSchema.callToAction = "";
    $scope.schema.$setPristine();
  };

  $scope.init = function(value,accountId,role,accountType, activeTab, embedCssRef) {
    $scope.newSchema.customerId = $scope.customerId = value;
    $scope.customerRole = role;
    $scope.accountId = accountId;
    $scope.accountType = accountType;
    $scope.activeTab = activeTab;
    $scope.embedCssRef = embedCssRef;
    $scope.supportsHTML5Blob = (window.Blob && window.FileReader)?true:false;
    $scope.msSaveBlob = (navigator.msSaveBlob)?true:false;
    jQuery.support.download = (function(){
          var i = document.createElement('a');
          return 'download' in i;
        })();
    $scope.supportDownload = $.support.download;

  $scope.getAppNames = function(accountId){
    config ={};
    $scope.accountId = accountId;

    formService.getFormNames({id:$scope.accountId}, function(data){
      $scope.appId = data._id;
      $scope.applicationName = data.applicationName;
    })

  }
  var duplicateFormData = window.sessionStorage && window.sessionStorage.getItem("duplicateFormData");
  if (duplicateFormData != null){
    var json = JSON.parse(duplicateFormData);
    $scope.newSchema = json.applicationInfo;
    $scope.newSchema.createdDate = new Date();
    window.sessionStorage && window.sessionStorage.removeItem("duplicateFormData");
  }

  userService.getUser({id:$scope.newSchema.customerId}, function(data){
          $scope.thisCustomer = data.customerInfo[0];
          if($scope.newSchema.categories.length == 0){
            $scope.newSchema.categories.push($scope.thisCustomer.defaultCategory);
          }

  });

  $scope.collapseAllFields();
  $scope.collapseBtn = true;

  }

  $scope.edit = function(value) {
    $scope.edit = value;
  }

  $scope.getAccount = function(accountId){
    $scope.account ={};

    acctService.getAcct({id:accountId}, function(data){
      $scope.account = data.accountInfo;
      if($scope.newSchema && !$scope.newSchema._id && !$scope.newSchema.appId){
        $scope.newSchema.policyURL = $scope.account.defaultPolicyURL;
        $scope.newSchema.tosURL = $scope.account.defaultTosURL;
      }

    })

  }

  $scope.confirm = false;
  $scope.success = false;
  //Minimum dob check age allowed in Sub. The user can choose a higher age for his/her form.
  $scope.minDOBCheckAge = 13;

  $scope.meta = [];

     // Default Application Settings (auto approve, active)
     $scope.newSchema = {
       'appFormFields': [],
       'mediaSets': [],
       'tags': [],
       customerId : null,
       createdDate : new Date(),
       autoApproved: true,
       active: true,
       submissionNotifications: false,
       endUserNotification:false,
       socialShareButtons : false,
       shared: true,
       categories:[],
       defaultImgFieldExt:"jpg",
       requireAll: false,
       submissionLimit: false,
       submissionLimitAmount:100
     };


     $scope.styles = {
      styles:[
      {
        'name': 'none',
        'readable': 'None'
      },
      {
        'name': 'metallic',
        'readable': 'Metallic'
      },
      {
        'name': 'mono',
        'readable': 'Monochromatic'
      },
      {
        'name': 'spring',
        'readable': 'Spring'
      },
      {
        'name': 'winter',
        'readable': 'Winter'
      }
      ]
    };

    $scope.fieldType = {
      'types':[
      {
       'name': 'text',
       'readable': 'Text',
       'description': 'Value MUST be a string.',
       'groupName': 'Standard'
     },{
     'name': 'textarea',
     'readable': 'Paragraph Text',
     'description':  'Text Area',
       'groupName': 'Standard'
   },{
      'name':  'email',
      'readable': 'Email',
      'description': 'Value MUST be email.',
       'groupName': 'Standard'
    },{
       'name': 'number',
       'readable': 'Number',
       'description': 'Value MUST be a number, floating point numbers are allowed.',
       'groupName': 'Standard'
     },
     {
       'name': 'sectionHeader',
       'readable': 'Section Header',
       'description':  'Section Header',
       'groupName': 'Standard'
     },{
       'name': 'subSectionHeader',
       'readable': 'Sub Section Header',
       'description':  'Sub Section Header',
       'groupName': 'Standard'
     },{
       'name': 'radio',
       'readable': 'Multiple choice (radio)',
       'description': 'Radio Button',
       'groupName': 'Standard'
     },{
       'name': 'dropdown',
       'readable': 'Choose from a list (dropdown)',
       'description': 'dropdown',
       'groupName': 'Standard'
     },{
     'name': 'checkbox',
     'readable': 'Checkboxes',
     'description':  'Checkboxes',
       'groupName': 'Standard'
   }
     ,{
       'name': 'mediaSet',
       'readable': 'Image Uploader (jpg, jpeg, png, gif, bmp)',
       'description':  'If you want to create a Photo set / Gallery.',
       'groupName': 'Uploaders'
     },{
       'name': 'mediaSetDoc',
       'readable': 'Document Uploader (doc, txt, xls, pdf)',
       'description':  'If you want to upload a document.',
       'groupName': 'Uploaders'
     },{
       'name': 'mediaSetVid',
       'readable': 'Video Uploader (mov, avi, mp4, wmv)',
       'description':  'If you want to upload a video.',
       'groupName': 'Uploaders'
     },
     {
       'name': 'mediaSetAudio',
       'readable': 'Audio File Uploader (wav, mp3, mp4, mid, wma)',
       'description':  'If you want to upload an audio file.',
       'groupName': 'Uploaders'
     },

     {
       'name': 'date',
       'readable': 'Date',
       'description': 'Value MUST be a date.',
       'groupName': 'Date & Time'
     },
     {
       'name': 'pastDate',
       'readable': 'Past Date (including today)',
       'description': 'Value MUST be a date.',
       'groupName': 'Date & Time'
     },
     {
       'name': 'futureDate',
       'readable': 'Future Date (including today)',
       'description': 'Value MUST be a date.',
       'groupName': 'Date & Time'
     },
     {
       'name': 'time',
       'readable': 'Time',
       'groupName': 'Date & Time'
     },
     {
       'name': 'trueFalse',
       'readable': 'True/False (radio)',
       'description': 'Value MUST be a boolean.',
       'groupName': 'Custom'
     },{
       'name': 'yesNo',
       'readable': 'Yes/No (radio)',
       'description': 'Value MUST be a boolean.',
       'groupName': 'Custom'
     },
   {
     'name': 'firstAndLastName',
     'readable': 'First and Last Name fields',
     'description':  'First and Last Name fields',
       'groupName': 'Custom'
   },
   {
     'name': 'phoneNumber',
     'readable': 'U.S. Phone Number field',
     'description':  'Phone Number field',
       'groupName': 'Custom'
   },
   {
     'name': 'address',
     'readable': 'Address field',
     'description':  'Address field',
     'groupName': 'Custom'
   },
   {
     'name': 'dobCheck',
     'readable': 'Date of Birth Check',
     'description':  'Use this to require a minimum age',
     'groupName': 'Custom'
   }
   // {
   //   'name': 'payment',
   //   'readable': 'Payments',
   //   'description':  'Payment Field',
   //   'groupName': 'Custom'
   // }
   ]
 };

 $scope.tooltips = {
  name:"This is the name of your form; it will appear at the top and let users know what your form is called.",
  url:"Please let us know the web address of the site where you’ll be using your form. Note: This information will not appear anywhere on your form.",
  uniqueId:"This is a machine-readable name without spaces or special characters. It will always remain the same.",
  fieldName:"This is the name of the field",
  replyto:"You may select any email field from this form to supply the reply to header on your notification emails.",
  fieldType:"Here are explanations for some of the fields:<br>Section Header - Use this to provide bolded information to your user<br>Multiple Choice - User can select one item from a radio button list<br>Choose from a list - User can select one item from a dropdown list<br>Checkbox - User can select more than one item from a list using checkboxes<br>Paragraph Text - Use this to provide information to your user ",
  fieldInstructions:"Enter text that explains what you want your users to do. This appears under the field name/question.",
  publicPrivate:"Mark a field as “Private” if you want it to be seen only by admin users. Otherwise, mark it as “Public”.",
  placeholder:"This placeholder text will appear in gray inside the field. It will disappear as soon as the user types in the field.",
  tags:"Use tags to organize your submissions by specific terms. These tags can be edited later. Separate individual tags using commas.",
  status:"This indicates the current status of your form. 'Active' means your form is live for everyone to see. 'Inactive' means no one will see your form.",
  autoApprove:"Use this to moderate and approve your user submissions. Select 'Yes' if you want to reserve the option to approve/not approve each submission. Select “No” if you don't need this feature. ",
  heading:"The default title for your form will be your Form Name. Otherwise, you can designate a separate title here. ",
  description:"Describe your form for users (this will appear below the name of your form). A description could be a tagline or additional information about your form. You can also leave this space blank. ",
  buttonText:"This text will appear inside the button a user will click at the bottom of your form to submit his or her response. ",
  confirmMsg:"Customize the confirmation message users will see after submitting their forms. Or, stick with a default confirmation message.",
  numOfImgs:"Enter the number of images users can upload. ",
  activeEndDate:"Enter the date of when the form should no longer accept submissions. The form will be marked inactive at 11:00PM of selected date.",
  activeStartDate:"Enter the date of when the form should start to accept submissions.",
  inactiveMsg:"Enter a custom message for users to see when the form is inactive.",
  notifications:"When turned on, a notification will be sent to a designated email address (normally the creator of this form) every time this form recieves a submission.",
  endUserNotification :"When turned on, a notification will be sent to the end user's email address confirming the user's form submission",
  endUserNotificationMessage :"This will be prepended to the message that is sent.",
  socialShareButtons :"On the confirmation page shown to the user after form submission the user will be prompted to share this form on Facebook, Twitter and Google+",
  socialTitle : "Some social media platforms require a title for the shared item. For example, this will be the title of this share on a user's Facebook wall",
  socialDescription : "Some social media platforms require a description for the shared item. For example, this will be the description of this share on a user's Facebook wall",
  socialLogo : "Display a custom logo when your form is shared on Facebook instead of the Submission Platform logo",
  logo:"The maximum upload file size is 10 MB. The only file types allowed are jpg, png, jpeg, bmp, and gif.",
  policy:"You have the option to include a link to the privacy policy that your would like displayed on the hosted version of your form. You can set a default policy to use for all forms in your account settings.",
  tos:"You have the option to include a link to the terms of service that your would like displayed on the hosted version of your form. You can set a default policy to use for all forms in your account settings.",
  minAge: "Use this to enforce a minimum age for your end users. Sub only allows restriction of forms to ages 13 and up. You can specify a minimum age older than 13 but not younger.",
  shared:"If you want the form to be visible to everyone in the account or it is a private form that you do not want to share. ",
  categories:"Apply the category the form should be filed under. ",
  required:"If you want all form fields to be required. ",
  conditional:"A conditional field allows you to present the user with different fields based on their answers. ",
  customSubjLine:"If you would like user input to appear in the email's subject line, start typing '@' and all the possible fields will appear.",
  otherField:"Check this, if you would like to add an option called 'Other' and an empty input field."
};

$scope.placeholders = {
  msgNextToDraftBtnPlaceholder:"Default: Click to save your submission to be edited later."

};


  $scope.showEdit = function(){
    if ($scope.edit == true)
      $scope.edit = false;
    else
     $scope.edit = true;
 };

 $scope.newFormField = function(fieldType){
  $scope.collapseBtn = true;
  var sortID = rfc4122.newuuid();
  var array = [];
  fieldObj =  {"fieldType": fieldType.name, "isMandatory":false, "isPublic":true, "readable": fieldType.readable, "sequenceNumber": sortID, "endUserNotification" : false, "isCollapsed":false, "isFocused": true, "isConditional":false, "fieldTypeOptionsArray":array};
  if(fieldType.name == "dobCheck"){
    //set default dob min age to be the minimum require by our app. The user can increase this.
    fieldObj.minAge = $scope.minDOBCheckAge;
  }
  $scope.newSchema.appFormFields.push(fieldObj);

  if(fieldType.name == "mediaSet" ||fieldType.name == "mediaSetDoc" || fieldType.name == "mediaSetVid" ||fieldType.name == "mediaSetAudio"){
    $scope.newMedia(fieldObj);
  }

  if(fieldType.name == "payment"){
    $scope.payments = true;
  }

  if(fieldType.name== "email"){
    $scope.replyToOptions.push($scope.newSchema.appFormFields[$scope.newSchema.appFormFields.length-1]);
  }

};

$scope.shuffleFields = function(){
  var shuffled = [];
  var fieldScope = $scope.newSchema.appFormFields;
  $("input.sequenceNumber").each(function(){
    var val = $(this).val();
    var result = fieldScope.filter(function(fieldScope) {
      return fieldScope.sequenceNumber === val;
    })[0];
    shuffled.push(result);
  });
    // dumb, but have to null the array and $apply() before reassiging
    $scope.newSchema.appFormFields.length = 0;
    $scope.$apply();

    $scope.newSchema.appFormFields = shuffled;
    $scope.isCollapsed = true;
    $scope.$apply();
  };

  $scope.removeFormField = function(index,formField){
    $scope.newSchema.appFormFields.splice(index, 1);
    if(formField.fieldType == "mediaSet" || formField.fieldType =="mediaSetDoc" || formField.fieldType =="mediaSetVid" || formField.fieldType =="mediaSetAudio"){
      var mediasetToDeleteIndex;
        for (var i = 0;i<$scope.newSchema.mediaSets.length;i++){
          if($scope.newSchema.mediaSets[i] != null && parseInt(formField.mediaSetId)==parseInt($scope.newSchema.mediaSets[i]._id)){
            mediasetToDeleteIndex = i;
          }
        }
        $scope.newSchema.mediaSets[mediasetToDeleteIndex] = {};
    }

    //remove deleted email form fields from replyToOptions
    if(formField.fieldType == "email"){
      $scope.removeReplyToOption(formField);
      // for(var c=0; c<$scope.replyToOptions.length;c++){
      //   if(formField.uniqueId == $scope.replyToOptions[c].uniqueId){
      //     $scope.replyToOptions.splice(c, 1);
      //   }
      // }
    }

  };


//Duplicate Form Field
  $scope.duplicateFormField = function(index,formField){
    if(formField.fieldType == "mediaSet" || formField.fieldType =="mediaSetDoc" || formField.fieldType =="mediaSetVid" || formField.fieldType =="mediaSetAudio"){
        var i = index;
        $scope.index = index += 1;
        $scope.duplicateField = angular.copy(formField);
        $scope.originalField = angular.copy(formField);
        $scope.duplicateField.uniqueId = $filter('nospace')($scope.duplicateField.fieldName) + "_" + $scope.index ;
        $scope.duplicateField.mediaSetId = $scope.duplicateField.mediaSetId +=1;
        $scope.mediaSetFormFieldsNew = angular.copy($scope.newSchema.mediaSets[$scope.originalField.mediaSetId].mediaSetFormFields);
        angular.forEach($scope.mediaSetFormFieldsNew, function(value, key) {
            angular.forEach(value, function(v, k) {
              if (k == 'uniqueId'){
                value[k] = v += 1;
              }else{
              }
            });
        });
        $scope.mediaSetName = $scope.newSchema.mediaSets[$scope.originalField.mediaSetId].mediaSetName + "_" + $scope.index;
        $scope.duplicateField.isCollapsed = false;
        // window.console.log($scope.duplicateField);
        $scope.newSchema.appFormFields.push($scope.duplicateField);
        $scope.newSchema.mediaSets.push({"_id":$scope.duplicateField.mediaSetId, "numOfMedia":1, "mediaSetType":'image', "mediaSetName": $scope.mediaSetName, "mediaSetFormFields": $scope.mediaSetFormFieldsNew});
        formField.mediaSetType = formField.fieldType;
    } else if(formField.isConditional == true){
      var i = index;
        $scope.index = index += 1;
        $scope.duplicateField = angular.copy(formField);
        $scope.duplicateField.isCollapsed = false;
        $scope.duplicateField.uniqueId = $filter('nospace')($scope.duplicateField.fieldName) + "_" + $scope.index ;
        $scope.fieldTypeOptionsArrayNew = $scope.duplicateField.fieldTypeOptionsArray;
        angular.forEach($scope.fieldTypeOptionsArrayNew, function(value, key) {
          angular.forEach(value, function (v, k) {
            if (k == 'conditionalFields'){
              angular.forEach(v, function (v1, k1) {
                angular.forEach(v1, function (v2, k2) {
                  if (k2 == 'uniqueId'){
                      v1[k2] = v2 += "_" + 1;
                      // console.log(v1[k2]);
                  }
                });
              });
            }
          });
        });
        // console.log($scope.duplicateField);
        $scope.newSchema.appFormFields.push($scope.duplicateField);
    }else{
      $scope.index = index += 1;
      $scope.duplicateField = angular.copy(formField);
      $scope.duplicateField.isCollapsed = false;
      $scope.duplicateField.uniqueId = $filter('nospace')($scope.duplicateField.fieldName) + "_" + $scope.index ;
      $scope.newSchema.appFormFields.push($scope.duplicateField);
      console.log($scope.duplicateField);
    }
  };
    // Create New Media Set

    $scope.newMedia = function(formField){

      var mediaSetId,mediaSetIndex;
      if($scope.newSchema.mediaSets.length == 0) mediaSetId = 0;
      else{
        var id = 0;
        for(var i = 0; i < $scope.newSchema.mediaSets.length; i++){
            if($scope.newSchema.mediaSets[i]._id > id){
              id = $scope.newSchema.mediaSets[i]._id;
            }
        }
        mediaSetId = id;
        mediaSetId++;
      }

      var readableName, readable = '', value;

      for (var i=0;i<$scope.fieldType.types.length;i++){
        readableName = $scope.fieldType.types[i].name,
        readable = $scope.fieldType.types[i].readable
        value = formField.fieldType;
        if(value == readableName){
          formField.readable = readable;
        }
      }

      //If email field type, add this form field to replyToOptions, else, remove it from replyToOptions
      if(formField.fieldType == "email"){
        $scope.replyToOptions.push(formField);
      } else{
        $scope.removeReplyToOption(formField);
      }
      if(formField.fieldType == "mediaSet" || formField.fieldType == "mediaSetDoc" || formField.fieldType == "mediaSetVid" || formField.fieldType == "mediaSetAudio"){
        var mediasetToDeleteIndex;
        for (var i = 0;i<$scope.newSchema.mediaSets.length;i++){
          if($scope.newSchema.mediaSets[i] != null && parseInt(formField.mediaSetId)==parseInt($scope.newSchema.mediaSets[i]._id)){
            mediasetToDeleteIndex = i;
          }
        }
        $scope.newSchema.mediaSets[mediasetToDeleteIndex] = {};
        formField.mediaSetId = mediaSetId;
      }
      if(formField.fieldType == "mediaSet"){
        $scope.newSchema.mediaSets.push({"_id":mediaSetId, "numOfMedia":1, "mediaSetType":'image'});
        formField.mediaSetType = "image";
      }else if(formField.fieldType == "mediaSetDoc"){
        $scope.newSchema.mediaSets.push({"_id":mediaSetId, "numOfMedia":1, "mediaSetType":'document'});
        formField.mediaSetType = "document";
      }else if(formField.fieldType == "mediaSetVid"){
        $scope.newSchema.mediaSets.push({"_id":mediaSetId, "numOfMedia":1, "mediaSetType":'video'});
        formField.mediaSetType = "video";
      }
    else if(formField.fieldType == "mediaSetAudio"){
        $scope.newSchema.mediaSets.push({"_id":mediaSetId, "numOfMedia":1, "mediaSetType":'audio'});
        formField.mediaSetType = "audio";
      }
      else
      {
        $scope.newSchema.mediaSets[formField.mediaSetId] = {};
        delete formField.mediaSetId;
        delete formField.mediaSetType;
      }
    };

    // New meta data field for mediaSet (images only)
    $scope.newMediaField = function(msId){
     for(var i=0;i<$scope.newSchema.mediaSets.length;i++){
      if($scope.newSchema.mediaSets[i].hasOwnProperty("_id")){
        if($scope.newSchema.mediaSets[i]._id == msId){
          if (!$scope.newSchema.mediaSets[i].mediaSetFormFields) {
            $scope.newSchema.mediaSets[i].mediaSetFormFields = [];
          }
          $scope.newSchema.mediaSets[i].mediaSetFormFields.push({"isCollapsed":false,"isMandatory":false, "isPublic":true,"readable": "Text","fieldType": $scope.fieldType.types[0].name});
          }
        }
      }
    };

    // Duplicate meta data field for mediaSet (images only)
    $scope.newMediaFieldDuplicate = function(msId, index, imageFormField){
    console.log($scope.newSchema);
    console.log(msId);
    for(var i=0;i<$scope.newSchema.mediaSets.length;i++){
      if($scope.newSchema.mediaSets[i].hasOwnProperty("_id")){
        if($scope.newSchema.mediaSets[i]._id == msId){
          if (!$scope.newSchema.mediaSets[i].mediaSetFormFields) {
            $scope.newSchema.mediaSets[i].mediaSetFormFields = [];
          }
          $scope.index = index += 1;
          $scope.duplicateField = angular.copy(imageFormField);
          console.log($scope.duplicateField);
          $scope.duplicateField.uniqueId = $scope.duplicateField.uniqueId + "_" + $scope.index ;
          console.log($scope.duplicateField);
          $scope.newSchema.mediaSets[i].mediaSetFormFields.push($scope.duplicateField);
          }
        }
      }
    };



    $scope.review = function (){
      // set the location.hash to the id of
      // the element you wish to scroll to.
      $scope.confirm = true;
      $location.hash('top');
      // call $anchorScroll()
      $anchorScroll();
    };


    $scope.uploadLogo = function(){

      if($scope.uploader.queue.length > 0){
        $scope.uploader.uploadAll();
        $scope.newSchema.logoURL = "//wppup2approved.s3.amazonaws.com/internal/"+$scope.newSchema.logoUploadId+".png";
        console.log($scope.newSchema);
      }
    }

    $scope.cleanMediaSetsArray = function(){
      //clean up mediasets array
      var removeValFromIndex = [];
      for (var i=0;i<$scope.newSchema.mediaSets.length;i++){
        var mediaset = $scope.newSchema.mediaSets[i];
        // console.log(mediaset);
        var prop = "_id";
        if(mediaset!=null && mediaset.hasOwnProperty(prop)){
          //do nothing
          }
          else{
            removeValFromIndex.push(i);
          }
        }
        for(var i = removeValFromIndex.length - 1; i>=0;i--){
          $scope.newSchema.mediaSets.splice(removeValFromIndex[i],1);
        }
    }


    // POST Application to DB
    $scope.addNewApp = function() {
      $scope.uploadLogo();
      $scope.cleanMediaSetsArray();
      $scope.newSchema.accountId = $scope.accountId;
      $scope.newSchema.draftLastSaved = new Date();

      formService.addForm($scope.newSchema, function(data){
            // window.console.log(data);
          $scope.response = data;
          $scope.newSchema.appId = $scope.response.applicationInfo._id;
          $scope.newSchema._id = $scope.response.applicationInfo._id;

          window.console &&  console.log('success - saved', $scope.newSchema.appId);
          $location.hash('top');
          //show success message

          // call $anchorScroll()
          $anchorScroll();
          // console.log("after anchor scroll")
        }, function(){
            // window.console && console.log('error - unsaved', $scope.newSchema);
        });
    };

    $scope.saveForm = function(user, userId){
      if($scope.schema.$invalid){
        $scope.createFormErrors = true;
        return false;
      }
      else{
          $scope.createFormErrors = false;
          $scope.newSchema.draftLastSaved = new Date();
          $scope.newSchema.draftLastSavedUser = user;
          $scope.newSchema.lastSavedUserId = userId;
              if($scope.newSchema.appId || $scope.newSchema._id){
                $scope.updateApp();
                $scope.updateSuccess = true;
                $scope.appCreatedSuccessMsg = false;
              }
              else{
                $scope.addNewApp();
                $scope.updateSuccess = false;
                $scope.appCreatedSuccessMsg = true;
              }
      }

    };

    $scope.thisDomain = window.location.hostname;
    if ($scope.thisDomain == 'localhost') $scope.thisDomain = 'localhost:3000'

      $scope.goToTop = function() {
        $location.hash('top');
    // call $anchorScroll()
    $anchorScroll();
  }

  $scope.updateSub = function(submission) {

    subService.updateSub(submission, function(data){
          if (data.durr) {
            console.log("Update Failed")
          }
        }, function(){
           // console.log("Update Sub Failed");
        });
  }

  $scope.manageTags = {};
  $scope.addTag = function(){
    // window.console.log($filter('lowercase')($scope.manageTags.newTag) + $scope.app.tags);
    if($scope.app.tags.indexOf($filter('lowercase')($scope.manageTags.newTag)) != -1){
      $scope.manageTags.error = "Whoops! This tag already exists.";
    } else {
      $scope.manageTags.error = false;
      $scope.app.tags.push($filter('lowercase')($scope.manageTags.newTag));
      $scope.updateAppTags($scope.app);
    }
    $scope.manageTags.newTag = "";
  }

  $scope.manageTags.removeTag = false;
  $scope.removeTag = function(index){

    var tagsToRemove = []
    tagsToRemove.push($scope.app.tags[index]);
    $scope.app.tags.splice(index,1);
    $scope.updateAppTags($scope.app, tagsToRemove);
  }

  $scope.updateAppTags = function(app, tagsToRemove){

    formService.updateForm(app, function(data){
            if (data.durr) {
              if(!tagsToRemove){
                $scope.removeTag($scope.app.tags.length -1);
              }
              $scope.manageTags.error = "data.durr";
            }
        }, function(){
            if(!tagsToRemove){
              $scope.removeTag($scope.app.tags.length -1);
            }
            $scope.manageTags.error = "Tag Failed";
        });
    //if tagsToRemove specified, remove tags from this form's submissions
    if(tagsToRemove && tagsToRemove.length > 0){
      subService.updateSubTags({id: $scope.app._id, tagsToRemove: tagsToRemove}, function(data){
        if(data.error){
          $scope.manageTags.error = "Error removing tag";
          console.log(data.error);
        } else{
          $scope.getSubs();
        }
        }, function(){
            $scope.manageTags.error = "Tag Failed";
        })
    }

  }

  //UI filter by status and tags
  $scope.filterTagVals = [];
  $scope.filterStatus = ""
  $scope.setfilterTagVals = function(tag, page){
    $scope.tagFilter = true;
    $scope.subs=[];
    if(page){
      $scope.pag.bigCurrentPage = page
    }

    //if it is in the array, remove it
    if($scope.inArray(tag,$scope.filterTagVals)){
      var index = $scope.filterTagVals.indexOf(tag);
      if(index > -1){
        $scope.filterTagVals.splice(index,1);
      }
    }
    //if it is not in the array, add it
    else{
      $scope.filterTagVals.push(tag);
    }

    if($scope.showSearchCond){
      $scope.searchAll($scope.filterTagVals)
    }
    else{
      var tagsParam = ""
      for(tagI in $scope.filterTagVals){
        tagsParam += "&tags[]="+$scope.filterTagVals[tagI].toLowerCase();
        $scope.tagsParam = tagsParam;
      }
      $http.get("/internal/"+$scope.approvalApp+"/subs.json?page="+$scope.pag.bigCurrentPage+"&size="+$scope.pag.itemsPerPage+tagsParam, config, {}).
      success(function(data) {

        if(data.Submissions){
          $scope.subs = data.Submissions;
        }
        else{
          $scope.hasNoSubs = true;
        }
        $scope.info.totalSubs = data.Total;
        $scope.message = data.Message;
        if($scope.subs){
          $scope.pag.bigTotalItems = data.Total;
        }
      });
    }

  }

  $scope.setfilterApproved = function(approved, page){
    $scope.subs=[];
    if(page){
      $scope.pag.bigCurrentPage = page
    }

    $scope.filterKey = "approved";
    $scope.filterVal = (approved)?true:false;

    if($scope.showSearchCond){
      $scope.searchAll(null,{approved:approved})
    }
    else{

      $http.get("/internal/"+$scope.approvalApp+"/subs.json?page="+$scope.pag.bigCurrentPage+"&size="+$scope.pag.itemsPerPage+"&approved="+approved, config, {}).
      success(function(data) {

        if(data.Submissions){
          $scope.subs = data.Submissions;
        }
        else{
          $scope.hasNoSubs = true;
        }
        $scope.info.totalSubs = data.Total;
        $scope.message = data.Message;
        if($scope.subs){
          $scope.pag.bigTotalItems = data.Total;
        }
      });
    }
  }


//check if in array helper function
$scope.inArray = function(needle,haystack)
{
  var count=haystack.length;
  for(var i=0;i<count;i++)
  {
    if(haystack[i]===needle){return true;}
  }
  return false;
}

//bulk actions
$scope.bulkActions = {
  on: false,
  tags: [],
  subs: []
}

$scope.bulkActions.selectAllVis = function(){
  for(var key in $scope.subs){
    $scope.subs[key].isSelected=true;
    $scope.bulkActions.subs.push($scope.subs[key]._id);
  }
}

$scope.bulkActions.deselectAll = function(){
  $scope.bulkActions.subs = [];
  for(var key in $scope.subs){
    $scope.subs[key].isSelected=false;
  }
}

$scope.bulkActions.applyTags = function(){
  //apply tags in bulkactions.tags array to subs in bulkactions.subs array
  subService.bulkAddTags({subs:$scope.bulkActions.subs, tags:$scope.bulkActions.tags}, function(data){
      console.log("tags added: ");
      console.log(data);

      //Update subs in scope b/c sometimes callback is called before change is propegated in Elastic Search
      for(var key in $scope.subs){
        if($scope.subs[key].isSelected){
          $scope.subs[key].isSelected = false;
          for (var tagKey in $scope.bulkActions.tags){
            if(!$scope.subs[key].tags.indexOf($scope.bulkActions.tags[tagKey]) > -1){
              $scope.subs[key].tags.push($scope.bulkActions.tags[tagKey]);
            }
          }
        }
      }
      $scope.bulkActions.subs=[];
    });
}

$scope.bulkActions.removeTags = function(){
  //remove tags in bulkactions.tags array from subs in bulkactions.subs array
  subService.bulkRemoveTags({subs:$scope.bulkActions.subs, tags:$scope.bulkActions.tags}, function(data){
      console.log("tags removed: ");
      console.log(data);

      //Update subs in scope b/c sometimes callback is called before change is propegated in Elastic Search
      for(var key in $scope.subs){
        if($scope.subs[key].isSelected){
          $scope.subs[key].isSelected = false;
          for (var tagKey in $scope.bulkActions.tags){
            var indexOfTag = $scope.subs[key].tags.indexOf($scope.bulkActions.tags[tagKey]);
            if(indexOfTag > -1){
               $scope.subs[key].tags.splice(indexOfTag, 1);
            }

          }
        }
      }
      $scope.bulkActions.subs=[];
    });
}

$scope.bulkActions.deleteSubs = function(){
  //delete subs in bulkactions.subs array
  subService.bulkDeleteSubs({subs:$scope.bulkActions.subs}, function(data){
      console.log("subs deleted: ");
      console.log(data);
      $scope.paginate();
    });
}

$scope.bulkActions.updateSubs = function(id,isSelected){
  console.log(isSelected)
  if(isSelected){
    $scope.bulkActions.subs.push(id)
  }else{
    for (var i=$scope.bulkActions.subs.length-1; i>=0; i--) {
      if ($scope.bulkActions.subs[i] === id) {
          $scope.bulkActions.subs.splice(i, 1);
          break;
      }
    }
  }
}

$scope.pag = {};
$scope.pag.bigTotalItems = 0;
$scope.pag.bigCurrentPage = 1;
$scope.pag.maxSize = 10;
$scope.pag.numPages = 10;
$scope.pag.itemsPerPage = 10;
$scope.pag.otherItemsPerPage = 50;
$scope.tagsParam = "";


$scope.appApprove = function(value) {
  $scope.approvalApp = value;
  config ={};

  // formService.getForm({action:$scope.approvalApp},
  //   function(data){

      // $scope.app = data.applicationInfo;
  //     window.document.title = "Admin | " + $scope.app.appName;
  //     //TODO: move this into a search function so it only runs when a person opens the search gui
  //     $scope.searchFields = [];
  //     // $scope.searchFields.push({name:"Tag", key:"tags"});

  //     angular.forEach($scope.app.appFormFields, function(field , key, index) {
  //       $scope.searchFields.push({name:field.fieldName, key:field.uniqueId, type:field.fieldType});
  //     });

  //     angular.forEach($scope.app.mediaSets, function(mediaset , key, index) {
  //       angular.forEach(mediaset.mediaSetFormFields, function(formField , key, index) {
  //         $scope.searchFields.push({name:"MetaData: " + formField.fieldName, key:"mediasets." + formField.uniqueId});
  //       })
  //     });

  //     if(!$scope.app.autoApproved){
  //       $scope.searchFields.push({name:'Approved', key:"approved"});
  //     }

  // });

          $http.get("/"+$scope.approvalApp+"/app.json", config, {}).
        success(function(data) {
          $scope.app = data.applicationInfo;
                  if($scope.app.tinyUrl){
                  if($scope.app.tinyUrl.indexOf("subpl.at") == -1){
                    $scope.bitly.isBitly=false;
                  } else{
                    var tinyUrlParts = $scope.app.tinyUrl.split("subpl.at/");
                    $scope.bitly.customKeyWord = tinyUrlParts[1];
                  }

                }
                   window.document.title = "Admin | " + $scope.app.appName;
              //TODO: move this into a search function so it only runs when a person opens the search gui
              $scope.searchFields = [];
              // $scope.searchFields.push({name:"Tag", key:"tags"});
              $scope.searchFields.push({name:"Created Date", key:"createdDate", type:"createdDate"})
              $scope.searchFields.push({name:"Search All Fields", key:"_all", type:"searchAll"})

              angular.forEach($scope.app.appFormFields, function(field , key, index) {
                $scope.searchFields.push({name:field.fieldName, key:field.uniqueId, type:field.fieldType});
              });

              angular.forEach($scope.app.mediaSets, function(mediaset , key, index) {
                angular.forEach(mediaset.mediaSetFormFields, function(formField , key, index) {
                  $scope.searchFields.push({name:"MetaData: " + formField.fieldName, key:"mediasets." + formField.uniqueId, type:formField.fieldType});
                })
              });

              if(!$scope.app.autoApproved){
                $scope.searchFields.push({name:'Approved', key:"approved"});
              }
          });








      // Tab Menu Settings
      $scope.tabs = [
      { title:'Submissions', content:'/approval/', href:"/admin/"+$scope.approvalApp, tabName: "subs", url: $scope.approvalApp, icon:'fa fa-database', active:(!$scope.activeTab || $scope.activeTab == 'subs')?true:false },
      { title:'Edit Form', content:'/edit/', href:"/admin/"+$scope.approvalApp+"?tab=edit", tabName:"edit", url: $scope.approvalApp, icon:'fa fa-edit', active:($scope.activeTab == 'edit')?true:false },
      { title:'Share Form', content:'/settings/', href:"/admin/"+$scope.approvalApp+"?tab=share",tabName:"share", url: $scope.approvalApp, icon:'fa fa-share-square-o', active:($scope.activeTab == 'share')?true:false }//,
      // { title:'Search', content:'/search/', url: $scope.approvalApp, icon:'fa fa-search' },
      ];

      $scope.reloadPage = function(tabName){

        window.location.href = window.location.protocol+"//"+window.location.host+"/admin/"+$scope.approvalApp+"?tab="+tabName;
        }

      $scope.getSubs();

    }

    $scope.page=1;
    $scope.size=5;


    $scope.paginate = function(){
      //if search is on, do a new search, otherwise just get subs
      if($scope.showSearchCond){
        $scope.searchAll()
      } else{
        $scope.getSubs()
      }
    }

    $scope.getSubs = function(){
      $scope.subs = [];
      //get subs if filter by tag
      if ($scope.tagFilter) {
          $http.get("/internal/"+$scope.approvalApp+"/subs.json?page="+$scope.pag.bigCurrentPage+"&size="+$scope.pag.itemsPerPage+$scope.tagsParam, config, {}).
          success(function(data) {

          if(data.Submissions){
            $scope.subs = data.Submissions;
          }
          else{
            $scope.hasNoSubs = true;
          }
          $scope.info.totalSubs = data.Total;
          //$scope.info.totalApproved = ($scope.subs)?$filter('filter')($scope.subs,{approved: true}).length:0;
          //$scope.info.totalUnapproved = ($scope.subs)?$filter('filter')($scope.subs,{approved: false}).length:0;
          $scope.message = data.Message;
                if($scope.subs){
                  $scope.pag.bigTotalItems = data.Total;
                }

                $scope.mediaArrays = {};
                angular.forEach($scope.app.mediaSets, function(mediaset , key, index) {
                  $scope.mediaArrays[key] = new Array(mediaset.numOfMedia);
                });

          });
      }

    else{
      //get approval counts
      $http({method: 'GET', url: "/elasticSearch/countApproved/" + $scope.approvalApp}).
      success(function(acResults) {
        $scope.info.totalApproved = acResults.approvedCount;
        $scope.info.totalUnapproved = acResults.unapprovedCount;

      });

      //todo, do agg here and get approved/unapproved counts along with subs.
      $http.get("/internal/"+$scope.approvalApp+"/subs.json?page="+$scope.pag.bigCurrentPage+"&size="+$scope.pag.itemsPerPage, config, {}).
      success(function(data) {

        if(data.Submissions){
          $scope.subs = data.Submissions;
        }
        else{
          $scope.hasNoSubs = true;
        }
        $scope.info.totalSubs = data.Total;
        //$scope.info.totalApproved = ($scope.subs)?$filter('filter')($scope.subs,{approved: true}).length:0;
        //$scope.info.totalUnapproved = ($scope.subs)?$filter('filter')($scope.subs,{approved: false}).length:0;
        $scope.message = data.Message;
              if($scope.subs){
                $scope.pag.bigTotalItems = data.Total;
              }

              $scope.mediaArrays = {};
              angular.forEach($scope.app.mediaSets, function(mediaset , key, index) {
                $scope.mediaArrays[key] = new Array(mediaset.numOfMedia);
              });

      });
     }
    }

    $scope.getNumber = function(num) {
      return new Array(num);
    }

    $scope.deleteSubmission = function(submission, index) {
    subService.deleteSub({id:submission._id}, function(data){
      submission.deleted = true;
    })

    }

    $scope.undoDelete = function(submission) {
      subService.createEmptySubmission(submission, function(data){
            // window.console &&  console.debug('success - submission ' + submission._id + ' restored.');
            //$scope.deletedSub = submission;
            submission.deleted = false;
            //$scope.submissions.splice(index, 1);
            //$(".alert").alert('close')
        }, function(){
           // window.console && console.debug('error - Not restored');
        });

    }

    $scope.updateApproval = function(submission, status) {
      var request = {};
      request.id = submission._id;
      request.approved = status;

      subService.updateApproval(request, function(data){
            // window.console &&  console.debug('success - approval = ' + data);
          submission.approved = status;
          if(status){
            $scope.info.totalApproved++;
            $scope.info.totalUnapproved--;
          }
          else{
            $scope.info.totalApproved--;
            $scope.info.totalUnapproved++;
          }
        }, function(){
            // window.console && console.debug('error - Approval failed' + data);
        });


    }

    $scope.updateApp = function() {
      // window.console &&  console.log('start update app');
      $scope.uploadLogo();
      $scope.cleanMediaSetsArray();
      $scope.newSchema.draftLastSaved = new Date();

      // console.log("newschema in updateApp...");
      // console.log($scope.newSchema);

      formService.updateForm($scope.newSchema, function(data){
           // window.console.log(data);
          $scope.response = data;
          $scope.newSchema.appId = $scope.response.applicationInfo._id;
          // window.console &&  console.debug('success - saved', $scope.newSchema.appId);


          //$scope.importUrl = "/import/" + $scope.newSchema.appId;
          if($scope.newSchema.importRequired){
            $scope.importSubs($scope.newSchema,$scope.newSchema.appId)
          }
        }, function(){
           // window.console && console.debug('error - unsaved', $scope.newSchema);
        });

    };

    $scope.importSubs = function(app, appId) {
      $scope.importMessage = {};
      var importInfo={
        appId:appId,
        importSource:app.importSource
      };
      // $http({method: 'POST', url: '/import/'+appId + '/' + app.importSource}).success(function(data)
      // {
      //   app.importRequired = false;
      //   $scope.importSuccess = "Submissions imported successfully!";
      //   //$window.location.href = "/admin/"+appId;
      // }).
      // error(function(err,status){
      //   $scope.importError = err;
      // })

      subService.importSubs(importInfo, function(data){
           app.importRequired = false;
           $scope.importSuccess = "Submissions imported successfully!";
          //$window.location.href = "/admin/"+appId;
        }, function(){
           $scope.importError = err;
        });


    }


    $scope.supportsHTML5Blob = (window.Blob && window.FileReader)?true:false;
    $scope.isExportingtoSpreadsheet = false;
    $scope.subsToCSV = function(){
      $scope.isExportingtoSpreadsheet = true;
      var formCSV = [];
      var subs;

      $http.get('/external/'+$scope.app._id+'/viewSubs.json')
      .success(function(data,err){
        $scope.isExportingtoSpreadsheet = false;
          subs = data.Submissions;

          subs = $filter('togglableFilter')(subs, $scope.filterKey, $scope.filterVal, $scope.filterActive);
          subs = $filter('tagsFilter')(subs, $scope.filterTagVals);
          // var subs = $scope.subs;
          // console.log('subs',subs);
          subs.forEach(function(sub){
            var newObj = {};
           newObj.id = sub._id;
           newObj.createdDate = $filter('date')(sub.createdDate, 'short');

              //fields
              var appFields = $scope.app.appFormFields;
              var appMediasets = $scope.app.mediaSets;
              var subMediasets = sub.mediasets;
              for(var i = 0; i<appFields.length;i++){
                var thisField = appFields[i];
                if(thisField.fieldType == 'mediaSet' || thisField.fieldType == 'mediaSetDoc'|| thisField.fieldType == 'mediaSetVid' || thisField.fieldType == 'mediaSetAudio'){

                }
                else{
                  if(sub.formData){

                      if((thisField.fieldType == 'radio' || thisField.fieldType == 'dropdown') && thisField.isConditional){

                      newObj[thisField.uniqueId] = sub.formData[thisField.uniqueId].optionValue;


                      //add conditional field responses to csv
                      var condFields = sub.formData[thisField.uniqueId].conditionalFields;
                      for(var k=0;k<condFields.length;k++){
                        returnCorrectFormat(condFields[k]);
                      }
                    }
                    else{
                      returnCorrectFormat(thisField);
                    }

                  }
                  else{
                    newObj[thisField.uniqueId]=" ";
                  }

                  //if this field is empty, make it a string so it will be preserved by json parse
                  if(!newObj[thisField.uniqueId]){
                    newObj[thisField.uniqueId]=" ";
                  }






                }


              }

              function returnCorrectFormat(thisField){
                    if(thisField.fieldType == 'date' || thisField.fieldType == 'pastDate' || thisField.fieldType == 'futureDate'){
                      newObj[thisField.uniqueId] = $filter('date')(sub.formData[thisField.uniqueId], 'shortDate');
                    }
                    else if(thisField.fieldType == 'time') {
                      newObj[thisField.uniqueId] = $filter('date')(sub.formData[thisField.uniqueId], 'shortTime');
                    }
                    else if(thisField.fieldType == 'checkbox'){

                      var cbVals = sub.formData[thisField.uniqueId], cbValsConcat="";
                      for(var key in cbVals){
                        if(cbVals.hasOwnProperty(key)){

                          cbValsConcat = cbValsConcat + key + ", "
                        }
                      }
                      newObj[thisField.uniqueId] = cbValsConcat;



                    }
                    else{
                      newObj[thisField.uniqueId] = sub.formData[thisField.uniqueId];
                    }

                  }

              //tags
              var tags = sub.tags.sort(),allTags="";
              for(var i = 0;i<tags.length;i++){
                if(i == (tags.length-1)) {
                  allTags = allTags + tags[i];
                }
                else{

                  allTags = allTags + tags[i] + ', ';
                }

              }
              newObj['tags'] = allTags;


              //mediasets
                  if(subMediasets.length > 0){
                    subMediasets.forEach(function(mediaset, msIndex){
                      if(mediaset){
                        var media = mediaset.media;
                        if(media != null){
                          media.forEach(function(item,itemIndex){
                            newObj['mediaset_'+msIndex+'_item_'+itemIndex+'_fileName']=item.originalName;

                            //mediaset form fields
                            var mediaFields = item.mediasetFormData;
                            for (var key in mediaFields){
                              if(mediaFields.hasOwnProperty(key)){
                                newObj['mediaset_'+msIndex+'_item_'+itemIndex+'_'+key]=mediaFields[key];
                              }
                            }
                          })
                        }
                      }
                    })
                  }



              //push newObj to formCSV
              // console.log('newObj', newObj);
              formCSV.push(newObj);
           })
          // console.log('formCSV',formCSV);

          var filteredGridData = JSON.parse(JSON.stringify(formCSV));
          JSONToCSVConvertor(filteredGridData, "submissions.csv", true);

          function JSONToCSVConvertor(JSONData, ReportTitle, ShowLabel) {

            //If JSONData is not an object then JSON.parse will parse the JSON string in an Object
            var arrData = typeof JSONData != 'object' ? JSON.parse(JSONData) : JSONData;
            var CSV = '';
            //This condition will generate the Label/Header
            if (ShowLabel) {
              var row = "";

                //This loop will extract the label from 1st index of on array
                for (var index in arrData[0]) {
                    //Now convert each value to string and comma-seprated
                    row += index + ',';
                  }
                  row = row.slice(0, -1);
                //append Label row with line break
                CSV += row + '\r\n';
              }

            //1st loop is to extract each row
            for (var i = 0; i < arrData.length; i++) {
              var row = "";
                //2nd loop will extract each column and convert it in string comma-seprated
                for (var index in arrData[i]) {
                  row += '"' + arrData[i][index] + '",';
                }
                row.slice(0, row.length - 1);
                //add a line break after each row
                CSV += row + '\r\n';
              }

              if (CSV == '') {
                alert("Invalid data");
                return;
              }

            //this trick will generate a temp "a" tag
            var link = document.createElement("a");
            link.id="lnkDwnldLnk";

            //this part will append the anchor tag and remove it after automatic click
            document.body.appendChild(link);

            var csv = CSV;
            blob = new Blob([csv], { type: 'text/csv' });
            var csvUrl;
            if(window.webkitURL) csvUrl = window.webkitURL.createObjectURL(blob);
            else if(window.URL && window.URL.createObjectURL)csvUrl = window.URL.createObjectURL(blob);
            else csvUrl = null;
            var filename = ReportTitle;
            $scope.msSaveBlob = navigator.msSaveBlob;

            jQuery.support.download = (function(){
              var i = document.createElement('a');
              return 'download' in i;
            })();

            if($.support.download){
              $("#lnkDwnldLnk")
              .attr({
                'download': filename,
                'href': csvUrl
              });
            }
            else if(navigator.msSaveBlob){
              navigator.msSaveBlob(blob, filename);

            }
            else{
              alert("Sorry, this browser doesn't suppor CSV downloads yet.");
            }



            $('#lnkDwnldLnk')[0].click();
            document.body.removeChild(link);
          }

      })
      .error(function(){});






    };

    // $scope.rolodexCSV = function(){
    //   var formCSV = [];
    //   var subs = $scope.rolodex;
    //   // console.log('rolosubs',subs);
    //   subs.forEach(function(sub){
    //     var newObj = {};
    //    newObj.id = sub._id, newObj.createdDate = sub.createdDate;

    //       //fields
    //       var persons = $scope.rolodex;
    //       // console.log(sub);
    //       // console.log(persons);
    //       for(var i = 0; i<persons.length;i++){
    //         var thisField = persons[i];
    //           if(sub.formData){
    //             newObj[thisField.uniqueId] = sub.formData[thisField.uniqueId];
    //           }
    //           else{
    //             newObj[thisField.uniqueId]="";
    //           }
    //         }
    //       //push newObj to formCSV
    //       // console.log('newObj', newObj);
    //       formCSV.push(newObj);
    //    })
    //   // console.log('formCSV',formCSV);

    //   var filteredGridData = JSON.parse(JSON.stringify(formCSV));
    //   JSONToCSVConvertor(filteredGridData, "submissions.csv", true);

    //   function JSONToCSVConvertor(JSONData, ReportTitle, ShowLabel) {

    //     //If JSONData is not an object then JSON.parse will parse the JSON string in an Object
    //     var arrData = typeof JSONData != 'object' ? JSON.parse(JSONData) : JSONData;
    //     var CSV = '';
    //     //This condition will generate the Label/Header
    //     if (ShowLabel) {
    //       var row = "";

    //         //This loop will extract the label from 1st index of on array
    //         for (var index in arrData[0]) {
    //             //Now convert each value to string and comma-seprated
    //             row += index + ',';
    //           }
    //           row = row.slice(0, -1);
    //         //append Label row with line break
    //         CSV += row + '\r\n';
    //       }

    //     //1st loop is to extract each row
    //     for (var i = 0; i < arrData.length; i++) {
    //       var row = "";
    //         //2nd loop will extract each column and convert it in string comma-seprated
    //         for (var index in arrData[i]) {
    //           row += '"' + arrData[i][index] + '",';
    //         }
    //         row.slice(0, row.length - 1);
    //         //add a line break after each row
    //         CSV += row + '\r\n';
    //       }

    //       if (CSV == '') {
    //         alert("Invalid data");
    //         return;
    //       }

    //     //this trick will generate a temp "a" tag
    //     var link = document.createElement("a");
    //     link.id="lnkDwnldLnk";

    //     //this part will append the anchor tag and remove it after automatic click
    //     document.body.appendChild(link);

    //     var csv = CSV;
    //     blob = new Blob([csv], { type: 'text/csv' });
    //     var csvUrl;
    //     if(window.webkitURL) csvUrl = window.webkitURL.createObjectURL(blob);
    //     else if(window.URL && window.URL.createObjectURL)csvUrl = window.URL.createObjectURL(blob);
    //     else csvUrl = null;
    //     var filename = ReportTitle;

    //     jQuery.support.download = (function(){
    //       var i = document.createElement('a');
    //       return 'download' in i;
    //     })();

    //     if($.support.download){
    //       $("#lnkDwnldLnk")
    //       .attr({
    //         'download': filename,
    //         'href': csvUrl
    //       });
    //     }
    //     else if(navigator.msSaveBlob){
    //       navigator.msSaveBlob(blob, filename);

    //     }
    //     else{
    //       // alert("Sorry :(. This browser doesn't suppor CSV downloads yet.");
    //         $scope.supportsHTML5Blob = false;
    //     }



    //     $('#lnkDwnldLnk')[0].click();
    //     document.body.removeChild(link);
    //   }




    // };

    $scope.printMe = function(){
      $window.print();
    };

    $scope.openSingleSub = function(id){
      $window.open("/submission/"+id,"","left=20, width=600, height=600");
    }


    $scope.collapseAllFields = function(){
      for(var i = 0; i<$scope.newSchema.appFormFields.length;i++){
          $scope.newSchema.appFormFields[i].isCollapsed = true;
      }

    }

    $scope.expandAllFields = function(){
      for(var i = 0; i<$scope.newSchema.appFormFields.length;i++){
          $scope.newSchema.appFormFields[i].isCollapsed = false;
      }

    }

    $scope.checkAllFieldsCollapsed = function(){
    var allFieldsCollapsed = true, allFieldsExpanded = true;
        for(var i = 0; i<$scope.newSchema.appFormFields.length;i++){
          if($scope.newSchema.appFormFields[i].isCollapsed){
            allFieldsExpanded = false;
          }
          else{
            allFieldsCollapsed = false;
          }
      }
      if(allFieldsCollapsed){
        $scope.collapseBtn=false;
      }
      if(allFieldsExpanded){
        $scope.collapseBtn=true;
      }
    };

    $scope.addOption = function(index, uniqueId){
      var length = $scope.newSchema.appFormFields[index].fieldTypeOptionsArray.length;
      $scope.newSchema.appFormFields[index].fieldTypeOptionsArray.push({optionValue:'', formFieldId:uniqueId, optionId:uniqueId+"_"+length, isFocused:true});
    }

    $scope.newConditionalField = function(index, uniqueId){
      for(var i = 0; i<$scope.newSchema.appFormFields.length;i++){
         if($scope.newSchema.appFormFields[i].uniqueId == uniqueId)
         {
            var conditionalFields = $scope.newSchema.appFormFields[i].fieldTypeOptionsArray[index].conditionalFields;


            if(!conditionalFields){$scope.newSchema.appFormFields[i].fieldTypeOptionsArray[index].conditionalFields=[];}
            $scope.newSchema.appFormFields[i].fieldTypeOptionsArray[index].conditionalFields.push({"fieldType": "text", "isMandatory":false, "isPublic":true, "readable": "Text", "endUserNotification" : false, "isCollapsed":false, "isFocused": true, "isConditional":false, "fieldTypeOptionsArray":[]});

         }
      }
    }

    $scope.viewDocument = function(id, seqNum){
      $('#docModal_'+id+'_'+seqNum).modal();
    }


    $scope.openImgEditModal = function(id, seqNum){
      $('#imgEditModal_'+id+'_'+seqNum).modal();
    };

    $scope.saveImgEdit = function(sub, msid, photo){
      var app = sub.appId;
      var uuid = msid.uuid;

      subService.updateSubandMed(sub, function(data){
           if (data.durr) {
              window.console.log("Update Failed")
            }
        }, function(){
           window.console.log("Update Sub Failed");
        });

      //transfer photo
      //get domain from URL
      $http.get(pupScan + "transfer/" + app + "/" + msid + "/" + uuid + "/" + sub)
      .then(
        //success callback
        function(data){
          // window.console.log('#imgEditModal_'+sub._id+'_'+photo.sequenceNumber);
          $('#imgEditModal_'+sub._id+'_'+photo.sequenceNumber).modal('hide');
        },
        //error callback
        function(data){}
        );


    }//saveImgEdit


    /* mentio javascript for custom subject line in admin email notification*/
    $scope.searchMentioFields = function(term){
      var fieldList = [];
      angular.forEach($scope.newSchema.appFormFields, function(item){
            if (item.fieldName.toUpperCase().indexOf(term.toUpperCase()) >= 0) {
              if(item.fieldType == 'mediaSet'|| item.fieldType == 'mediaSetVid' || item.fieldType == 'mediaSetDoc' || item.fieldType == 'mediaSetAudio' || item.fieldType == 'sectionHeader'){
                //do nothing
              }
              else{
                fieldList.push(item);
              }
            }
            $scope.mentioFields = fieldList;
            return $q.when(fieldList);
      })
    }

    $scope.getMentioFieldName = function(item){
          return '$' + item.uniqueId + '$';
        };
     /* END: mentio javascript for custom subject line in admin email notification*/

     /* script to add email notification information to the updated location */
     $scope.setEndUserEmailNotifications = function(formField){
      if(formField.fieldType == 'email' && formField.endUserNotification && $scope.newSchema.endUserNotification == undefined){
        $scope.newSchema.endUserNotification = true;
        $scope.newSchema.endUserNotificationSubjectLine = formField.endUserNotificationSubjectLine;
        $scope.newSchema.endUserNotificationMessage = formField.endUserNotificationMessage;
        $scope.newSchema.endUserNotificationEmail = [];
        $scope.newSchema.endUserNotificationEmail.push(formField.uniqueId);
      }

     }



    /*logo uploader*/

    var logoUploader = $scope.uploader = $fileUploader.create({});

    logoUploader.filters.push(function(item /*{File|HTMLInputElement}*/) {

      var type = logoUploader.isHTML5 ? item.type : '/' + item.value.slice(item.value.lastIndexOf('.') + 1);
            var maxSize = 10; //10 MB
            type = '|' + type.toLowerCase().slice(type.lastIndexOf('/') + 1) + '|';

            var isImage = ('|jpg|png|jpeg|bmp|gif|'.indexOf(type) !== -1);
            var isGoodSize = item.size/1024/1024 <= maxSize;

            if(!isImage){
              // console.log(item.name + ": logo is not an image.");
              $scope.logoError = true;
              $scope.logoErrorText = "Looks like you accidentally tried to upload something that was not an image. Allowed file types are jpg, png, jpeg, bmp, and gif. Please try again.";
            }
            if(!isGoodSize){
              // console.log(item.name + ":logo is too large.");
              $scope.logoError = true;
              $scope.logoErrorText = "Looks like your file was too large. The limit is 10 MB. Please try a different one.";
            }
            else{
              $scope.hasError = false;
            }

            return isImage && isGoodSize;
          })
logoUploader.bind('afteraddingfile', function (event, item) {
  console.info('After adding a file', item);
  $scope.newSchema.logoUploadId = ($scope.newSchema.logoUploadId)?$scope.newSchema.logoUploadId:rfc4122.newuuid();
  item.url = pupScan+'internalUpload/'+$scope.newSchema.logoUploadId;
});
logoUploader.bind('whenaddingfilefailed', function (event, item) {
  console.info('When adding a file failed', item);
});

logoUploader.bind('beforeupload', function (event, item) {
  console.info('Before upload', item);
});
logoUploader.bind('progress', function (event, item, progress) {
  console.info('Progress: ' + progress, item);
});

logoUploader.bind('error', function (event, xhr, item, response) {
  console.info('Error', xhr, item, response);
});

logoUploader.bind('complete', function (event, xhr, item, response) {
  console.info('Complete', xhr, item, response);
});
logoUploader.bind('success', function (event, xhr, item, response) {
  console.log('Success', xhr, item, response);
  if(response.status == "success"){
    $scope.newSchema.logoURL = response.data.photoUrl;
  }
});

}])

.controller('subCollapse', ['$scope', function ($scope) {
  $scope.isCollapsed = false;
}]);
