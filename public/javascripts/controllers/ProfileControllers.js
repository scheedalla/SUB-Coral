angular.module('profile.controllers', [
        'ui.bootstrap',
        'uuids',
        'profile.filters',
        'subPlatformServices',
        'modalServices',
  'pasvaz.bindonce'
    ])

.controller('SettingsCtrl', ['$scope', '$http', 'rfc4122', 'userService', 'acctService', 'formService', 'modals', function ($scope, $http, rfc4122, userService, acctService, formService, modals) {
    $scope.loginRegister = 'New user? Register here!';
    $scope.goRegister = false;
    $scope.forgotPW = false;
    $scope.predicate = '-createdDate';
    $scope.status = null;
    $scope.pass = {};
    $scope.userManagement = {};
    $scope.newUser = {};
    $scope.addNewUser = false;
    // $scope.newUser.role = 'user';
    $scope.loginType = 'sub'; //default login is TWPN


    $scope.quotes = [
      { value: "Hello" }
    ];
    $scope.randomQuote = $scope.quotes[Math.floor(Math.random() * $scope.quotes.length)];

  $scope.addAUser = function(){
     $scope.addNewUser = true;
     $scope.newUser = {};
     $scope.userManagement.success = '';
     $scope.newUser.role = 'user';
  };

  $scope.setUserStatus = function(user,status){
      var updatedUser = user;
      updatedUser.account.status = status;

        userService.updateUserStatus(updatedUser, function(data){
          if(data.error){
            $scope.userManagement.error = data.error;
          } else{
            user = updatedUser;
          }
        }, function(){
           $scope.userManagement.error = "Failed to update user";
        });


  }

  $scope.setUserRole = function(user){
      var updatedUser = user;

        userService.updateUserStatus(updatedUser, function(data){
          if(data.error){
            $scope.userManagement.error = data.error;
          } else{
            user = updatedUser;
          }
        }, function(){
           $scope.userManagement.error = "Failed to update user";
        });
  }


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

  $scope.setDefaultCategory = function(customer){
      userService.updateUser(customer, function(data){});

  }

  $scope.addCategory = function(categoryName, account, customer){
    // $scope.app.tags.indexOf($scope.manageTags.newTag) != -1
    for(i=0;i<account.categories.length;i++){
      if(categoryName.toUpperCase() == account.categories[i].categoryName.toUpperCase()){
        $scope.categoryError = true;
        $scope.categoryErrorValue = categoryName;
        break;
      }
      else{
        $scope.categoryError = false;

      }
    }

    if(!$scope.categoryError){
      var newCategory ={
          "categoryName":categoryName
        }
        account.categories.push(newCategory);
        $scope.updateAccount(account, customer);

    }



  }


  $scope.openDeleteCategoryModal = function(id, account){
    var data = {mustMatch:{"categories._id": id}};
    // console.log("Account id: "+ account._id)
    $http({method: 'POST', url: '/elasticSearch/'+ account._id +'/apps', data: data})
    .success(function(data) {//success

      // console.log("cat data",data);
      // console.log("count ", data.Results.total)
      $scope.catCount = data.Results.total;
      //$scope.numAppWithCategory = data.count;
      $('#deleteCategoryModal_'+id).modal('show');

    })
    .error(function(data){// error
        // console.log("cat error",data);
        $scope.catCount = 0;
        $('#deleteCategoryModal_'+id).modal('show');
      });

  }

 $scope.deleteCategory = function(index, account, id, accountApps, customer){

    if(customer.defaultCategory && customer.defaultCategory._id == id){
      delete customer.defaultCategory;
      $scope.setDefaultCategory(customer);
    }


    account.categories.splice(index,1);
    //remove the category from the account
    $scope.updateAccount(account, customer);
    var catId =id;



    //remove the category from applications
    // $http({method: 'DELETE', url: '/categories/'+, data: catId})
    // .success(function(data) {//success
    // $("#deleteCategoryModal_"+id).modal('hide');
    // $(".fade").removeClass('in modal-backdrop');
    // $("body").removeClass('modal-open');

    // })
    // .error(function(data){// error

    //   });

    formService.deleteCategoryFromForms({id:catId}, function(data){
      $("#deleteCategoryModal_"+id).modal('hide');
      $(".fade").removeClass('in modal-backdrop');
      $("body").removeClass('modal-open');
    })

 }

  $scope.updateAccount = function(account, customer){
    //remove excluded categories
    for(var i = account.categories.length - 1; i >=0;i--){
      k=account.categories[i];
      if(k.exclude){
        account.categories.splice(i,1);
      }
    }

    acctService.updateAccount(account,
      function(data){
        if(customer.defaultCategory == null){

          var last = account.categories[account.categories.length - 1];
          if(typeof last._id == 'undefined'){
            last._id="temp";
            // customer.defaultCategory = "";
          }

        }
    });


  };


  $scope.addUserToAccount = function(accountId) {
    //$scope.newUser.account.acctId = $scope.accountId;
    var user = {
      customerName : $scope.newUser.name,
      userName : $scope.newUser.userName.toLowerCase(),
      emailAddress : $scope.newUser.emailAddress,
      account : {
        acctId : accountId,
        role : $scope.newUser.role
      }
    };
    var registrationData = {
      invite: true,
      user: user
    };

     userService.register(registrationData, function(data){
          if(data.error){
              $scope.userManagement.error = data.error;
            } else {
              $scope.userManagement.success = "An email has been sent to " + $scope.newUser.emailAddress + " with further instructions.";
              $scope.addNewUser = false;
              $scope.newUser = '';
            }
        }, function(){
           $scope.userManagement.error = "Failed to create user";
        });

  }

   $scope.onLoginRegister = function() {
      if($scope.goRegister == false) {
           $scope.goRegister = true;
           $scope.loginRegister = 'Sign In';
       } else {
           $scope.loginRegister = 'New user? Register here!';
           $scope.goRegister = false;
      };
      $scope.hideErrorMsg = true;
    }

  }])

  .controller('AppCtrl', ['$scope', '$filter','$http', 'rfc4122', 'formService', 'userService', 'acctService', 'subService',function ($scope, $filter, $http, rfc4122, formService, userService, acctService, subService) {
    $scope.customerId = null;

      $scope.init = function(value, accountId, role, accountType, isLDAP) {
        $scope.customerId = value;
        $scope.customerRole = role;
        $scope.accountId = accountId;
        $scope.accountType = accountType;
        $scope.isLDAP = isLDAP;
        $scope.activeDate = new Date();
        $scope.pass.change = false;

        $scope.account ={};

        acctService.getAcct({id:accountId}, function(data){
          $scope.account = data.accountInfo;
          //adding all and mine options to categories
          // $scope.account.categories.push({_id:"all",categoryName:"All Forms", exclude:"true"});
          // $scope.account.categories.push({_id:"mine",categoryName:"My Forms", exclude:"true"});
          // if(!$scope.filterCatOption){
          //   $scope.filterCatOption = {_id:"mine",categoryName:"My Forms", exclude:"true"};
          // }

        });

        var updatedUser = {};
        updatedUser._id = $scope.customerId;
        updatedUser.activeDate = $scope.activeDate;

        userService.updateUserLastActiveDate(updatedUser, function(data){
          if(data.error){
            $scope.userManagement.error = data.error;
          } else{
            user = updatedUser;
          }
        }, function(){
           $scope.userManagement.error = "Failed to update user";
        });

         userService.getUserForms({id:$scope.customerId}, function(data){
            $scope.applications = data.applicationInfo;
        });

        acctService.getAcctForms({id:$scope.accountId}, function(data){
             $scope.accountApps = data.acctAppsInfo;
            $scope.customerInfoMap = data.customerinfoMap;
        });

        acctService.getAcctSubs({id:$scope.accountId}, function(data){
             $scope.accountSubs = data.Results;
        });

        userService.getAllUsers({id:$scope.accountId}, function(data){
           $scope.users = data.customers;
        });

        userService.getUser({id:$scope.customerId}, function(data){
          $scope.thisCustomer = data.customerInfo[0];
            // if($scope.thisCustomer.defaultCategory){
            //   $scope.filterCatOption = $scope.thisCustomer.defaultCategory; //default option for filter on forms
            // }
            $scope.filterOption = true;
        });


      }

    $scope.reset = function(value) {
      $scope.reset = value;
    }

     // Last Active Date for User
    $scope.initErrorMessages = function(errorMessage,successMessage, redirect) {
      $scope.errorMessage = errorMessage;
      $scope.successMessage = successMessage;
      $scope.redirectPath = redirect;
    }

    //placeholder offerrings json
    //TODO: replace with json from Lin's paymentech app.
    $scope.offerings = {
      packages: [
      {
        id: "53d145d47304a04920d6c55d",
        price: "49.99",
        duration: 30
      },
      {
        id: "53d1462c7304a04920d6c55e",
        price: "0.00",
        duration: 30
      },
      {
        id : "53fb7eda7304a0492008792d",
        price: "19.99",
        duration: 30
      },
      {
        id : "53fb80207304a0492008edbd",
        price: "29.99",
        duration: 30
      }
      ]
    };

    $scope.userRoles = ['admin', 'user'];




    $scope.changePass = function(isReset) {
      $scope.pass.reset = isReset;
      $scope.pass.error = $scope.pass.success = null;
      if($scope.pass.newPass != $scope.pass.repeatPass){
        $scope.pass.error = "Passwords do not match";
      } else {
        $scope.pass.change = true;
        $http({method: 'POST', url: "/"+ $scope.customerId +"/changePass", data: $scope.pass}).
          success(function(data) {
            if(data.error){
              $scope.pass.error = data.error;
            } else {
              $scope.pass.success = "Password updated";
              $scope.pass.change = false;
            }
          })
          .error(function(){
            $scope.pass.error = "Password update Failed";
            $scope.pass.change = false;
          });
      }
    }

    $scope.activatePlatform = function(application, active) {
      application.active = active;
      if(application.activEndDate != "") application.activeEndDate = "";

        formService.updateForm(application, function(data){
            if(data.durr){
            $scope.error = data.durr;
            }
            else{
              // console.log("Platform status updated");
              angular.forEach($scope.applications, function(app, key){
                if(app._id == application._id){
                  app.active = active;
                }
              })
            }
        }, function(){
           $scope.error = "Platform update failed";
        });
    }

    $scope.deleteWarningCount = 0;

    $scope.deletePlatform = function(application) {
      $scope.deleted = {};

        formService.deleteForm({id: application._id}, function(data){
            if(data.durr){
            $scope.deleted.error = data.durr;
            }
            else{
              $scope.deleteAllSubs(application);
              // console.log("Platform deleted");
              angular.forEach($scope.accountApps, function(value, key){
                if (value._id == application._id){
                  $scope.accountApps[key].deleted = {};
                  $scope.accountApps[key].deleted.success = "Deleted Platform";
                  //$scope.applications.splice(key,1);
                }
              });
            }
        }, function(){
            $scope.deleted.error = "Platform delete failed";
        });

    }

    $scope.deleteAllSubs = function(application){

        subService.deleteAllSubs({id: application._id}, function(data){
          if(data.durr){
            $scope.error = data.durr;
          }
          else{
            // console.log("Submissions deleted");
          }
        }, function(){
           $scope.error = "Submission delete failed";
        });
    }

    $scope.updateSub = function(submission) {
        subService.updateSub(submission, function(data){
            if (data.durr) {
              alert("Update Failed");
            }
        }, function(){
           alert("Validation Failed");
        });

    }

    var indexedApplications = [];

    $scope.applicationsToFilter = function() {
        indexedApplications = [];
        return $scope.applications;
        // return $scope.accountApps;
    }

    $scope.filterApplications = function(application) {
        var newApplication = indexedApplications.indexOf(application.customerId) == -1;
        $scope.appId = application._id;

        if (newApplication) {
            indexedApplications.push(application.customerId);
        }
        return newApplication;
    }

    var indexedSubmissions = [];

    $scope.submissionsToFilter = function() {
        indexedSubmissions = [];
        return $scope.submissions;
    }

    $scope.filterSubmissions = function(submissions) {
        var newSubmissions = indexedSubmissions.indexOf(submissions.appId) == -1;
        if (newSubmissions) {
            indexedSubmissions.push(submissions.appId);
        }
        return newSubmissions;
    }

    $scope.duplicateForm = function(appId){
      console.log("duplicate form clicked");

      formService.getForm({id:appId+'.json'}, function(data){
        delete data.applicationInfo._id;
        delete data.applicationInfo.createdDate;
        data.applicationInfo.customerId = $scope.customerId;
        window.sessionStorage && window.sessionStorage.setItem("duplicateFormData", JSON.stringify(data));
        var tempDomain = (window.location.hostname == 'localhost')?"localhost:3000":window.location.hostname;
        window.location.replace(window.location.protocol+"//"+tempDomain + "/add");
        });
    };

  }]);


//Profile filters
angular.module('profile.filters', [])

.filter('appsByCategory', [function() {
  return function(input, filterCatOption, customerId){
  // console.log('appsByCategory filter called', filterCatOption);
  //if category is all, show all forms
   if(!filterCatOption)  return input;
   else if(filterCatOption._id == 'all') return input;
   else if(filterCatOption._id == 'mine'){
      var ret = [];
      angular.forEach(input, function(v){
        if(v.customerId == customerId){
          ret.push(v);
        }


      });

      return ret;
   }
   else{
    var ret=[];

    angular.forEach(input, function(v){
      if(v.categories.length == 0){
        //do nothing
      }
      else{
        angular.forEach(v.categories, function(cat){
          if(cat!=null && filterCatOption && filterCatOption._id == cat._id){
            ret.push(v);
          }
        })
      }
    })
    return ret;
   }
  }
}])

.filter('sharedApps',function(){
  return function(items, customerId){

      var arrayToReturn = [];
      if(items){
        angular.forEach(items, function(item){

          if(item.shared == true || item.shared == null){
            arrayToReturn.push(item);
          }
          else if(customerId == item.customerId){
            arrayToReturn.push(item);
          }

        })
      }
      return arrayToReturn;

  }
})

.filter('myForms',function(){
  return function(items, filterOption, customerId){

      var arrayToReturn = [];
      if(items && !filterOption){
        angular.forEach(items, function(item){

          if(customerId == item.customerId){
            arrayToReturn.push(item);
          }

        })
      }
      else arrayToReturn = items;
      return arrayToReturn;

  }
})

.filter('hideOptions', function(){
  return function(item,array){

    if(!item) {
      //do nothing
    }
    else{
      for(var i = array.length - 1; i >=0;i--){
      k=array[i];
      if(k.exclude){
        array.splice(i,1);
      }
    }
      return item;
    }


  };
})

.filter('notNull', function(){
  return function(items){
    var arrayToReturn = [];

    if(items){
       for (var i=0; i<items.length; i++){
      if (items[i] != null) {
        arrayToReturn.push(items[i]);
      }
    }
    }


   return arrayToReturn;
  };
})


;
