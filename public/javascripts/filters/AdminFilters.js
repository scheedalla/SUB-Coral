// Social Directive
// This directive controls the social share button actions.  Twitter, facebook, google plus.

angular.module('admin.filters', [])

//Filter to Toggle what Submissions are and aren't visible.  Can be Tags, Approval Status, etc.
.filter('togglableFilter',[function(){
  return function(input, filterKey, filterVal, isFilterActive){
    if(!angular.isDefined(isFilterActive) || !isFilterActive) return input;
    var ret = [];
    if(angular.isDefined(filterKey)){
     angular.forEach(input, function(v){
      var value = v[filterKey];
      if(!angular.isString(value) && !angular.isArray(value)){
        value = new String(value)
      }
      if(value.indexOf(filterVal) !== -1){
       ret.push(v);
     }
   });
   }
   return ret;
 }
}])

//Filter Submissions in Approval Tool by Tag.
.filter('tagsFilter',[function(){
  return function(input, filterTagVals){      
   //helper function
   function arrayContainsAnotherArray(needle, haystack){   	
	  for(var i = 0; i < needle.length; i++){
	    if(haystack.indexOf(needle[i]) === -1)
	       return false;
	  }
	  return true;
	}


   //if filtered by nothing, show all
   if(filterTagVals.length ==0)return input;

   //check the tag filters
   var ret = [],filterKey='tags';
   if(angular.isDefined(filterKey)){
     angular.forEach(input, function(v){
      var value = v[filterKey]; 
      if(value.length != 0 && arrayContainsAnotherArray(filterTagVals,value)){
      	
      	ret.push(v);
      }     
   });
   }   
   	return ret;
   
 }
}])


//Pagination Filter in Approval Tool
.filter('slice', function() {
  return function(arr, currentPage, maxSize, showAll) {
    if(showAll){
      return (arr || []);
    }
    else{
      end = currentPage * maxSize;
      start = end - maxSize;
      return (arr || []).slice(start, end);
    }
  };
})

//Convert Submission Unique ID to human readable Date
.filter('creationDate', [function () {
  return function (value) {
    var dateFromObjectId = parseInt(value.substring(0, 8), 16) * 1000;
    var createdDate = new Date(dateFromObjectId)
    return createdDate;
  };
}])

//Remove Tag from Submissions when that Tag is deleted.
.filter('subsWithTag', [function() {
 return function(subs, removeTag, tag) {
  if(removeTag){
    var subsWithTag = [];
    angular.forEach(subs, function(sub, key, index) {
     if(sub.tags.indexOf(tag) != -1){
       subsWithTag.push(sub);
            }
          })
    return (subsWithTag || []);
  }
  else {
    return (subs || []);
  }
};
}])

//Clean up White Space in Unique ID of Form Fields
.filter('nospace', [function () {
  return function (value) {
    return (!value) ? '' : value.toLowerCase().replace(/[^a-z0-9\s]/gi, '').replace(/[_\s]/g, '_');
  };
}])

//Remove Extension from Media for viewing.
.filter('removeExt', [function () {
  return function (value) {
    var dotPos = value.indexOf(".");
    var bitBeforeDot = value.substring(0,dotPos);     
    return bitBeforeDot;
  };
}])

//Format user data in Telephone Form Field
.filter('tel', function () {
    return function (tel) {
        if (!tel) { return ''; }

        var value = tel.toString().trim().replace(/^\+/, '');

        if (value.match(/[^0-9]/)) {
            return tel;
        }

        var country, city, number;

        switch (value.length) {
            case 10: // +1PPP####### -> C (PPP) ###-####
                country = 1;
                city = value.slice(0, 3);
                number = value.slice(3);
                break;

            case 11: // +CPPP####### -> CCC (PP) ###-####
                country = value[0];
                city = value.slice(1, 4);
                number = value.slice(4);
                break;

            case 12: // +CCCPP####### -> CCC (PP) ###-####
                country = value.slice(0, 3);
                city = value.slice(3, 5);
                number = value.slice(5);
                break;

            default:
                return tel;
        }

        if (country == 1) {
            country = "";
        }

        number = number.slice(0, 3) + '-' + number.slice(3);

        return (country + " (" + city + ") " + number).trim();
    };
})

//Filter to Create Unique ID for all Form Fields
.filter('unique', ['$parse', function ($parse) {

  return function (items, filterOn) {

    if (filterOn === false) {
      return items;
    }

    if ((filterOn || angular.isUndefined(filterOn)) && angular.isArray(items)) {
      var newItems = [],
        get = angular.isString(filterOn) ? $parse(filterOn) : function (item) { return item; };

      var extractValueToCompare = function (item) {
        return angular.isObject(item) ? get(item) : item;
      };

      angular.forEach(items, function (item) {
        var isDuplicate = false;

        for (var i = 0; i < newItems.length; i++) {
          if (angular.equals(extractValueToCompare(newItems[i]), extractValueToCompare(item))) {
            isDuplicate = true;
            break;
          }
        }
        if (!isDuplicate) {
          newItems.push(item);
        }

      });
      items = newItems;
    }
    return items;
  };
}])

.filter('exclude', function(){
  return function(items, name){

    var arrayToReturn = [];        
    for (var i=0; i<items.length; i++){
      if (items[i].name != name) {
        arrayToReturn.push(items[i]);
      }
    }

    return arrayToReturn;
  };
})

//Check if MediaSet Value is null before diplaying Media Set EJS
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

//Condition to filter by inside advanced search
.filter('condition', function(){
  return function(input){
    var cond = input;
    if(cond == "lt"){
      cond = "<";
    }
    else if(cond == "lte"){
      cond = "<=";
    }
    else if(cond == "gt"){
      cond = ">";
    }
    else if(cond == "gte"){
      cond = ">=";
    }
    else if(cond == "f"){
      cond = "=";
    }

    return cond;
  }
})

//Format Document URL for Document Preview in Approval Tool
.filter('docIframeUrl', function ($sce) {
    return function(url) {      
      return $sce.trustAsResourceUrl('//view.officeapps.live.com/op/view.aspx?src='+url);
    };
  })

//Format Audio URL for Audio Preview in Approval Tool
.filter('audioUrl', function ($sce) {
    return function(url) {      
      return $sce.trustAsResourceUrl(url);
    };
  })


//Filter Submissions in Approval tool to show compared submissions only
.filter('comparedSubFilter',function(value) {
 return ($scope.comparedSubmissions.indexOf(value._id) !== -1);
});


;