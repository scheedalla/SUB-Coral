angular.module("subPlatformServices", ['ngResource'])
       .factory('subService', function($resource){
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
       })

       .factory('formService', function($resource){
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
       })

       .factory('userService', function($resource){
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
       })

           .factory('acctService', function($resource){
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
       })
