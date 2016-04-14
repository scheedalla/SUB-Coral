angular.module('import.controllers', [
        'ui.bootstrap',
        'uuids',
        'angularFileUpload',
        'subPlatformServices'
    ])

  .controller('ImportCtrl', ['$scope', '$filter','$http', 'rfc4122', '$fileUploader','userService', 'acctService','formService', function ($scope, $filter, $http, rfc4122, $fileUploader, userService, acctService, formService) {
    $scope.customerId = null;
      $scope.init = function(value, accountId, role, accountType) {
        // console.log(accountType);
        $scope.customerId = value;
        $scope.customerRole = role;
        $scope.accountId = accountId;
        $scope.accountType = accountType;        

        userService.getUserForms({id:$scope.customerId}, function(data){
          $scope.applications = data.applicationInfo;
        });          

        // userService.getCustomerSubs({id:$scope.customerId}, function(data){
        //    $scope.submissions = data.Submissions;
        // });              

          userService.getAllUsers({id:$scope.accountId}, function(data){
            $scope.users = data.customers;
        });  

      }

    // $scope.reset = function(value) {
    //   $scope.reset = value;
    // }

    // $scope.initErrorMessages = function(errorMessage,successMessage) {
    //   $scope.errorMessage = errorMessage;
    //   $scope.successMessage = successMessage;
    // }

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
          while (arrMatches = objPattern.exec( csv )){
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

          $scope.csvHeaders = []

          if($scope.importSource == 'wufoo'){
            //if this is a wufoo form, correct for duplicates of checkbox fields
            var lastHeader;
            angular.forEach(arrData[0], function(header,key){
              if(header != lastHeader){
                $scope.csvHeaders.push(header);
              }
              lastHeader = header;
            })
          } else { 
            $scope.csvHeaders = arrData[0];
          }

           angular.forEach($scope.csvHeaders, function(header, key){
            $scope.appjson.appFormFields[key] = {
                                                "isMandatory": false,
                                                "isPublic": true,
                                                "readable": "Text",
                                                "fieldType": "text"
                                              };
            $scope.appjson.appFormFields[key].fieldName = header;
            $scope.appjson.appFormFields[key].importName = header;
            $scope.appjson.appFormFields[key].uniqueId = $filter('nospace')(header) + "_" + key;
            //$scope.appjson.appFormFields[key].uniqueId = header + "_" + key;
            $scope.appjson.appFormFields[key].sequenceNumber = rfc4122.newuuid();

          });          

           //post $scope.appjson           

              formService.addForm($scope.appjson, function(data){
                  $scope.response = data;
                  $scope.appId = $scope.response.applicationInfo._id;                  
                  window.console &&  console.log('success - saved', $scope.appId);  
                  $scope.editUrl = "/edit/" + $scope.appId;  
              }, function(){
                 // window.console && console.log('error - unsaved', $scope.newSchema);
              });  
            

    }

    $scope.csvUrl = "";
    $scope.buttonAction = "Choose a CSV";
    $scope.fileName = "";
    $scope.fileIsUploaded = false;

    $scope.setFile = function(files){
      $scope.$apply(function(scope){
        $scope.fd = new FormData();
        $scope.fd.append("file", files[0]);
        $scope.buttonAction = "Choose another CSV";
        $scope.fileName = files[0].name;
        $scope.fileIsUploaded = true;        
      })
      
    }

    $scope.uploadFile = function() {

      var upId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
            return v.toString(16);});
      //var fd = new FormData();
      //Take the first selected file
      //fd.append("file", files[0]);

      var digitalinkDomain = true;

      var pupScan, thisDomain = window.location.hostname;

      //localhost
      if(thisDomain == 'localhost'){                       
            pupScan = 'pupscantest.digitalink.com';
      }
      //QA
      else if(thisDomain == 'wp-sub-qa.digitalink.com'){            
          pupScan = 'pupscantest.digitalink.com';
      }
      //Prod
      else{            
          pupScan = 'pupscan.washingtonpost.com';
      }    

      $http.post("//" + pupScan + "/photo-uploader/newuploader/internalUpload/" + upId, $scope.fd, {
          headers: {'Content-Type': undefined },
          transformRequest: angular.identity
      }).
      then(
        //success
        function(response){
          $scope.csvUrl = response.data.data.uploadUrl;
          $scope.createApp();
        },
        //error
        function(data, status, error){
          console.log(data + status + error);
        }
      )
    };

    $scope.createApp = function() {
      $scope.appjson = {
        "appFormFields": [],
        "mediaSets": [],
        "tags": [],
        "autoApproved": true,
        "active": true,
        "importRequired" : true,
        "importCsv" : $scope.csvUrl,
        "accountId": $scope.accountId,
        "appName": "My Form",
        "customerId": $scope.customerId,
        "createdDate" : new Date(),
        "logoURL": "//wppup2scanned.s3.amazonaws.com/internal/cedb89e7-49ee-404c-8904-6148db9016d0.png",
        "logoUploadId": "cedb89e7-49ee-404c-8904-6148db9016d0"
      }

      if($scope.importSource == 'wufoo'){
        $scope.appjson.importSource = "wufoo";
      }

      $scope.csv = $http.get($scope.csvUrl).then(function(response){        
        csvParser(response.data);
      });
    }

//csv uploader 
var csvUploader = $scope.uploader = $fileUploader.create({
	autoUpload: false
});

    csvUploader.filters.push(function(item /*{File|HTMLInputElement}*/) {
      // console.log(item);
      var type = csvUploader.isHTML5 ? item.type : '/' + item.value.slice(item.value.lastIndexOf('.') + 1);
            var maxSize = 10; //10 MB
            type = '|' + type.toLowerCase().slice(type.lastIndexOf('/') + 1) + '|';            
            var isCSV = ('|csv|vnd.ms-excel|plain|tsv|'.indexOf(type) !== -1);
            var isGoodSize = item.size/1024/1024 <= maxSize;

            if(!isCSV){
              window.console.log(item.name + ": file is not a csv.");
              $scope.csvError = true;
              $scope.csvErrorText = "Looks like you accidentally tried to upload something that was not a csv.  Please try again.";
            }
            if(!isGoodSize){
              window.console.log(item.name + ":csv is too large.");
              $scope.csvError = true;
              $scope.csvErrorText = "Looks like your file was too large. The limit is 10 MB. Please try a different one.";
            }
            else{
              $scope.hasError = false;
            }

            return isCSV && isGoodSize;
          });

csvUploader.bind('afteraddingfile', function (event, item) {
  console.info('After adding a file', item);  
  		$scope.fd = new FormData();
        $scope.fd.append("file", item.file);
        $scope.buttonAction = "Choose another CSV";
        $scope.fileName = item.file.name;
        $scope.fileIsUploaded = true;       
        $scope.csvError = false; 
});



  }]);  