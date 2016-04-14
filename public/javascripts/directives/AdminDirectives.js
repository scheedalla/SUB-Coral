// Admin Directive
// This Directive has the field preview tempalte, loading indicator and editable form field

angular.module('admin.directives', [
        'ui.bootstrap',
        'localytics.directives',
        'ngSanitize',
        'ngResource',
        'subPlatformServices',
        'modalServices',
        'pasvaz.bindonce'
    ])

//Loading of Page.  Blue line on top of page.
.directive('loadingIndicator', function() {
  return {
    restrict : "A",
    template: '<div class="loading"><div id="circleG"><div id="circleG_1" class="circleG"></div><div id="circleG_2" class="circleG"></div><div id="circleG_3" class="circleG"></div></div></div>',
    link : function(scope, element, attrs) {
      scope.$on("loading-started", function(e) {
        element.css({"display" : ""});
        scope.isLoading = true;
      });

      scope.$on("loading-started-hard", function(e) {
                        element.css({"display" : ""});
                        scope.isLoading = true;
                        scope.isLoadingHard = true;
                    });
      scope.$on("loading-complete", function(e) {
        element.css({"display" : "none"});
        scope.isLoading = false;

      });
      scope.$on("loading-complete-hard", function(e) {
                        element.css({"display" : "none"});
                        scope.isLoading = false;
                        scope.isLoadingHard = false;
                    });

    }
  };
})

 // Directive to generate field types for preview
 .directive('fieldPreview', function($compile, $sce) {
   var fieldTypeTemplates = {
     textTemplate:"<input type='text' placeholder='{{content.placeholder}}' class='form-control' disabled>",
     mediaSetTemplate:"<button class='btn btn-success' disabled>Attach Photo(s)</button>",
     numberTemplate:"<input type='number' placeholder='{{content.placeholder}}' class='form-control' disabled>",
     dateTemplate:"<div class='input-group'><input type='text' class='form-control' disabled><span class='input-group-addon'><i class='fa fa-calendar'></i></span></div>",
     pastDateTemplate:"<div class='input-group'><input type='text' class='form-control' disabled><span class='input-group-addon'><i class='fa fa-calendar'></i></span></div>",
     futureDateTemplate:"<div class='input-group'><input type='text' class='form-control' disabled><span class='input-group-addon'><i class='fa fa-calendar'></i></span></div>",
     dobCheckTemplate:"<div class='input-group'><input type='text' class='form-control' disabled><span class='input-group-addon'><i class='fa fa-calendar'></i></span></div>",
     sectionHeaderTemplate:"<h3 class='section-header'><label>{{content.fieldName}}</label><small><p class='help-block' ng-bind-html='content.descriptionSafe'></p></small></h3>",
     subSectionHeaderTemplate:"<h4 class='sub-section-header'><label>{{content.fieldName}}</label><small><p class='help-block' ng-bind-html='content.descriptionSafe'></p></small></h4>",
     trueFalseTemplate:"<div class='radio'><label><input type='radio'  disabled>True</label></div><div class='radio'><label><input type='radio' disabled>False</label></div>",
     yesNoTemplate:"<div class='radio'><label><input type='radio' disabled>Yes</label></div><div class='radio'><label><input type='radio' disabled>No</label></div>",
     radioTemplate:"<div class='radio' ng-repeat='option in content.fieldTypeOptions.split(\",\") track by $index' ng-hide='content.isConditional'><input type='radio' disabled>{{option}}</div><div class='radio' ng-repeat='option in content.fieldTypeOptionsArray' ng-show='content.isConditional'><label><input type='radio' name='{{content.uniqueId}}' value='{{option.optionValue}}' ng-model='content.uniqueId' ng-required='content.isMandatory' disabled>{{option.optionValue}}</label></div><div ng-repeat='option in content.fieldTypeOptionsArray'><div ng-repeat='condField in option.conditionalFields' ng-show='content.uniqueId==option.optionValue'><label ng-hide='condField.fieldType==\"sectionHeader\"'>{{condField.fieldName}} <span ng-show='condField.isMandatory' class='sub_reqText'>*</span></label><span ng-hide='condField.fieldType==\"sectionHeader\"'><p class='help-block' ng-bind-html='condField.descriptionSafe'></p></span><!--<field-preview content='condField'></field-preview>--></div></div></div></div>",
    dropdownTemplate:"<select class='form-control' disabled  ng-hide='content.isConditional' disabled><option>--Select an option--</option></select><select class='form-control' ng-show='content.isConditional' ng-model='content.uniqueId' ng-options='option.optionValue as option.optionValue for option in content.fieldTypeOptionsArray' disabled><option value=''>--Select an option--</option></select><div ng-repeat='option in content.fieldTypeOptionsArray'><div ng-repeat='condField in option.conditionalFields' ng-show='content.uniqueId==option.optionValue'><label ng-hide='condField.fieldType==\"sectionHeader\"'>{{condField.fieldName}} <span ng-show='condField.isMandatory' class='sub_reqText'>*</span></label><span ng-hide='condField.fieldType==\"sectionHeader\"'><p class='help-block' ng-bind-html='condField.descriptionSafe'></p></span><!--<field-preview content='condField'></field-preview>--></div></div></div></div>",
     emailTemplate:"<input type='email' placeholder='{{content.placeholder}}' class='form-control' disabled>",
     checkboxTemplate:"<div class='checkbox' ng-repeat='option in content.fieldTypeOptions.split(\",\")'><label><input type='checkbox' disabled>{{option}}</label></div>",
     textareaTemplate:"<textarea placeholder='{{content.placeholder}}' class='form-control' disabled></textarea>",
     mediaSetDocTemplate:"<button class='btn btn-success' disabled>Attach Document</button>",
     mediaSetVidTemplate:"<button class='btn btn-success' disabled>Attach Video</button>",
     mediaSetAudioTemplate:"<button class='btn btn-success' disabled>Attach Audio File</button>",
     firstAndLastNameTemplate:"<div class='row'><div class='col-sm-6'><input type='text' placeholder='{{content.placeholder}}' class='form-control' disabled><p class='help-block'>First</p></div><div class='col-sm-6'><input type='text' placeholder='{{content.placeholder}}' class='form-control' disabled><p class='help-block'>Last</p></div></div>",
     phoneNumberTemplate:"<div class='row'><div class='col-sm-1 phone-num'><input type='number' class='form-control' disabled><p class='help-block'>###</p></div><div class='col-sm-1 em-dash'>&#8212;</div><div class='col-sm-1 phone-num'><input type='number' class='form-control' disabled><p class='help-block'>###</p></div><div class='col-sm-1 em-dash'>&#8212;</div><div class='col-sm-1 phone-num'><input type='number' class='form-control' disabled><p class='help-block'>####</p></div></div>",
     addressTemplate:"<div class='row'><div class='col-sm-12'><input type='text' class='form-control' disabled><p class='help-block'>Street Address</p></div></div><div class='row'><div class='col-sm-12'><input type='text' class='form-control' disabled><p class='help-block'>Address Line 2</p></div></div><div class='row'><div class='col-sm-6'><input type='text' class='form-control' disabled><p class='help-block'>City</p></div><div class='col-sm-6'><input type='text' class='form-control' disabled><p class='help-block'>State/Province/Region</p></div></div><div class='row'><div class='col-sm-6'><input type='text' class='form-control' disabled><p class='help-block'>Postal Code</p></div><div class='col-sm-6'><select class='form-control' disabled><option>United States</option></select><p class='help-block'>Country</p></div></div>",
     timeTemplate:"<timepicker ng-disabled ng-model='timeTemp'></timepicker>"

 };

   var getTemplate = function(content){
     var template = {};
       template = fieldTypeTemplates[content.fieldType+'Template'];

     if(typeof template != 'undefined' && template != null) {
       return template;
     }
     else {
       return '';
     }

   }

   var linker = function(scope,element,attrs){

    scope.$watch('content', function(v){
     if(scope.content.description){
       scope.content.descriptionSafe = $sce.trustAsHtml(scope.content.description);
    };

     element.html(getTemplate(v)).show();
     $compile(element.contents())(scope);
   }, true);
  }
  return {
   restrict: "E",
   replace: true,
   link: linker,
   scope: {
     content:'=',
   }
 };
})

//Creates link to media inside of S3 Bucket
.directive('mediaLink', function() {
    return {
      link: function(scope, element, attrs) {
        var href;
          if (attrs.mediasetId != "0") {
            href = attrs.bucketId + "/" +  attrs.mediasetId + "/" + attrs.fileName;
          } else {
            href = attrs.bucketId + "/" + attrs.fileName;
          }
          attrs.$set('href', href);

      }
    }
  })

//Creates link to media source inside of S3 Bucket
.directive('mediaSrc', function() {
    return {
      link: function(scope, element, attrs) {
          if (attrs.mediasetId != "0") {
            attrs.$set('src', attrs.bucketId + "/" +  attrs.mediasetId + "/" + attrs.fileName);
          } else {
            attrs.$set('src', attrs.bucketId + "/" + attrs.fileName);
          }

      }
    }
  })

//Editable Form Fields for Submission Inside of Approval Tool
.directive('editableFormfield', function ($compile,$filter,$http, subService) {
    var subFormTemplates = {
      plainTextTemplate : '<div ng-hide="editOn" ng-click="editOn=true; tempValue=model"><label for="{{formId}}_{{content.fieldName}}" class="question"><span bo-text="content.fieldName"></span>&nbsp;-&nbsp;</label><span class="angular-with-newlines">{{readableModel}}</span></div>',
      wufooUploadTemplate : '<div><label for="{{formId}}_{{content.fieldName}}" class="question"><span bo-text="content.fieldName"></span>&nbsp;-&nbsp;</label><a href="{{readableModel}}">Download From Wufoo <span class="fa fa-download"></a></div>',
      textTemplate : '<div ng-show="editOn" class="form-group"><label for="{{formId}}_{{content.fieldName}}" class="question"><span bo-text="content.fieldName"></span></label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <p ng-show="content.description" class="help-block" bo-text="content.description"></p>  <input type="text" ng-model="model" value="{{model}}" name="{{content.fieldName}}" class="form-control" ng-required="content.isMandatory" placeholder="{{content.placeholder}}"/><span ng-show="">This field is required.</span> </div>',
      numberTemplate : '<div ng-show="editOn" class="form-group"><label for="{{formId}}_{{content.fieldName}}" class="question"><span bo-text="content.fieldName"></span></label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <p ng-show="content.description" class="help-block" bo-text="content.description"></p> <input type="number" ng-model="model" value="{{content.value}}" name="{{content.fieldName}}" id="{{formId}}_{{content.fieldName}}"  class="form-control" ng-required="content.isMandatory" placeholder="{{content.placeholder}}"/> </div>',
      dateTemplate :
      '<div ng-show="editOn" class="form-group"><label for="{{formId}}_{{content.fieldName}}" class="question"><span bo-text="content.fieldName"></span></label><span ng-show="content.isMandatory" class="sub_reqText">*</span> <p ng-show="content.description" class="help-block" bo-text="content.description"></p> <p class="input-group">'+
      '<input type="text" id="{{formId}}_{{content.fieldName}}"  class="form-control" ng-model="model" is-open="opened" ng-required="content.isMandatory" placeholder="{{content.placeholder}}" close-text="Close"  datepicker-popup="{{format}}">{{content.value | date:"yyyy-MM-dd"}}'+
      '<span class="input-group-btn">'+
      '<button class="btn btn-default" ng-click="opened = true;$event.preventDefault();$event.stopPropagation();"><i class="fa fa-calendar"></i></button>'+
      '</span></p></div>',
      pastDateTemplate : '<div ng-show="editOn" class="form-group"><label for="{{formId}}_{{content.fieldName}}" class="question"><span bo-text="content.fieldName"></span></label><span ng-show="content.isMandatory" class="sub_reqText">*</span> <p ng-show="content.description" class="help-block" bo-text="content.description"></p>  <p class="input-group">'+
      '<input type="text" id="{{formId}}_{{content.fieldName}}"  class="form-control" datepicker-popup="{{format}}" ng-model="model" is-open="opened" max="now" show-weeks="false" datepicker-options="dateOptions" ng-required="content.isMandatory" placeholder="{{content.placeholder}}" close-text="Close" />{{content.value | date:"yyyy-MM-dd"}}'+
      '<span class="input-group-btn">'+
      '<button class="btn btn-default" ng-click="opened = true;$event.preventDefault();$event.stopPropagation();"><i class="fa fa-calendar"></i></button>'+
      '</span></p></div>',
      futureDateTemplate : '<div ng-show="editOn" class="form-group"><label for="{{formId}}_{{content.fieldName}}"  class="question"><span bo-text="content.fieldName"></span></label><span ng-show="content.isMandatory" class="sub_reqText">*</span> <p ng-show="content.description" class="help-block" bo-text="content.description"></p>  <p class="input-group">'+
      '<input type="text" id="{{formId}}_{{content.fieldName}}"  class="form-control" datepicker-popup="{{format}}" ng-model="model" is-open="opened" min="now" show-weeks="false" datepicker-options="dateOptions" ng-required="content.isMandatory" placeholder="{{content.placeholder}}" close-text="Close" />{{content.value | date:"yyyy-MM-dd"}}'+
      '<span class="input-group-btn">'+
      '<button class="btn btn-default" ng-click="opened = true;$event.preventDefault();$event.stopPropagation();"><i class="fa fa-calendar"></i></button>'+
      '</span></p></div>',
      dobCheckTemplate : '<p ng-show="editOn">{{readableModel}}<span class="optional-text"> This field is not editable.</span></p>',
      trueFalseTemplate : '<div ng-show="editOn" class="form-group"><label for="{{formId}}_{{content.fieldName}}"  class="question"><span bo-text="content.fieldName"></span></label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <p ng-show="content.description" class="help-block" bo-text="content.description"></p> <div class="radio"> <label><input type="radio" name="{{content.fieldName}}" value="true" ng-model="model" ng-required="content.isMandatory" placeholder="{{content.placeholder}}"/> True </label> </div><div class="radio"><label><input type="radio" name="{{content.fieldName}}" value="false" ng-model="model" ng-required="content.isMandatory"/> False </label> </div></div>',
      yesNoTemplate : '<div ng-show="editOn" class="form-group"><label for="{{formId}}_{{content.fieldName}}"  class="question"><span bo-text="content.fieldName"></span></label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <p ng-show="content.description" class="help-block" bo-text="content.description"></p> <div class="radio"> <label><input type="radio" name="{{content.fieldName}}" value="yes" ng-model="model" ng-required="content.isMandatory" placeholder="{{content.placeholder}}"/> Yes </label> </div><div class="radio"><label><input type="radio" name="{{content.fieldName}}" value="no" ng-model="model" ng-required="content.isMandatory"/> No </label> </div></div>',
      radioTemplate : '<div ng-show="editOn" class="form-group"><label for="{{formId}}_{{content.fieldName}}"  class="question"><span bo-text="content.fieldName"></span></label><span ng-show="content.isMandatory" class="sub_reqText">*</span> <p ng-show="content.description" class="help-block" bo-text="content.description"></p>  <div class="radio" ng-repeat="field in content.fieldTypeOptions.split(\',\') track by $index" ng-hide="content.isConditional"><label><input type="radio" name="{{content.fieldName}}" value="{{field}}" ng-model="$parent.model" ng-required="content.isMandatory"/> {{field}}</label> </div><div class="radio" ng-repeat="option in content.fieldTypeOptionsArray" ng-show="content.isConditional"><label><input type="radio" name="{{content.fieldName}}" ng-value="option" id="{{option.optionId}}" ng-model="$parent.model" ng-required="content.isMandatory"/> {{option.optionValue}}</label> </div></div>',
      dropdownTemplate : '<div ng-show="editOn" class="form-group"><label for="{{formId}}_{{content.fieldName}}"  class="question"><span bo-text="content.fieldName"></span></label> <span ng-show="content.isMandatory" class="sub_reqText">*</span><p ng-show="content.description" class="help-block" bo-text="content.description"></p>  <select ng-model="model" ng-options="option for option in content.fieldTypeOptions.split(\',\')" name="{{content.fieldName}}" id="{{formId}}_{{content.fieldName}}"  class="form-control" ng-required="content.isMandatory" value="{{content.value}}" ng-hide="content.isConditional"> <option value="">-- Select an option --</option> </select> <select ng-model="model" ng-options="option.optionValue as option.optionValue for option in content.fieldTypeOptionsArray" name="{{content.fieldName}}" id="{{formId}}_{{content.fieldName}}"  class="form-control" ng-required="content.isMandatory" value="{{content.value}}" ng-show="content.isConditional"> <option value="">-- Select an option --</option> </select></div>',
      emailTemplate : '<div ng-show="editOn" class="form-group"><label for="{{formId}}_{{content.fieldName}}"  class="question"><span bo-text="content.fieldName"></span></label> <span ng-show="content.isMandatory" class="sub_reqText">*</span><input type="email" ng-model="model" name="{{content.fieldName}}" id="{{formId}}_{{content.fieldName}}"  class="form-control" ng-required="content.isMandatory" placeholder="{{content.placeholder}}"/> </div>',
      checkboxTemplate : '<div ng-show="editOn" class="form-group"><label><span bo-text="content.fieldName"></span></label><span ng-show="content.isMandatory" class="sub_reqText">*</span> <p ng-show="content.description" class="help-block" bo-text="content.description"></p>  <div class="checkbox" ng-repeat="field in content.fieldTypeOptions.split(\',\')" ng-init="$parent.model = $parent.model || {}"><label><input ng-model="$parent.model[field]" type="checkbox" name="{{content.uniqueId}}"/> {{field}} <input type="text" class="form-control" ng-show="$last && content.hasOtherField" ng-model="$parent.model[\'otherVal\']"></label> </div></div>',
      textareaTemplate : '<div ng-show="editOn" class="form-group"><label for="{{formId}}_{{content.fieldName}}"  class="question"><span bo-text="content.fieldName"></span></label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <p ng-show="content.description" class="help-block" bo-text="content.description"></p>  <textarea ng-model="model" name="{{content.fieldName}}" id="{{formId}}_{{content.fieldName}}"  class="form-control" ng-required="content.isMandatory" placeholder="{{content.placeholder}}"></textarea> </div>',
      closeCancelButtons :  '<button ng-show="editOn" ng-click="saveEdit()" ><span class="fa fa-check"></span></button>' +
      '<button ng-show="editOn" ng-click="cancelEdit()" ><span class="fa fa-remove"></span></button>',
      sectionHeaderTemplate:'<div><label><span bo-text="content.fieldName"></span></label></div>',
      subSectionHeaderTemplate:'<div><label><span bo-text="content.fieldName"></span></div>',
      timeTemplate : '<div ng-show="editOn" class="form-group"><label for="{{formId}}_{{content.fieldName}}" class="question"><span bo-text="content.fieldName"></span>}}</label><span ng-show="content.isMandatory" class="sub_reqText">*</span> <p ng-show="content.description" class="help-block" bo-text="content.description"></p> </div>',
      parameterTemplate : '',
      conditionalRadioTemplate:'<div class="row"><div class="col-sm-11 col-sm-offset-1"><div ng-repeat="option in content.fieldTypeOptionsArray"><div ng-repeat="condField in option.conditionalFields"><editable-formfield form-id="application._id" content="condField" model="submission.formData[condField.uniqueId]" submission="submission" ng-show="model.optionValue == option.optionValue"> </editable-formfield></div></div></div></div>',
      conditionalDropdownTemplate:'<div class="row"><div class="col-sm-11 col-sm-offset-1"><div ng-repeat="option in content.fieldTypeOptionsArray"><div ng-repeat="condField in option.conditionalFields"><editable-formfield form-id="application._id" content="condField" model="submission.formData[condField.uniqueId]" submission="submission" ng-show="model == option.optionValue"> </editable-formfield></div></div></div></div>'
};

    var getTemplate = function(scope) {
      var template = {};
        var templateType = subFormTemplates[scope.content.fieldType+'Template'];
          if(templateType != "undefined" && templateType != null && scope.content.fieldType!='sectionHeader' && scope.content.fieldType!='subSectionHeader'&& scope.content.fieldType!='wufooUpload'){
            if((scope.content.fieldType == 'radio' || scope.content.fieldType == 'dropdown')&& scope.content.isConditional){
              var condTemplate;
              if(scope.content.fieldType == 'radio'){
                condTemplate = subFormTemplates['conditionalRadioTemplate'];
              }
              else if(scope.content.fieldType == 'dropdown'){
                condTemplate = subFormTemplates['conditionalDropdownTemplate'];
              }
          template = subFormTemplates[scope.content.fieldType+'Template'] +
                    subFormTemplates['closeCancelButtons'] +
                    subFormTemplates['plainTextTemplate'] +
                    condTemplate;
            }
            else{
              template = subFormTemplates[scope.content.fieldType+'Template'] +
                    subFormTemplates['closeCancelButtons'] +
                    subFormTemplates['plainTextTemplate'] ;
            }

        }
        else if(scope.content.fieldType == 'sectionHeader'|| scope.content.fieldType == 'subSectionHeader'){
          template = subFormTemplates[scope.content.fieldType+'Template'];

        }
        else if(scope.content.fieldType == "wufooUpload"){
          template = subFormTemplates['wufooUploadTemplate'];
        }
        else if(scope.content.fieldType == 'mediaSet' || scope.content.fieldType == 'mediaSetDoc' || scope.content.fieldType == 'mediaSetVid' || scope.content.fieldType == 'mediaSetAudio'){
          //skip these. They'll appear in the mediasets section in approval.ejs
        }

        else{
          template = subFormTemplates['textTemplate'] +
                    subFormTemplates['closeCancelButtons'] +
                    subFormTemplates['plainTextTemplate'] ;

        }
        return template;
    }

    var linker = function(scope, element, attrs) {
      scope.editOn = false;
      scope.tempValue = null;

      scope.setReadableModel = function(){
        if(scope.content.fieldType === 'checkbox'){
        var checked = '',other='', otherVal='';
        var lastSixChars = scope.content.fieldTypeOptions.slice(-6);
        if(scope.content.hasOtherField && lastSixChars !=",Other"){
          scope.content.fieldTypeOptions = scope.content.fieldTypeOptions+",Other";
        }
        angular.forEach(scope.model, function(value , key, index) {
            if(value){
              if(key == 'Other' && scope.content.hasOtherField){
                other = ", "+key + ": ";
              }
              else if(key == 'otherVal' && scope.content.hasOtherField){
                otherVal = value;
              }
              else{
                checked = checked + ", " + key;
              }

            }
          })
        scope.readableModel = checked + other + otherVal;
        }
        else if (scope.content.fieldType === 'radio'){
          if(!scope.content.isConditional){
            scope.readableModel = scope.model;
          }
          else{
            scope.readableModel = (scope.model)?scope.model.optionValue:"";
          }

        }
        else if(scope.content.fieldType === 'futureDate' || scope.content.fieldType === 'pastDate' || scope.content.fieldType === 'date' || scope.content.fieldType === 'time' || scope.content.fieldType === 'dobCheck'){

          var date = new Date(scope.model);
          if ( Object.prototype.toString.call(date) === "[object Date]" ) {
            // it is a date
             if ( date.valueOf() == "" || date.valueOf() == null) {  // d.valueOf() could also work
               // date is not valid
               scope.readableModel = scope.model;
             }
             else {
               // date is valid
               if(scope.content.fieldType === 'futureDate' || scope.content.fieldType === 'pastDate' || scope.content.fieldType === 'date' || scope.content.fieldType === 'dobCheck'){
                scope.readableModel = (scope.model)?$filter('date')(scope.model, "yyyy-MM-dd"):"";
                scope.format = 'yyyy-MM-dd';
               }
               else if(scope.content.fieldType === 'time'){
                scope.readableModel = (scope.model)?$filter('date')(scope.model, "shortTime"):"";

               }

             }
          }
          else {
            scope.readableModel = scope.model
          }

        }
        else{ scope.readableModel = scope.model }
      }

      if(scope.content.fieldType === 'futureDate' || scope.content.fieldType === 'pastDate') { scope.now = Date.now(); }
      scope.setReadableModel();
      element.html(getTemplate(scope)).show();

      scope.cancelEdit = function(){
        scope.editOn = false;
        scope.model = scope.tempValue;
      }

      scope.saveEdit = function(){
        scope.editOn = false;
        if(scope.content.fieldType === 'futureDate' || scope.content.fieldType === 'pastDate' || scope.content.fieldType === 'date'){
          var fullYear = scope.model.getFullYear();
          var date = scope.model.getDate();
          var month = scope.model.getMonth() + 1;
          scope.model = fullYear + "-" + month + "-" + date;
        }
        if(scope.content.fieldType === 'checkbox'){
           var newModel = {};
          angular.forEach(scope.model, function(value , key, index) {
            if(value){
              newModel[key] = value;
            }
          })
          scope.submission.formData[scope.content.uniqueId] = newModel;
        }

            subService.updateSub(scope.submission, function(data){
                scope.response = data;
                scope.setReadableModel();
            }, function(){
            });


      }

      $compile(element.contents())(scope);
    }
    return {
      restrict: "E",
      replace: true,
      link: linker,
      scope: {
        content:'=',
        formId:'=?',
        submission:'=',
        model: '=?'
      }
    };
})


//Editable Form Fields for Media of Submission Inside of Approval Tool
.directive('mediaFormfield', function ($compile,$filter,$http) {
  var template = "<label><span bo-text='field.uniqueId'></span></label> - ";
  var linker = function(scope, element, attrs) {
    angular.forEach(scope.formData, function(value , key, index) {
      if (key == scope.field.uniqueId){
        scope.value = value;
      }
    });

    if(scope.field.fieldType === 'checkbox'){
    var checked = '';
    angular.forEach(scope.value, function(value , key, index) {
        if(value){
          checked = checked + ", " + key;
        }
      })
    scope.readableModel = checked.substring(2);
    }
    else if(scope.field.fieldType === 'futureDate' || scope.field.fieldType === 'pastDate' || scope.field.fieldType === 'date' || scope.field.fieldType === 'time'){

      if(scope.value){
        var date = new Date(scope.value);
        if ( Object.prototype.toString.call(date) === "[object Date]" ) {
            // it is a date
             if ( date.valueOf() == "" || date.valueOf() == null || isNaN(date.valueOf())) {  // d.valueOf() could also work
               // date is not valid
               scope.readableModel = scope.value;
             }
             else {
               // date is valid
               if(scope.field.fieldType === 'futureDate' || scope.field.fieldType === 'pastDate' || scope.field.fieldType === 'date'){
                scope.readableModel = (scope.value)?$filter('date')(scope.value, "yyyy-MM-dd"):"";
                scope.format = 'yyyy-MM-dd';
               }
               else if(scope.field.fieldType === 'time'){
                scope.readableModel = (scope.value)?$filter('date')(scope.value, "shortTime"):"";

               }

             }
          }
          else {
            // not a date
            scope.readableModel = scope.value
          }
      }
      else{
        scope.readableModel = '';
      }

    }
    else{ scope.readableModel = scope.value }


    element.html("<label><span bo-text='field.fieldName'></span></label> - {{readableModel}}").show();
    $compile(element.contents())(scope);


  }

  return {
      restrict: "E",
      replace: true,
      link: linker,
      scope: {
        field:'=',
        formData:'='
      }
    };

})

//Query Builder for Advanced Search.  Multiple fields and values, plus an opperator.
.directive('queryBuilder', ['$compile', function ($compile, $scope) {
    return {
        restrict: 'E',
        scope: {
            group: '=',
            test: '=',
            subsSearch: '='
        },
        templateUrl: '/queryBuilderDirective.html',
        compile: function (element, attrs) {
            var content, directive;
            content = element.contents().remove();
            return function (scope, element, attrs) {

                scope.operators = [
                    { name: '&' },
                    { name: 'OR' }
                ];

                scope.conditions = [
                    // { name: '=',
                    //   symbol: '=' },
                    { name: '=',
                      symbol:'f'},
                    // { name: '<>' },
                     { name: '<',
                        symbol: 'lt' },
                     { name: '<=',
                        symbol: 'lte' },
                     { name: '>',
                        symbol: 'gt' },
                     { name: '>=',
                        symbol: 'gte' }
                ];

                scope.addCondition = function () {
                    scope.group.rules.push({
                        condition: 'f',
                        field: '',
                        data: ''
                    });
                };

                scope.removeCondition = function (index) {
                    scope.group.rules.splice(index, 1);
                };

                scope.addGroup = function () {
                    scope.group.rules.push({
                        group: {
                            operator: '&',
                            rules: []
                        }
                    });
                };

                scope.removeGroup = function () {
                    "group" in scope.$parent && scope.$parent.group.rules.splice(scope.$parent.$index, 1);
                };

                directive || (directive = $compile(content));

                element.append(directive(scope));
            }
        }
    }
}])

//Query builder for basic search.  One Field and one value.
.directive('querySingle', ['$compile', function ($compile, $scope) {
    return {
        restrict: 'E',
        scope: {
            group: '=',
            fields: '=',
            contentType: '='
        },
        templateUrl: '/querySingleDirective.html',
        compile: function (element, attrs) {
            var content, directive;
            content = element.contents().remove();
            return function (scope, element, attrs) {
                scope.searchField = {type:"text"};

                scope.operators = [
                    { name: '&' },
                    { name: 'OR' }
                ];

                scope.conditions = [
                    { name: 'f' }
                ];

                scope.group.rules.push({
                        condition: 'f',
                        field: '',
                        data: ''
                });



                scope.addGroup = function () {
                    scope.group.rules.push({
                        group: {
                            operator: '&',
                            rules: []
                        }
                    });
                };

                scope.removeGroup = function () {
                    "group" in scope.$parent && scope.$parent.group.rules.splice(scope.$parent.$index, 1);
                };

                directive || (directive = $compile(content));

                element.append(directive(scope));
            }
        }
    }
}])


//Creates elements inside Photo Uploader Window
.directive("bnLazySrc",
            ['$window', '$document', function( $window, $document ) {

                var lazyLoader = (function() {

                    var images = [];
                    var renderTimer = null;
                    var renderDelay = 100;
                    var win = $( $window );
                    var doc = $document;
                    var documentHeight = doc.height();
                    var documentTimer = null;
                    var documentDelay = 2000;
                    var isWatchingWindow = false;


                    function addImage( image ) {
                        images.push( image );

                        if ( ! renderTimer ) {
                            startRenderTimer();
                        }

                        if ( ! isWatchingWindow ) {
                            startWatchingWindow();
                        }
                    }

                    function removeImage( image ) {
                        for ( var i = 0 ; i < images.length ; i++ ) {
                            if ( images[ i ] === image ) {
                                images.splice( i, 1 );
                                break;
                            }
                        }

                        if ( ! images.length ) {
                            clearRenderTimer();
                            stopWatchingWindow();
                        }
                    }

                    function checkDocumentHeight() {

                        if ( renderTimer ) {
                            return;
                        }

                        var currentDocumentHeight = doc.height();

                        if ( currentDocumentHeight === documentHeight ) {
                            return;
                        }

                        documentHeight = currentDocumentHeight;
                        startRenderTimer();
                    }

                    function checkImages() {
                        var visible = [];
                        var hidden = [];

                        //  the window dimensions.
                        var windowHeight = win.height();
                        var scrollTop = win.scrollTop();

                        // Calculate the viewport offsets.
                        var topFoldOffset = scrollTop;
                        var bottomFoldOffset = ( topFoldOffset + windowHeight );

                        for ( var i = 0 ; i < images.length ; i++ ) {
                            var image = images[ i ];
                            if ( image.isVisible( topFoldOffset, bottomFoldOffset ) ) {
                                visible.push( image );
                            } else {
                                hidden.push( image );
                            }
                        }

                        for ( var i = 0 ; i < visible.length ; i++ ) {
                            visible[ i ].render();
                        }

                        images = hidden;
                        clearRenderTimer();

                        if ( ! images.length ) {
                            stopWatchingWindow();
                        }
                    }

                    function clearRenderTimer() {
                        clearTimeout( renderTimer );
                        renderTimer = null;
                    }

                    function startRenderTimer() {
                        renderTimer = setTimeout( checkImages, renderDelay );
                    }

                    function startWatchingWindow() {
                        isWatchingWindow = true;
                        win.on( "resize.bnLazySrc", windowChanged );
                        win.on( "scroll.bnLazySrc", windowChanged );
                        documentTimer = setInterval( checkDocumentHeight, documentDelay );
                    }

                    // I stop watching the window for changes in dimension.
                    function stopWatchingWindow() {
                        isWatchingWindow = false;
                        win.off( "resize.bnLazySrc" );
                        win.off( "scroll.bnLazySrc" );
                        clearInterval( documentTimer );
                    }

                    function windowChanged() {
                        if ( ! renderTimer ) {
                            startRenderTimer();
                        }
                    }

                    return({
                        addImage: addImage,
                        removeImage: removeImage
                    });
                })();

                function LazyImage( element ) {
                    var source = null;
                    var isRendered = false;
                    var height = null;

                    function isVisible( topFoldOffset, bottomFoldOffset ) {
                        if ( ! element.is( ":visible" ) ) {
                            return( false );
                        }

                        if ( height === null ) {
                            height = element.height();
                        }

                        var top = element.offset().top;
                        var bottom = ( top + height );

                        return(
                                (
                                    ( top <= bottomFoldOffset ) &&
                                    ( top >= topFoldOffset )
                                )
                            ||
                                (
                                    ( bottom <= bottomFoldOffset ) &&
                                    ( bottom >= topFoldOffset )
                                )
                            ||
                                (
                                    ( top <= topFoldOffset ) &&
                                    ( bottom >= bottomFoldOffset )
                                )
                        );

                    }

                    function render() {
                        isRendered = true;
                        renderSource();
                    }

                    function setSource( newSource ) {
                        source = newSource;
                        if ( isRendered ) {
                            renderSource();
                        }
                    }

                    function renderSource() {
                        element[ 0 ].src = source;
                    }

                    return({
                        isVisible: isVisible,
                        render: render,
                        setSource: setSource
                    });

                }


                function link( $scope, element, attributes ) {
                    var lazyImage = new LazyImage( element );
                    lazyLoader.addImage( lazyImage );
                    attributes.$observe(
                        "bnLazySrc",
                        function( newSource ) {

                            lazyImage.setSource( newSource );

                        }
                    );
                    $scope.$on(
                        "$destroy",
                        function() {
                            lazyLoader.removeImage( lazyImage );
                        }
                    );
                }

                return({
                    link: link,
                    restrict: "A"
                });
            }]
        )

//Downloads Submissions of a Form as a CSV
.directive('csvUrl', function ($compile,$filter,$http) {
      var linker = function(scope, element, attrs) {
        scope.$watch(scope.value, function(value){
          scope.csvUploaded = true;
        })
      }

    return {
      restrict: "E",
      replace: true,
      link: linker,
      scope: {
        csvUploaded:'=',
        value:'='
      }
    };
  })

// Templates included here to reduce HTTP requests for hosted form
  .directive('variedFieldType', function ($compile,$filter,$http) {
      var subFormTemplates = {
        // To reduce HTTP requests
        textTemplate : '<div class="form-group"><label for="{{formId}}_{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <p ng-show="content.description" class="help-block">{{content.description}}</p>  <input type="text" ng-model="model" value="{{content.default}}" name="{{formId}}_{{content.uniqueId}}" class="form-control" ng-required="content.isMandatory" placeholder="{{content.placeholder}}" id="{{formId}}_{{content.uniqueId}}"/><span ng-show="">This field is required.</span> </div>',
        dateTemplate :
        '<div class="form-group"><label for="{{formId}}_{{content.uniqueId}}" >{{content.fieldName}}</label><span ng-show="content.isMandatory" class="sub_reqText">*</span> <p ng-show="content.description" class="help-block">{{content.description}}</p> <p class="input-group">'+
        '<input value="{{content.default}}" type="text" id="{{formId}}_{{content.uniqueId}}"  class="form-control" datepicker-popup="{{format}}" ng-model="model" is-open="opened" min="minDate" show-weeks="false" datepicker-options="dateOptions" ng-required="content.isMandatory" placeholder="{{content.placeholder}}" close-text="Close" />'+
        '<span class="input-group-btn">'+
        '<button class="btn btn-default" ng-click="opened = true;$event.preventDefault();$event.stopPropagation();"><i class="fa fa-calendar"></i></button>'+
        '</span></p></div>',

      };

      var getTemplate = function(type) {
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

      var linker = function(scope, element, attrs) {
        element.html(getTemplate(scope.contentType)).show();

        $compile(element.contents())(scope);
      }

      return {
        restrict: "E",
        replace: true,
        link: linker,
        scope: {
          contentType:'='
        }
      };
    })

//Focus on element when tabbing through hosted form.
  .directive('syncFocusWith', function($timeout, $rootScope) {
    return {
        restrict: 'A',
        scope: {
            focusValue: "=syncFocusWith"
        },
        link: function($scope, $element, attrs) {
            $scope.$watch("focusValue", function(currentValue, previousValue) {
                if (currentValue === true && previousValue) {
                    $element[0].focus();
                }
            })
        }
    }
  })
  ;
