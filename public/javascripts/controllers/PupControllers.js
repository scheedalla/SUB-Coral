angular.module('pupApp.controllers', ['angularFileUpload', 'uuids', 'ngResource','subPlatformServices', 'loggingModuleServices'])

       .controller('pupController', ['$scope', '$rootScope', '$fileUploader', '$http', '$location', '$sce', '$modal', '$anchorScroll', '$timeout', 'rfc4122', '$window', 'subService', 'subLogService', function ($scope, $rootScope, $fileUploader, $http, $location, $sce, $modal,$anchorScroll,$timeout, rfc4122, $window, subService, subLogService) {
        /******************** BEGIN: custom controller******************/

        //http config parameters for loading
        var config = {};

        //get domain from URL
        //comment this out or set to false if your localhost is localhost:8080
        var digitalinkDomain = false;

        var pupScan, assetBase, thisDomain = window.location.hostname;

        $scope.hasFileReader = ($window.FileReader)?true:false;

        //localhost
        if(thisDomain == 'localhost'){

                //pupScan = '//pupscan.washingtonpost.com/photo-uploader/newuploader/';
                // pupScan = '//10.128.130.35:8080/photo-uploader/newuploader/';
                pupScan = '//pupscantest.digitalink.com/photo-uploader/newuploader/';
                assetBase = '//localhost:3000'
                // pupScan = (digitalinkDomain)?'//localhost.digitalink.com/photo-uploader/newuploader/':'//localhost:8080/photo-uploader/newuploader/';
                //pupScan = '//internal-wp-sub-dev-glassfish-1248513819.us-east-1.elb.amazonaws.com/photo-uploader/newuploader/'
                //pupScan = '//10.128.130.183:8080/photo-uploader/newuploader/';
                // pupScan = '//pupscantest.digitalink.com/photo-uploader/newuploader/';
                // pupScan = (digitalinkDomain)?'//localhost.digitalink.com/photo-uploader/newuploader/':'//localhost:8080/photo-uploader/newuploader/';
                //comment out digitalinkDomain or set to false if your localhost is localhost:8080
        }
        //DEV
        else if(thisDomain == 'wp-sub.wpprivate.com' || thisDomain.indexOf("subsaastest")>-1){
            pupScan = '//pupscantest.digitalink.com/photo-uploader/newuploader/'
            assetBase = '//wp-sub.wpprivate.com'
        }
        //QA
        else if(thisDomain == 'wp-sub-qa.digitalink.com'){
         // else if (thisDomain.indexOf("qa")>-1){
            pupScan = '//pupscantest.digitalink.com/photo-uploader/newuploader/';
            assetBase = '//wp-sub-qa.digitalink.com'
        }
        //STAGE
        else if(thisDomain == 'wp-sub-stage.digitalink.com'){
            //pupScan = '//pupscantest.digitalink.com/photo-uploader/newuploader/';
            pupScan = '//subphoto-stage.digitalink.com/photo-uploader/newuploader/';
            assetBase = '//wp-sub-stage.digitalink.com'
        }
        //Prod
        else if(thisDomain == 'sub.washingtonpost.com'){
            pupScan = '//pupscan.washingtonpost.com/photo-uploader/newuploader/';
            assetBase = '//sub.washingtonpost.com'
        }
        //Prod
        else{
            pupScan = '//pupscan.washingtonpost.com/photo-uploader/newuploader/';
            assetBase = '//sub.washingtonpost.com'
        }

        //TODO: does this work?
        $scope.closeWindow  = function(close) {
            $window.close();
        };

        $scope.goToTop = function (){
            // set the location.hash to the id of
            // the element you wish to scroll to.
            $location.hash('top');
            // call $anchorScroll()
            $anchorScroll();
        };

        //get params from URL
        var pathVars = window.location.pathname.split("/");

        var appId = pathVars[1];
        var msId = pathVars[2];
        var upId = pathVars[3];
        var subId = pathVars[4];

        $scope.upId = upId;

        //config for auto upload
        var uploadedPhotoCount = 0;

        $scope.mediaset = {};
        $scope.application = {};

        //all the potential error messages
        var errorMsgs = {
            invalidMediaSet: "Whoops! You stumbled across an invalid media set. Please try a different one.",
            imageSizeError: "Whoops! Looks like your file was too large. Please try a different one.",
            fileTypeError:"Whoops! Looks like you accidentally tried to upload something that wasn't allowed. Please try again.",
            virusScanError:"",
            deleteFailed:"Whoops! Something went wrong with our servers and we weren't able to delete the file. Please try again.",
            tooManyImages:"Whoops! Looks like too many photos got uploaded. Not all of them made it. Please verify.",
            uploadFailed:"Whoops! Something went wrong with our servers and we weren't able to upload some of your files. Please try again.",
            transferFailed: "Whoops! Something went wrong with our servers and we weren't able to apply changes to your photos."
        };

        var successMsgs = {
            uploadSuccess: "Your image(s) uploaded successfully!"
        };


       var thisSub,thisMediaset,thisMedia;
        //getting the correct mediaset definition from the application object
        $http.jsonp(assetBase+'/'+appId+'/app.jsonp?callback=JSON_CALLBACK', config, {}).success(function(data)

            {
            $scope.application = data.applicationInfo; // response data
            //get the correct mediaset
            if($scope.application != null){
                for (var i=0;i<data.applicationInfo.mediaSets.length;i++){
                    if(data.applicationInfo.mediaSets[i]._id == msId){
                        $scope.mediaset = data.applicationInfo.mediaSets[i];
                    }
                }
            }
            else{
                $scope.hasError=true;
                $scope.mediasetError=true;
                $scope.errorText=errorMsgs.invalidMediaSet;
            }

            }).
            error(function(data,status){
                // console.info("error with get request");
            });

            //getting the temporary submission created in the hosted directive when the PUP modal was opened
            $http.jsonp(assetBase+'/sub/'+subId+'.jsonp?callback=JSON_CALLBACK', config, {}).success(function(data)
            {
               thisSub = data;
                for(var i=0;i<data.mediasets.length;i++){
                    if(data.mediasets[i] && data.mediasets[i].mediasetId == msId){

                        thisMediaset = data.mediasets[i];
                        if(thisMediaset.uniqueUploadId){
                            upId = data.mediasets[i].uniqueUploadId
                        }
                        break;
                    }
                }
                if(!thisMediaset.media){
                   thisMediaset.media =[];
                }
                else{
                }

                thisMedia = $scope.thisMedia = thisMediaset.media;


            }).
            error(function(data,status){
                // console.info("error with get request");
            });





        /**
         * Remove items from the queue and deletes from the database. Remove last: index = -1
         * @param {Item|Number} value
         */



        $scope.deletePhoto = function (seqNum, newUpload) {

            if(newUpload){
                var item = $scope.uploader.queue[ seqNum ];
                    item.uploader.removeFromQueue(item);
                $scope.uploader.progress = $scope.uploader._getTotalProgress();
            }


            $scope.deleteChecked = true;

            $http.get(pupScan + "delete/" + upId + "/" + subId + "/" + $scope.mediaset.numOfMedia + "/" + seqNum + "/timestamp", config, {})
            // success callback
            .then(function (response) {
            if(uploadedPhotoCount>0){
                uploadedPhotoCount--;
            }

                if(newUpload){
                    for(var i=seqNum;i<uploader.queue.length;i++){
                        if(uploader.queue[i].sequenceNumber){
                            uploader.queue[i].sequenceNumber--;
                        }

                }
                }

                if(!newUpload){
                    for(var i=seqNum;i<$scope.thisMedia.length;i++){
                        if($scope.thisMedia[i].sequenceNumber>0){
                            $scope.thisMedia[i].sequenceNumber--;
                        }

                    }
                }

            },
            // error callback
                function(response) {
                    $scope.hasError = true;
                    $scope.errorText = errorMsgs.deleteFailed;

               }
            );
        }

      //hide/show the edit mode
        $scope.editMode = false;
        $scope.$on('editMode', function(){
            $scope.editMode = !$scope.editMode;
        });

        //when user clicks submit on the form, collect crop, rotate, input fields
        $scope.submitPupForm = function(){

            $scope.newImgsSuccess = false, $scope.oldImgsSuccess = false, $scope.transfered = false;

            //newly uploaded images

            for (var i=0;i<$scope.uploader.queue.length;i++){

                var subMedia = {
                    mediaId : rfc4122.newuuid(),
                    originalName: $scope.uploader.queue[i].file.name,
                    sequenceNumber : $scope.uploader.queue[i].sequenceNumber,
                    fileExtentions : $scope.fileExtentions,
                    duration : $scope.duration,
                    mediaSetType : $scope.mediaset.mediaSetType,
                    mediasetFormData : $scope.uploader.queue[i].file.mediasetFormData,
                    crop: $scope.uploader.queue[i].file.crop,
                    rotation: $scope.uploader.queue[i].file.rotation,
                    mediaSetId: msId
                }

                if(msId==0){
                    if($scope.mediaset.mediaSetType == 'image'){subMedia.mediaUrlThumb = "//noname.com/"+subId+"/"+$scope.uploader.queue[i].sequenceNumber+"_thumb";}
                    subMedia.mediaUrl = "//noname.com/"+subId+"/"+$scope.uploader.queue[i].sequenceNumber+subMedia.fileExtentions;
                }
                else if (msId>0){
                    if($scope.mediaset.mediaSetType == 'image'){subMedia.mediaUrlThumb = "//noname.com/"+subId+"/"+msId+"/"+$scope.uploader.queue[i].sequenceNumber+"_thumb";}
                    subMedia.mediaUrl = "//noname.com/"+subId+"/"+msId+"/"+$scope.uploader.queue[i].sequenceNumber+subMedia.fileExtentions;
                }

                thisMedia.push(subMedia);
            }

          //post to submission
                subService.updatePupSub(thisSub, function(data){
                    $scope.oldImgsSuccess = true;
                    $http.get(pupScan + "transfer/" +appId + "/" + msId + "/" + upId + "/" + subId)
                    // success callback
                    .then(function (response) {
                        //do nothing
                        window.console &&  console.log('transfered');
                        $scope.transfered = true;
                        $rootScope.$broadcast('loading-complete-hard');
                        // window.parent.closeModal();
                        var tempDomain;
                        if(thisDomain == 'localhost'){
                            tempDomain = 'localhost:3000'
                        }
                        else {
                            tempDomain = thisDomain;
                        }
                        window.parent.postMessage(window.location.protocol+"//"+tempDomain, '*');
                    },
                    // error callback
                    function(response) {
                        $rootScope.$broadcast('loading-complete-hard');
                        $scope.hasError = true;
                        $scope.errorText = errorMsgs.transferFailed;

                    });
                }, function(){

                });




               // $scope.goToTop();
          //close alerts if they are open
          $scope.hasError = false, $scope.hasError = false;

        }

        //IE hack because it doesn't support CORS properly https://github.com/Modernizr/Modernizr/issues/1002
         var SUPPORTS_CORS = (function() {
            function onload() {
              var c = document.createElement('canvas');
              var ctx = c.getContext('2d');
              ctx.drawImage(img, 0, 0, 1, 1);
              try {
                c.toDataURL('image/png');

                SUPPORTS_CORS = true;
                $scope.amazonUrl = "//wppup2scanned.s3.amazonaws.com/";
              }
              catch(e) {

                $scope.amazonUrl = "/wppup2scanned/";
              }
            }

            var img = new Image();
            img.onload = onload;
            img.crossOrigin = 'anonymous';
            img.src = '//upload.wikimedia.org/wikipedia/commons/c/ca/1x1.png';

            return false;
          })();


          //check for touch support
          $scope.touch_capable = window.DocumentTouch && document instanceof DocumentTouch;


          //mouse support




        /******************** END: custom controller******************/


		/******************** BEGIN: angular file uploader controller******************/

		// Creates a uploader
        var uploader = $scope.uploader = $fileUploader.create({
            // scope: $scope,
            // url: 'upload.php'
            autoUpload: true
        });

        // ADDING FILTERS

        // Images only
        uploader.filters.push(function(item /*{File|HTMLInputElement}*/) {
            var type = uploader.isHTML5 ? item.type : '/' + item.value.slice(item.value.lastIndexOf('.') + 1);
            var fileTypeInName = item.name.slice(-4);
            var maxSize = 10; //10 MB
            type = '|' + type.toLowerCase().slice(type.lastIndexOf('/') + 1) + '|';
            var isImage = ('|jpg|png|jpeg|bmp|gif|'.indexOf(type) !== -1);
            var isDoc = ('|pdf|doc|docx|txt|csv|xml|ppt|plain|msword|vnd.openxmlformats-officedocument.wordprocessingml.document|vnd.ms-excel|vnd.ms-powerpoint|rtf|vnd.openxmlformats-officedocument.presentationml.presentation|'.indexOf(type) !== -1) || (fileTypeInName == 'xlsx')||(fileTypeInName == '.csv');
            var isVid = ('|avi|mov|mp4|wmv|x-sgi-movie|x-ms-wmv|quicktime|'.indexOf(type) !== -1);
            var isAudio = ('|wav|mp3|mp4|mid|x-ms-wma|mpeg|'.indexOf(type) !== -1);
            var isGoodSize = item.size/1024/1024 <= maxSize;

            if ($scope.mediaset.mediaSetType == 'image') {
                if(!isImage){
                    $scope.hasError = true;
                    $scope.errorText = errorMsgs.fileTypeError;
                }
                if(!isGoodSize){
                    $scope.hasError = true;
                    $scope.errorText = errorMsgs.imageSizeError;
                }
                return isImage && isGoodSize;

            } else  if ($scope.mediaset.mediaSetType == 'document') {
                 if(!isDoc){
                    $scope.hasError = true;
                    $scope.errorText = errorMsgs.fileTypeError;
                }
                if(!isGoodSize){
                    $scope.hasError = true;
                    $scope.errorText = errorMsgs.imageSizeError;
                }
                return isDoc && isGoodSize;

            } else if  ($scope.mediaset.mediaSetType == 'video') {
                if(!isVid){
                    $scope.hasError = true;
                    $scope.errorText = errorMsgs.fileTypeError;
                }
                if(!isGoodSize){
                    $scope.hasError = true;
                    $scope.errorText = errorMsgs.imageSizeError;
                }
                return isVid && isGoodSize;

            }
            else if  ($scope.mediaset.mediaSetType == 'audio') {
                if(!isAudio){
                    $scope.hasError = true;
                    $scope.errorText = errorMsgs.fileTypeError;
                }
                if(!isGoodSize){
                    $scope.hasError = true;
                    $scope.errorText = errorMsgs.imageSizeError;
                }
                return isAudio && isGoodSize;

            }

        });


        // REGISTER HANDLERS

        uploader.bind('afteraddingfile', function (event, item) {

            console.info('After adding a file', item);
            if($scope.uploader.queue.length + $scope.thisMedia.length > $scope.mediaset.numOfMedia){
                $scope.hasError = true;
                $scope.errorText = errorMsgs.tooManyImages;
                item.uploader.removeFromQueue(item);
            }
            if(!item.file.mediasetFormData)item.file.mediasetFormData = {};
            if(!item.file.crop)item.file.crop = {};
            if(!item.file.rotation)item.file.rotation = 0;

        });

        uploader.bind('whenaddingfilefailed', function (event, item) {
            console.info('When adding a file failed', item);
        });

        uploader.bind('afteraddingall', function (event, items) {
            console.info('After adding all files', items);
        });

        uploader.bind('beforeupload', function (event, item) {
            console.info('Before upload', item);
            $scope.hasError=false;
            $scope.mediasetError=false;
            $scope.errorText=null;
            if(!$scope.isLoading){
                $rootScope.$broadcast('loading-started-hard');
            }
            item.sequenceNumber = uploadedPhotoCount;

            item.url = pupScan + "upload/" + upId + "/" + $scope.mediaset.numOfMedia + "/" + item.sequenceNumber + "/" + $scope.application.defaultImgFieldExt;
        });

        uploader.bind('progress', function (event, item, progress) {
            console.info('Progress: ' + progress, item);
        });

        uploader.bind('success', function (event, xhr, item, response) {
            var expirationDate = new Date();
            expirationDate.setMonth(expirationDate.getMonth() + $scope.mediaset.mediaSetExpiration);
            if(!thisMediaset.media) thisMediaset.media =[];
            uploadedPhotoCount++;
        });

        uploader.bind('cancel', function (event, xhr, item) {
            console.info('Cancel', xhr, item);
        });

        uploader.bind('error', function (event, xhr, item, response) {
            console.info('Error', xhr, item, response);
            //$rootScope.$broadcast('loading-complete');
            $scope.hasError = true;
            $scope.errorText = errorMsgs.uploadFailed;
            item.uploader.removeFromQueue(item);
        });

        uploader.bind('complete', function (event, xhr, item, response) {
            console.log('starting');
            console.info('Complete', xhr, item, response);
            console.log("extensionsList", response.data.extensionsList)
            $scope.fileExtentions = "." + $scope.application.defaultImgFieldExt;
            subLogService.debug({ message: "File Info", response: response.data});
            if(response.data.extensionsList && response.data.extensionsList[0] != null){
                $scope.fileExtentions = (response.data.extensionsList[0]);
                console.log('file ext' + $scope.fileExtentions);
            } else {
                console.log('use default file ext' + $scope.fileExtentions);
            }
            // console.log("duration", response.data.duration);
            if(response.data.duration != null){
                $scope.duration = (response.data.duration);
            }
        });

        uploader.bind('progressall', function (event, progress) {
            console.info('Total progress: ' + progress);
        });

        uploader.bind('completeall', function (event, items) {
            console.info('Complete all', items);
            $rootScope.$broadcast('loading-complete-hard');
        });
        /******************** END: angular file uploader controller******************/
	}]);
