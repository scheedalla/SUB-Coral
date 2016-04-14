/*
 Angular File Upload v0.3.3.1
 https://github.com/nervgh/angular-file-upload
*/
(function(angular, factory) {
    if (typeof define === 'function' && define.amd) {
        define('angular-file-upload', ['angular'], function(angular) {
            return factory(angular);
        });
    } else {
        return factory(angular);
    }
}(angular || null, function(angular) {
var app = angular.module('angularFileUpload', []);

// It is attached to an element that catches the event drop file
app.directive('ngFileDrop', [ '$fileUploader', function ($fileUploader) {
    'use strict';

    return {
        // don't use drag-n-drop files in IE9, because not File API support
        link: !$fileUploader.isHTML5 ? angular.noop : function (scope, element, attributes) {
            element
                .bind('drop', function (event) {
                    var dataTransfer = event.dataTransfer ?
                        event.dataTransfer :
                        event.originalEvent.dataTransfer; // jQuery fix;
                    if (!dataTransfer) return;
                    event.preventDefault();
                    event.stopPropagation();
                    scope.$broadcast('file:removeoverclass');
                    scope.$emit('file:add', dataTransfer.files, scope.$eval(attributes.ngFileDrop));
                })
                .bind('dragover', function (event) {
                    var dataTransfer = event.dataTransfer ?
                        event.dataTransfer :
                        event.originalEvent.dataTransfer; // jQuery fix;

                    event.preventDefault();
                    event.stopPropagation();
                    dataTransfer.dropEffect = 'copy';
                    scope.$broadcast('file:addoverclass');
                })
                .bind('dragleave', function () {
                    scope.$broadcast('file:removeoverclass');
                });
        }
    };
}])
// It is attached to an element which will be assigned to a class "ng-file-over" or ng-file-over="className"
app.directive('ngFileOver', function () {
    'use strict';

    return {
        link: function (scope, element, attributes) {
            scope.$on('file:addoverclass', function () {
                element.addClass(attributes.ngFileOver || 'ng-file-over');
            });
            scope.$on('file:removeoverclass', function () {
                element.removeClass(attributes.ngFileOver || 'ng-file-over');
            });
        }
    };
});
// It is attached to <input type="file"> element like <ng-file-select="options">
app.directive('ngFileSelect', [ '$fileUploader', function ($fileUploader) {
    'use strict';

    return {
        link: function (scope, element, attributes) {
            $fileUploader.isHTML5 || element.removeAttr('multiple');

            element.bind('change', function () {
                scope.$emit('file:add', $fileUploader.isHTML5 ? this.files : this, scope.$eval(attributes.ngFileSelect));
                ($fileUploader.isHTML5 && element.attr('multiple')) && element.prop('value', null);
            });

            element.prop('value', null); // FF fix
        }
    };
}]);
app.factory('$fileUploader', [ '$compile', '$rootScope', '$http', '$window', function ($compile, $rootScope, $http, $window) {
    'use strict';

    /**
     * Creates a uploader
     * @param {Object} params
     * @constructor
     */
    function Uploader(params) {
        angular.extend(this, {
            scope: $rootScope,
            url: '/',
            alias: 'file',
            queue: [],
            headers: {},
            progress: null,
            autoUpload: false,
            removeAfterUpload: false,
            method: 'POST',
            filters: [],
            formData: [],
            isUploading: false,
            _nextIndex: 0,
            _timestamp: Date.now()
        }, params);

        // add the base filter
        this.filters.unshift(this._filter);

        this.scope.$on('file:add', function (event, items, options) {
            event.stopPropagation();
            this.addToQueue(items, options);
        }.bind(this));

        this.bind('beforeupload', Item.prototype._beforeupload);
        this.bind('in:progress', Item.prototype._progress);
        this.bind('in:success', Item.prototype._success);
        this.bind('in:cancel', Item.prototype._cancel);
        this.bind('in:error', Item.prototype._error);
        this.bind('in:complete', Item.prototype._complete);
        this.bind('in:progress', this._progress);
        this.bind('in:complete', this._complete);
    }

    Uploader.prototype = {
        /**
         * Link to the constructor
         */
        constructor: Uploader,

        /**
         * The base filter. If returns "true" an item will be added to the queue
         * @param {File|Input} item
         * @returns {boolean}
         * @private
         */
        _filter: function (item) {
            return angular.isElement(item) ? true : !!item.size;
        },

        /**
         * Registers a event handler
         * @param {String} event
         * @param {Function} handler
         * @return {Function} unsubscribe function
         */
        bind: function (event, handler) {
            return this.scope.$on(this._timestamp + ':' + event, handler.bind(this));
        },

        /**
         * Triggers events
         * @param {String} event
         * @param {...*} [some]
         */
        trigger: function (event, some) {
            arguments[ 0 ] = this._timestamp + ':' + event;
            this.scope.$broadcast.apply(this.scope, arguments);
        },

        /**
         * Checks a support the html5 uploader
         * @returns {Boolean}
         * @readonly
         */
        isHTML5: !!($window.File && $window.FormData),


        /**
        * Checks support for canvas
        * @returns {Boolean}
        * @readonly
        */

        isCanvasSupported: !!($window.FileReader && $window.CanvasRenderingContext2D),        

        /**
         * Adds items to the queue
         * @param {FileList|File|HTMLInputElement} items
         * @param {Object} [options]
         */
        addToQueue: function (items, options) {
            var length = this.queue.length;
            var list = 'length' in items ? items : [items];

            angular.forEach(list, function (file) {
                var isValid = !this.filters.length ? true : this.filters.every(function (filter) {
                    return filter.call(this, file);
                }, this);

                if (isValid) {
                    var item = new Item(angular.extend({
                        url: this.url,
                        alias: this.alias,
                        headers: angular.copy(this.headers),
                        formData: angular.copy(this.formData),
                        removeAfterUpload: this.removeAfterUpload,
                        method: this.method,
                        uploader: this,
                        file: file
                    }, options));

                    this.queue.push(item);
                    this.trigger('afteraddingfile', item);
                }
            }, this);

            if (this.queue.length !== length) {
                this.trigger('afteraddingall', this.queue);
                this.progress = this._getTotalProgress();
            }

            this._render();
            this.autoUpload && this.uploadAll();
        },

        /**
         * Remove items from the queue. Remove last: index = -1
         * @param {Item|Number} value
         */
        removeFromQueue: function (value) {
            var index = this.getIndexOfItem(value);
            var item = this.queue[ index ];
            item.isUploading && item.cancel();
            this.queue.splice(index, 1);
            item._destroy();
            this.progress = this._getTotalProgress();
        },

        /**
         * Clears the queue
         */
        clearQueue: function () {
            this.queue.forEach(function (item) {
                item.isUploading && item.cancel();
                item._destroy();
            }, this);
            this.queue.length = 0;
            this.progress = 0;
        },

        /**
         * Returns a index of item from the queue
         * @param {Item|Number} value
         * @returns {Number}
         */
        getIndexOfItem: function (value) {
            return angular.isObject(value) ? this.queue.indexOf(value) : value;
        },

        /**
         * Returns not uploaded items
         * @returns {Array}
         */
        getNotUploadedItems: function () {
            return this.queue.filter(function (item) {
                return !item.isUploaded;
            });
        },

        /**
         * Returns items ready for upload
         * @returns {Array}
         */
        getReadyItems: function() {
            return this.queue
                .filter(function(item) {
                    return item.isReady && !item.isUploading;
                })
                .sort(function(item1, item2) {
                    return item1.index - item2.index;
                });
        },

        /**
         * Uploads a item from the queue
         * @param {Item|Number} value
         */
        uploadItem: function (value) {
            var index = this.getIndexOfItem(value);
            var item = this.queue[ index ];
            var transport = this.isHTML5 ? '_xhrTransport' : '_iframeTransport';

            item.index = item.index || this._nextIndex++;
            item.isReady = true;

            if (this.isUploading) {
                return;
            }

            this.isUploading = true;
            this[ transport ](item);
        },

        /**
         * Cancels uploading of item from the queue
         * @param {Item|Number} value
         */
        cancelItem: function(value) {
            var index = this.getIndexOfItem(value);
            var item = this.queue[ index ];
            var prop = this.isHTML5 ? '_xhr' : '_form';
            item[prop] && item[prop].abort();
        },
        /**
         * Edits item from the queue
         * @param {Item|Number} value
         */
        editItem: function(value) {
            console.log(value);
        },

        /**
         * Uploads all not uploaded items of queue
         */
        uploadAll: function () {
            var items = this.getNotUploadedItems().filter(function(item) {
                return !item.isUploading;
            });
            items.forEach(function(item) {
                item.index = item.index || this._nextIndex++;
                item.isReady = true;
            }, this);
            items.length && this.uploadItem(items[ 0 ]);
        },

        /**
         * Cancels all uploads
         */
        cancelAll: function() {
            this.getNotUploadedItems().forEach(function(item) {
                this.cancelItem(item);
            }, this);
        },

        /**
         * Updates angular scope
         * @private
         */
        _render: function() {
            this.scope.$$phase || this.scope.$digest();
        },

        /**
         * Returns the total progress
         * @param {Number} [value]
         * @returns {Number}
         * @private
         */
        _getTotalProgress: function (value) {
            if (this.removeAfterUpload) {
                return value || 0;
            }

            var notUploaded = this.getNotUploadedItems().length;
            var uploaded = notUploaded ? this.queue.length - notUploaded : this.queue.length;
            var ratio = 100 / this.queue.length;
            var current = (value || 0) * ratio / 100;

            return Math.round(uploaded * ratio + current);
        },

        /**
         * The 'in:progress' handler
         * @private
         */
        _progress: function (event, item, progress) {
            var result = this._getTotalProgress(progress);
            this.trigger('progressall', result);
            this.progress = result;
            this._render();
        },

        /**
         * The 'in:complete' handler
         * @private
         */
        _complete: function () {
            var item = this.getReadyItems()[ 0 ];
            this.isUploading = false;

            if (angular.isDefined(item)) {
                this.uploadItem(item);
                return;
            }

            this.trigger('completeall', this.queue);
            this.progress = this._getTotalProgress();
            this._render();
        },

        /**
         * The XMLHttpRequest transport
         * @private
         */
        _xhrTransport: function (item) {
            var xhr = item._xhr = new XMLHttpRequest();
            var form = new FormData();
            var that = this;

            this.trigger('beforeupload', item);

            item.formData.forEach(function(obj) {
                angular.forEach(obj, function(value, key) {
                    form.append(key, value);
                });
            });

            form.append(item.alias, item.file);

            xhr.upload.onprogress = function (event) {
                var progress = event.lengthComputable ? event.loaded * 100 / event.total : 0;
                that.trigger('in:progress', item, Math.round(progress));
            };

            xhr.onload = function () {
                var response = that._transformResponse(xhr.response);
                var event = that._isSuccessCode(xhr.status) ? 'success' : 'error';
                that.trigger('in:' + event, xhr, item, response);
                that.trigger('in:complete', xhr, item, response);
            };

            xhr.onerror = function () {
                that.trigger('in:error', xhr, item);
                that.trigger('in:complete', xhr, item);
            };

            xhr.onabort = function () {
                that.trigger('in:cancel', xhr, item);
                that.trigger('in:complete', xhr, item);
            };

            xhr.open(item.method, item.url, true);

            angular.forEach(item.headers, function (value, name) {
                xhr.setRequestHeader(name, value);
            });

            xhr.send(form);
        },

        /**
         * The IFrame transport
         * @private
         */
        _iframeTransport: function (item) {
            var form = angular.element('<form style="display: none;" />');
            var iframe = angular.element('<iframe name="iframeTransport' + Date.now() + '">');
            var input = item._input;
            var that = this;

            item._form && item._form.replaceWith(input); // remove old form
            item._form = form; // save link to new form

            this.trigger('beforeupload', item);

            input.prop('name', item.alias);

            item.formData.forEach(function(obj) {
                angular.forEach(obj, function(value, key) {
                    form.append(angular.element('<input type="hidden" name="' + key + '" value="' + value + '" />'));
                });
            });

            form.prop({
                action: item.url,
                method: item.method,
                target: iframe.prop('name'),
                enctype: 'multipart/form-data',
                encoding: 'multipart/form-data' // old IE
            });

            iframe.bind('load', function () {
                // fixed angular.contents() for iframes
                var html = iframe[0].contentDocument.body.innerHTML;
                var xhr = { response: html, status: 200, dummy: true };
                var response = that._transformResponse(xhr.response);
                that.trigger('in:success', xhr, item, response);
                that.trigger('in:complete', xhr, item, response);
            });

            form.abort = function() {
                var xhr = { status: 0, dummy: true };
                iframe.unbind('load').prop('src', 'javascript:false;');
                form.replaceWith(input);
                that.trigger('in:cancel', xhr, item);
                that.trigger('in:complete', xhr, item);
            };

            input.after(form);
            form.append(input).append(iframe);

            form[ 0 ].submit();
        },

        /**
         * Checks whether upload successful
         * @param {Number} status
         * @returns {Boolean}
         * @private
         */
        _isSuccessCode: function(status) {
            return (status >= 200 && status < 300) || status === 304;
        },

        /**
         * Transforms the server response
         * @param {*} response
         * @returns {*}
         * @private
         */
        _transformResponse: function (response) {
            $http.defaults.transformResponse.forEach(function (transformFn) {
                response = transformFn(response);
            });
            return response;
        }
    };


    /**
     * Create a item
     * @param {Object} params
     * @constructor
     */
    function Item(params) {
        // fix for old browsers
        if (!Uploader.prototype.isHTML5) {
            var input = angular.element(params.file);
            var clone = $compile(input.clone())(params.uploader.scope);
            var value = input.val();

            params.file = {
                lastModifiedDate: null,
                size: null,
                type: 'like/' + value.slice(value.lastIndexOf('.') + 1).toLowerCase(),
                name: value.slice(value.lastIndexOf('/') + value.lastIndexOf('\\') + 2)
            };

            params._input = input;
            clone.prop('value', null); // FF fix
            input.css('display', 'none').after(clone); // remove jquery dependency
        }

        angular.extend(this, {
            isReady: false,
            isUploading: false,
            isUploaded: false,
            isSuccess: false,
            isCancel: false,
            isError: false,
            progress: null,
            index: null
        }, params);
    }


    Item.prototype = {
        /**
         * Link to the constructor
         */
        constructor: Item,
        /**
         * Removes a item
         */
        remove: function () {
            this.uploader.removeFromQueue(this);
        },
        /**
         * Uploads a item
         */
        upload: function () {
            this.uploader.uploadItem(this);
        },
        /**
         * Cancels uploading
         */
        cancel: function() {
            this.uploader.cancelItem(this);
        },
        /**
         * Edits item
         */
        edit: function() {
            this.uploader.editItem(this);
        },
        /**
         * Destroys form and input
         * @private
         */
        _destroy: function() {
            this._form && this._form.remove();
            this._input && this._input.remove();
            delete this._form;
            delete this._input;
        },
        /**
         * The 'beforeupload' handler
         * @param {Object} event
         * @param {Item} item
         * @private
         */
        _beforeupload: function (event, item) {
            item.isReady = true;
            item.isUploading = true;
            item.isUploaded = false;
            item.isSuccess = false;
            item.isCancel = false;
            item.isError = false;
            item.progress = 0;
        },
        /**
         * The 'in:progress' handler
         * @param {Object} event
         * @param {Item} item
         * @param {Number} progress
         * @private
         */
        _progress: function (event, item, progress) {
            item.progress = progress;
            item.uploader.trigger('progress', item, progress);
        },
        /**
         * The 'in:success' handler
         * @param {Object} event
         * @param {XMLHttpRequest} xhr
         * @param {Item} item
         * @param {*} response
         * @private
         */
        _success: function (event, xhr, item, response) {
            item.isReady = false;
            item.isUploading = false;
            item.isUploaded = true;
            item.isSuccess = true;
            item.isCancel = false;
            item.isError = false;
            item.progress = 100;
            item.index = null;
            item.uploader.trigger('success', xhr, item, response);
        },
        /**
         * The 'in:cancel' handler
         * @param {Object} event
         * @param {XMLHttpRequest} xhr
         * @param {Item} item
         * @private
         */
        _cancel: function(event, xhr, item) {
            item.isReady = false;
            item.isUploading = false;
            item.isUploaded = false;
            item.isSuccess = false;
            item.isCancel = true;
            item.isError = false;
            item.progress = 0;
            item.index = null;
            item.uploader.trigger('cancel', xhr, item);
        },
        /**
         * The 'in:error' handler
         * @param {Object} event
         * @param {XMLHttpRequest} xhr
         * @param {Item} item
         * @param {*} response
         * @private
         */
        _error: function (event, xhr, item, response) {
            item.isReady = false;
            item.isUploading = false;
            item.isUploaded = true;
            item.isSuccess = false;
            item.isCancel = false;
            item.isError = true;
            item.progress = 100;
            item.index = null;
            item.uploader.trigger('error', xhr, item, response);
        },
        /**
         * The 'in:complete' handler
         * @param {Object} event
         * @param {XMLHttpRequest} xhr
         * @param {Item} item
         * @param {*} response
         * @private
         */
        _complete: function (event, xhr, item, response) {
            item.uploader.trigger('complete', xhr, item, response);
            item.removeAfterUpload && item.remove();
        }
    };

    return {
        create: function (params) {
            return new Uploader(params);
        },
        isHTML5: Uploader.prototype.isHTML5
    };
}])

    return app;
}));
(function () {
    'use strict';
/* 
  Luke Mason 2014
  Angular directives which use Canvas to provide an editable context for images.
  Jcrop, used for cropping http://deepliquid.com/content/Jcrop.html
*/

/*Convert a file in the scope into an img src data attribute*/
    angular.module('imgEditor.directives', [])
        .directive('imgData', [
            function () {
                return {
                    restrict: 'A',
                    link: function (scope, element, attributes) {
                        var imgData = scope.$eval(attributes.imgData);
                        var reader = new FileReader();
                        reader.onload = function () {
                            scope.$apply(function () {
                                var img = new Image();
                                img.onload = function () {
                                    element.attr('src', img.src);
                                };
                                img.src = reader.result;
                                scope.$broadcast('loadedImg', img, img.src);
                            });
                        };
                        reader.readAsDataURL(imgData);
                    }
                };
            }
        ])
/* read a file from a url and convert it to a data src 
(this will only work for CORS images, in non-cors supporting browsers 
serve images from the same domain as the user is on. */
    .directive('imgDataFromUri', function () {
        return {
            restrict: 'A',
            link: function (scope, element, attributes) {
                // Create an empty canvas element
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');

                var img = new Image();
                img.onload = function () {

                    var cw = canvas.width = img.width;
                    var ch = canvas.height = img.height;
                    // Copy the image contents to the canvas
                    ctx.drawImage(img, 0, 0);
                    var dataURL = canvas.toDataURL('image/png');
                    var loadedImgData = new Image();
                    loadedImgData.src = dataURL;
                    // $(element).css('width', img.width + 'px');
                    // $(element).css('height', img.height + 'px');
                    var crop = scope.model.crop(scope) ;
                    if ( crop && crop.x > 0) {
                        //apply the crop programatically pre-load
                        var cropImage = new Image();
                        cropImage.src = dataURL;
                        var selected = crop;
                        selected.w = selected.x2 - selected.x;
                        selected.h = selected.y2 - selected.y;
                        cw = canvas.width;
                        ch = canvas.height;
                        // create 2 temporary canvases
                        var canvas1 = document.createElement('canvas');
                        var ctx1 = canvas1.getContext('2d');
                        var canvas2 = document.createElement('canvas');
                        var ctx2 = canvas2.getContext('2d');
                        var rectBB = getRotatedRectBB(
                            selected.x, selected.y, selected.w, selected.h, 0);
                        // clip the boundingbox of the crop rect
                        // to a temporary canvas
                        canvas1.width = canvas2.width = rectBB.width;
                        canvas1.height = canvas2.height = rectBB.height;
                        ctx1.drawImage(cropImage,
                            rectBB.cx - rectBB.width / 2,
                            rectBB.cy - rectBB.height / 2,
                            rectBB.width,
                            rectBB.height,
                            0, 0, rectBB.width, rectBB.height);
                        ctx2.translate(parseInt(canvas1.width / 2),
                            parseInt(canvas1.height / 2));
                        ctx2.drawImage(canvas1,
                            parseInt(-canvas1.width / 2), parseInt(-canvas1.height / 2));
                        // draw the rect to the display canvas
                        var offX = rectBB.width / 2 - selected.w / 2;
                        var offY = rectBB.height / 2 - selected.h / 2;
                        canvas.width = selected.w;
                        canvas.height = selected.h;
                        cw = canvas.width;
                        ch = canvas.height;
                        ctx.drawImage(canvas2, -offX, -offY);
                        //clear temp variables
                        cropImage = canvas1 = canvas2 = ctx1 = ctx2 = offY = offX = null;
                        dataURL = canvas.toDataURL();
                    }
                    if (scope.model.rotation(scope)) {
                        //apply any rotation next
                        var angle = scope.model.rotation(scope);
                        while (angle<0){
                            angle+= 360;
                        }
                          var rotations = (angle / 90) % 4;
                          var rotateImage = new Image();
                          rotateImage.src = dataURL;
                          //it would be better to do the rotation in one batch,
                          //but this will work for now. TODO
                          for (var i=0;i<rotations;i++) {
                            canvas.width = ch;
                            canvas.height = cw;
                            cw = canvas.width;
                            ch = canvas.height;
                            ctx.save();
                            // translate and rotate
                            ctx.translate(cw, ch / cw);
                            ctx.rotate(Math.PI / 2);
                            // draw the previows image, now rotated
                            ctx.drawImage(rotateImage, 0, 0);               
                            ctx.restore();
                            rotateImage.src = canvas.toDataURL();
                          }
                          // clear the temporary image
                          rotateImage = null;
                          //save 
                          dataURL = canvas.toDataURL();
                    }
                    scope.$broadcast('loadedImg', loadedImgData, dataURL);
                    element.attr('src', dataURL);


                };


                img.crossOrigin = '';
                attributes.$observe('imgDataFromUri', function (val) {
                    img.src = val;
                });
            }
        };
    })
        .directive('imgThumb', [

            function () {
                return {
                    restrict: 'A',
                    link: function (scope, element, attributes) {
                        scope.$on('loadedImg', function (e, img, imgSRC) {
                            element.attr('src', imgSRC);
                        });
                        scope.$on('update', function (e, imgSRC) {
                            element.attr('src', imgSRC);
                        });
                    }
                };
            }
        ])
    /* add listeners for 'crop', 'rotate' and 'rest' brodcasts */
    .directive('imgEditable', ["$parse", function ($parse) {
        return {
            restrict: 'A',
            link: function (scope, element, attributes) {
                var jcrop_api;
                var croppedImage; //this will be used to support cancel of crop.
                var fullSize = new Image();
                var orig = new Image();
                scope.model = {};
                scope.model.crop = $parse(attributes.crop);
                scope.model.rotation = $parse(attributes.rotation);
                scope.model.trueSize= $parse(attributes.trueSize);

                if (!scope.crop) {
                    scope.crop = false;
                }
                if (!scope.rotation) {
                    scope.rotation = 0;
                }
                if (element.attr('src') && element.attr('src').length > 1) {
                    fullSize.src = element.attr('src');
                } //load the src if it was already on the dom
                scope.$on('loadedImg', function (e, img, imgSRC) {
                    //if we are using one of the helpers to load img data 
                    //this will load the full sized as original and cropped into the view
                    fullSize.src = imgSRC;
                    orig.src = img.src;
                });
                //listen for actions
                scope.$on('crop', function () {
                    scope.cropping = true;
                    croppedImage = new Image();
                    croppedImage.src = element.attr('src');
                    //re-load the full size image, 
                    //instead of the cropped on so that the user can crop wider
                    element.attr('src', fullSize.src);

                    //Init Jcrop with old selection if one exists
                    console.log([fullSize.width,fullSize.height]);
                    if (scope.crop) {
                        var pt1 = rotatePoint(scope.crop.x, scope.crop.y,
                            orig.width, orig.height, scope.rotation);
                        var pt2 = rotatePoint(scope.crop.x2, scope.crop.y2,
                            orig.width, orig.height, scope.rotation);
                        var selectedInit = [pt1.x, pt1.y, pt2.x, pt2.y];
                        $(element).Jcrop({
                            'trueSize': [fullSize.width,fullSize.height],
                            'setSelect': selectedInit
                        }, function () {
                            jcrop_api = this;
                        });
                    } else {
                        $(element).Jcrop({
                            'trueSize': [fullSize.width,fullSize.height],
                        }, function () {
                            jcrop_api = this;
                        });
                    }
                });

                scope.$on('reset', function () {
                    scope.crop = false;
                    scope.rotation = 0;
                    reset();
                    //brodcast update
                    scope.$broadcast('update', orig.src);
                });

                scope.$on('save', function () {
                    if (scope.cropping) {
                        croppedImage = null;
                        //main crop function.
                        scope.cropping = false;
                        //Save the new crop to the scope
                        var crop = jcrop_api.tellSelect();

                        var p1 = rotatePoint(crop.x, crop.y,
                            fullSize.width, fullSize.height, -scope.rotation);
                        var p2 = rotatePoint(crop.x2, crop.y2,
                            fullSize.width, fullSize.height, -scope.rotation);
                        var w, h;
                        scope.crop = {
                            x: p1.x,
                            y: p1.y,
                            x2: p2.x,
                            y2: p2.y
                        };
                        //save the crop in origin cords
                        scope.model.crop.assign(scope, scope.crop);

                        //remove jcrop applied width and height for native sizing
                        $(element).css('width', '');
                        $(element).css('height', '');
                        //turn off jcrop
                        jcrop_api.destroy();
                        //apply the crop (requires canvas support)
                        applyCrop(crop);
                    }
                });

                scope.$on('cancel', function () {
                    if (scope.cropping) {
                        scope.cropping = false;
                        element.attr('src', croppedImage.src);
                        $(element).css('width', '');
                        $(element).css('height', '');
                        croppedImage = null;
                        jcrop_api.destroy();
                    }
                    //extend if other methods need cancel support
                });

                //rotate
                scope.$on('rotate', function () {
                    scope.rotation = (scope.rotation + 90) % 360;
                    //update the model
                    scope.model.rotation.assign(scope, scope.rotation);
                    doRotate();
                });

                //Functions
                function reset() {
                    croppedImage = null;
                    element.attr('src', orig.src);
                    // $(element).css('width', orig.width + 'px');
                    // $(element).css('height', orig.height + 'px');
                    fullSize.src = orig.src; //reset the saved crop image as well
                }

                function doRotate() {

                    var img = new Image();
                    img.onload = function () {
                        var myImage;
                        var rotating = false;
                        var canvas = document.createElement('canvas');
                        var ctx = canvas.getContext('2d');
                        var cw, ch;
                        canvas.width = img.width;
                        canvas.height = img.height;
                        cw = canvas.width;
                        ch = canvas.height;
                        ctx.drawImage(img, 0, 0, img.width, img.height);
                        if (!rotating) {
                            rotating = true;
                            // store current data to an image
                            myImage = new Image();
                            myImage.src = canvas.toDataURL();
                            myImage.onload = function () {
                                // reset the canvas with new dimensions
                                canvas.width = ch;
                                canvas.height = cw;
                                cw = canvas.width;
                                ch = canvas.height;
                                ctx.save();
                                // translate and rotate
                                ctx.translate(parseInt(cw), parseInt(ch / cw));
                                ctx.rotate(Math.PI / 2);
                                // draw the previows image, now rotated
                                ctx.drawImage(myImage, 0, 0);
                                ctx.restore();
                                // clear the temporary image
                                myImage = null;
                                rotating = false;
                                element.attr('src', canvas.toDataURL());
                                scope.$broadcast('update', canvas.toDataURL());
                                canvas = null;
                            };
                        }
                    };
                    img.src = element.attr('src');
                    rotateFullSize();
                }

                function rotateFullSize() {
                    //silently rotate the full size image in the background
                    var img2 = new Image();
                    img2.onload = function () {
                        var myImage2, rotating2 = false;
                        var canvas2 = document.createElement('canvas');
                        var ctx2 = canvas2.getContext('2d');
                        var cw2, ch2;
                        canvas2.width = img2.width;
                        canvas2.height = img2.height;
                        cw2 = canvas2.width;
                        ch2 = canvas2.height;
                        ctx2.drawImage(img2, 0, 0, img2.width, img2.height);
                        if (!rotating2) {
                            rotating2 = true;
                            // store current data to an image
                            myImage2 = new Image();
                            myImage2.src = canvas2.toDataURL();
                            myImage2.onload = function () {
                                // reset the canvas with new dimensions
                                canvas2.width = ch2;
                                canvas2.height = cw2;
                                cw2 = canvas2.width;
                                ch2 = canvas2.height;
                                ctx2.save();
                                // translate and rotate
                                ctx2.translate(parseInt(cw2), parseInt(ch2 / cw2));
                                ctx2.rotate(Math.PI / 2);
                                // draw the previows image, now rotated
                                ctx2.drawImage(myImage2, 0, 0);
                                ctx2.restore();
                                // clear the temporary image
                                myImage2 = null;
                                rotating2 = false;
                                var newImgSrc = canvas2.toDataURL();
                                canvas2 = null;
                                fullSize.src = newImgSrc;
                            };
                        }
                    };
                    img2.src = fullSize.src;
                }

                function applyCrop(crop) {
                    var cropImage = new Image();
                    cropImage.src = element.attr('src');
                    var canvas = document.createElement('canvas');
                    var ctx = canvas.getContext('2d');
                    var selected = crop;
                    var cw = canvas.width;
                    var ch = canvas.height;
                    // create 2 temporary canvases
                    var canvas1 = document.createElement('canvas');
                    var ctx1 = canvas1.getContext('2d');
                    var canvas2 = document.createElement('canvas');
                    var ctx2 = canvas2.getContext('2d');
                    var rectBB = getRotatedRectBB(
                        selected.x, selected.y, selected.w, selected.h, 0);
                    // clip the boundingbox of the crop rect
                    // to a temporary canvas
                    canvas1.width = canvas2.width = rectBB.width;
                    canvas1.height = canvas2.height = rectBB.height;
                    ctx1.drawImage(cropImage,
                        rectBB.cx - rectBB.width / 2,
                        rectBB.cy - rectBB.height / 2,
                        rectBB.width,
                        rectBB.height,
                        0, 0, rectBB.width, rectBB.height);
                    ctx2.translate(parseInt(canvas1.width / 2),
                        parseInt(canvas1.height / 2));
                    ctx2.drawImage(canvas1,
                        parseInt(-canvas1.width / 2), parseInt(-canvas1.height / 2));
                    // draw the rect to the display canvas
                    var offX = rectBB.width / 2 - selected.w / 2;
                    var offY = rectBB.height / 2 - selected.h / 2;
                    canvas.width = selected.w;
                    canvas.height = selected.h;
                    cw = canvas.width;
                    ch = canvas.height;
                    ctx.drawImage(canvas2, -offX, -offY);
                    element.attr('src', canvas.toDataURL());
                    // $(element).css('width', selected.w + 'px');
                    // $(element).css('height', selected.h + 'px');
                    scope.$broadcast('update', canvas.toDataURL());
                    cropImage = canvas = ctx = cw = ch = selected =
                        ctx1 = ctx2 = canvas1 = canvas2 = rectBB = offX = offY = null;
                } // end crop using canvas.
                //helper functions

                function rotatePoint(pointX, pointY, width, height, angle) {
                    if (angle === 0) {
                        return {
                            x: pointX,
                            y: pointY
                        };
                    } else if (Math.abs(angle) === 180) {
                        return {
                            x: width - pointX,
                            y: height - pointY
                        };
                    } else {
                        var rad = angle * Math.PI / 180.0; //convert to rad
                        var x = pointX - width / 2; //convert to normal grid
                        var y = pointY - height / 2;
                        var offsetX = height / 2,
                            offsetY = width / 2;
                        return {
                            x: parseInt(Math.cos(rad) * x - Math.sin(rad) * y + offsetX),
                            y: parseInt(Math.sin(rad) * x + Math.cos(rad) * y + offsetY)
                        };
                    }
                }
            }
        };
    }]);

    /*Global private helper functions */
    function getRotatedRectBB(x, y, width, height, rAngle) {
        var absCos = Math.abs(Math.cos(rAngle));
        var absSin = Math.abs(Math.sin(rAngle));
        var cx = x + width / 2 * Math.cos(rAngle) -
            height / 2 * Math.sin(rAngle);
        var cy = y + width / 2 * Math.sin(rAngle) +
            height / 2 * Math.cos(rAngle);
        var w = width * absCos + height * absSin;
        var h = width * absSin + height * absCos;
        return ({
            cx: cx,
            cy: cy,
            width: w,
            height: h
        });
    }

})();
angular.module("subPlatformServices", ['ngResource'])
       .factory('subService', ["$resource", function($resource){
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
       }])

       .factory('formService', ["$resource", function($resource){
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
       }])

       .factory('userService', ["$resource", function($resource){
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
       }])

           .factory('acctService', ["$resource", function($resource){
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
       }])

'use strict';

// Declare app level module which depends on filters, and services
angular.module('pupApp', [    
  'pupApp.directives',
  'pupApp.controllers',		
  'hostedApp.directives',
  'imgEditor.directives',
]).config(["$httpProvider", function($httpProvider){
        $httpProvider.interceptors.push(["$q", "$rootScope", function($q, $rootScope) {
                return {
                    'request': function(config) {
                        $rootScope.$broadcast('loading-started');
                        return config || $q.when(config);
                    },
                    'response': function(response) {
                        $rootScope.$broadcast('loading-complete');
                        return response || $q.when(response);
                    }
                };
            }]);

    }]);
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
.directive('dropZoneIcon', ["$compile", function($compile){
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
}])

//Determines allowed file types for media upload
.directive('dropZoneFileType', ["$compile", function($compile){
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
}])

//Button for adding media based on type.
.directive('dropZoneButton', ["$compile", function($compile){
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
}])

// Which icon to display to user based on file extension
.directive('fileExt', ["$compile", function($compile){
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
}]);
// Hosted Directive
// This Directive is for the hosted form.  It creates each field type for the loaded form and prints on the page.

	angular.module('hostedApp.directives',['ui.bootstrap', 'ngResource', 'subPlatformServices'])
	//Creates Form Fields for Hosted Form
	.directive('subFormfield', ["$compile", "$filter", "$http", "$sce", "subService", "formService", function ($compile,$filter,$http, $sce, subService, formService) {
		// Templates included here to reduce HTTP requests for hosted form
		var subFormTemplates = {
			// To reduce HTTP requests
			radioTemplate : '<div class="form-group"><label>{{content.fieldName}}</label><span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="content.isMandatory && model==null && submitted" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p>  <div class="radio" ng-repeat="field in content.fieldTypeOptions.split(\',\') track by $index" ng-hide="content.isConditional"><label for="{{content.uniqueId}}_{{$index}}"><input type="radio" name="{{content.uniqueId}}" ng-value="field" ng-model="$parent.model" id="{{content.uniqueId}}_{{$index}}" ng-required="content.isMandatory"/> {{field}}</label> </div><div class="" ng-show="content.isConditional"><div class="radio" ng-repeat="option in content.fieldTypeOptionsArray"><label><input type="radio" name="{{content.uniqueId}}" ng-value="option" id="{{option.optionId}}" ng-model="$parent.model" ng-required="content.isMandatory">{{option.optionValue}}</label></div><div ng-repeat="option in content.fieldTypeOptionsArray"><sub-formfield form-id="formId" content="condField" model="submission.formData[condField.uniqueId]" submission="submission" application="application" ng-repeat="condField in option.conditionalFields" submitted="submitted" ng-if="$parent.model==option"> </sub-formfield></div></div></div>',
			hiddenTemplate : '<input type="hidden" class="sub_{{content.fieldType}}" name="{{content.uniqueId}}" placeholder="{{content.placeholder}}">',
			textTemplate : '<ng-form name="form"><div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="(form.text.$error.required && !form.text.$pristine) || (form.text.$error.required && submitted)" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p>  <input type="text" ng-model="model" name="text" class="form-control" ng-required="content.isMandatory" placeholder="{{content.placeholder}}" id="{{content.uniqueId}}"/> </div></ng-form>',
			numberTemplate : '<ng-form name="form"><div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}} </label><span ng-if="content.min || content.max">  (Between {{content.min}} - {{content.max}})</span> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="(form.number.$error.required && !form.number.$pristine)||(form.number.$error.required && submitted)" class="text-danger">This field is required.</span> <span ng-show="(form.number.$error.number && !form.number.$pristine)||(form.number.$error.number && submitted)" class="text-danger">This field must be a number.</span> <span ng-show="(form.number.$error.min && !form.number.$pristine)||(form.number.$error.min && submitted)" class="text-danger">This number must be greater than or equal to {{content.min}}.</span><span ng-show="(form.number.$error.max && !form.number.$pristine)||(form.number.$error.max && submitted)" class="text-danger">This number must be less than or equal to {{content.max}}.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p> <input type="number" ng-model="model" min="{{content.min}}" max="{{content.max}}" name="number" id="{{content.uniqueId}}"  class="form-control" ng-required="content.isMandatory" placeholder="{{content.placeholder}}"/> </div></ng-form>',
			dateTemplate :
			'<ng-form name="form"><div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label><span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="(form.date.$error.required && !form.date.$pristine)||(form.date.$error.required && submitted)" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p> <p class="input-group">'+
			'<input type="text" id="{{content.uniqueId}}"  class="form-control" datepicker-popup="{{format}}" ng-model="model" is-open="opened" show-weeks="false" datepicker-options="dateOptions" ng-required="content.isMandatory" placeholder="{{content.placeholder}}" close-text="Close" name="date" />'+
			'<span class="input-group-btn">'+
			'<button class="btn btn-default" ng-click="opened = true;$event.preventDefault();$event.stopPropagation();"><i class="fa fa-calendar"></i></button>'+
			'</span></p></div></ng-form>',
			pastDateTemplate : '<ng-form name="form"><div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label><span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="(form.pastdate.$error.required && !form.pastdate.$pristine)||(form.pastdate.$error.required && submitted)" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p>  <p class="input-group">'+
			'<input type="text" id="{{content.uniqueId}}"  class="form-control" datepicker-popup="{{format}}" ng-model="model" is-open="opened" max-date="now" show-weeks="false" datepicker-options="dateOptions" ng-required="content.isMandatory" placeholder="{{content.placeholder}}" close-text="Close" name="pastdate"/>'+
			'<span class="input-group-btn">'+
			'<button class="btn btn-default" ng-click="opened = true;$event.preventDefault();$event.stopPropagation();"><i class="fa fa-calendar"></i></button>'+
			'</span></p></div></ng-form>',
			futureDateTemplate : '<ng-form name="form"><div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label><span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="(form.futuredate.$error.required && !form.futuredate.$pristine)||(form.futuredate.$error.required && submitted)" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p>  <p class="input-group">'+
			'<input type="text" id="{{content.uniqueId}}"  class="form-control" datepicker-popup="{{format}}" ng-model="model" is-open="opened" min-date="now" show-weeks="false" datepicker-options="dateOptions" ng-required="content.isMandatory" placeholder="{{content.placeholder}}" close-text="Close" name="futuredate"/>'+
			'<span class="input-group-btn">'+
			'<button class="btn btn-default" ng-click="opened = true;$event.preventDefault();$event.stopPropagation();"><i class="fa fa-calendar"></i></button>'+
			'</span></p></div></ng-form>',
			dobCheckTemplate : '<ng-form name="form"><div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label><span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="(form.dobCheck.$error.required && !form.dobCheck.$pristine)||(form.dobCheck.$error.required && submitted)" class="text-danger">This field is required.</span><span class="text-danger" ng-show="form.dobCheck.$error.dobcheck"> You must be {{content.minAge}} years or older.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p>  <p class="input-group">'+
			'<input type="text" id="{{content.uniqueId}}"  class="form-control" datepicker-popup="{{format}}" ng-model="model" is-open="opened" dobcheck="{{maxDate}}" max-date="now" show-weeks="false" datepicker-options="dateOptions" ng-required="content.isMandatory" placeholder="{{content.placeholder}}" close-text="Close" name="dobCheck"/>'+
			'<span class="input-group-btn">'+
			'<button class="btn btn-default" ng-click="opened = true;$event.preventDefault();$event.stopPropagation();"><i class="fa fa-calendar"></i></button>'+
			'</span></p></div></ng-form>',
			sectionHeaderTemplate : '<h3 class="section-header">{{content.fieldName}}<small><p class="help-block" ng-bind-html="content.descriptionSafe"></p></small></h3> ',
			subSectionHeaderTemplate : '<h4 class="sub-section-header">{{content.fieldName}}<small><p class="help-block" ng-bind-html="content.descriptionSafe"></p></small></h4> ',
			subNameTemplate : '<h4>{{content.fieldName}}</h4> ',
			subDescTemplate : '<h5>{{content.fieldName}}</h5> ',
			trueFalseTemplate : '<div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="content.isMandatory && model==null && submitted" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p> <div class="radio"> <label><input type="radio" name="{{content.uniqueId}}" value="true" ng-model="model" ng-required="content.isMandatory" placeholder="{{content.placeholder}}"/> True </label> </div><div class="radio"><label><input type="radio" name="{{content.uniqueId}}" value="false" ng-required="content.isMandatory"/> False </label> </div></div>',
			yesNoTemplate : '<div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="content.isMandatory && model==null && submitted" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p> <div class="radio"> <label><input type="radio" name="{{content.uniqueId}}" value="yes" ng-model="model" ng-required="content.isMandatory" placeholder="{{content.placeholder}}"/> Yes </label> </div><div class="radio"><label><input type="radio" name="{{content.uniqueId}}" value="no" ng-model="model" ng-required="content.isMandatory"/> No </label> </div></div>',
			dropdownTemplate : '<div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span><span ng-show="content.isMandatory && model==null && submitted" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p>  <select ng-hide="content.isConditional" ng-model="model" ng-options="option for option in content.fieldTypeOptions.split(\',\')" name="dropdown" id="{{content.uniqueId}}"  class="form-control" ng-required="content.isMandatory" > <option value="">-- Select an option --</option> </select><select ng-show="content.isConditional" ng-model="model" ng-options="option.optionValue as option.optionValue for option in content.fieldTypeOptionsArray" name="{{content.uniqueId}}" id="{{content.uniqueId}}"  class="form-control" ng-required="content.isMandatory" > <option value="">-- Select an option --</option> </select><div ng-repeat="option in content.fieldTypeOptionsArray"><sub-formfield form-id="formId" content="condField" model="submission.formData[condField.uniqueId]" submission="submission" application="application" ng-repeat="condField in option.conditionalFields" submitted="submitted" ng-if="model==option.optionValue"> </sub-formfield></div></div>',
			emailTemplate : '<ng-form name="form"><div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="(form.email.$error.required && !form.email.$pristine)||(form.email.$error.required && submitted)" class="text-danger">This field is required.</span> <span ng-show="(form.email.$error.pattern && !form.email.$pristine)||(form.email.$error.pattern && submitted)" class="text-danger">This is not a valid email.</span> <p class="help-block" ng-bind-html="content.descriptionSafe"></p><input type="email" ng-pattern="/^[a-z0-9!#$%&\'*+/=?^_`{|}~.-]+@[a-z0-9-]+\\.[a-z0-9-]/i" ng-model="model" name="email" id="{{content.uniqueId}}"  class="form-control" ng-required="content.isMandatory" placeholder="{{content.placeholder}}" /> </div></ng-form>',
			checkboxTemplate : '<ng-form name="form"><div class="form-group"><label>{{content.fieldName}}</label><span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="cblength > 0 && content.isMandatory && submitted" class="text-danger">Please check at least one.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p>  <div class="checkbox" ng-repeat="field in content.fieldTypeOptions.split(\',\')" ng-init="$parent.model = $parent.model || {}"><label><input ng-model="$parent.model[field]" type="checkbox" name="{{content.uniqueId}}"/> {{field}} <input type="text" class="form-control" ng-show="$last && content.hasOtherField" ng-model="$parent.model[\'otherVal\']" ng-disabled="!$parent.model[\'Other\']"></label> </div></div></ng-form>',
			textareaTemplate : '<ng-form name="form"><div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="(form.textarea.$error.required && !form.textarea.$pristine)||(form.textarea.$error.required && submitted)" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p> <textarea ng-model="model" name="textarea" id="{{content.uniqueId}}"  class="form-control" ng-required="content.isMandatory" placeholder="{{content.placeholder}}" maxlength="{{content.textareaCharLimit}}"></textarea> <span ng-show="content.textareaCharLimit" class="textarea-char-limit">Max Number of Characters: {{content.textareaCharLimit}}</span></div></ng-form>',
			mediaSetDocTemplate : '<ng-form name="form"><div class="form-group mediaset-box"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="form.mediasetDoc.$error.required && submitted" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p> <br><button class="btn btn-success" type="button" ng-click="createMediaSetModal()">Attach Document</button> <span ng-show="docNotUploaded"><em>Please upload a document</em></span><span ng-show="isDocUploaded"><i class="fa fa-check"></i></span><br><br><div media-preview="timestamp" submission-id="{{submission._id}}" mediaset-id="{{content.mediaSetId}}" num-of-media="{{numOfMedia}}"></div></div>' +
			'<input type="hidden" ng-model="model" name="uniqueUploadId.{{content.fieldType}}" value="{{uuId}}"/>' +
			'<input type="hidden" name="transfered.{{content.fieldType}}" value="false"><input type="hidden" name="mediasetId.{{content.fieldType}}" value="false">' +
			'<input type="hidden" ng-model="isDocUploaded" name="mediasetDoc" ng-required="content.isMandatory" />'+
			'<div class="modal fade hosted-modal" id="{{uuId}}_hostedModal"><div class="modal-dialog"><div class="modal-content"><button type="button" ng-click="modalClosed()" class="close" data-dismiss="modal" aria-hidden="true">Close</button><iframe></iframe></div></div></div><hr></ng-form>',
			mediaSetVidTemplate : '<ng-form name="form"><div class="form-group mediaset-box"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="form.mediasetVid.$error.required && submitted" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p> <br><button class="btn btn-success" type="button" ng-click="createMediaSetModal()">Attach Video</button> <span ng-show="vidNotUploaded"><em>Please upload a video</em></span><span ng-show="isVidUploaded"><i class="fa fa-check"></i></span><br><br><div media-preview="timestamp" submission-id="{{submission._id}}" mediaset-id="{{content.mediaSetId}}" num-of-media="{{numOfMedia}}"></div></div>' +
			'<input type="hidden" ng-model="model" name="uniqueUploadId.{{content.fieldType}}" value="{{uuId}}"/>' +
			'<input type="hidden" name="transfered.{{content.fieldType}}" value="false"><input type="hidden" name="mediasetId.{{content.fieldType}}" value="false">' +
			'<input type="hidden" ng-model="isVidUploaded" name="mediasetVid" ng-required="content.isMandatory" />'+
			'<div class="modal fade hosted-modal" id="{{uuId}}_hostedModal"><div class="modal-dialog"><div class="modal-content"><button type="button" ng-click="modalClosed()" class="close" data-dismiss="modal" aria-hidden="true">Close</button><iframe></iframe></div></div></div><hr></ng-form>',
			mediaSetAudioTemplate : '<ng-form name="form"><div class="form-group mediaset-box"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="form.mediasetAudio.$error.required && submitted" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p> <br><button class="btn btn-success" type="button" ng-click="createMediaSetModal()">Attach Audio File</button> <span ng-show="audioNotUploaded"><em>Please upload a video</em></span><span ng-show="isAudioUploaded"><i class="fa fa-check"></i></span><br><br><div media-preview="timestamp" submission-id="{{submission._id}}" mediaset-id="{{content.mediaSetId}}" num-of-media="{{numOfMedia}}"></div></div>' +
			'<input type="hidden" ng-model="model" name="uniqueUploadId.{{content.fieldType}}" value="{{uuId}}"/>' +
			'<input type="hidden" name="transfered.{{content.fieldType}}" value="false"><input type="hidden" name="mediasetId.{{content.fieldType}}" value="false">' +
			'<input type="hidden" ng-model="isAudioUploaded" name="mediasetAudio" ng-required="content.isMandatory" />'+
			'<div class="modal fade hosted-modal" id="{{uuId}}_hostedModal"><div class="modal-dialog"><div class="modal-content"><button type="button" ng-click="modalClosed()" class="close" data-dismiss="modal" aria-hidden="true">Close</button><iframe></iframe></div></div></div><hr></ng-form>',
			mediaSetTemplate : '<ng-form name="form"><div class="form-group mediaset-box"><label for="{{formId}}_{{content.fieldName}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="numOfMedia==1"><em>You can upload {{numOfMedia}} image</em></span><span ng-show="numOfMedia>1"><em>You can attach up to {{numOfMedia}} images</em></span> <span ng-show="form.mediaset.$error.required && submitted" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p> <br><button class="btn btn-success" type="button" ng-click="createMediaSetModal()">Attach Photo(s)</button><br><br><div media-preview="timestamp" submission-id="{{submission._id}}" mediaset-id="{{content.mediaSetId}}" num-of-media="{{numOfMedia}}"></div></div>' +
			'<input type="hidden" ng-model="model" name="uniqueUploadId.{{content.fieldType}}" value="{{uuId}}"/>' +
			'<input type="hidden" name="mediaset" ng-model="isPhotoUploaded" ng-required="content.isMandatory" />' +
			'<input type="hidden" name="transfered.{{content.fieldType}}" value="false"><input type="hidden" name="mediasetId.{{content.fieldType}}" value="false">'+
			'<div class="modal fade hosted-modal" id="{{uuId}}_hostedModal"><div class="modal-dialog"><div class="modal-content"><button type="button" ng-click="modalClosed()" class="close" data-dismiss="modal" aria-hidden="true">Close</button><iframe></iframe></div></div></div><hr></ng-form>',
			firstAndLastNameTemplate :'<ng-form name="form"><div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="(form.name_first.$error.required && !form.name_first.$pristine)|| (form.name_last.$error.required && !form.name_last.$pristine)||(form.name_first.$error.required && submitted)|| (form.name_last.$error.required && submitted)" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p>  <br><div class="row"><div class="col-sm-6"><input type="text" name="name_first" class="form-control" ng-required="content.isMandatory" ng-model="content.fandLName_first" ng-change="concatName()"/><p class="help-block">First</p></div><div class="col-sm-6"><input type="text" name="name_last" class="form-control" ng-required="content.isMandatory" ng-model="content.fandLName_last" ng-change="concatName()"/><p class="help-block">Last</p></div></div></div></ng-form>',
			phoneNumberTemplate:'<ng-form name="form"><div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="(form.phnum_areacode.$error.required && !form.phnum_areacode.$pristine)|| (form.phnum_prefix.$error.required && !form.phnum_prefix.$pristine) || (form.phnum_linenum.$error.required && !form.phnum_linenum.$pristine)||(form.phnum_areacode.$error.required && submitted)|| (form.phnum_prefix.$error.required && submitted) || (form.phnum_linenum.$error.required && submitted)" class="text-danger">This field is required.</span> <span ng-show="(form.phnum_areacode.$error.pattern )|| (form.phnum_prefix.$error.pattern) || (form.phnum_linenum.$error.pattern)" class="text-danger">This field must be a number and the correct length.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p><br><div class="row"><div class="col-sm-2 phone-num"><input type="text" ng-model="content.phNum_areacode" name="phnum_areacode" id="{{content.uniqueId}}" class="form-control" ng-required="content.isMandatory" ng-change="concatPhNum()" min="0" max="999" ng-pattern="/^[0-9]{3,3}$/"/  ng-maxlength="3" tabindex="{{index*1000}}" auto-next><p class="help-block">###</p></div><div class="col-sm-1 em-dash">&#8212;</div><div class="col-sm-2 phone-num"><input type="text" ng-model="content.phNum_prefix" name="phnum_prefix" id="{{content.uniqueId}}" class="form-control" ng-required="content.isMandatory" ng-change="concatPhNum()" min="0" max="999" ng-pattern="/^[0-9]{3,3}$/"/  ng-maxlength="3"  tabindex="{{(index*1000)+1}}" auto-next><p class="help-block">###</p></div><div class="col-sm-1 em-dash">&#8212;</div><div class="col-sm-2 phone-num"><input type="text" ng-model="content.phNum_linenum" name="phnum_linenum" id="{{content.uniqueId}}" class="form-control" ng-required="content.isMandatory" ng-change="concatPhNum()" min="0" max="9999" ng-pattern="/^[0-9]{4,4}$/"/ ng-maxlength="4"  tabindex="{{(index*1000)+2}}" auto-next><p class="help-block">####</p></div></div></div></ng-form>',
			addressTemplate:'<ng-form name="form"><div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="(form.address1.$error.required && !form.address1.$pristine)|| (form.city.$error.required && !form.city.$pristine) || (form.postalcode.$error.required && !form.postalcode.$pristine)||(form.address1.$error.required && submitted)|| (form.city.$error.required && submitted) || (form.postalcode.$error.required && submitted)" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p><br><div class="row"><div class="col-sm-12"><input type="text" class="form-control" ng-model="content.address_address1" ng-change="concatAddress()" ng-required="content.isMandatory" name="address1"><p class="help-block">Street Address</p></div></div><div class="row"><div class="col-sm-12"><input type="text" class="form-control" ng-model="content.address_address2" ng-change="concatAddress()"><p class="help-block">Address Line 2</p></div></div><div class="row"><div class="col-sm-6"><input type="text" name="city" class="form-control" ng-model="content.address_city" ng-change="concatAddress()" ng-required="content.isMandatory"><p class="help-block">City</p></div><div class="col-sm-6"><input type="text" class="form-control"  ng-model="content.address_state" ng-change="concatAddress()" ng-hide="isUS"><select class="form-control" ng-model="content.address_usState" ng-options="state.name for state in states track by state.abbreviation" ng-show="isUS" ng-change="concatAddress()" ng-init="content.address_usState.abbreviation=defaultState"><option value="">--choose--</option></select><p class="help-block">State/Province/Region</p></div></div><div class="row"><div class="col-sm-6"><input type="text" name="postalcode" class="form-control" ng-model="content.address_postalcode" ng-change="concatAddress()" ng-required="content.isMandatory"><p class="help-block">Postal Code</p></div><div class="col-sm-6"><select class="form-control" ng-options="country.name for country in countries track by country.name" ng-model="content.address_country" ng-change="concatAddress()" ng-init="content.address_country.name=defaultCountry" ng-required="content.isMandatory"><option value="">--choose--</option></select><p class="help-block">Country</p></div></div></div></ng-form>',
			timeTemplate:'<div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label><span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="(form.time.$error.required && !form.time.$pristine)||(form.time.$error.required && submitted)" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p><p class="input-group"><timepicker ng-model="model" id="{{content.uniqueId}}" name="time"></timepicker></p></div>',
			parameterTemplate: '<ng-form name="form"><div class="form-group"><label for="{{content.uniqueId}}" >{{content.fieldName}}</label> <span ng-show="content.isMandatory" class="sub_reqText">*</span> <span ng-show="(form.text.$error.required && !form.text.$pristine) || (form.text.$error.required && submitted)" class="text-danger">This field is required.</span><p class="help-block" ng-bind-html="content.descriptionSafe"></p>  <input type="text" ng-model="model" name="text" class="form-control" ng-required="content.isMandatory" placeholder="{{content.placeholder}}" id="{{content.uniqueId}}"/> </div></ng-form>',
		};

		var getTemplate = function(content) {
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

		var linker = function(scope, element, attrs, form) {
			scope.formInfo = form;
			scope.content.descriptionSafe = $sce.trustAsHtml(scope.content.description);
			if(!scope.content.isPublic) {
				element.html(getTemplate('hidden')).show();
			}
			else {
				if(scope.content.fieldType === 'futureDate' || scope.content.fieldType === 'pastDate' ) { scope.now = new Date(); }
				else if(scope.content.fieldType === 'time'){scope.model = new Date();}
				else if(scope.content.fieldType == 'checkbox'){
					if(scope.content.hasOtherField){
						scope.content.fieldTypeOptions = scope.content.fieldTypeOptions+",Other";
					}
					scope.cblength = scope.content.fieldTypeOptions.split(",").length;
				}
				else if(scope.content.fieldType == "phoneNumber"){
					scope.concatPhNum = function concatPhNum(){
						var areacode = (scope.content.phNum_areacode)?scope.content.phNum_areacode:'';
						var prefix = (scope.content.phNum_prefix)?scope.content.phNum_prefix:'';
						var linenum = (scope.content.phNum_linenum)?scope.content.phNum_linenum:'';
						scope.submission.formData[scope.content.uniqueId] = areacode + '-' + prefix + '-' + linenum;
					}
				}
				else if (scope.content.fieldType == "firstAndLastName"){
					scope.concatName = function concatName(){
						var firstName = (scope.content.fandLName_first)?scope.content.fandLName_first:'';
						var lastName = (scope.content.fandLName_last)?scope.content.fandLName_last:'';
						scope.submission.formData[scope.content.uniqueId] = firstName + '|' + lastName;
					}
				}
				else if(scope.content.fieldType === 'address'){
					$http.get('/javascripts/vendors/countries.json')
					.success(function(data,err){
						scope.countries = data;
					})
					.error(function(){
	            	})
	            	$http.get('/javascripts/vendors/us-states.json')
					.success(function(data,err){
						scope.states = data;
					})
					.error(function(){
	            	})
	            	//default as US
	            	scope.defaultCountry = "United States";
	            	scope.defaultState = "DC";
	            	scope.isUS = true;
					scope.concatAddress = function concatAddress(){
						var address1 = (scope.content.address_address1)?scope.content.address_address1:'';
						var address2 = (scope.content.address_address2)?scope.content.address_address2:'';
						var city = (scope.content.address_city)?scope.content.address_city:'';
						var state;
						var postalcode = (scope.content.address_postalcode)?scope.content.address_postalcode:'';
						var country = scope.content.address_country.name;
						if(country == "United States") {
							scope.isUS = true;
							state = (scope.content.address_usState)?scope.content.address_usState.abbreviation:"";
						}
						else {
							scope.isUS = false;
							state = (scope.content.address_state)?scope.content.address_state:'';
						}
						scope.submission.formData[scope.content.uniqueId] = address1 + ', ' + address2 + ', ' + city + ',' + state + ', ' + postalcode + ',' + country;
					}

				}
				else if((scope.content.fieldType ==='radio' || scope.content.fieldType === 'dropdown')){
					if(scope.content.isConditional){
							scope.condFields = scope.$parent.model = {};
					}
					else{
						if(scope.content.hasOtherField){
						scope.content.fieldTypeOptions = scope.content.fieldTypeOptions+",Other";

					}
					}
				}
				else if(scope.content.fieldType === 'dobCheck'){
					var date = new Date();
					date = new Date(date.getFullYear() - scope.content.minAge, date.getMonth(), date.getDate());
					scope.maxDate = date.toISOString();
					scope.now = new Date();
				}
				else if(scope.content.fieldType === 'mediaSet' || scope.content.fieldType === 'mediaSetDoc' || scope.content.fieldType === 'mediaSetVid' || scope.content.fieldType === 'mediaSetAudio') {
					//listen for close modal broadcast from hosted controller
					scope.$on("checkDraftForUploads", function (event, args) {
		                scope.checkDraftForUploads(args);
		            });
					if(scope.content.fieldType === 'mediaSet'){
						var id = scope.content.mediaSetId;
						for(var i=0;i<scope.application.mediaSets.length;i++){
							if(id == scope.application.mediaSets[i]._id){
								scope.numOfMedia = scope.application.mediaSets[i].numOfMedia;
							}
						}
					}
					else{scope.numOfMedia = 1;}
					if (scope.uuId == null){
						if(scope.submission.mediasets[scope.content.mediaSetId] && scope.submission.mediasets[scope.content.mediaSetId].uniqueUploadId){
							scope.uuId = scope.submission.mediasets[scope.content.mediaSetId].uniqueUploadId;
						}
						scope.uuId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
						var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
						return v.toString(16);});
					}
					// var ms = jQuery.grep(scope.application.mediaSets, function(e){ return e.mediaSetName === scope.content.fieldType; })[0];
					// scope.mediaSetId = ms.formId;
					// scope.createMediaSet =
					// function createMediaset(){
						var mediasetHref = "/" + scope.formId + "/" + scope.content.mediaSetId + "/" + scope.uuId + "/pup";
					// 	window.open(mediasetHref, 'targetWindow','width=600');
					// }
					scope.checkDraftForUploads = function(args){
						scope.timestamp = new Date().getTime();
						$http.get("/"+args._id+"/"+scope.content.mediaSetId+"/mediaset.json", {})
			            	.success(function(data, err){
			            		if(data[0].mediasets[0].media != null && data[0].mediasets[0].media.length > 0){
			            			if(scope.content.fieldType == 'mediaSetVid'){
			            				scope.isVidUploaded = true;
			            				scope.vidNotUploaded = false;
				            		}
				            		else if(scope.content.fieldType == 'mediaSetDoc'){
										scope.isDocUploaded = true;
										scope.docNotUploaded = false;
				            		}
				            		else if(scope.content.fieldType == 'mediaSetAudio'){
										scope.isAudioUploaded = true;
										scope.docAudioUploaded = false;
				            		}
				            	}
			            		else{
			            			if(scope.content.fieldType == 'mediaSetVid'){
			            				if(scope.content.isMandatory) scope.vidNotUploaded = true;
			            				scope.isVidUploaded = "";
				            		}
				            		else if(scope.content.fieldType == 'mediaSetDoc'){
										if(scope.content.isMandatory) scope.docNotUploaded = true;
										scope.isDocUploaded = "";
				            		}
				            		else if(scope.content.fieldType == 'mediaSetAudio'){
										if(scope.content.isMandatory) scope.audioNotUploaded = true;
										scope.isAudioUploaded = "";
				            		}
			            		}

				            })
					}
					scope.modalClosed = function modalClosed(){
						scope.timestamp = new Date().getTime();
				$http.get("/"+scope.submission._id+"/"+scope.content.mediaSetId+"/mediaset.json", {})
            	.success(function(data, err){

            		if(data[0].mediasets[0].media != null && data[0].mediasets[0].media.length > 0){
            			if(scope.content.fieldType == 'mediaSetVid'){
            				scope.isVidUploaded = true;
            				scope.vidNotUploaded = false;
	            		}
	            		else if(scope.content.fieldType == 'mediaSetDoc'){
							scope.isDocUploaded = true;
							scope.docNotUploaded = false;
	            		}
	            		else if(scope.content.fieldType == 'mediaSetAudio'){
							scope.isAudioUploaded = true;
							scope.docAudioUploaded = false;
	            		}
            		}
            		else{
            			if(scope.content.fieldType == 'mediaSetVid'){
            				if(scope.content.isMandatory) scope.vidNotUploaded = true;
            				scope.isVidUploaded = "";
	            		}
	            		else if(scope.content.fieldType == 'mediaSetDoc'){
							if(scope.content.isMandatory) scope.docNotUploaded = true;
							scope.isDocUploaded = "";
	            		}
	            		else if(scope.content.fieldType == 'mediaSetAudio'){
							if(scope.content.isMandatory) scope.audioNotUploaded = true;
							scope.isAudioUploaded = "";
	            		}
            		}
	            })
	            .error(function(){

	            })
					}
					scope.createMediaSetModal =
					function createMediaSetModal(){
						scope.timestamp = new Date().getTime();
						var mediasetIdIndex;
						//numOfMedia should equal the object in the mediasets array with the matching mediasetid
						for(var i=0; i<scope.application.mediaSets.length;i++){

							if(scope.application.mediaSets[i].hasOwnProperty("_id")){
								if(scope.application.mediaSets[i]._id == scope.content.mediaSetId){
									scope.numOfMedia = scope.application.mediaSets[i].numOfMedia;
									mediasetIdIndex = i;
								}
							}
						}
						scope.submission.mediasets[scope.content.mediaSetId] = {};
						scope.submission.mediasets[scope.content.mediaSetId].uniqueUploadId = scope.uuId;
		                scope.submission.mediasets[scope.content.mediaSetId].transfered = false;
		                scope.submission.mediasets[scope.content.mediaSetId].mediasetId = scope.content.mediaSetId;
						//scope.$apply(attrs.enter);
						if(scope.submission._id == null){
								subService.createEmptySubmission(scope.submission, function(data){
								scope.submission._id = data.submissionInfo._id;
				                mediasetHref =  "/" + scope.formId + "/" + scope.content.mediaSetId + "/" + scope.uuId + "/" + scope.submission._id + "/pup";
				                //open modal
				                var parentDocHeight = getDocumentHeight();//parent.getDocumentHeight();
				                if (parentDocHeight > 800) parentDocHeight = 800;
								//this is jQUERY need to rewrite!!!!
								$("#"+scope.uuId+"_hostedModal iframe").css('height', parentDocHeight).attr('src', mediasetHref);
								$("#"+scope.uuId+"_hostedModal").modal();
								$(window).on('message', receiveMessage);
						        function receiveMessage(e){
						          if(e.originalEvent.origin === e.originalEvent.data){
						            scope.modalClosed();
						            $("#"+scope.uuId+"_hostedModal").modal('hide');
						          }
						        }
					        }, function(){
					        });
						} else {
							subService.updateSub(scope.submission, function(data){
					           var mediasetHref = "/" + scope.formId + "/" + scope.content.mediaSetId + "/" + scope.uuId + "/" + scope.submission._id + "/pup";
								var parentDocHeight = getDocumentHeight();//parent.getDocumentHeight();
								//this is jQUERY need to rewrite!!!!
								$("#"+scope.uuId+"_hostedModal iframe").css('height', parentDocHeight).attr('src', mediasetHref);
								$("#"+scope.uuId+"_hostedModal").modal();
					        }, function(){
					        });
						}
					}
					function getDocumentHeight(){
						return $(document).height() - 80;
					}
				}
				element.html(getTemplate(scope.content)).show();
			}
			$compile(element.contents())(scope);
		}
		return {
			restrict: "E",
			require:"^form",
			replace: true,
			link: linker,
			scope: {
				content:'=',
				formId:'=?',
				submission:'=',
				application:'=',
				model: '=?',
				submitted:'=?',
				index:'=?'
			}
		};
	}])

//If error when creating form field.
	.directive('errSrc', function() {
	  return {
	    link: function(scope, element, attrs) {
	      element.bind('error', function() {
	        if (attrs.src != attrs.errSrc) {
	          attrs.$set('src', attrs.errSrc);
	        }
	      });
	    }
	  }
	})

// Preview Photo in Hosted Form
	.directive('photoPreview', ["$timeout", "$http", "$compile", function($timeout,$http,$compile){
        return function(scope, element, attr){
        	var mediasetDir = "";
        	if(parseInt(attr.mediasetId) > 0 ){
        		mediasetDir = "/" + attr.mediasetId;
        	}
        	var thumbnail = "//noname.com/" + attr.submissionId +mediasetDir + "/0_thumb";
            // Add a watch on the `focus-input` attribute.
            // Whenever the `focus-input` statement changes this callback function will be executed.
            scope.$watch(attr.photoPreview, function(value){
        		var i = 0
        		var imageHtml = "<br><div class='row' ><ul class='list-unstyled'>";
        		while (i < attr.numOfMedia) {
				    imageHtml += "<li class='col-md-3'><br><img src='" + "//noname.com/" + attr.submissionId + mediasetDir + "/"+i+"_thumb?" + value + "' err-src='/images/no-image-available.png' alt='image'/></li>";
		            i++;
				}
				imageHtml = imageHtml + "</ul></div>";

				$http.get("//no-name.com/" + attr.submissionId + mediasetDir+ "/0_thumb", {})
            	.success(function(data, err){
            		scope.isPhotoUploaded = true;
            		var clonedElement = $compile(imageHtml)(scope, function(clonedElement, scope) {
					    //attach the clone to DOM document at the right place
					    element.html(clonedElement);
					  });
	            })
	            .error(function(){
	            })
            });

        };
    }])

// Preview Media in Hosted Form
	.directive('mediaPreview', ["$timeout", "$http", "$compile", function($timeout,$http,$compile){
        return function(scope, element, attr){
        	scope.$watch(attr.mediaPreview, function(value){
        		if(attr.submissionId){
        			$http.get("/"+attr.submissionId+"/"+attr.mediasetId+"/mediaset.json").success(function(data){
							var media = data[0].mediasets[0].media;
							var fileHTML = "";
							for(var i=0;i<media.length;i++){
					        	if(media[i].hasOwnProperty('mediaUrlThumb')){
					        		fileHTML +="<li><img class='photo-preview' src='"+media[i].mediaUrlThumb+"'></li>"
					        	}
					        	else{
					        		fileHTML +="<li>"+media[i].originalName+": <a href='"+media[i].mediaUrl +"' target='_blank'>http:"+media[i].mediaUrl+"</a></li>";
					        	}
										console.log("mediasetType is " + media[i].mediaSetType);
										if(media[i].mediaSetType == "image"){
												scope.isPhotoUploaded = true;
										}
					        }
					        var clonedElement = $compile("<ul class='list-unstyled'>"+fileHTML+"</ul>")(scope, function(clonedElement, scope) {
					    //attach the clone to DOM document at the right place
					    element.html(clonedElement);
					  });
						});
        		}

        	})






        };
    }])

//Special validation for "dobCheck" field type
.directive('dobcheck', function (){
   return {
      require: 'ngModel',
      link: function(scope, elem, attr, ngModel) {
          ngModel.$parsers.unshift(function (value) {
          	 //convert ngmodel value to iso string and compare to max allowed dob
          	 var dob = new Date(value).toISOString();
             ngModel.$setValidity('dobcheck', attr.dobcheck >= dob);
             return value;
          });
      }
   };
})

//Auto tab to next field in Hosted Form
.directive('autoNext', function() {
            return {
               restrict: 'A',
               link: function(scope, element, attr, form) {
                   var tabindex = parseInt(attr.tabindex);
                   var maxLength = parseInt(attr.ngMaxlength);
                   element.on('keyup', function(e) {
                       if (element.val().length > maxLength-1) {
                          var next = angular.element(document.body).find('[tabindex=' + (tabindex+1) + ']');
                          if (next.length > 0) {
                              next.focus();
                              return next.triggerHandler('keyup', { which: e.which});
                          }
                          else  {
                              return false;
                          }
                       }
                       return true;
                   });

               }
            }
        })

    ;

var uuids = angular.module('uuids', []);
uuids.factory("rfc4122", function () {
    return {
        newuuid: function () {
            // http://www.ietf.org/rfc/rfc4122.txt
            var s = [];
            var hexDigits = "0123456789abcdef";
            for (var i = 0; i < 36; i++) {
                s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
            }
            s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
            s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
            s[8] = s[13] = s[18] = s[23] = "-";
            return s.join("");
        }
    }
});

angular.module("loggingModuleServices", [])
   .factory( "subLogService", ["$log","$window",function($log, $window){ 
    return({ error: function(message, response){ 
        $log.error.apply($log, arguments); 
          // send logs to the server side 
          $.ajax({ 
            type: "POST", 
            url: "/clientErrorlogger", 
            contentType: "application/json", 
            data: angular.toJson({ 
              url: $window.location.href, 
              message: message, type: "error" 
              }) 
          }); 
        }, 
        debug: function(message, response){ 
        $log.log.apply($log, arguments); 
          $.ajax({ 
            type: "POST", 
            url: "/clientDebuglogger", 
            contentType: "application/json", 
            data: angular.toJson({
              url: $window.location.href, 
              message: message, 
              response: response,
              type: "debug"
            })
          }); 
        } 
    }); 
  }] 
  );