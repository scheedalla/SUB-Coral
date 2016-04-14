angular.module('approval').controller('BatchCtrl', function ($scope, $http, $timeout) {
    $scope.batch = {};
    $scope.batch.newFormData = {};
    $scope.migrateMedia = true;
    $scope.runBatch = function(migrateMedia) {
      $http({method: 'GET', url: "/" + $scope.batch.appId + "/subs.json"}).
          success(function(data) {
            if(data.error){
              $scope.error = data.error;
            } else {
              $scope.batch.subs = data.Submissions;
              angular.forEach($scope.batch.subs, function(submission, index){
                  $timeout(function(){
                  var ok = true;
                  angular.forEach(submission.formData, function(value, key){
                    // if(!angular.isNumber(key)){
                    //   $scope.error = $scope.error + " This batch won't work here. formData is already an object instead  of an array";
                    //   ok = false;
                    // }
                    //   angular.forEach(value, function(v, k){
                    //     $scope.batch.newFormData[k] = v;
                    //   });
                    
                    var noPunc = key.replace(/[,.?]+/g, '');
                    var lowCase = noPunc.toLowerCase();
                    var newKey = lowCase.replace(/ /g, "_");
                    $scope.batch.newFormData[newKey] = value;
                      

                  });
                 //if you don't want to move media into sub (datelab)
                 if($scope.migrateMedia){
                      



                        var originalName = "";
                          var rotation = null;
                          var crop = null;
                          

                          $scope.batch.newMediaset = [{}];
                          $scope.batch.newMediaset[0].uniqueUploadId = submission.mediasets[0].uniqueUploadId;
                          $scope.batch.newMediaset[0].transfered = submission.mediasets[0].transfered;
                          $scope.batch.newMediaset[0].mediasetId = 0;
                          $scope.batch.newMediaset[0].media = [{
                            mediaId : "b0e06c95-6590-4a8d-9d94-a533f174aacd",
                            originalName : originalName,
                            sequenceNumber : 0,
                            rotation : rotation,
                            crop : crop
                          }];

                          submission.formData = $scope.batch.newFormData;
                          submission.mediasets = $scope.batch.newMediaset;
                          $scope.updateSub(submission);
                      
                    

                  
                      
                    } else{
                    // if you don't want to move media into submission (datelab)
                    submission.formData = $scope.batch.newFormData;
                    $scope.updateSub(submission);
                  }
                });
              },3000);
              if(!$scope.error){
                $scope.success = "Batch ran successfully";
              }
            }
          })
          .error(function(){
            $scope.error = $scope.error + " Can't get submissions";
          });
    }

    $scope.updateSub = function(submission) {
      //this has to be ajax due to a $http bug. $http repeats data on successive calls.
      $.ajax({
                type    : 'POST',
                url     : '/updateSubAndMed',
                data: JSON.stringify(submission),

                contentType: "application/json; charset=utf-8",
                dataType: "json",
                success   : function(data) {
                  // if fails when compared against
                  if (data.durr) {             
                    alert("Update Failed")
                  } 
                }
              })
              .fail(function(){
                alert("Validation Failed");
              }); 
    }


  });  