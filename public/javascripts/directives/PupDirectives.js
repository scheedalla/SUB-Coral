// Photo Uploader Directive
// This Directive has the elements for the PUP upload and edit modal.

    angular.module('pupApp.directives',[])

// Create Thumbnail of images for Approval tool
    .directive('ngThumb', ['$window', function($window) {

        var helper = {
            support: !!($window.FileReader && $window.CanvasRenderingContext2D),
            isFile: function(item) {                
                return angular.isObject(item) && item instanceof $window.File;
                
            },
            isImage: function(file) {
                var type =  '|' + file.type.slice(file.type.lastIndexOf('/') + 1) + '|';                
                return '|jpg|png|jpeg|bmp|gif|pdf|'.indexOf(type) !== -1;                
            },
            isDoc: function(file) {
                var type =  '|' + file.type.slice(file.type.lastIndexOf('/') + 1) + '|';                
                return '|pdf|doc|docx|txt|csv|ppt|xlsx|plain|vnd.openxmlformats-officedocument.wordprocessingml.document|rtf|'.indexOf(type) !== -1;                 
            },
            isVid: function(file) {
                var type =  '|' + file.type.slice(file.type.lastIndexOf('/') + 1) + '|';                
                return '|avi|mov|mp4|wmv|'.indexOf(type) !== -1;                
            }
        };

        return {
            restrict: 'A',
            template: '<canvas/>',
            link: function(scope, element, attributes) {                
                if (!helper.support) return;

                var params = scope.$eval(attributes.ngThumb);

                if (!helper.isFile(params.file)) return;
                if (!helper.isImage(params.file)) return;
                if (!helper.isDoc(params.file)) return;
                if (!helper.isVid(params.file)) return;

                var canvas = element.find('canvas');
                var reader = new FileReader();

                reader.onload = onLoadFile;
                reader.readAsDataURL(params.file);

                function onLoadFile(event) {
                    var img = scope.img = new Image();
                    img.onload = onLoadImage;
                    img.src = event.target.result;
                }

                function onLoadImage() {
                    var width = params.width || this.width / this.height * params.height;
                    var height = params.height || this.height / this.width * params.width;
                    canvas.attr({ width: width, height: height });
                    canvas[0].getContext('2d').drawImage(this, 0, 0, width, height);
                }
            }
        };
    }])

// Loading of Submissions
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
                if(!scope.isLoadingHard){
                    element.css({"display" : "none"});
                    scope.isLoading = false;
                }

            });
            scope.$on("loading-complete-hard", function(e) {
                element.css({"display" : "none"});
                scope.isLoading = false;
                scope.isLoadingHard = false;
            });

        }
    };
})

//Drag and Drop icon for different media types.
.directive('dropZoneIcon', function($compile){
    var dropZoneIcons ={
        imageIcon:'<i class="fa fa-file-image-o glyphicon-pic-size"></i><br>',
        documentIcon:'<i class="fa fa-file-text glyphicon-pic-size"></i><br>',
        videoIcon:'<i class="fa fa-file-video-o glyphicon-pic-size"></i><br>',
        audioIcon:'<i class="fa fa-file-audio-o glyphicon-pic-size"></i><br>',
    };

    var getTemplate = function(mediaType){
        var template = {};

        if(typeof template != 'undefined' && template != null) {
            
            template = dropZoneIcons[mediaType+'Icon'];
            return template;
        }
        else {
            return '';
        }
    };

    return{
        restrict:'E',
        replace:true,
        scope:{
            mediaType:'='
        },
        link:function(scope, element, attrs){
            scope.$watchCollection('mediaType', function(v){  
                if(v != undefined){
                    element.html(getTemplate(v)).show();
                    $compile(element.contents())(scope);
                }                      
               
           }); 
        }
    }
})

//Determines allowed file types for media upload
.directive('dropZoneFileType', function($compile){
    var fileTypes = {
        imageFileType:'jpg, png, jpeg, bmp, gif',
        documentFileType:'pdf, doc, docx, txt, csv, ppt, pptx, xlsx, plain, rtf',
        videoFileType:'avi, mov, mp4, wmv',
        audioFileType:'wav, mp3, mp4, mid, wma'
    };

    var getTemplate = function(mediaType){
        var template = {};

        if(typeof template != 'undefined' && template != null) {
            
            template = fileTypes[mediaType+'FileType'];
            return template;
        }
        else {
            return '';
        }
    };

    return{
        restrict:'E',
        replace:true,
        scope:{
            mediaType:'='
        },
        link:function(scope, element, attrs){
            scope.$watchCollection('mediaType', function(v){                        
               if(v != undefined){
                    element.html(getTemplate(v)).show();
                    $compile(element.contents())(scope);
                }   
           }); 
        }
    }
})

//Button for adding media based on type.
.directive('dropZoneButton', function($compile){
    var buttons = {
        imageSingleButton:'<input ng-file-select type="file" id="uploadBtn" accept="image/*">',
        imageButton:'<input ng-file-select type="file" id="uploadBtn" multiple accept="image/*">',
        documentButton:'<input ng-file-select type="file" id="uploadBtn">',
        videoButton:'<input ng-file-select type="file" id="uploadBtn" accept="video/*">',
        audioButton:'<input ng-file-select type="file" id="uploadBtn" accept="audio/*">'
    };

    var getTemplate = function(mediaType, num){
        var template = {};

        if(typeof template != 'undefined' && template != null) {
            if(mediaType == 'image' && num == 1){
                template = buttons[mediaType+'SingleButton'];
            }
            else{
                template = buttons[mediaType+'Button'];
            }
            
            return template;
        }
        else {
            return '';
        }
    };

    return{
        restrict:'E',
        replace:true,
        scope:{
            mediaType:'=',
            num:'='
        },
        link:function(scope, element, attrs){
            scope.$watchCollection('mediaType', function(v){                        
               if(v != undefined){
                    element.html(getTemplate(v, scope.num)).show();
                    $compile(element.contents())(scope);
                }   
           }); 
        }
    }
})

// Which icon to display to user based on file extension
.directive('fileExt', function($compile){
    var exts = {
        pdf:'<i class="fa fa-file-pdf-o glyphicon-pic-size"></i>',
        doc:'<i class="fa fa-file-word-o glyphicon-pic-size"></i>',
        docx:'<i class="fa fa-file-word-o glyphicon-pic-size"></i>',
        xlsx:'<i class="fa fa-file-excel-o glyphicon-pic-size"></i>',
        csv:'<i class="fa fa-file-excel-o glyphicon-pic-size"></i>',
        pptx:'<i class="fa fa-file-powerpoint-o glyphicon-pic-size"></i>',
        txt:'<i class="fa fa-file-text-o glyphicon-pic-size"></i>',
        other:'<i class="fa fa-file-text-o glyphicon-pic-size"></i>'
    };

    var getTemplate = function(type){
        var template = {};
        type = type.slice(1);

        if(typeof template != 'undefined' && template != null) {
            
            template = exts[type];
            
        }
        else {
            template = exts['other']
        }
        return template;
    };

    return{
        restrict:'E',
        replace:true,
        scope:{
            type:'='
        },
        link:function(scope, element, attrs){
            scope.$watchCollection('type', function(v){                        
               if(v != undefined){
                    element.html(getTemplate(v)).show();
                    $compile(element.contents())(scope);
                }   
           }); 
        }
    }
});