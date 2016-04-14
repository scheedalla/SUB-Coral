/*steps to add 'embedForm'
1. inject 'embedForm' into controller
ex: angular.module('pupApp.controllers', ['angularFileUpload', 'embed'])
  .controller('pupController', function ($scope, $rootScope, $fileUploader, $http, $location, $sce, $modal,$anchorScroll,$timeout, embedForm, $window) { ...


2. call the factory
  $scope.callCreateFormHTML = function(){
    var html = embedForm.createFormHTML($scope)
      $scope.newSchema.formHTML = html;
      $("#test").html(html);
  }   

*/

var embed = angular.module('embed',[]);
embed.factory('embedForm', function () {
    return{
        createFormHTML: function($scope){
        //this is the html for the embedded form --------//
      var html;
      //if the form is not live
      if(!$scope.newSchema.active){
        html = "<h1>"+ $scope.newSchema.appName + "</h1><h3>This platform is currently not accepting submissions.</h3>";
      }
      //the form is live
      else{
        //error messaging at top
        html = "<div class='sub_formErrors sub_reqText' style='display:none;'>Oops! There is a problem with the form, please check and correct below.</div>";
        //app title and description
        var appDescription = ($scope.newSchema.appDescription)?$scope.newSchema.appDescription:"";
        html = html + "<h1>"+ $scope.newSchema.appName + "</h1>" + "<h2>"+ appDescription + "</h2>" + "<h5 class='sub_reqText'>*Required</h5>";
        //hidden fields
        html = html + "<input class='sub_appInfo' type='hidden' name='applicationName.appInfo' value='"+$scope.newSchema.appName+"'>" + "<input class='sub_appInfo' type='hidden' name='approved.appInfo' value='"+$scope.newSchema.autoApproved+"'>" + "<input class='appInfo' type='hidden' name='customerId.appInfo' value='"+$scope.newSchema.customerId+"'>";

        //all the form fields
        angular.forEach($scope.newSchema.appFormFields, function(field, key){

          if (field.isPublic){

            //set up required info
            var req,reqClass,fieldTitle="",fieldHTML = "", options, fieldOption="";
            if (field.isMandatory == "true"){
              req = "<span class='sub_reqText'>*</span>";
              reqClass = "sub_required";
            }
            else{
              req="";
              reqClass="";
            }

            //field Title and Description
            var description = (field.description)?field.description:"";
            fieldTitle = "<h4 class='sub_name'>"+ req + field.fieldName +" <label id='error_id_"+field.uniqueId+"' class='sub_reqText sub_errorMsg' style='display:none;'></label></h4><h5 class='sub_desc'>"+description + "</h5>";

            //placeholder
            var placeholder = (field.placeholder)?field.placeholder:"";  

            switch(field.fieldType){
              case "sectionHeader":
                    fieldHTML = "<h3 class='sub_section-header'>" + field.fieldName +"</h3>";
                    break;                
              case "radio":
              case "checkbox":
                    options = field.fieldTypeOptions.split(',');
                    angular.forEach(options,function(option,key){
                        fieldOption = fieldOption + "<input type='"+field.fieldType+"'class='"+reqClass+" sub_"+field.uniqueId+" 'name='"+field.uniqueId+"' value='"+$.trim(option)+"' id='_"+option+field.uniqueId+"'><label for='"+option+field.uniqueId+"'>"+ $.trim(option) +"</label><br>";
                    });
                    fieldHTML = fieldTitle + fieldOption;
                    break;               
              case "dropdown":
                     options = field.fieldTypeOptions.split(',');
                    angular.forEach(options,function(option,key){
                        fieldOption = fieldOption + "<option value='"+$.trim(option)+"'>"+ $.trim(option)+"</option>";
                    });
                    fieldHTML = fieldTitle + "<select name='"+field.uniqueId+"' class='"+reqClass+"' id='id_"+field.uniqueId+"'>" + fieldOption + "</select>";
                    break;    
              case "trueFalse":
                    fieldHTML = fieldTitle + "<input type='radio' class='"+reqClass+" sub_"+field.uniqueId+"'name='"+field.uniqueId+"' value='true' id='true_"+field.uniqueId+"'><label  for='true_"+field.uniqueId+"' >True</label><br>"+
          "<input type='radio' class='"+reqClass+" sub_"+field.uniqueId+"'name='"+field.uniqueId+"' value='false' id='false_"+field.uniqueId+"' ><label  for='false_"+field.uniqueId+"' >False</label><br>";
                    break; 
              case "textarea":
                    fieldHTML = fieldTitle + "<textarea name='"+field.uniqueId+"' placeholder='"+placeholder+"' class='"+reqClass+"'  id='_"+field.uniqueId+"' value=''></textarea><br>";
                    break;
              case "yesNo":
                    fieldHTML = fieldTitle + "<input type='radio' class='"+reqClass+" sub_"+field.uniqueId+"'name='"+field.uniqueId+"' value='yes' id='yes_"+field.uniqueId+"' ><label  for='yes_"+field.uniqueId+"' >Yes</label><br>"+
          "<input type='radio' class='"+reqClass+" sub_"+field.uniqueId+"'name='"+field.uniqueId+"' value='no' id='no_"+field.uniqueId+"' ><label  for='no_"+field.uniqueId+"' >No</label><br>";
                    break;  
              case "mediaSet":
                    fieldHTML = fieldTitle + "<button onclick=\"createMediasetModal("+field.mediaSetId+")\" type='button'>Upload Photo(s)</button><label id='error_uniqueUploadId"+field.mediaSetId+"' class='sub_reqText errorMsg' style='display:none;'></label><br><br>"+
            "<div id='"+field.mediaSetId+"_modal' style='display:none;position: fixed;top: 0;right: 0;bottom: 0;left: 0;z-index: 99999;background: rgba(0, 0, 0, 0.8);'><div style='width:75%;background-color: white;position: relative;margin: 10px auto;'><a style='font-size: 1.375em;line-height: 1;position: absolute;top: 0.5em;right: 0.6875em;color: #aaaaaa;font-weight: bold;cursor: pointer;text-decoration: none;cursor:pointer;' id='"+field.mediaSetId+"_modalClose'>x</a><br><br><iframe style='width: 99%;height: 500px;border: none;'></iframe></div></div>"+
            "<input type='hidden' class='"+reqClass+"' name='uniqueUploadId.mediaset" + field.mediaSetId + "' >"+
            "<input type='hidden' name='transfered.mediaset" + field.mediaSetId + "' value='false'>"+
            "<input type='hidden' name='mediasetId.mediaset" + field.mediaSetId + "' value='"+field.mediaSetId+"'>"+
            "<div id='uploadedPhoto" + field.mediaSetId + "' style='display:none'></div>";
                    break;  
              case "date":
              case "pastDate":
              case "futureDate":
                    var d = new Date();
                    var thisYear = d.getFullYear();
                    var thisMonth = d.getMonth();
                    var thisDay = d.getDate();
                    var months = ['Jan','Feb','Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct','Nov','Dec'];
                    var numMonth = 1, numArrayMonth = 0, numYear = 1950, days = 31, numDay = 1, futureYear = d.getFullYear(), selectedDay = 1;
                    var monthsLength = months.length;
                    //months
                    var monthsHTML = "<select name='months"+field.uniqueId+".dateComponent' class='"+reqClass+" "+"months"+field.uniqueId+"'>";                    
                    if(field.fieldType == 'futureDate'){
                      numArrayMonth = thisMonth;
                    }                   
                    for (var i = numArrayMonth;i<monthsLength;i++){            
                      monthsHTML = monthsHTML + "<option value='"+ (i + 1)  +"'>"+months[i]+"</option>";
                    }
                    monthsHTML = monthsHTML + "</select>";

                    //days
                    if(field.fieldType == 'futureDate'){
                        numDay = thisDay;
                    }
                    var daysHTML = "<select name='days"+field.uniqueId+".dateComponent' class='"+reqClass+" "+"days"+field.uniqueId+"'>";
                    for (var i = numDay;i<=days;i++){
                      daysHTML = daysHTML + "<option value='"+ i +"'>"+i+"</option>";
                    }
                    daysHTML = daysHTML + "</select>";


                    //years
                    var yearsHTML = "<select name='years"+field.uniqueId+".dateComponent' class='"+reqClass+" "+"years"+field.uniqueId+"'>";
                    if (field.fieldType =='futureDate'){
                        numYear = thisYear;
                        futureYear = thisYear + 10;
                    }          
                    for (var i = numYear;i<=futureYear;i++){
                      yearsHTML = yearsHTML + "<option value='"+ i +"'>"+i+"</option>";
                    }
                    yearsHTML = yearsHTML + "</select>";
                    fieldHTML = fieldTitle + monthsHTML + daysHTML + yearsHTML + "<input type='hidden' name='"+field.uniqueId+"' class='date"+field.uniqueId+"' value='"+numYear+"-"+numMonth+"-"+numDay+"'><br>";
                    // bindCalendarEvents(field.uniqueId, field.fieldType);
                    break;                                     
              default:
                    fieldHTML = fieldTitle + "<input type='"+field.fieldType+"'class='"+reqClass+" sub_"+field.fieldType+" 'name='"+field.uniqueId+"' placeholder='"+placeholder+"' id='id_"+field.uniqueId+"' value=''></input><br>";
                    break;
            }
            html = html + fieldHTML;

          }

        });

      }
      //button text
      var buttonText = ($scope.newSchema.callToAction)?$scope.newSchema.callToAction:"Submit";
      html = html + "<br><button type='submit'>"+buttonText+"</button>";
      //LAST STEP: return the html
          return html;
        }
      }
  })