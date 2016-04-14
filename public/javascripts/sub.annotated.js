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

var modalServices = angular.module('modalServices',[]);
modalServices.service('modals', ['$modal',
    function ($modal) {

        var modalDefaults = {
            backdrop: true,
            keyboard: true,
            modalFade: true,
            templateUrl: '/modal'
        };

        var modalOptions = {
            closeButtonText: 'Close',
            actionButtonText: 'OK',
            headerText: 'Proceed?',
            bodyText: 'Perform this action?'
        };

        this.showModal = function (customModalDefaults, customModalOptions) {
            if (!customModalDefaults) customModalDefaults = {};
            customModalDefaults.backdrop = 'static';
            return this.show(customModalDefaults, customModalOptions);
        };

        this.show = function (customModalDefaults, customModalOptions) {
            //Create temp objects to work with since we're in a singleton service
            var tempModalDefaults = {};
            var tempModalOptions = {};

            //Map angular-ui modal custom defaults to modal defaults defined in service
            angular.extend(tempModalDefaults, modalDefaults, customModalDefaults);

            //Map modal.html $scope custom properties to defaults defined in service
            angular.extend(tempModalOptions, modalOptions, customModalOptions);

            if (!tempModalDefaults.controller) {
                tempModalDefaults.controller = function ($scope, $modalInstance) {
                    $scope.modalOptions = tempModalOptions;
                    $scope.modalOptions.ok = function (result) {
                        $modalInstance.close(result);
                    };
                    $scope.modalOptions.close = function (result) {
                        $modalInstance.dismiss('cancel');
                    };
                }
            }

            return $modal.open(tempModalDefaults).result;
        };

    }]);
//
angular.module('admin.controllers', [
  'ui.bootstrap',
  'localytics.directives',
  'admin.filters',
  'admin.directives',
  'imgEditor.directives',
  'ngSanitize',
  'uuids',
  'angularFileUpload',
  'ui.sortable',
  'ngResource',
  'subPlatformServices',
  'modalServices',
  'mentio',
  'pasvaz.bindonce',
  'loggingModuleServices',
  ]
  )

.config(["$httpProvider", function($httpProvider){
  $httpProvider.defaults.useXDomain = true;
  delete $httpProvider.defaults.headers.common['X-Requested-With'];
  $httpProvider.interceptors.push(["$q", "$rootScope", function($q, $rootScope){
    return {
      'request': function(config) {
        // $rootScope.$broadcast('loading-started');
        return config || $q.when(config);
      },
      'response': function(response) {
        // $rootScope.$broadcast('loading-complete');
        return response || $q.when(response);
      }
    };
  }]);
}])

.controller('SettingsCtrl', ['$scope',  function ($scope) {
  $scope.predicate = '-_id';
  $scope.filterText = {};
  $scope.filterKey = "";
  $scope.filterVal = "";
  $scope.filterActive = false;
  $scope.status = null;
  $scope.simple = true;
  $scope.advanced = false;
  $scope.dateSearch = false;
  $scope.info = {}; //object to store miscellaneous information

  $scope.quotes = [
  { value: "Hello" }
  ];
  $scope.randomQuote = $scope.quotes[Math.floor(Math.random() * $scope.quotes.length)];


}])


.controller('AppCtrl', ['$scope', '$filter', '$http', '$location', '$window', '$anchorScroll','$rootScope', 'rfc4122', '$fileUploader','subService', 'formService', 'userService', 'acctService', 'modals', '$q', 'subLogService', function ($scope, $filter, $http, $location, $window, $anchorScroll, $rootScope, rfc4122, $fileUploader, subService, formService, userService, acctService, modals, $q, subLogService) {

      // // Catch all 500 Errors
      // // Need to Expand to 400 etc
      // $httpProvider.responseInterceptors.push([ '$rootScope', '$q', '$injector','$location','applicationLoggingService',
      //  function($rootScope, $q, $injector, $location, applicationLoggingService)
      //  { return function(promise)
      //     { return promise.then(function(response){
      //     // http on success
      //     return response; }, function (response) {
      //       // http on failure
      //       if(response.status === null || response.status === 500){
      //         var error =
      //         { method: response.config.method,
      //           url: response.config.url,
      //           message: response.data,
      //           status: response.status };
      //          applicationLoggingService.error(JSON.stringify(error)); }
      //       return $q.reject(response);
      //     });
      //     };
      //   }
      // ])

      // $scope.subTime = function(value) {,
      //   $scope.dateFromObjectId = parseInt(value.substring(0, 8), 16) * 1000;
      //   $scope.createdDate = new Date($scope.dateFromObjectId)
      //   console.log($scope.createdDate);
      // }

      //set up replyToOptions
      $scope.replyToOptions = [];
      //force an update of all replyToOptions in replyToOptions array
      $scope.updateReplyToOptions = function(){
        // console.log("updateReplyToOptions");
        $scope.replyToOptions.push({forceUpdate:""})
      }

      //remove formField from replyToOptions based on unique id
      $scope.removeReplyToOption = function(formField){
        for(var c=0; c<$scope.replyToOptions.length;c++){
            if(formField.uniqueId == $scope.replyToOptions[c].uniqueId){
              $scope.replyToOptions.splice(c, 1);
            }
          }
      }

      //Empty scope for comparable submissions
      $scope.comparedSubmissions = [];
      $scope.compareSubmission = false;
      $scope.compare = false;
      $scope.isPreview = true;

      window.onload = function() {
       setTimeout (function () {
        scrollTo(0,0);
       }, 5000);
      }


      //Call Modal Service - Compare Submissions
      $scope.compareSubmissionsModal = function() {
        var modalOptions = {
            closeButtonText: '',
            actionButtonText: 'Okay',
            headerText: 'Compare Submissions',
            bodyText: 'Such a good looking modal.',

        };
        modals.showModal({templateUrl: 'compare.html', scope:$scope}, modalOptions).then(function (result) {
        });
      };

      //Call Modal Service - Tags!
      $scope.manageTagsModal = function() {
        var modalOptions = {
            closeButtonText: 'Cancel',
            actionButtonText: 'Finish',
            headerText: 'Add or remove tags',
            bodyText: '',
            close: $scope.manageTags.error = ''
        };
        modals.showModal({templateUrl: 'tags.html', scope:$scope}, modalOptions).then(function (result) {
        });
      };

      //Call Modal Service - Save Search!
      $scope.saveSearchModal = function() {
        var modalOptions = {
            closeButtonText: 'Cancel',
            actionButtonText: 'Save Search',
            headerText: 'Save Search',
            bodyText: ''
        };
        modals.showModal({templateUrl: 'saveSearch.html', scope:$scope}, modalOptions).then(function (result) {
        });
      };

      //Call Modal Service - Use a Savee Search!
      $scope.useSaveSearchModal = function() {
        var modalOptions = {
            closeButtonText: 'Close',
            actionButtonText: 'Save Search',
            headerText: 'Use a Save Search',
            bodyText: ''
        };
        modals.showModal({templateUrl: 'useSaveSearch.html', scope:$scope}, modalOptions).then(function (result) {
        });
      };

      //Call Modal Service - Document View Search!
      $scope.documentViewModal = function(photo, submission, sequenceNumber) {
        var modalOptions = {
            closeButtonText: '',
            actionButtonText: 'Finish',
            headerText: 'View Document',
            bodyText: '',
            photo : photo,
            sequenceNumber : sequenceNumber,
            submission : submission
        };
        modals.showModal({templateUrl: 'viewDocument.html', scope:$scope}, modalOptions).then(function (result) {
        });
      };

      //Call Modal Service - Image Edit!
      $scope.imgEditModal = function(photo, mediaset, submission) {
        var modalOptions = {
            closeButtonText: 'Cancel',
            actionButtonText: 'Save Changes',
            headerText: 'Edit Image',
            bodyText: '',
            photo : photo,
            mediaset : mediaset,
            submission : submission

        };
        modals.showModal({templateUrl: 'imgEdit.html', scope:$scope}, modalOptions).then(function (result) {
        });
      };

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


      //comment this out or set to false if your localhost is localhost:8080
      var digitalinkDomain = false;

      var pupScan, thisDomain = window.location.hostname;

        //localhost
        if(thisDomain == 'localhost'){
           pupScan = '//pupscantest.digitalink.com/photo-uploader/newuploader/';
           // pupScan = (digitalinkDomain)?'//localhost.digitalink.com/photo-uploader/newuploader/':'//localhost:8080/photo-uploader/newuploader/';
           //pupScan = '//internal-wp-sub-dev-glassfish-1248513819.us-east-1.elb.amazonaws.com/photo-uploader/newuploader/'
           //pupScan = '//localhost:8080/photo-uploader/newuploader/';
              //comment out digitalinkDomain or set to false if your localhost is localhost:8080
              $scope.embedEnvVar = "local";
            }
        //QA
        else if(thisDomain == 'wp-sub-qa.digitalink.com'){
          pupScan = '//pupscantest.digitalink.com/photo-uploader/newuploader/';
          $scope.embedEnvVar = "qa";
        }
        //Prod
        else{
          pupScan = '//pupscan.washingtonpost.com/photo-uploader/newuploader/';
          $scope.embedEnvVar = "prod";
        }

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
        while (arrMatches = objPattern.exec( strData )){
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

        // Return the parsed data.
        return( arrData );
      }

//End import


var data = '{"group": {"operator": "&","rules": []}}';

function htmlEntities(str) {
  return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function computed(group) {
  if (!group) return "";
  for (var str = "", i = 0; i < group.rules.length; i++) {
    i > 0 && (str += "&");
      var elasticData = group.rules[i].data;
      var elasticKey = group.rules[i].field.key
      // console.log(elasticData);
      // console.log(group.rules[i].field)
      if(group.rules[i].field.type=='pastDate' || group.rules[i].field.type=='futureDate' || group.rules[i].field.type=='date'){
        var date = new Date (elasticData);
        //if this is a date, parse it into a valid format for elastic search
        //TODO: this will work for now but change the string at the end to an actual time adjusted for our time zone, instead of just adding 5 hours
        if(group.rules[i].condition == "lt"){
          elasticData = $filter('date')(date,"yyyy'-'MM'-'dd'T00:00:00'");
        } else if(group.rules[i].condition == "gt"){
          elasticData = $filter('date')(date,"yyyy'-'MM'-'dd'T23:59:59'");
        } else {
          elasticData = $filter('date')(date,"yyyy'-'MM'-'dd'T05:00:00'");
        }
        // console.log(elasticData);
      } else if(group.rules[i].field.type=='checkbox'){
        //if this is a checkbox look for a field name that matches the user input search string whose value is true and use a * to pick up categories with and without space
        elasticKey = group.rules[i].field.key + ". " + elasticData;
        elasticData = true;
      }
    str += group.rules[i].group ?
    computed(group.rules[i].group) :
      // group.rules[i].field.name + " " + htmlEntities(group.rules[i].condition) + " " + group.rules[i].data;
      // group.rules[i].field.key + " " + htmlEntities(group.rules[i].condition) + " " + group.rules[i].data;
      // $scope.thisDomain + "/" + $scope.approvalApp + "/subs.json?" +
      elasticKey + "" + group.rules[i].condition + "" + elasticData;
  }

  return str + "";
}

    $scope.json = null;

    $scope.filter = JSON.parse(data);

    $scope.searchOptions = {};
    $scope.$watchCollection('filter', function (newValue) {
      $scope.json = JSON.stringify(newValue, null, 2);
      $scope.searchOptions = newValue;
      $scope.output = computed(newValue.group);
      $scope.operator = newValue.group.operator
    }, true);

    $scope.clearSearch = function(){
      $scope.searchOptions = {};
      //$scope.filter = {};
    }


    $scope.searchToApply = {}

    //apply saved search to scope
    $scope.applySearch = function(){
      $scope.searchOptions = $scope.searchToApply.search.searchOptions;
      $scope.filter = $scope.searchToApply.search.filter;
      $scope.filterActive = true;
      // $scope.filterKey = "approved";
      $scope.filterVal = $scope.searchToApply.search.approved;

      //$scope.filter.group.rules[0].field = 1;
      $scope.advSearch = $scope.searchToApply.search.isAdvanced;
      $scope.basicSearch = !$scope.searchToApply.search.isAdvanced;
      $scope.searchAll();
      //$modalInstance.dismiss('cancel');

    }

    $scope.searchToSave = {}
    //save current search to the app for the admin user to use later
    $scope.saveSearch = function(overwrite){
      //if overwrite is not on, check to see if this search name has already been used
      if(!overwrite){
        for(var key in $scope.app.savedSearches){
          if($scope.searchToSave.name === $scope.app.savedSearches[key].name){
            //$scope.searchToOverwrite = $scope.app.savedSearches[key];
            //show warning message
            $scope.searchToSave.overwriteWarning = true;
          }
        }
      }

      //If there are no warnings, go ahead and save this search
      if(!$scope.searchToSave.overwriteWarning){
        //Create a saved search object, and a static copy of that object.
        $scope.savedSearch = {name: $scope.searchToSave.name, searchOptions: $scope.searchOptions, filter: $scope.filter, isAdvanced: $scope.advSearch, approved: $scope.filterVal};
        var searchCopy = angular.copy($scope.savedSearch)
        var searchInfo = {appId:$scope.approvalApp,overwrite: overwrite, search: searchCopy};
        // window.console.log(searchInfo);
        //update application with new saved search
        subService.saveSearch(searchInfo, function(data){
          console.log(data);
           if(!$scope.app.savedSearches || !$scope.app.savedSearches.length){
            $scope.app.savedSearches = []
          }
          //add new saved searches to current scope so no refresh is required
            $scope.app.savedSearches = data.application.savedSearches;
          //show success message
          $scope.searchToSave.success = true;
          $scope.searchToSave.name = null;
        }, function(){
          $scope.searchToSave.error = err;
          console.log("can't save search: " + err);
        });


      }
    }

    $scope.advSearch = false;
    $scope.searchAll = function(tags, approved, page){
        window.console.log('start search');
        $scope.subs=[];
        //get approval counts
        $http({method: 'GET', url: "/elasticSearch/countApproved/" + $scope.approvalApp}).
        success(function(acResults) {
          window.console.log(acResults);
          $scope.info.totalApproved = acResults.approvedCount;
          $scope.info.totalUnapproved = acResults.unapprovedCount;

        });

         //save all the subs into a temporary variable
         $scope.showSearchCond = true;
         var filters = {};
         var allFilters = [];
         var fuzzyFilters = {};
         var rangeFilters = {};

         var rules = $scope.searchOptions.group.rules;
         for(var key in rules){
          // console.log("rule ", rules[key])
          var condition = rules[key].condition;
          var field = rules[key].field.key;
          // $scope.rule.field = 1;

          if(rules[key].field.type=='pastDate' || rules[key].field.type=='futureDate' || rules[key].field.type=='date'||rules[key].field.type=='createdDate'){
            //handle dates
            var date = new Date (rules[key].data);
            //if this is a date, parse it into a valid format for elastic search and set time of day based on condition
            if(rules[key].condition == "lt"){
              rules[key].data = $filter('date')(date,"yyyy'-'MM'-'dd'T00:00:00'");
            } else if(rules[key].condition == "gt"){
              rules[key].data = $filter('date')(date,"yyyy'-'MM'-'dd'T23:59:59'");
            } else {
              rules[key].data = $filter('date')(date,"yyyy'-'MM'-'dd'T05:00:00'");
            }
          }

          if(field.indexOf("mediasets.") == 0){
            //handle mediaset form field
            field = "mediasets.media.mediasetFormData." + field.substring(10);
          } else if (rules[key].field.type=='createdDate'){
            //normal form field
            field = field;
          } else if(field != "_all"){
            //normal form field
            field = "formData." + $scope.approvalApp + "." + field;
          }
          if(field == "_all"){
            allFilters.push(rules[key].data);
          }
          else{
            if(condition == "="){
              filters[field] = rules[key].data;
            } else if(condition == "f"){
              fuzzyFilters[field] = rules[key].data;
            } else{
              if(!rangeFilters[field]){
                rangeFilters[field] = {};
              }
              rangeFilters[field][condition] = rules[key].data;
            }
          }
         }


         // console.log("filters ", filters);
         // console.log("fuzzyfilters ", fuzzyFilters);

        $scope.searchQuery = "/elasticSearch/" + $scope.approvalApp + "/subs.json"
        var data = {};
        if($scope.searchOptions.group.operator == "OR"){
          data.shouldMatch = filters;
          data.shouldFuzzyMatch = fuzzyFilters;
          data.shouldRange = rangeFilters;
          data.shouldAllMatch = allFilters;
        } else{
          data.mustMatch = filters;
          data.mustFuzzyMatch = fuzzyFilters;
          data.mustRange = rangeFilters;
          data.mustAllMatch = allFilters;
        }

        //apply filters
        if(tags){
          if(!data.mustMatch){
            data.mustMatch={};
          }
          data.mustMatch.tags=tags;
        }

        if(approved){
          if(!data.mustMatch){
            data.mustMatch={};
          }
          data.mustMatch.approved=approved.approved
        }

        if(page){
          $scope.pag.bigCurrentPage = page;
        }
        data.pageSize = $scope.pag.itemsPerPage;
        data.page = $scope.pag.bigCurrentPage;

      config ={};
      $http({method: 'POST', url: $scope.searchQuery, data: data}).
      success(function(data) {
        $scope.subs = data.Submissions;
        $scope.pag.bigTotalItems = data.Total;
          });
    }

    $scope.searchDate = function(minDate, maxDate){
      //save all the subs into a temporary variable
      $scope.showSearchCond = true;

      //TODO: this will work for now but change the string at the end to an actual time adjusted for our time zone, instead of just adding 5 hours
      minDate = $filter('date')(minDate, "yyyy'-'MM'-'dd'T00:00:00'");
      maxDate = $filter('date')(maxDate, "yyyy'-'MM'-'dd'T23:59:59'");

      //$scope.searchQueryDate = "/elasticSearch/" + $scope.approvalApp + "/subDate.json?" + "min=" + minDate + "&" + "max=" + maxDate;

      $scope.searchQuery = "/elasticSearch/" + $scope.approvalApp + "/subs.json"
        var data = {};
        data.mustRange = {"createdDate" : {
          "gte" : minDate,
          "lte" : maxDate
        }};

        data.pageSize = $scope.pag.itemsPerPage;
        data.page = $scope.pag.bigCurrentPage;

      $http({method: 'POST', url: $scope.searchQuery, data: data}).
      success(function(data) {
        $scope.subs = data.Submissions;
            // window.console.log($scope.subsSearch);

         $scope.pag.bigTotalItems = data.Total
          });


    }

    //when user is on adv search, and goes back to basic search clean up rules
    $scope.cleanupRules = function(rules){
      if(rules.length > 1){
        for(var i = rules.length - 1;i>=1;i--){
        rules.splice(i, 1);
      }
      }

    }

    //clear the rules on search when user clears search
    $scope.clearRules = function(rules){

        if(!$scope.subsTemp){
          $scope.subsTemp = $scope.subs;
         }


        for(var i = rules.length - 1;i>=0;i--){
         if(i > 0){
          rules.splice(i, 1);
         }
         else{
          rules[i].field = "";
          rules[i].data = "";
         }

        }

        $scope.showSearchCond=false;

    }


    //get a single submission
    $scope.getSubmission = function(value){
      config ={};
      $scope.submissionId = value;

      subService.getSingleSub({id:$scope.submissionId+'.json'}, function(sub){

        $scope.submission = sub;

      formService.getForm({id:sub.appId+'.json'}, function(data){
        $scope.app = data.applicationInfo;

      });




      })
    }

    $scope.getApp = function(value){
      config ={};
      formService.getForm({action:value}, function(data){
        $scope.app = data.applicationInfo;

      });
    }

    $scope.today = new Date();
    $scope.minActiveEndDate = $scope.today;
    $scope.updateMinActiveEndDate = function(){
      if($scope.newSchema.activeStartDate){
        $scope.minActiveEndDate = $scope.newSchema.activeStartDate;
      }
      if ($scope.newSchema.activeEndDate < $scope.newSchema.activeStartDate){
        $scope.newSchema.activeEndDate = null;
      }
    }

    $scope.handleRequireAll = function(isRequired){
      if(!isRequired){
        $scope.newSchema.requireAll = false;
      }
    }

    $scope.auth = {};

    $scope.thisDomain = window.location.hostname;
    if ($scope.thisDomain == 'localhost') $scope.thisDomain = 'localhost:3000'


      $scope.editApp = null;

    $scope.bitly = {isBitly:true};
    //Change bitly link
    $scope.changeBitly = function(){
      $scope.bitly.success = null;
      $scope.bitly.error = null;
      if($scope.bitly.customKeyWord){
      $http.post("/" + $scope.app._id + "/changeTinyUrl",{customKeyWord: $scope.bitly.customKeyWord}).
        success(function(data) {
          console.log("data")
          console.log(data)
          if(!data.error){
            $scope.app.tinyUrl = data.applicationInfo.tinyUrl
            $scope.bitly.success = "Your short url has been updated."
            console.log("Changed tinyurl to " + data.applicationInfo.tinyUrl);
            $scope.bitly.editBitly=false;
            $scope.bitly.customKeyWord = null;
          } else{
            console.log("failed to update tinyurl ");
            console.log(data.error);
              $scope.bitly.error = data.error

          }
        }).
        error(function(data,status){
          console.log("failed to change tinyurl to " + data.url);
          $scope.bitly.error = "Sorry, we encountered an error while trying to change your short URL"
        })
      } else{
        console.log("No custom link keyword defined")
        $scope.bitly.error = "Please enter a custom short URL"
      }
    }

    //Set Compare Flag to True
    $scope.compareFlag = function() {
      if ($scope.compare == false) {
          $scope.compare = true;
      }else{
          $scope.compare = false;
      }
    }

    //Add and Remove submissions IDs to be compared
    $scope.compareSubmissions = function(submissionId, value) {
      if (value == true) {
        var index = $scope.comparedSubmissions.indexOf(submissionId);
        $scope.comparedSubmissions.splice(index, 1);
        $scope.compareSubmission = false;
        // window.console.log('removed', index);
      }else{
        $scope.thisSubmission = submissionId;
        $scope.comparedSubmissions.push($scope.thisSubmission);
        // $scope.compareSubmission = true;
        // window.console.log('added');
      }
    }

    //Filter Submissions in Approval tool to show compared submissions only
    $scope.comparedSubFilter = function(value) {
     return ($scope.comparedSubmissions.indexOf(value._id) !== -1);
    };

    //when admin clicks approved or unapproved
    $scope.setApprovedStatus = function(filterActive, filterKey, filterVal){

      $scope.filterActive = filterActive;
      $scope.filterKey = filterKey;
      $scope.filterVal = filterVal;
      $scope.pag.bigCurrentPage = 1;
      //$scope.setPagTotalItems();


    }

    $scope.appEdit = function(value) {
      if ($scope.edit == 'true') {
        $scope.editApp = value;
        config ={};

        // formService.getForm({action:$scope.editApp},function(data){
        //     $scope.newSchema = data.applicationInfo;

        //       //if wufoo form, set wufooImport to false by default
        //       if($scope.newSchema.importSource == "wufoo"){
        //         $scope.fieldType.types.push({
        //          'name': 'wufooUpload',
        //          'readable': 'Wufoo File Upload',
        //          'description': 'Use this to import photos from Wufoo.'
        //        });
        //       }

        //       for (var i = 0; i < $scope.newSchema.appFormFields.length; i++){
        //         $scope.newSchema.appFormFields[i].isExistingField = true;
        //         if ($scope.newSchema.appFormFields[i].sequenceNumber == undefined){
        //           var sortID = rfc4122.newuuid();
        //           $scope.newSchema.appFormFields[i].sequenceNumber = sortID;
        //         }
        //       }
        // });

                $http.get("/"+$scope.editApp+"/app.json", config, {}).
        success(function(data) {
          $scope.newSchema = data.applicationInfo;

            //if wufoo form, set wufooImport to false by default
            if($scope.newSchema.importSource == "wufoo"){
              $scope.fieldType.types.push({
               'name': 'wufooUpload',
               'readable': 'Wufoo File Upload',
               'description': 'Use this to import photos from Wufoo.'
             });
              // console.log($scope.fieldType);
            }

            for (var i = 0; i < $scope.newSchema.appFormFields.length; i++){
              $scope.newSchema.appFormFields[i].isExistingField = true;
              if ($scope.newSchema.appFormFields[i].sequenceNumber == undefined){
                var sortID = rfc4122.newuuid();
                $scope.newSchema.appFormFields[i].sequenceNumber = sortID;
              }
              //populate replyToOptions
              if($scope.newSchema.appFormFields[i].fieldType == "email"){
                $scope.replyToOptions.push($scope.newSchema.appFormFields[i]);
              }
            }
          });




      } else {
      }
    }

    $scope.validateLabel = function(label) {
      for (index in $scope.newSchema.appFormFields){
        if (label === $scope.newSchema.appFormFields[index].fieldName){
        }

      }
    }

   $scope.requireAll = function() {
      angular.forEach($scope.newSchema.appFormFields, function(obj){

      obj["isMandatory"] = true;

      });
    }


    $scope.requireAllUndo = function() {
      angular.forEach($scope.newSchema.appFormFields, function(obj){

      obj["isMandatory"] = false;

      });
    }

    //Validate Search by Date Range
    $scope.checkSearchDate = function(minDate, maxDate){
      // window.console.log(minDate + maxDate);
      if(minDate >= null && maxDate >= null){
        // window.console.log('all dates');
        if(minDate <= maxDate){
          // window.console.log('move along');
        }
        else{
          // window.console.log('stop!');
        }
      }
      else {
        // window.console.log('no dates');
      }
    }


    $scope.createUniqueId = function(formField,index, ismsFormField, msId, iscondField, optionId){
      if(formField && formField.isExistingField){
        //do nothing
      }
      else{
        if(ismsFormField){
        formField.uniqueId = $filter('nospace')(formField.fieldName) + "_ms_" + msId + "_"+index;
      }
      else if(iscondField){
        formField.uniqueId = $filter('nospace')(formField.fieldName) + "_cond_" + optionId + "_"+index;
      }
      else{
        formField.uniqueId = $filter('nospace')(formField.fieldName) + "_" + index;
      }

      if(formField.fieldType == "mediaSet" || formField.fieldType == "mediaSetDoc" || formField.fieldType == "mediaSetVid" || formField.fieldType == 'mediaSetAudio'){

        var mediasetIndex;
        for (var i = 0;i<$scope.newSchema.mediaSets.length;i++){
          if($scope.newSchema.mediaSets[i] != null && parseInt(formField.mediaSetId)==parseInt($scope.newSchema.mediaSets[i]._id)){
            mediasetIndex = i;
          }
        }
        $scope.newSchema.mediaSets[mediasetIndex].mediaSetName = formField.uniqueId;
      }

      }
    }

    $scope.isAuthenticated = function() {
      var nameEQ = "auth=";
      var ca = document.cookie.split(';');
      for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) {
          var auth = c.substring(nameEQ.length, c.length);
          if (auth == "true"){
            return true
          }
        }
      }
      return false;
    }

    $scope.logout = function() {
    //Since all cookies are session cookies, we only need to remove the data.
    createCookie("auth", "");
  }

  $scope.isCollapsed = true;

  $scope.reset = function() {
    $scope.newSchema.appFormFields = [];
    $scope.newSchema.mediaSets = [];
    $scope.newSchema.tags = [];
    $scope.newSchema.appName = "";
    $scope.newSchema.appDescription = "";
    $scope.newSchema.appUrl = "";
    $scope.newSchema.confirmation = "";
    $scope.newSchema.platformTitle = "";
    $scope.newSchema.callToAction = "";
    $scope.schema.$setPristine();
  };

  $scope.init = function(value,accountId,role,accountType, activeTab, embedCssRef) {
    $scope.newSchema.customerId = $scope.customerId = value;
    $scope.customerRole = role;
    $scope.accountId = accountId;
    $scope.accountType = accountType;
    $scope.activeTab = activeTab;
    $scope.embedCssRef = embedCssRef;
    $scope.supportsHTML5Blob = (window.Blob && window.FileReader)?true:false;
    $scope.msSaveBlob = (navigator.msSaveBlob)?true:false;
    jQuery.support.download = (function(){
          var i = document.createElement('a');
          return 'download' in i;
        })();
    $scope.supportDownload = $.support.download;

  $scope.getAppNames = function(accountId){
    config ={};
    $scope.accountId = accountId;

    formService.getFormNames({id:$scope.accountId}, function(data){
      $scope.appId = data._id;
      $scope.applicationName = data.applicationName;
    })

  }
  var duplicateFormData = window.sessionStorage && window.sessionStorage.getItem("duplicateFormData");
  if (duplicateFormData != null){
    var json = JSON.parse(duplicateFormData);
    $scope.newSchema = json.applicationInfo;
    $scope.newSchema.createdDate = new Date();
    window.sessionStorage && window.sessionStorage.removeItem("duplicateFormData");
  }

  userService.getUser({id:$scope.newSchema.customerId}, function(data){
          $scope.thisCustomer = data.customerInfo[0];
          if($scope.newSchema.categories.length == 0){
            $scope.newSchema.categories.push($scope.thisCustomer.defaultCategory);
          }

  });

  $scope.collapseAllFields();
  $scope.collapseBtn = true;

  }

  $scope.edit = function(value) {
    $scope.edit = value;
  }

  $scope.getAccount = function(accountId){
    $scope.account ={};

    acctService.getAcct({id:accountId}, function(data){
      $scope.account = data.accountInfo;
      if($scope.newSchema && !$scope.newSchema._id && !$scope.newSchema.appId){
        $scope.newSchema.policyURL = $scope.account.defaultPolicyURL;
        $scope.newSchema.tosURL = $scope.account.defaultTosURL;
      }

    })

  }

  $scope.confirm = false;
  $scope.success = false;
  //Minimum dob check age allowed in Sub. The user can choose a higher age for his/her form.
  $scope.minDOBCheckAge = 13;

  $scope.meta = [];

     // Default Application Settings (auto approve, active)
     $scope.newSchema = {
       'appFormFields': [],
       'mediaSets': [],
       'tags': [],
       customerId : null,
       createdDate : new Date(),
       autoApproved: true,
       active: true,
       submissionNotifications: false,
       endUserNotification:false,
       socialShareButtons : false,
       shared: true,
       categories:[],
       defaultImgFieldExt:"jpg",
       requireAll: false,
       submissionLimit: false,
       submissionLimitAmount:100
     };


     $scope.styles = {
      styles:[
      {
        'name': 'none',
        'readable': 'None'
      },
      {
        'name': 'metallic',
        'readable': 'Metallic'
      },
      {
        'name': 'mono',
        'readable': 'Monochromatic'
      },
      {
        'name': 'spring',
        'readable': 'Spring'
      },
      {
        'name': 'winter',
        'readable': 'Winter'
      }
      ]
    };

    $scope.fieldType = {
      'types':[
      {
       'name': 'text',
       'readable': 'Text',
       'description': 'Value MUST be a string.',
       'groupName': 'Standard'
     },{
     'name': 'textarea',
     'readable': 'Paragraph Text',
     'description':  'Text Area',
       'groupName': 'Standard'
   },{
      'name':  'email',
      'readable': 'Email',
      'description': 'Value MUST be email.',
       'groupName': 'Standard'
    },{
       'name': 'number',
       'readable': 'Number',
       'description': 'Value MUST be a number, floating point numbers are allowed.',
       'groupName': 'Standard'
     },
     {
       'name': 'sectionHeader',
       'readable': 'Section Header',
       'description':  'Section Header',
       'groupName': 'Standard'
     },{
       'name': 'subSectionHeader',
       'readable': 'Sub Section Header',
       'description':  'Sub Section Header',
       'groupName': 'Standard'
     },{
       'name': 'radio',
       'readable': 'Multiple choice (radio)',
       'description': 'Radio Button',
       'groupName': 'Standard'
     },{
       'name': 'dropdown',
       'readable': 'Choose from a list (dropdown)',
       'description': 'dropdown',
       'groupName': 'Standard'
     },{
     'name': 'checkbox',
     'readable': 'Checkboxes',
     'description':  'Checkboxes',
       'groupName': 'Standard'
   }
     ,{
       'name': 'mediaSet',
       'readable': 'Image Uploader (jpg, jpeg, png, gif, bmp)',
       'description':  'If you want to create a Photo set / Gallery.',
       'groupName': 'Uploaders'
     },{
       'name': 'mediaSetDoc',
       'readable': 'Document Uploader (doc, txt, xls, pdf)',
       'description':  'If you want to upload a document.',
       'groupName': 'Uploaders'
     },{
       'name': 'mediaSetVid',
       'readable': 'Video Uploader (mov, avi, mp4, wmv)',
       'description':  'If you want to upload a video.',
       'groupName': 'Uploaders'
     },
     {
       'name': 'mediaSetAudio',
       'readable': 'Audio File Uploader (wav, mp3, mp4, mid, wma)',
       'description':  'If you want to upload an audio file.',
       'groupName': 'Uploaders'
     },

     {
       'name': 'date',
       'readable': 'Date',
       'description': 'Value MUST be a date.',
       'groupName': 'Date & Time'
     },
     {
       'name': 'pastDate',
       'readable': 'Past Date (including today)',
       'description': 'Value MUST be a date.',
       'groupName': 'Date & Time'
     },
     {
       'name': 'futureDate',
       'readable': 'Future Date (including today)',
       'description': 'Value MUST be a date.',
       'groupName': 'Date & Time'
     },
     {
       'name': 'time',
       'readable': 'Time',
       'groupName': 'Date & Time'
     },
     {
       'name': 'trueFalse',
       'readable': 'True/False (radio)',
       'description': 'Value MUST be a boolean.',
       'groupName': 'Custom'
     },{
       'name': 'yesNo',
       'readable': 'Yes/No (radio)',
       'description': 'Value MUST be a boolean.',
       'groupName': 'Custom'
     },
   {
     'name': 'firstAndLastName',
     'readable': 'First and Last Name fields',
     'description':  'First and Last Name fields',
       'groupName': 'Custom'
   },
   {
     'name': 'phoneNumber',
     'readable': 'U.S. Phone Number field',
     'description':  'Phone Number field',
       'groupName': 'Custom'
   },
   {
     'name': 'address',
     'readable': 'Address field',
     'description':  'Address field',
     'groupName': 'Custom'
   },
   {
     'name': 'dobCheck',
     'readable': 'Date of Birth Check',
     'description':  'Use this to require a minimum age',
     'groupName': 'Custom'
   }
   // {
   //   'name': 'payment',
   //   'readable': 'Payments',
   //   'description':  'Payment Field',
   //   'groupName': 'Custom'
   // }
   ]
 };

 $scope.tooltips = {
  name:"This is the name of your form; it will appear at the top and let users know what your form is called.",
  url:"Please let us know the web address of the site where you’ll be using your form. Note: This information will not appear anywhere on your form.",
  uniqueId:"This is a machine-readable name without spaces or special characters. It will always remain the same.",
  fieldName:"This is the name of the field",
  replyto:"You may select any email field from this form to supply the reply to header on your notification emails.",
  fieldType:"Here are explanations for some of the fields:<br>Section Header - Use this to provide bolded information to your user<br>Multiple Choice - User can select one item from a radio button list<br>Choose from a list - User can select one item from a dropdown list<br>Checkbox - User can select more than one item from a list using checkboxes<br>Paragraph Text - Use this to provide information to your user ",
  fieldInstructions:"Enter text that explains what you want your users to do. This appears under the field name/question.",
  publicPrivate:"Mark a field as “Private” if you want it to be seen only by admin users. Otherwise, mark it as “Public”.",
  placeholder:"This placeholder text will appear in gray inside the field. It will disappear as soon as the user types in the field.",
  tags:"Use tags to organize your submissions by specific terms. These tags can be edited later. Separate individual tags using commas.",
  status:"This indicates the current status of your form. 'Active' means your form is live for everyone to see. 'Inactive' means no one will see your form.",
  autoApprove:"Use this to moderate and approve your user submissions. Select 'Yes' if you want to reserve the option to approve/not approve each submission. Select “No” if you don't need this feature. ",
  heading:"The default title for your form will be your Form Name. Otherwise, you can designate a separate title here. ",
  description:"Describe your form for users (this will appear below the name of your form). A description could be a tagline or additional information about your form. You can also leave this space blank. ",
  buttonText:"This text will appear inside the button a user will click at the bottom of your form to submit his or her response. ",
  confirmMsg:"Customize the confirmation message users will see after submitting their forms. Or, stick with a default confirmation message.",
  numOfImgs:"Enter the number of images users can upload. ",
  activeEndDate:"Enter the date of when the form should no longer accept submissions. The form will be marked inactive at 11:00PM of selected date.",
  activeStartDate:"Enter the date of when the form should start to accept submissions.",
  inactiveMsg:"Enter a custom message for users to see when the form is inactive.",
  notifications:"When turned on, a notification will be sent to a designated email address (normally the creator of this form) every time this form recieves a submission.",
  endUserNotification :"When turned on, a notification will be sent to the end user's email address confirming the user's form submission",
  endUserNotificationMessage :"This will be prepended to the message that is sent.",
  socialShareButtons :"On the confirmation page shown to the user after form submission the user will be prompted to share this form on Facebook, Twitter and Google+",
  socialTitle : "Some social media platforms require a title for the shared item. For example, this will be the title of this share on a user's Facebook wall",
  socialDescription : "Some social media platforms require a description for the shared item. For example, this will be the description of this share on a user's Facebook wall",
  socialLogo : "Display a custom logo when your form is shared on Facebook instead of the Submission Platform logo",
  logo:"The maximum upload file size is 10 MB. The only file types allowed are jpg, png, jpeg, bmp, and gif.",
  policy:"You have the option to include a link to the privacy policy that your would like displayed on the hosted version of your form. You can set a default policy to use for all forms in your account settings.",
  tos:"You have the option to include a link to the terms of service that your would like displayed on the hosted version of your form. You can set a default policy to use for all forms in your account settings.",
  minAge: "Use this to enforce a minimum age for your end users. Sub only allows restriction of forms to ages 13 and up. You can specify a minimum age older than 13 but not younger.",
  shared:"If you want the form to be visible to everyone in the account or it is a private form that you do not want to share. ",
  categories:"Apply the category the form should be filed under. ",
  required:"If you want all form fields to be required. ",
  conditional:"A conditional field allows you to present the user with different fields based on their answers. ",
  customSubjLine:"If you would like user input to appear in the email's subject line, start typing '@' and all the possible fields will appear.",
  otherField:"Check this, if you would like to add an option called 'Other' and an empty input field."
};

$scope.placeholders = {
  msgNextToDraftBtnPlaceholder:"Default: Click to save your submission to be edited later."

};


  $scope.showEdit = function(){
    if ($scope.edit == true)
      $scope.edit = false;
    else
     $scope.edit = true;
 };

 $scope.newFormField = function(fieldType){
  $scope.collapseBtn = true;
  var sortID = rfc4122.newuuid();
  var array = [];
  fieldObj =  {"fieldType": fieldType.name, "isMandatory":false, "isPublic":true, "readable": fieldType.readable, "sequenceNumber": sortID, "endUserNotification" : false, "isCollapsed":false, "isFocused": true, "isConditional":false, "fieldTypeOptionsArray":array};
  if(fieldType.name == "dobCheck"){
    //set default dob min age to be the minimum require by our app. The user can increase this.
    fieldObj.minAge = $scope.minDOBCheckAge;
  }
  $scope.newSchema.appFormFields.push(fieldObj);

  if(fieldType.name == "mediaSet" ||fieldType.name == "mediaSetDoc" || fieldType.name == "mediaSetVid" ||fieldType.name == "mediaSetAudio"){
    $scope.newMedia(fieldObj);
  }

  if(fieldType.name == "payment"){
    $scope.payments = true;
  }

  if(fieldType.name== "email"){
    $scope.replyToOptions.push($scope.newSchema.appFormFields[$scope.newSchema.appFormFields.length-1]);
  }

};

$scope.shuffleFields = function(){
  var shuffled = [];
  var fieldScope = $scope.newSchema.appFormFields;
  $("input.sequenceNumber").each(function(){
    var val = $(this).val();
    var result = fieldScope.filter(function(fieldScope) {
      return fieldScope.sequenceNumber === val;
    })[0];
    shuffled.push(result);
  });
    // dumb, but have to null the array and $apply() before reassiging
    $scope.newSchema.appFormFields.length = 0;
    $scope.$apply();

    $scope.newSchema.appFormFields = shuffled;
    $scope.isCollapsed = true;
    $scope.$apply();
  };

  $scope.removeFormField = function(index,formField){
    $scope.newSchema.appFormFields.splice(index, 1);
    if(formField.fieldType == "mediaSet" || formField.fieldType =="mediaSetDoc" || formField.fieldType =="mediaSetVid" || formField.fieldType =="mediaSetAudio"){
      var mediasetToDeleteIndex;
        for (var i = 0;i<$scope.newSchema.mediaSets.length;i++){
          if($scope.newSchema.mediaSets[i] != null && parseInt(formField.mediaSetId)==parseInt($scope.newSchema.mediaSets[i]._id)){
            mediasetToDeleteIndex = i;
          }
        }
        $scope.newSchema.mediaSets[mediasetToDeleteIndex] = {};
    }

    //remove deleted email form fields from replyToOptions
    if(formField.fieldType == "email"){
      $scope.removeReplyToOption(formField);
      // for(var c=0; c<$scope.replyToOptions.length;c++){
      //   if(formField.uniqueId == $scope.replyToOptions[c].uniqueId){
      //     $scope.replyToOptions.splice(c, 1);
      //   }
      // }
    }

  };


//Duplicate Form Field
  $scope.duplicateFormField = function(index,formField){
    if(formField.fieldType == "mediaSet" || formField.fieldType =="mediaSetDoc" || formField.fieldType =="mediaSetVid" || formField.fieldType =="mediaSetAudio"){
        var i = index;
        $scope.index = index += 1;
        $scope.duplicateField = angular.copy(formField);
        $scope.originalField = angular.copy(formField);
        $scope.duplicateField.uniqueId = $filter('nospace')($scope.duplicateField.fieldName) + "_" + $scope.index ;
        $scope.duplicateField.mediaSetId = $scope.duplicateField.mediaSetId +=1;
        $scope.mediaSetFormFieldsNew = angular.copy($scope.newSchema.mediaSets[$scope.originalField.mediaSetId].mediaSetFormFields);
        angular.forEach($scope.mediaSetFormFieldsNew, function(value, key) {
            angular.forEach(value, function(v, k) {
              if (k == 'uniqueId'){
                value[k] = v += 1;
              }else{
              }
            });
        });
        $scope.mediaSetName = $scope.newSchema.mediaSets[$scope.originalField.mediaSetId].mediaSetName + "_" + $scope.index;
        $scope.duplicateField.isCollapsed = false;
        // window.console.log($scope.duplicateField);
        $scope.newSchema.appFormFields.push($scope.duplicateField);
        $scope.newSchema.mediaSets.push({"_id":$scope.duplicateField.mediaSetId, "numOfMedia":1, "mediaSetType":'image', "mediaSetName": $scope.mediaSetName, "mediaSetFormFields": $scope.mediaSetFormFieldsNew});
        formField.mediaSetType = formField.fieldType;
    } else if(formField.isConditional == true){
      var i = index;
        $scope.index = index += 1;
        $scope.duplicateField = angular.copy(formField);
        $scope.duplicateField.isCollapsed = false;
        $scope.duplicateField.uniqueId = $filter('nospace')($scope.duplicateField.fieldName) + "_" + $scope.index ;
        $scope.fieldTypeOptionsArrayNew = $scope.duplicateField.fieldTypeOptionsArray;
        angular.forEach($scope.fieldTypeOptionsArrayNew, function(value, key) {
          angular.forEach(value, function (v, k) {
            if (k == 'conditionalFields'){
              angular.forEach(v, function (v1, k1) {
                angular.forEach(v1, function (v2, k2) {
                  if (k2 == 'uniqueId'){
                      v1[k2] = v2 += "_" + 1;
                      // console.log(v1[k2]);
                  }
                });
              });
            }
          });
        });
        // console.log($scope.duplicateField);
        $scope.newSchema.appFormFields.push($scope.duplicateField);
    }else{
      $scope.index = index += 1;
      $scope.duplicateField = angular.copy(formField);
      $scope.duplicateField.isCollapsed = false;
      $scope.duplicateField.uniqueId = $filter('nospace')($scope.duplicateField.fieldName) + "_" + $scope.index ;
      $scope.newSchema.appFormFields.push($scope.duplicateField);
      console.log($scope.duplicateField);
    }
  };
    // Create New Media Set

    $scope.newMedia = function(formField){

      var mediaSetId,mediaSetIndex;
      if($scope.newSchema.mediaSets.length == 0) mediaSetId = 0;
      else{
        var id = 0;
        for(var i = 0; i < $scope.newSchema.mediaSets.length; i++){
            if($scope.newSchema.mediaSets[i]._id > id){
              id = $scope.newSchema.mediaSets[i]._id;
            }
        }
        mediaSetId = id;
        mediaSetId++;
      }

      var readableName, readable = '', value;

      for (var i=0;i<$scope.fieldType.types.length;i++){
        readableName = $scope.fieldType.types[i].name,
        readable = $scope.fieldType.types[i].readable
        value = formField.fieldType;
        if(value == readableName){
          formField.readable = readable;
        }
      }

      //If email field type, add this form field to replyToOptions, else, remove it from replyToOptions
      if(formField.fieldType == "email"){
        $scope.replyToOptions.push(formField);
      } else{
        $scope.removeReplyToOption(formField);
      }
      if(formField.fieldType == "mediaSet" || formField.fieldType == "mediaSetDoc" || formField.fieldType == "mediaSetVid" || formField.fieldType == "mediaSetAudio"){
        var mediasetToDeleteIndex;
        for (var i = 0;i<$scope.newSchema.mediaSets.length;i++){
          if($scope.newSchema.mediaSets[i] != null && parseInt(formField.mediaSetId)==parseInt($scope.newSchema.mediaSets[i]._id)){
            mediasetToDeleteIndex = i;
          }
        }
        $scope.newSchema.mediaSets[mediasetToDeleteIndex] = {};
        formField.mediaSetId = mediaSetId;
      }
      if(formField.fieldType == "mediaSet"){
        $scope.newSchema.mediaSets.push({"_id":mediaSetId, "numOfMedia":1, "mediaSetType":'image'});
        formField.mediaSetType = "image";
      }else if(formField.fieldType == "mediaSetDoc"){
        $scope.newSchema.mediaSets.push({"_id":mediaSetId, "numOfMedia":1, "mediaSetType":'document'});
        formField.mediaSetType = "document";
      }else if(formField.fieldType == "mediaSetVid"){
        $scope.newSchema.mediaSets.push({"_id":mediaSetId, "numOfMedia":1, "mediaSetType":'video'});
        formField.mediaSetType = "video";
      }
    else if(formField.fieldType == "mediaSetAudio"){
        $scope.newSchema.mediaSets.push({"_id":mediaSetId, "numOfMedia":1, "mediaSetType":'audio'});
        formField.mediaSetType = "audio";
      }
      else
      {
        $scope.newSchema.mediaSets[formField.mediaSetId] = {};
        delete formField.mediaSetId;
        delete formField.mediaSetType;
      }
    };

    // New meta data field for mediaSet (images only)
    $scope.newMediaField = function(msId){
     for(var i=0;i<$scope.newSchema.mediaSets.length;i++){
      if($scope.newSchema.mediaSets[i].hasOwnProperty("_id")){
        if($scope.newSchema.mediaSets[i]._id == msId){
          if (!$scope.newSchema.mediaSets[i].mediaSetFormFields) {
            $scope.newSchema.mediaSets[i].mediaSetFormFields = [];
          }
          $scope.newSchema.mediaSets[i].mediaSetFormFields.push({"isCollapsed":false,"isMandatory":false, "isPublic":true,"readable": "Text","fieldType": $scope.fieldType.types[0].name});
          }
        }
      }
    };

    // Duplicate meta data field for mediaSet (images only)
    $scope.newMediaFieldDuplicate = function(msId, index, imageFormField){
    console.log($scope.newSchema);
    console.log(msId);
    for(var i=0;i<$scope.newSchema.mediaSets.length;i++){
      if($scope.newSchema.mediaSets[i].hasOwnProperty("_id")){
        if($scope.newSchema.mediaSets[i]._id == msId){
          if (!$scope.newSchema.mediaSets[i].mediaSetFormFields) {
            $scope.newSchema.mediaSets[i].mediaSetFormFields = [];
          }
          $scope.index = index += 1;
          $scope.duplicateField = angular.copy(imageFormField);
          console.log($scope.duplicateField);
          $scope.duplicateField.uniqueId = $scope.duplicateField.uniqueId + "_" + $scope.index ;
          console.log($scope.duplicateField);
          $scope.newSchema.mediaSets[i].mediaSetFormFields.push($scope.duplicateField);
          }
        }
      }
    };



    $scope.review = function (){
      // set the location.hash to the id of
      // the element you wish to scroll to.
      $scope.confirm = true;
      $location.hash('top');
      // call $anchorScroll()
      $anchorScroll();
    };


    $scope.uploadLogo = function(){

      if($scope.uploader.queue.length > 0){
        $scope.uploader.uploadAll();
        $scope.newSchema.logoURL = "//wppup2approved.s3.amazonaws.com/internal/"+$scope.newSchema.logoUploadId+".png";
        console.log($scope.newSchema);
      }
    }

    $scope.cleanMediaSetsArray = function(){
      //clean up mediasets array
      var removeValFromIndex = [];
      for (var i=0;i<$scope.newSchema.mediaSets.length;i++){
        var mediaset = $scope.newSchema.mediaSets[i];
        // console.log(mediaset);
        var prop = "_id";
        if(mediaset!=null && mediaset.hasOwnProperty(prop)){
          //do nothing
          }
          else{
            removeValFromIndex.push(i);
          }
        }
        for(var i = removeValFromIndex.length - 1; i>=0;i--){
          $scope.newSchema.mediaSets.splice(removeValFromIndex[i],1);
        }
    }


    // POST Application to DB
    $scope.addNewApp = function() {
      $scope.uploadLogo();
      $scope.cleanMediaSetsArray();
      $scope.newSchema.accountId = $scope.accountId;
      $scope.newSchema.draftLastSaved = new Date();

      formService.addForm($scope.newSchema, function(data){
            // window.console.log(data);
          $scope.response = data;
          $scope.newSchema.appId = $scope.response.applicationInfo._id;
          $scope.newSchema._id = $scope.response.applicationInfo._id;

          window.console &&  console.log('success - saved', $scope.newSchema.appId);
          $location.hash('top');
          //show success message

          // call $anchorScroll()
          $anchorScroll();
          // console.log("after anchor scroll")
        }, function(){
            // window.console && console.log('error - unsaved', $scope.newSchema);
        });
    };

    $scope.saveForm = function(user, userId){
      if($scope.schema.$invalid){
        $scope.createFormErrors = true;
        return false;
      }
      else{
          $scope.createFormErrors = false;
          $scope.newSchema.draftLastSaved = new Date();
          $scope.newSchema.draftLastSavedUser = user;
          $scope.newSchema.lastSavedUserId = userId;
              if($scope.newSchema.appId || $scope.newSchema._id){
                $scope.updateApp();
                $scope.updateSuccess = true;
                $scope.appCreatedSuccessMsg = false;
              }
              else{
                $scope.addNewApp();
                $scope.updateSuccess = false;
                $scope.appCreatedSuccessMsg = true;
              }
      }

    };

    $scope.thisDomain = window.location.hostname;
    if ($scope.thisDomain == 'localhost') $scope.thisDomain = 'localhost:3000'

      $scope.goToTop = function() {
        $location.hash('top');
    // call $anchorScroll()
    $anchorScroll();
  }

  $scope.updateSub = function(submission) {

    subService.updateSub(submission, function(data){
          if (data.durr) {
            console.log("Update Failed")
          }
        }, function(){
           // console.log("Update Sub Failed");
        });
  }

  $scope.manageTags = {};
  $scope.addTag = function(){
    // window.console.log($filter('lowercase')($scope.manageTags.newTag) + $scope.app.tags);
    if($scope.app.tags.indexOf($filter('lowercase')($scope.manageTags.newTag)) != -1){
      $scope.manageTags.error = "Whoops! This tag already exists.";
    } else {
      $scope.manageTags.error = false;
      $scope.app.tags.push($filter('lowercase')($scope.manageTags.newTag));
      $scope.updateAppTags($scope.app);
    }
    $scope.manageTags.newTag = "";
  }

  $scope.manageTags.removeTag = false;
  $scope.removeTag = function(index){

    var tagsToRemove = []
    tagsToRemove.push($scope.app.tags[index]);
    $scope.app.tags.splice(index,1);
    $scope.updateAppTags($scope.app, tagsToRemove);
  }

  $scope.updateAppTags = function(app, tagsToRemove){

    formService.updateForm(app, function(data){
            if (data.durr) {
              if(!tagsToRemove){
                $scope.removeTag($scope.app.tags.length -1);
              }
              $scope.manageTags.error = "data.durr";
            }
        }, function(){
            if(!tagsToRemove){
              $scope.removeTag($scope.app.tags.length -1);
            }
            $scope.manageTags.error = "Tag Failed";
        });
    //if tagsToRemove specified, remove tags from this form's submissions
    if(tagsToRemove && tagsToRemove.length > 0){
      subService.updateSubTags({id: $scope.app._id, tagsToRemove: tagsToRemove}, function(data){
        if(data.error){
          $scope.manageTags.error = "Error removing tag";
          console.log(data.error);
        } else{
          $scope.getSubs();
        }
        }, function(){
            $scope.manageTags.error = "Tag Failed";
        })
    }

  }

  //UI filter by status and tags
  $scope.filterTagVals = [];
  $scope.filterStatus = ""
  $scope.setfilterTagVals = function(tag, page){
    $scope.tagFilter = true;
    $scope.subs=[];
    if(page){
      $scope.pag.bigCurrentPage = page
    }

    //if it is in the array, remove it
    if($scope.inArray(tag,$scope.filterTagVals)){
      var index = $scope.filterTagVals.indexOf(tag);
      if(index > -1){
        $scope.filterTagVals.splice(index,1);
      }
    }
    //if it is not in the array, add it
    else{
      $scope.filterTagVals.push(tag);
    }

    if($scope.showSearchCond){
      $scope.searchAll($scope.filterTagVals)
    }
    else{
      var tagsParam = ""
      for(tagI in $scope.filterTagVals){
        tagsParam += "&tags[]="+$scope.filterTagVals[tagI].toLowerCase();
        $scope.tagsParam = tagsParam;
      }
      $http.get("/internal/"+$scope.approvalApp+"/subs.json?page="+$scope.pag.bigCurrentPage+"&size="+$scope.pag.itemsPerPage+tagsParam, config, {}).
      success(function(data) {

        if(data.Submissions){
          $scope.subs = data.Submissions;
        }
        else{
          $scope.hasNoSubs = true;
        }
        $scope.info.totalSubs = data.Total;
        $scope.message = data.Message;
        if($scope.subs){
          $scope.pag.bigTotalItems = data.Total;
        }
      });
    }

  }

  $scope.setfilterApproved = function(approved, page){
    $scope.subs=[];
    if(page){
      $scope.pag.bigCurrentPage = page
    }

    $scope.filterKey = "approved";
    $scope.filterVal = (approved)?true:false;

    if($scope.showSearchCond){
      $scope.searchAll(null,{approved:approved})
    }
    else{

      $http.get("/internal/"+$scope.approvalApp+"/subs.json?page="+$scope.pag.bigCurrentPage+"&size="+$scope.pag.itemsPerPage+"&approved="+approved, config, {}).
      success(function(data) {

        if(data.Submissions){
          $scope.subs = data.Submissions;
        }
        else{
          $scope.hasNoSubs = true;
        }
        $scope.info.totalSubs = data.Total;
        $scope.message = data.Message;
        if($scope.subs){
          $scope.pag.bigTotalItems = data.Total;
        }
      });
    }
  }


//check if in array helper function
$scope.inArray = function(needle,haystack)
{
  var count=haystack.length;
  for(var i=0;i<count;i++)
  {
    if(haystack[i]===needle){return true;}
  }
  return false;
}

//bulk actions
$scope.bulkActions = {
  on: false,
  tags: [],
  subs: []
}

$scope.bulkActions.selectAllVis = function(){
  for(var key in $scope.subs){
    $scope.subs[key].isSelected=true;
    $scope.bulkActions.subs.push($scope.subs[key]._id);
  }
}

$scope.bulkActions.deselectAll = function(){
  $scope.bulkActions.subs = [];
  for(var key in $scope.subs){
    $scope.subs[key].isSelected=false;
  }
}

$scope.bulkActions.applyTags = function(){
  //apply tags in bulkactions.tags array to subs in bulkactions.subs array
  subService.bulkAddTags({subs:$scope.bulkActions.subs, tags:$scope.bulkActions.tags}, function(data){
      console.log("tags added: ");
      console.log(data);

      //Update subs in scope b/c sometimes callback is called before change is propegated in Elastic Search
      for(var key in $scope.subs){
        if($scope.subs[key].isSelected){
          $scope.subs[key].isSelected = false;
          for (var tagKey in $scope.bulkActions.tags){
            if(!$scope.subs[key].tags.indexOf($scope.bulkActions.tags[tagKey]) > -1){
              $scope.subs[key].tags.push($scope.bulkActions.tags[tagKey]);
            }
          }
        }
      }
      $scope.bulkActions.subs=[];
    });
}

$scope.bulkActions.removeTags = function(){
  //remove tags in bulkactions.tags array from subs in bulkactions.subs array
  subService.bulkRemoveTags({subs:$scope.bulkActions.subs, tags:$scope.bulkActions.tags}, function(data){
      console.log("tags removed: ");
      console.log(data);

      //Update subs in scope b/c sometimes callback is called before change is propegated in Elastic Search
      for(var key in $scope.subs){
        if($scope.subs[key].isSelected){
          $scope.subs[key].isSelected = false;
          for (var tagKey in $scope.bulkActions.tags){
            var indexOfTag = $scope.subs[key].tags.indexOf($scope.bulkActions.tags[tagKey]);
            if(indexOfTag > -1){
               $scope.subs[key].tags.splice(indexOfTag, 1);
            }

          }
        }
      }
      $scope.bulkActions.subs=[];
    });
}

$scope.bulkActions.deleteSubs = function(){
  //delete subs in bulkactions.subs array
  subService.bulkDeleteSubs({subs:$scope.bulkActions.subs}, function(data){
      console.log("subs deleted: ");
      console.log(data);
      $scope.paginate();
    });
}

$scope.bulkActions.updateSubs = function(id,isSelected){
  console.log(isSelected)
  if(isSelected){
    $scope.bulkActions.subs.push(id)
  }else{
    for (var i=$scope.bulkActions.subs.length-1; i>=0; i--) {
      if ($scope.bulkActions.subs[i] === id) {
          $scope.bulkActions.subs.splice(i, 1);
          break;
      }
    }
  }
}

$scope.pag = {};
$scope.pag.bigTotalItems = 0;
$scope.pag.bigCurrentPage = 1;
$scope.pag.maxSize = 10;
$scope.pag.numPages = 10;
$scope.pag.itemsPerPage = 10;
$scope.pag.otherItemsPerPage = 50;
$scope.tagsParam = "";


$scope.appApprove = function(value) {
  $scope.approvalApp = value;
  config ={};

  // formService.getForm({action:$scope.approvalApp},
  //   function(data){

      // $scope.app = data.applicationInfo;
  //     window.document.title = "Admin | " + $scope.app.appName;
  //     //TODO: move this into a search function so it only runs when a person opens the search gui
  //     $scope.searchFields = [];
  //     // $scope.searchFields.push({name:"Tag", key:"tags"});

  //     angular.forEach($scope.app.appFormFields, function(field , key, index) {
  //       $scope.searchFields.push({name:field.fieldName, key:field.uniqueId, type:field.fieldType});
  //     });

  //     angular.forEach($scope.app.mediaSets, function(mediaset , key, index) {
  //       angular.forEach(mediaset.mediaSetFormFields, function(formField , key, index) {
  //         $scope.searchFields.push({name:"MetaData: " + formField.fieldName, key:"mediasets." + formField.uniqueId});
  //       })
  //     });

  //     if(!$scope.app.autoApproved){
  //       $scope.searchFields.push({name:'Approved', key:"approved"});
  //     }

  // });

          $http.get("/"+$scope.approvalApp+"/app.json", config, {}).
        success(function(data) {
          $scope.app = data.applicationInfo;
                  if($scope.app.tinyUrl){
                  if($scope.app.tinyUrl.indexOf("subpl.at") == -1){
                    $scope.bitly.isBitly=false;
                  } else{
                    var tinyUrlParts = $scope.app.tinyUrl.split("subpl.at/");
                    $scope.bitly.customKeyWord = tinyUrlParts[1];
                  }

                }
                   window.document.title = "Admin | " + $scope.app.appName;
              //TODO: move this into a search function so it only runs when a person opens the search gui
              $scope.searchFields = [];
              // $scope.searchFields.push({name:"Tag", key:"tags"});
              $scope.searchFields.push({name:"Created Date", key:"createdDate", type:"createdDate"})
              $scope.searchFields.push({name:"Search All Fields", key:"_all", type:"searchAll"})

              angular.forEach($scope.app.appFormFields, function(field , key, index) {
                $scope.searchFields.push({name:field.fieldName, key:field.uniqueId, type:field.fieldType});
              });

              angular.forEach($scope.app.mediaSets, function(mediaset , key, index) {
                angular.forEach(mediaset.mediaSetFormFields, function(formField , key, index) {
                  $scope.searchFields.push({name:"MetaData: " + formField.fieldName, key:"mediasets." + formField.uniqueId, type:formField.fieldType});
                })
              });

              if(!$scope.app.autoApproved){
                $scope.searchFields.push({name:'Approved', key:"approved"});
              }
          });








      // Tab Menu Settings
      $scope.tabs = [
      { title:'Submissions', content:'/approval/', href:"/admin/"+$scope.approvalApp, tabName: "subs", url: $scope.approvalApp, icon:'fa fa-database', active:(!$scope.activeTab || $scope.activeTab == 'subs')?true:false },
      { title:'Edit Form', content:'/edit/', href:"/admin/"+$scope.approvalApp+"?tab=edit", tabName:"edit", url: $scope.approvalApp, icon:'fa fa-edit', active:($scope.activeTab == 'edit')?true:false },
      { title:'Share Form', content:'/settings/', href:"/admin/"+$scope.approvalApp+"?tab=share",tabName:"share", url: $scope.approvalApp, icon:'fa fa-share-square-o', active:($scope.activeTab == 'share')?true:false }//,
      // { title:'Search', content:'/search/', url: $scope.approvalApp, icon:'fa fa-search' },
      ];

      $scope.reloadPage = function(tabName){

        window.location.href = window.location.protocol+"//"+window.location.host+"/admin/"+$scope.approvalApp+"?tab="+tabName;
        }

      $scope.getSubs();

    }

    $scope.page=1;
    $scope.size=5;


    $scope.paginate = function(){
      //if search is on, do a new search, otherwise just get subs
      if($scope.showSearchCond){
        $scope.searchAll()
      } else{
        $scope.getSubs()
      }
    }

    $scope.getSubs = function(){
      $scope.subs = [];
      //get subs if filter by tag
      if ($scope.tagFilter) {
          $http.get("/internal/"+$scope.approvalApp+"/subs.json?page="+$scope.pag.bigCurrentPage+"&size="+$scope.pag.itemsPerPage+$scope.tagsParam, config, {}).
          success(function(data) {

          if(data.Submissions){
            $scope.subs = data.Submissions;
          }
          else{
            $scope.hasNoSubs = true;
          }
          $scope.info.totalSubs = data.Total;
          //$scope.info.totalApproved = ($scope.subs)?$filter('filter')($scope.subs,{approved: true}).length:0;
          //$scope.info.totalUnapproved = ($scope.subs)?$filter('filter')($scope.subs,{approved: false}).length:0;
          $scope.message = data.Message;
                if($scope.subs){
                  $scope.pag.bigTotalItems = data.Total;
                }

                $scope.mediaArrays = {};
                angular.forEach($scope.app.mediaSets, function(mediaset , key, index) {
                  $scope.mediaArrays[key] = new Array(mediaset.numOfMedia);
                });

          });
      }

    else{
      //get approval counts
      $http({method: 'GET', url: "/elasticSearch/countApproved/" + $scope.approvalApp}).
      success(function(acResults) {
        $scope.info.totalApproved = acResults.approvedCount;
        $scope.info.totalUnapproved = acResults.unapprovedCount;

      });

      //todo, do agg here and get approved/unapproved counts along with subs.
      $http.get("/internal/"+$scope.approvalApp+"/subs.json?page="+$scope.pag.bigCurrentPage+"&size="+$scope.pag.itemsPerPage, config, {}).
      success(function(data) {

        if(data.Submissions){
          $scope.subs = data.Submissions;
        }
        else{
          $scope.hasNoSubs = true;
        }
        $scope.info.totalSubs = data.Total;
        //$scope.info.totalApproved = ($scope.subs)?$filter('filter')($scope.subs,{approved: true}).length:0;
        //$scope.info.totalUnapproved = ($scope.subs)?$filter('filter')($scope.subs,{approved: false}).length:0;
        $scope.message = data.Message;
              if($scope.subs){
                $scope.pag.bigTotalItems = data.Total;
              }

              $scope.mediaArrays = {};
              angular.forEach($scope.app.mediaSets, function(mediaset , key, index) {
                $scope.mediaArrays[key] = new Array(mediaset.numOfMedia);
              });

      });
     }
    }

    $scope.getNumber = function(num) {
      return new Array(num);
    }

    $scope.deleteSubmission = function(submission, index) {
    subService.deleteSub({id:submission._id}, function(data){
      submission.deleted = true;
    })

    }

    $scope.undoDelete = function(submission) {
      subService.createEmptySubmission(submission, function(data){
            // window.console &&  console.debug('success - submission ' + submission._id + ' restored.');
            //$scope.deletedSub = submission;
            submission.deleted = false;
            //$scope.submissions.splice(index, 1);
            //$(".alert").alert('close')
        }, function(){
           // window.console && console.debug('error - Not restored');
        });

    }

    $scope.updateApproval = function(submission, status) {
      var request = {};
      request.id = submission._id;
      request.approved = status;

      subService.updateApproval(request, function(data){
            // window.console &&  console.debug('success - approval = ' + data);
          submission.approved = status;
          if(status){
            $scope.info.totalApproved++;
            $scope.info.totalUnapproved--;
          }
          else{
            $scope.info.totalApproved--;
            $scope.info.totalUnapproved++;
          }
        }, function(){
            // window.console && console.debug('error - Approval failed' + data);
        });


    }

    $scope.updateApp = function() {
      // window.console &&  console.log('start update app');
      $scope.uploadLogo();
      $scope.cleanMediaSetsArray();
      $scope.newSchema.draftLastSaved = new Date();

      // console.log("newschema in updateApp...");
      // console.log($scope.newSchema);

      formService.updateForm($scope.newSchema, function(data){
           // window.console.log(data);
          $scope.response = data;
          $scope.newSchema.appId = $scope.response.applicationInfo._id;
          // window.console &&  console.debug('success - saved', $scope.newSchema.appId);


          //$scope.importUrl = "/import/" + $scope.newSchema.appId;
          if($scope.newSchema.importRequired){
            $scope.importSubs($scope.newSchema,$scope.newSchema.appId)
          }
        }, function(){
           // window.console && console.debug('error - unsaved', $scope.newSchema);
        });

    };

    $scope.importSubs = function(app, appId) {
      $scope.importMessage = {};
      var importInfo={
        appId:appId,
        importSource:app.importSource
      };
      // $http({method: 'POST', url: '/import/'+appId + '/' + app.importSource}).success(function(data)
      // {
      //   app.importRequired = false;
      //   $scope.importSuccess = "Submissions imported successfully!";
      //   //$window.location.href = "/admin/"+appId;
      // }).
      // error(function(err,status){
      //   $scope.importError = err;
      // })

      subService.importSubs(importInfo, function(data){
           app.importRequired = false;
           $scope.importSuccess = "Submissions imported successfully!";
          //$window.location.href = "/admin/"+appId;
        }, function(){
           $scope.importError = err;
        });


    }


    $scope.supportsHTML5Blob = (window.Blob && window.FileReader)?true:false;
    $scope.isExportingtoSpreadsheet = false;
    $scope.subsToCSV = function(){
      $scope.isExportingtoSpreadsheet = true;
      var formCSV = [];
      var subs;

      $http.get('/external/'+$scope.app._id+'/viewSubs.json')
      .success(function(data,err){
        $scope.isExportingtoSpreadsheet = false;
          subs = data.Submissions;

          subs = $filter('togglableFilter')(subs, $scope.filterKey, $scope.filterVal, $scope.filterActive);
          subs = $filter('tagsFilter')(subs, $scope.filterTagVals);
          // var subs = $scope.subs;
          // console.log('subs',subs);
          subs.forEach(function(sub){
            var newObj = {};
           newObj.id = sub._id;
           newObj.createdDate = $filter('date')(sub.createdDate, 'short');

              //fields
              var appFields = $scope.app.appFormFields;
              var appMediasets = $scope.app.mediaSets;
              var subMediasets = sub.mediasets;
              for(var i = 0; i<appFields.length;i++){
                var thisField = appFields[i];
                if(thisField.fieldType == 'mediaSet' || thisField.fieldType == 'mediaSetDoc'|| thisField.fieldType == 'mediaSetVid' || thisField.fieldType == 'mediaSetAudio'){

                }
                else{
                  if(sub.formData){

                      if((thisField.fieldType == 'radio' || thisField.fieldType == 'dropdown') && thisField.isConditional){

                      newObj[thisField.uniqueId] = sub.formData[thisField.uniqueId].optionValue;


                      //add conditional field responses to csv
                      var condFields = sub.formData[thisField.uniqueId].conditionalFields;
                      for(var k=0;k<condFields.length;k++){
                        returnCorrectFormat(condFields[k]);
                      }
                    }
                    else{
                      returnCorrectFormat(thisField);
                    }

                  }
                  else{
                    newObj[thisField.uniqueId]=" ";
                  }

                  //if this field is empty, make it a string so it will be preserved by json parse
                  if(!newObj[thisField.uniqueId]){
                    newObj[thisField.uniqueId]=" ";
                  }






                }


              }

              function returnCorrectFormat(thisField){
                    if(thisField.fieldType == 'date' || thisField.fieldType == 'pastDate' || thisField.fieldType == 'futureDate'){
                      newObj[thisField.uniqueId] = $filter('date')(sub.formData[thisField.uniqueId], 'shortDate');
                    }
                    else if(thisField.fieldType == 'time') {
                      newObj[thisField.uniqueId] = $filter('date')(sub.formData[thisField.uniqueId], 'shortTime');
                    }
                    else if(thisField.fieldType == 'checkbox'){

                      var cbVals = sub.formData[thisField.uniqueId], cbValsConcat="";
                      for(var key in cbVals){
                        if(cbVals.hasOwnProperty(key)){

                          cbValsConcat = cbValsConcat + key + ", "
                        }
                      }
                      newObj[thisField.uniqueId] = cbValsConcat;



                    }
                    else{
                      newObj[thisField.uniqueId] = sub.formData[thisField.uniqueId];
                    }

                  }

              //tags
              var tags = sub.tags.sort(),allTags="";
              for(var i = 0;i<tags.length;i++){
                if(i == (tags.length-1)) {
                  allTags = allTags + tags[i];
                }
                else{

                  allTags = allTags + tags[i] + ', ';
                }

              }
              newObj['tags'] = allTags;


              //mediasets
                  if(subMediasets.length > 0){
                    subMediasets.forEach(function(mediaset, msIndex){
                      if(mediaset){
                        var media = mediaset.media;
                        if(media != null){
                          media.forEach(function(item,itemIndex){
                            newObj['mediaset_'+msIndex+'_item_'+itemIndex+'_fileName']=item.originalName;

                            //mediaset form fields
                            var mediaFields = item.mediasetFormData;
                            for (var key in mediaFields){
                              if(mediaFields.hasOwnProperty(key)){
                                newObj['mediaset_'+msIndex+'_item_'+itemIndex+'_'+key]=mediaFields[key];
                              }
                            }
                          })
                        }
                      }
                    })
                  }



              //push newObj to formCSV
              // console.log('newObj', newObj);
              formCSV.push(newObj);
           })
          // console.log('formCSV',formCSV);

          var filteredGridData = JSON.parse(JSON.stringify(formCSV));
          JSONToCSVConvertor(filteredGridData, "submissions.csv", true);

          function JSONToCSVConvertor(JSONData, ReportTitle, ShowLabel) {

            //If JSONData is not an object then JSON.parse will parse the JSON string in an Object
            var arrData = typeof JSONData != 'object' ? JSON.parse(JSONData) : JSONData;
            var CSV = '';
            //This condition will generate the Label/Header
            if (ShowLabel) {
              var row = "";

                //This loop will extract the label from 1st index of on array
                for (var index in arrData[0]) {
                    //Now convert each value to string and comma-seprated
                    row += index + ',';
                  }
                  row = row.slice(0, -1);
                //append Label row with line break
                CSV += row + '\r\n';
              }

            //1st loop is to extract each row
            for (var i = 0; i < arrData.length; i++) {
              var row = "";
                //2nd loop will extract each column and convert it in string comma-seprated
                for (var index in arrData[i]) {
                  row += '"' + arrData[i][index] + '",';
                }
                row.slice(0, row.length - 1);
                //add a line break after each row
                CSV += row + '\r\n';
              }

              if (CSV == '') {
                alert("Invalid data");
                return;
              }

            //this trick will generate a temp "a" tag
            var link = document.createElement("a");
            link.id="lnkDwnldLnk";

            //this part will append the anchor tag and remove it after automatic click
            document.body.appendChild(link);

            var csv = CSV;
            blob = new Blob([csv], { type: 'text/csv' });
            var csvUrl;
            if(window.webkitURL) csvUrl = window.webkitURL.createObjectURL(blob);
            else if(window.URL && window.URL.createObjectURL)csvUrl = window.URL.createObjectURL(blob);
            else csvUrl = null;
            var filename = ReportTitle;
            $scope.msSaveBlob = navigator.msSaveBlob;

            jQuery.support.download = (function(){
              var i = document.createElement('a');
              return 'download' in i;
            })();

            if($.support.download){
              $("#lnkDwnldLnk")
              .attr({
                'download': filename,
                'href': csvUrl
              });
            }
            else if(navigator.msSaveBlob){
              navigator.msSaveBlob(blob, filename);

            }
            else{
              alert("Sorry, this browser doesn't suppor CSV downloads yet.");
            }



            $('#lnkDwnldLnk')[0].click();
            document.body.removeChild(link);
          }

      })
      .error(function(){});






    };

    // $scope.rolodexCSV = function(){
    //   var formCSV = [];
    //   var subs = $scope.rolodex;
    //   // console.log('rolosubs',subs);
    //   subs.forEach(function(sub){
    //     var newObj = {};
    //    newObj.id = sub._id, newObj.createdDate = sub.createdDate;

    //       //fields
    //       var persons = $scope.rolodex;
    //       // console.log(sub);
    //       // console.log(persons);
    //       for(var i = 0; i<persons.length;i++){
    //         var thisField = persons[i];
    //           if(sub.formData){
    //             newObj[thisField.uniqueId] = sub.formData[thisField.uniqueId];
    //           }
    //           else{
    //             newObj[thisField.uniqueId]="";
    //           }
    //         }
    //       //push newObj to formCSV
    //       // console.log('newObj', newObj);
    //       formCSV.push(newObj);
    //    })
    //   // console.log('formCSV',formCSV);

    //   var filteredGridData = JSON.parse(JSON.stringify(formCSV));
    //   JSONToCSVConvertor(filteredGridData, "submissions.csv", true);

    //   function JSONToCSVConvertor(JSONData, ReportTitle, ShowLabel) {

    //     //If JSONData is not an object then JSON.parse will parse the JSON string in an Object
    //     var arrData = typeof JSONData != 'object' ? JSON.parse(JSONData) : JSONData;
    //     var CSV = '';
    //     //This condition will generate the Label/Header
    //     if (ShowLabel) {
    //       var row = "";

    //         //This loop will extract the label from 1st index of on array
    //         for (var index in arrData[0]) {
    //             //Now convert each value to string and comma-seprated
    //             row += index + ',';
    //           }
    //           row = row.slice(0, -1);
    //         //append Label row with line break
    //         CSV += row + '\r\n';
    //       }

    //     //1st loop is to extract each row
    //     for (var i = 0; i < arrData.length; i++) {
    //       var row = "";
    //         //2nd loop will extract each column and convert it in string comma-seprated
    //         for (var index in arrData[i]) {
    //           row += '"' + arrData[i][index] + '",';
    //         }
    //         row.slice(0, row.length - 1);
    //         //add a line break after each row
    //         CSV += row + '\r\n';
    //       }

    //       if (CSV == '') {
    //         alert("Invalid data");
    //         return;
    //       }

    //     //this trick will generate a temp "a" tag
    //     var link = document.createElement("a");
    //     link.id="lnkDwnldLnk";

    //     //this part will append the anchor tag and remove it after automatic click
    //     document.body.appendChild(link);

    //     var csv = CSV;
    //     blob = new Blob([csv], { type: 'text/csv' });
    //     var csvUrl;
    //     if(window.webkitURL) csvUrl = window.webkitURL.createObjectURL(blob);
    //     else if(window.URL && window.URL.createObjectURL)csvUrl = window.URL.createObjectURL(blob);
    //     else csvUrl = null;
    //     var filename = ReportTitle;

    //     jQuery.support.download = (function(){
    //       var i = document.createElement('a');
    //       return 'download' in i;
    //     })();

    //     if($.support.download){
    //       $("#lnkDwnldLnk")
    //       .attr({
    //         'download': filename,
    //         'href': csvUrl
    //       });
    //     }
    //     else if(navigator.msSaveBlob){
    //       navigator.msSaveBlob(blob, filename);

    //     }
    //     else{
    //       // alert("Sorry :(. This browser doesn't suppor CSV downloads yet.");
    //         $scope.supportsHTML5Blob = false;
    //     }



    //     $('#lnkDwnldLnk')[0].click();
    //     document.body.removeChild(link);
    //   }




    // };

    $scope.printMe = function(){
      $window.print();
    };

    $scope.openSingleSub = function(id){
      $window.open("/submission/"+id,"","left=20, width=600, height=600");
    }


    $scope.collapseAllFields = function(){
      for(var i = 0; i<$scope.newSchema.appFormFields.length;i++){
          $scope.newSchema.appFormFields[i].isCollapsed = true;
      }

    }

    $scope.expandAllFields = function(){
      for(var i = 0; i<$scope.newSchema.appFormFields.length;i++){
          $scope.newSchema.appFormFields[i].isCollapsed = false;
      }

    }

    $scope.checkAllFieldsCollapsed = function(){
    var allFieldsCollapsed = true, allFieldsExpanded = true;
        for(var i = 0; i<$scope.newSchema.appFormFields.length;i++){
          if($scope.newSchema.appFormFields[i].isCollapsed){
            allFieldsExpanded = false;
          }
          else{
            allFieldsCollapsed = false;
          }
      }
      if(allFieldsCollapsed){
        $scope.collapseBtn=false;
      }
      if(allFieldsExpanded){
        $scope.collapseBtn=true;
      }
    };

    $scope.addOption = function(index, uniqueId){
      var length = $scope.newSchema.appFormFields[index].fieldTypeOptionsArray.length;
      $scope.newSchema.appFormFields[index].fieldTypeOptionsArray.push({optionValue:'', formFieldId:uniqueId, optionId:uniqueId+"_"+length, isFocused:true});
    }

    $scope.newConditionalField = function(index, uniqueId){
      for(var i = 0; i<$scope.newSchema.appFormFields.length;i++){
         if($scope.newSchema.appFormFields[i].uniqueId == uniqueId)
         {
            var conditionalFields = $scope.newSchema.appFormFields[i].fieldTypeOptionsArray[index].conditionalFields;


            if(!conditionalFields){$scope.newSchema.appFormFields[i].fieldTypeOptionsArray[index].conditionalFields=[];}
            $scope.newSchema.appFormFields[i].fieldTypeOptionsArray[index].conditionalFields.push({"fieldType": "text", "isMandatory":false, "isPublic":true, "readable": "Text", "endUserNotification" : false, "isCollapsed":false, "isFocused": true, "isConditional":false, "fieldTypeOptionsArray":[]});

         }
      }
    }

    $scope.viewDocument = function(id, seqNum){
      $('#docModal_'+id+'_'+seqNum).modal();
    }


    $scope.openImgEditModal = function(id, seqNum){
      $('#imgEditModal_'+id+'_'+seqNum).modal();
    };

    $scope.saveImgEdit = function(sub, msid, photo){
      var app = sub.appId;
      var uuid = msid.uuid;

      subService.updateSubandMed(sub, function(data){
           if (data.durr) {
              window.console.log("Update Failed")
            }
        }, function(){
           window.console.log("Update Sub Failed");
        });

      //transfer photo
      //get domain from URL
      $http.get(pupScan + "transfer/" + app + "/" + msid + "/" + uuid + "/" + sub)
      .then(
        //success callback
        function(data){
          // window.console.log('#imgEditModal_'+sub._id+'_'+photo.sequenceNumber);
          $('#imgEditModal_'+sub._id+'_'+photo.sequenceNumber).modal('hide');
        },
        //error callback
        function(data){}
        );


    }//saveImgEdit


    /* mentio javascript for custom subject line in admin email notification*/
    $scope.searchMentioFields = function(term){
      var fieldList = [];
      angular.forEach($scope.newSchema.appFormFields, function(item){
            if (item.fieldName.toUpperCase().indexOf(term.toUpperCase()) >= 0) {
              if(item.fieldType == 'mediaSet'|| item.fieldType == 'mediaSetVid' || item.fieldType == 'mediaSetDoc' || item.fieldType == 'mediaSetAudio' || item.fieldType == 'sectionHeader'){
                //do nothing
              }
              else{
                fieldList.push(item);
              }
            }
            $scope.mentioFields = fieldList;
            return $q.when(fieldList);
      })
    }

    $scope.getMentioFieldName = function(item){
          return '$' + item.uniqueId + '$';
        };
     /* END: mentio javascript for custom subject line in admin email notification*/

     /* script to add email notification information to the updated location */
     $scope.setEndUserEmailNotifications = function(formField){
      if(formField.fieldType == 'email' && formField.endUserNotification && $scope.newSchema.endUserNotification == undefined){
        $scope.newSchema.endUserNotification = true;
        $scope.newSchema.endUserNotificationSubjectLine = formField.endUserNotificationSubjectLine;
        $scope.newSchema.endUserNotificationMessage = formField.endUserNotificationMessage;
        $scope.newSchema.endUserNotificationEmail = [];
        $scope.newSchema.endUserNotificationEmail.push(formField.uniqueId);
      }

     }



    /*logo uploader*/

    var logoUploader = $scope.uploader = $fileUploader.create({});

    logoUploader.filters.push(function(item /*{File|HTMLInputElement}*/) {

      var type = logoUploader.isHTML5 ? item.type : '/' + item.value.slice(item.value.lastIndexOf('.') + 1);
            var maxSize = 10; //10 MB
            type = '|' + type.toLowerCase().slice(type.lastIndexOf('/') + 1) + '|';

            var isImage = ('|jpg|png|jpeg|bmp|gif|'.indexOf(type) !== -1);
            var isGoodSize = item.size/1024/1024 <= maxSize;

            if(!isImage){
              // console.log(item.name + ": logo is not an image.");
              $scope.logoError = true;
              $scope.logoErrorText = "Looks like you accidentally tried to upload something that was not an image. Allowed file types are jpg, png, jpeg, bmp, and gif. Please try again.";
            }
            if(!isGoodSize){
              // console.log(item.name + ":logo is too large.");
              $scope.logoError = true;
              $scope.logoErrorText = "Looks like your file was too large. The limit is 10 MB. Please try a different one.";
            }
            else{
              $scope.hasError = false;
            }

            return isImage && isGoodSize;
          })
logoUploader.bind('afteraddingfile', function (event, item) {
  console.info('After adding a file', item);
  $scope.newSchema.logoUploadId = ($scope.newSchema.logoUploadId)?$scope.newSchema.logoUploadId:rfc4122.newuuid();
  item.url = pupScan+'internalUpload/'+$scope.newSchema.logoUploadId;
});
logoUploader.bind('whenaddingfilefailed', function (event, item) {
  console.info('When adding a file failed', item);
});

logoUploader.bind('beforeupload', function (event, item) {
  console.info('Before upload', item);
});
logoUploader.bind('progress', function (event, item, progress) {
  console.info('Progress: ' + progress, item);
});

logoUploader.bind('error', function (event, xhr, item, response) {
  console.info('Error', xhr, item, response);
});

logoUploader.bind('complete', function (event, xhr, item, response) {
  console.info('Complete', xhr, item, response);
});
logoUploader.bind('success', function (event, xhr, item, response) {
  console.log('Success', xhr, item, response);
  if(response.status == "success"){
    $scope.newSchema.logoURL = response.data.photoUrl;
  }
});

}])

.controller('subCollapse', ['$scope', function ($scope) {
  $scope.isCollapsed = false;
}]);

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
 .directive('fieldPreview', ["$compile", "$sce", function($compile, $sce) {
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
}])

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
.directive('editableFormfield', ["$compile", "$filter", "$http", "subService", function ($compile,$filter,$http, subService) {
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
}])


//Editable Form Fields for Media of Submission Inside of Approval Tool
.directive('mediaFormfield', ["$compile", "$filter", "$http", function ($compile,$filter,$http) {
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

}])

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
.directive('csvUrl', ["$compile", "$filter", "$http", function ($compile,$filter,$http) {
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
  }])

// Templates included here to reduce HTTP requests for hosted form
  .directive('variedFieldType', ["$compile", "$filter", "$http", function ($compile,$filter,$http) {
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
    }])

//Focus on element when tabbing through hosted form.
  .directive('syncFocusWith', ["$timeout", "$rootScope", function($timeout, $rootScope) {
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
  }])
  ;

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
.filter('docIframeUrl', ["$sce", function ($sce) {
    return function(url) {      
      return $sce.trustAsResourceUrl('//view.officeapps.live.com/op/view.aspx?src='+url);
    };
  }])

//Format Audio URL for Audio Preview in Approval Tool
.filter('audioUrl', ["$sce", function ($sce) {
    return function(url) {      
      return $sce.trustAsResourceUrl(url);
    };
  }])


//Filter Submissions in Approval tool to show compared submissions only
.filter('comparedSubFilter',["value", function(value) {
 return ($scope.comparedSubmissions.indexOf(value._id) !== -1);
}]);


;
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
// 'use strict';

// Admin app level module directives and controller dependencies.
angular.module('admin', [
		'admin.controllers',
		'admin.directives'
	])
	.config(["$locationProvider", function($locationProvider){
		// $locationProvider.html5Mode(true);
	}])
;

// 'use strict';
// Profile app level module directives and controller dependencies.
angular.module('profile', [
        'profile.controllers',
        'profile.directives'
    ])
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

// Profile Directive
// This Directive checks for a unique username and email on register.

angular.module('profile.directives', [])

//???
.directive('errSrc', function() {
  return {
    link: function(scope, element, attrs) {
      element.bind('error', function() {
        element.attr('src', attrs.errSrc);
      });
    }
  }
})

//Make sure user registers a unique user name
.directive('uniqueUsername', ['$http', function($http){
	return{
		require:'ngModel',
		link: function(scope,elem,attrs,ctrl){
			scope.$watch(attrs.ngModel, function(value){
				ctrl.$setValidity('isTaken', true);
				ctrl.$setValidity('invalidChars', true);

				if(!value){
					// don't send undefined to the server during dirty check
          			// empty username is caught by required directive
					return;
				}
				
				$http.post('/check/username', {username:value})
				.success(function(data){
					//do nothing
				})
				.error(function(data){
					if(data.isTaken){
						ctrl.$setValidity('isTaken', false);
					} else if (data.invalidChars) {
              			ctrl.$setValidity('invalidChars', false);

            }
				});
			})
		}
	}

}])

//Make sure user registers a unique Email Address
.directive('uniqueEmail', ['$http', '$sce', function($http, $sce){
	return{
		require:'ngModel',
		link: function(scope,elem,attrs,ctrl){
			scope.$watch(attrs.ngModel, function(value){
				ctrl.$setValidity('isTaken', true);

				if(!value){
					// don't send undefined to the server during dirty check
          			// empty username is caught by required directive
					return;
				}
				
				$http.post('/check/email', {email:value})
				.success(function(data){
					//do nothing
				})
				.error(function(data){
					if(data.isTaken){
						ctrl.$setValidity('isTaken', false);
					} else if(data.isSpecialDomain){
						console.log("is special domain")
						ctrl.$setValidity('isSpecialDomain', false);
						scope.specialDomain = data.specialDomain;
						scope.redirectMessage = $sce.trustAsHtml(data.redirectMessage);
					}
				});
			})
		}
	}

}])

//???
.directive('match', [function () {
  return {
    require: 'ngModel',
    link: function (scope, elem, attrs, ctrl) {
    	

      scope.$watch('[' + attrs.ngModel + ', ' + attrs.match + ']', function(value){
      	
        ctrl.$setValidity('match', value[0] === value[1] );
      }, true);

    }
  }
}]);
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

/*! jQuery UI - v1.11.1 - 2014-08-19
* http://jqueryui.com
* Includes: core.js, widget.js, mouse.js, sortable.js
* Copyright 2014 jQuery Foundation and other contributors; Licensed MIT */

(function(e){"function"==typeof define&&define.amd?define(["jquery"],e):e(jQuery)})(function(e){function t(t,s){var a,n,o,r=t.nodeName.toLowerCase();return"area"===r?(a=t.parentNode,n=a.name,t.href&&n&&"map"===a.nodeName.toLowerCase()?(o=e("img[usemap='#"+n+"']")[0],!!o&&i(o)):!1):(/input|select|textarea|button|object/.test(r)?!t.disabled:"a"===r?t.href||s:s)&&i(t)}function i(t){return e.expr.filters.visible(t)&&!e(t).parents().addBack().filter(function(){return"hidden"===e.css(this,"visibility")}).length}e.ui=e.ui||{},e.extend(e.ui,{version:"1.11.1",keyCode:{BACKSPACE:8,COMMA:188,DELETE:46,DOWN:40,END:35,ENTER:13,ESCAPE:27,HOME:36,LEFT:37,PAGE_DOWN:34,PAGE_UP:33,PERIOD:190,RIGHT:39,SPACE:32,TAB:9,UP:38}}),e.fn.extend({scrollParent:function(t){var i=this.css("position"),s="absolute"===i,a=t?/(auto|scroll|hidden)/:/(auto|scroll)/,n=this.parents().filter(function(){var t=e(this);return s&&"static"===t.css("position")?!1:a.test(t.css("overflow")+t.css("overflow-y")+t.css("overflow-x"))}).eq(0);return"fixed"!==i&&n.length?n:e(this[0].ownerDocument||document)},uniqueId:function(){var e=0;return function(){return this.each(function(){this.id||(this.id="ui-id-"+ ++e)})}}(),removeUniqueId:function(){return this.each(function(){/^ui-id-\d+$/.test(this.id)&&e(this).removeAttr("id")})}}),e.extend(e.expr[":"],{data:e.expr.createPseudo?e.expr.createPseudo(function(t){return function(i){return!!e.data(i,t)}}):function(t,i,s){return!!e.data(t,s[3])},focusable:function(i){return t(i,!isNaN(e.attr(i,"tabindex")))},tabbable:function(i){var s=e.attr(i,"tabindex"),a=isNaN(s);return(a||s>=0)&&t(i,!a)}}),e("<a>").outerWidth(1).jquery||e.each(["Width","Height"],function(t,i){function s(t,i,s,n){return e.each(a,function(){i-=parseFloat(e.css(t,"padding"+this))||0,s&&(i-=parseFloat(e.css(t,"border"+this+"Width"))||0),n&&(i-=parseFloat(e.css(t,"margin"+this))||0)}),i}var a="Width"===i?["Left","Right"]:["Top","Bottom"],n=i.toLowerCase(),o={innerWidth:e.fn.innerWidth,innerHeight:e.fn.innerHeight,outerWidth:e.fn.outerWidth,outerHeight:e.fn.outerHeight};e.fn["inner"+i]=function(t){return void 0===t?o["inner"+i].call(this):this.each(function(){e(this).css(n,s(this,t)+"px")})},e.fn["outer"+i]=function(t,a){return"number"!=typeof t?o["outer"+i].call(this,t):this.each(function(){e(this).css(n,s(this,t,!0,a)+"px")})}}),e.fn.addBack||(e.fn.addBack=function(e){return this.add(null==e?this.prevObject:this.prevObject.filter(e))}),e("<a>").data("a-b","a").removeData("a-b").data("a-b")&&(e.fn.removeData=function(t){return function(i){return arguments.length?t.call(this,e.camelCase(i)):t.call(this)}}(e.fn.removeData)),e.ui.ie=!!/msie [\w.]+/.exec(navigator.userAgent.toLowerCase()),e.fn.extend({focus:function(t){return function(i,s){return"number"==typeof i?this.each(function(){var t=this;setTimeout(function(){e(t).focus(),s&&s.call(t)},i)}):t.apply(this,arguments)}}(e.fn.focus),disableSelection:function(){var e="onselectstart"in document.createElement("div")?"selectstart":"mousedown";return function(){return this.bind(e+".ui-disableSelection",function(e){e.preventDefault()})}}(),enableSelection:function(){return this.unbind(".ui-disableSelection")},zIndex:function(t){if(void 0!==t)return this.css("zIndex",t);if(this.length)for(var i,s,a=e(this[0]);a.length&&a[0]!==document;){if(i=a.css("position"),("absolute"===i||"relative"===i||"fixed"===i)&&(s=parseInt(a.css("zIndex"),10),!isNaN(s)&&0!==s))return s;a=a.parent()}return 0}}),e.ui.plugin={add:function(t,i,s){var a,n=e.ui[t].prototype;for(a in s)n.plugins[a]=n.plugins[a]||[],n.plugins[a].push([i,s[a]])},call:function(e,t,i,s){var a,n=e.plugins[t];if(n&&(s||e.element[0].parentNode&&11!==e.element[0].parentNode.nodeType))for(a=0;n.length>a;a++)e.options[n[a][0]]&&n[a][1].apply(e.element,i)}};var s=0,a=Array.prototype.slice;e.cleanData=function(t){return function(i){var s,a,n;for(n=0;null!=(a=i[n]);n++)try{s=e._data(a,"events"),s&&s.remove&&e(a).triggerHandler("remove")}catch(o){}t(i)}}(e.cleanData),e.widget=function(t,i,s){var a,n,o,r,h={},l=t.split(".")[0];return t=t.split(".")[1],a=l+"-"+t,s||(s=i,i=e.Widget),e.expr[":"][a.toLowerCase()]=function(t){return!!e.data(t,a)},e[l]=e[l]||{},n=e[l][t],o=e[l][t]=function(e,t){return this._createWidget?(arguments.length&&this._createWidget(e,t),void 0):new o(e,t)},e.extend(o,n,{version:s.version,_proto:e.extend({},s),_childConstructors:[]}),r=new i,r.options=e.widget.extend({},r.options),e.each(s,function(t,s){return e.isFunction(s)?(h[t]=function(){var e=function(){return i.prototype[t].apply(this,arguments)},a=function(e){return i.prototype[t].apply(this,e)};return function(){var t,i=this._super,n=this._superApply;return this._super=e,this._superApply=a,t=s.apply(this,arguments),this._super=i,this._superApply=n,t}}(),void 0):(h[t]=s,void 0)}),o.prototype=e.widget.extend(r,{widgetEventPrefix:n?r.widgetEventPrefix||t:t},h,{constructor:o,namespace:l,widgetName:t,widgetFullName:a}),n?(e.each(n._childConstructors,function(t,i){var s=i.prototype;e.widget(s.namespace+"."+s.widgetName,o,i._proto)}),delete n._childConstructors):i._childConstructors.push(o),e.widget.bridge(t,o),o},e.widget.extend=function(t){for(var i,s,n=a.call(arguments,1),o=0,r=n.length;r>o;o++)for(i in n[o])s=n[o][i],n[o].hasOwnProperty(i)&&void 0!==s&&(t[i]=e.isPlainObject(s)?e.isPlainObject(t[i])?e.widget.extend({},t[i],s):e.widget.extend({},s):s);return t},e.widget.bridge=function(t,i){var s=i.prototype.widgetFullName||t;e.fn[t]=function(n){var o="string"==typeof n,r=a.call(arguments,1),h=this;return n=!o&&r.length?e.widget.extend.apply(null,[n].concat(r)):n,o?this.each(function(){var i,a=e.data(this,s);return"instance"===n?(h=a,!1):a?e.isFunction(a[n])&&"_"!==n.charAt(0)?(i=a[n].apply(a,r),i!==a&&void 0!==i?(h=i&&i.jquery?h.pushStack(i.get()):i,!1):void 0):e.error("no such method '"+n+"' for "+t+" widget instance"):e.error("cannot call methods on "+t+" prior to initialization; "+"attempted to call method '"+n+"'")}):this.each(function(){var t=e.data(this,s);t?(t.option(n||{}),t._init&&t._init()):e.data(this,s,new i(n,this))}),h}},e.Widget=function(){},e.Widget._childConstructors=[],e.Widget.prototype={widgetName:"widget",widgetEventPrefix:"",defaultElement:"<div>",options:{disabled:!1,create:null},_createWidget:function(t,i){i=e(i||this.defaultElement||this)[0],this.element=e(i),this.uuid=s++,this.eventNamespace="."+this.widgetName+this.uuid,this.options=e.widget.extend({},this.options,this._getCreateOptions(),t),this.bindings=e(),this.hoverable=e(),this.focusable=e(),i!==this&&(e.data(i,this.widgetFullName,this),this._on(!0,this.element,{remove:function(e){e.target===i&&this.destroy()}}),this.document=e(i.style?i.ownerDocument:i.document||i),this.window=e(this.document[0].defaultView||this.document[0].parentWindow)),this._create(),this._trigger("create",null,this._getCreateEventData()),this._init()},_getCreateOptions:e.noop,_getCreateEventData:e.noop,_create:e.noop,_init:e.noop,destroy:function(){this._destroy(),this.element.unbind(this.eventNamespace).removeData(this.widgetFullName).removeData(e.camelCase(this.widgetFullName)),this.widget().unbind(this.eventNamespace).removeAttr("aria-disabled").removeClass(this.widgetFullName+"-disabled "+"ui-state-disabled"),this.bindings.unbind(this.eventNamespace),this.hoverable.removeClass("ui-state-hover"),this.focusable.removeClass("ui-state-focus")},_destroy:e.noop,widget:function(){return this.element},option:function(t,i){var s,a,n,o=t;if(0===arguments.length)return e.widget.extend({},this.options);if("string"==typeof t)if(o={},s=t.split("."),t=s.shift(),s.length){for(a=o[t]=e.widget.extend({},this.options[t]),n=0;s.length-1>n;n++)a[s[n]]=a[s[n]]||{},a=a[s[n]];if(t=s.pop(),1===arguments.length)return void 0===a[t]?null:a[t];a[t]=i}else{if(1===arguments.length)return void 0===this.options[t]?null:this.options[t];o[t]=i}return this._setOptions(o),this},_setOptions:function(e){var t;for(t in e)this._setOption(t,e[t]);return this},_setOption:function(e,t){return this.options[e]=t,"disabled"===e&&(this.widget().toggleClass(this.widgetFullName+"-disabled",!!t),t&&(this.hoverable.removeClass("ui-state-hover"),this.focusable.removeClass("ui-state-focus"))),this},enable:function(){return this._setOptions({disabled:!1})},disable:function(){return this._setOptions({disabled:!0})},_on:function(t,i,s){var a,n=this;"boolean"!=typeof t&&(s=i,i=t,t=!1),s?(i=a=e(i),this.bindings=this.bindings.add(i)):(s=i,i=this.element,a=this.widget()),e.each(s,function(s,o){function r(){return t||n.options.disabled!==!0&&!e(this).hasClass("ui-state-disabled")?("string"==typeof o?n[o]:o).apply(n,arguments):void 0}"string"!=typeof o&&(r.guid=o.guid=o.guid||r.guid||e.guid++);var h=s.match(/^([\w:-]*)\s*(.*)$/),l=h[1]+n.eventNamespace,u=h[2];u?a.delegate(u,l,r):i.bind(l,r)})},_off:function(e,t){t=(t||"").split(" ").join(this.eventNamespace+" ")+this.eventNamespace,e.unbind(t).undelegate(t)},_delay:function(e,t){function i(){return("string"==typeof e?s[e]:e).apply(s,arguments)}var s=this;return setTimeout(i,t||0)},_hoverable:function(t){this.hoverable=this.hoverable.add(t),this._on(t,{mouseenter:function(t){e(t.currentTarget).addClass("ui-state-hover")},mouseleave:function(t){e(t.currentTarget).removeClass("ui-state-hover")}})},_focusable:function(t){this.focusable=this.focusable.add(t),this._on(t,{focusin:function(t){e(t.currentTarget).addClass("ui-state-focus")},focusout:function(t){e(t.currentTarget).removeClass("ui-state-focus")}})},_trigger:function(t,i,s){var a,n,o=this.options[t];if(s=s||{},i=e.Event(i),i.type=(t===this.widgetEventPrefix?t:this.widgetEventPrefix+t).toLowerCase(),i.target=this.element[0],n=i.originalEvent)for(a in n)a in i||(i[a]=n[a]);return this.element.trigger(i,s),!(e.isFunction(o)&&o.apply(this.element[0],[i].concat(s))===!1||i.isDefaultPrevented())}},e.each({show:"fadeIn",hide:"fadeOut"},function(t,i){e.Widget.prototype["_"+t]=function(s,a,n){"string"==typeof a&&(a={effect:a});var o,r=a?a===!0||"number"==typeof a?i:a.effect||i:t;a=a||{},"number"==typeof a&&(a={duration:a}),o=!e.isEmptyObject(a),a.complete=n,a.delay&&s.delay(a.delay),o&&e.effects&&e.effects.effect[r]?s[t](a):r!==t&&s[r]?s[r](a.duration,a.easing,n):s.queue(function(i){e(this)[t](),n&&n.call(s[0]),i()})}}),e.widget;var n=!1;e(document).mouseup(function(){n=!1}),e.widget("ui.mouse",{version:"1.11.1",options:{cancel:"input,textarea,button,select,option",distance:1,delay:0},_mouseInit:function(){var t=this;this.element.bind("mousedown."+this.widgetName,function(e){return t._mouseDown(e)}).bind("click."+this.widgetName,function(i){return!0===e.data(i.target,t.widgetName+".preventClickEvent")?(e.removeData(i.target,t.widgetName+".preventClickEvent"),i.stopImmediatePropagation(),!1):void 0}),this.started=!1},_mouseDestroy:function(){this.element.unbind("."+this.widgetName),this._mouseMoveDelegate&&this.document.unbind("mousemove."+this.widgetName,this._mouseMoveDelegate).unbind("mouseup."+this.widgetName,this._mouseUpDelegate)},_mouseDown:function(t){if(!n){this._mouseStarted&&this._mouseUp(t),this._mouseDownEvent=t;var i=this,s=1===t.which,a="string"==typeof this.options.cancel&&t.target.nodeName?e(t.target).closest(this.options.cancel).length:!1;return s&&!a&&this._mouseCapture(t)?(this.mouseDelayMet=!this.options.delay,this.mouseDelayMet||(this._mouseDelayTimer=setTimeout(function(){i.mouseDelayMet=!0},this.options.delay)),this._mouseDistanceMet(t)&&this._mouseDelayMet(t)&&(this._mouseStarted=this._mouseStart(t)!==!1,!this._mouseStarted)?(t.preventDefault(),!0):(!0===e.data(t.target,this.widgetName+".preventClickEvent")&&e.removeData(t.target,this.widgetName+".preventClickEvent"),this._mouseMoveDelegate=function(e){return i._mouseMove(e)},this._mouseUpDelegate=function(e){return i._mouseUp(e)},this.document.bind("mousemove."+this.widgetName,this._mouseMoveDelegate).bind("mouseup."+this.widgetName,this._mouseUpDelegate),t.preventDefault(),n=!0,!0)):!0}},_mouseMove:function(t){return e.ui.ie&&(!document.documentMode||9>document.documentMode)&&!t.button?this._mouseUp(t):t.which?this._mouseStarted?(this._mouseDrag(t),t.preventDefault()):(this._mouseDistanceMet(t)&&this._mouseDelayMet(t)&&(this._mouseStarted=this._mouseStart(this._mouseDownEvent,t)!==!1,this._mouseStarted?this._mouseDrag(t):this._mouseUp(t)),!this._mouseStarted):this._mouseUp(t)},_mouseUp:function(t){return this.document.unbind("mousemove."+this.widgetName,this._mouseMoveDelegate).unbind("mouseup."+this.widgetName,this._mouseUpDelegate),this._mouseStarted&&(this._mouseStarted=!1,t.target===this._mouseDownEvent.target&&e.data(t.target,this.widgetName+".preventClickEvent",!0),this._mouseStop(t)),n=!1,!1},_mouseDistanceMet:function(e){return Math.max(Math.abs(this._mouseDownEvent.pageX-e.pageX),Math.abs(this._mouseDownEvent.pageY-e.pageY))>=this.options.distance},_mouseDelayMet:function(){return this.mouseDelayMet},_mouseStart:function(){},_mouseDrag:function(){},_mouseStop:function(){},_mouseCapture:function(){return!0}}),e.widget("ui.sortable",e.ui.mouse,{version:"1.11.1",widgetEventPrefix:"sort",ready:!1,options:{appendTo:"parent",axis:!1,connectWith:!1,containment:!1,cursor:"auto",cursorAt:!1,dropOnEmpty:!0,forcePlaceholderSize:!1,forceHelperSize:!1,grid:!1,handle:!1,helper:"original",items:"> *",opacity:!1,placeholder:!1,revert:!1,scroll:!0,scrollSensitivity:20,scrollSpeed:20,scope:"default",tolerance:"intersect",zIndex:1e3,activate:null,beforeStop:null,change:null,deactivate:null,out:null,over:null,receive:null,remove:null,sort:null,start:null,stop:null,update:null},_isOverAxis:function(e,t,i){return e>=t&&t+i>e},_isFloating:function(e){return/left|right/.test(e.css("float"))||/inline|table-cell/.test(e.css("display"))},_create:function(){var e=this.options;this.containerCache={},this.element.addClass("ui-sortable"),this.refresh(),this.floating=this.items.length?"x"===e.axis||this._isFloating(this.items[0].item):!1,this.offset=this.element.offset(),this._mouseInit(),this._setHandleClassName(),this.ready=!0},_setOption:function(e,t){this._super(e,t),"handle"===e&&this._setHandleClassName()},_setHandleClassName:function(){this.element.find(".ui-sortable-handle").removeClass("ui-sortable-handle"),e.each(this.items,function(){(this.instance.options.handle?this.item.find(this.instance.options.handle):this.item).addClass("ui-sortable-handle")})},_destroy:function(){this.element.removeClass("ui-sortable ui-sortable-disabled").find(".ui-sortable-handle").removeClass("ui-sortable-handle"),this._mouseDestroy();for(var e=this.items.length-1;e>=0;e--)this.items[e].item.removeData(this.widgetName+"-item");return this},_mouseCapture:function(t,i){var s=null,a=!1,n=this;return this.reverting?!1:this.options.disabled||"static"===this.options.type?!1:(this._refreshItems(t),e(t.target).parents().each(function(){return e.data(this,n.widgetName+"-item")===n?(s=e(this),!1):void 0}),e.data(t.target,n.widgetName+"-item")===n&&(s=e(t.target)),s?!this.options.handle||i||(e(this.options.handle,s).find("*").addBack().each(function(){this===t.target&&(a=!0)}),a)?(this.currentItem=s,this._removeCurrentsFromItems(),!0):!1:!1)},_mouseStart:function(t,i,s){var a,n,o=this.options;if(this.currentContainer=this,this.refreshPositions(),this.helper=this._createHelper(t),this._cacheHelperProportions(),this._cacheMargins(),this.scrollParent=this.helper.scrollParent(),this.offset=this.currentItem.offset(),this.offset={top:this.offset.top-this.margins.top,left:this.offset.left-this.margins.left},e.extend(this.offset,{click:{left:t.pageX-this.offset.left,top:t.pageY-this.offset.top},parent:this._getParentOffset(),relative:this._getRelativeOffset()}),this.helper.css("position","absolute"),this.cssPosition=this.helper.css("position"),this.originalPosition=this._generatePosition(t),this.originalPageX=t.pageX,this.originalPageY=t.pageY,o.cursorAt&&this._adjustOffsetFromHelper(o.cursorAt),this.domPosition={prev:this.currentItem.prev()[0],parent:this.currentItem.parent()[0]},this.helper[0]!==this.currentItem[0]&&this.currentItem.hide(),this._createPlaceholder(),o.containment&&this._setContainment(),o.cursor&&"auto"!==o.cursor&&(n=this.document.find("body"),this.storedCursor=n.css("cursor"),n.css("cursor",o.cursor),this.storedStylesheet=e("<style>*{ cursor: "+o.cursor+" !important; }</style>").appendTo(n)),o.opacity&&(this.helper.css("opacity")&&(this._storedOpacity=this.helper.css("opacity")),this.helper.css("opacity",o.opacity)),o.zIndex&&(this.helper.css("zIndex")&&(this._storedZIndex=this.helper.css("zIndex")),this.helper.css("zIndex",o.zIndex)),this.scrollParent[0]!==document&&"HTML"!==this.scrollParent[0].tagName&&(this.overflowOffset=this.scrollParent.offset()),this._trigger("start",t,this._uiHash()),this._preserveHelperProportions||this._cacheHelperProportions(),!s)for(a=this.containers.length-1;a>=0;a--)this.containers[a]._trigger("activate",t,this._uiHash(this));return e.ui.ddmanager&&(e.ui.ddmanager.current=this),e.ui.ddmanager&&!o.dropBehaviour&&e.ui.ddmanager.prepareOffsets(this,t),this.dragging=!0,this.helper.addClass("ui-sortable-helper"),this._mouseDrag(t),!0},_mouseDrag:function(t){var i,s,a,n,o=this.options,r=!1;for(this.position=this._generatePosition(t),this.positionAbs=this._convertPositionTo("absolute"),this.lastPositionAbs||(this.lastPositionAbs=this.positionAbs),this.options.scroll&&(this.scrollParent[0]!==document&&"HTML"!==this.scrollParent[0].tagName?(this.overflowOffset.top+this.scrollParent[0].offsetHeight-t.pageY<o.scrollSensitivity?this.scrollParent[0].scrollTop=r=this.scrollParent[0].scrollTop+o.scrollSpeed:t.pageY-this.overflowOffset.top<o.scrollSensitivity&&(this.scrollParent[0].scrollTop=r=this.scrollParent[0].scrollTop-o.scrollSpeed),this.overflowOffset.left+this.scrollParent[0].offsetWidth-t.pageX<o.scrollSensitivity?this.scrollParent[0].scrollLeft=r=this.scrollParent[0].scrollLeft+o.scrollSpeed:t.pageX-this.overflowOffset.left<o.scrollSensitivity&&(this.scrollParent[0].scrollLeft=r=this.scrollParent[0].scrollLeft-o.scrollSpeed)):(t.pageY-e(document).scrollTop()<o.scrollSensitivity?r=e(document).scrollTop(e(document).scrollTop()-o.scrollSpeed):e(window).height()-(t.pageY-e(document).scrollTop())<o.scrollSensitivity&&(r=e(document).scrollTop(e(document).scrollTop()+o.scrollSpeed)),t.pageX-e(document).scrollLeft()<o.scrollSensitivity?r=e(document).scrollLeft(e(document).scrollLeft()-o.scrollSpeed):e(window).width()-(t.pageX-e(document).scrollLeft())<o.scrollSensitivity&&(r=e(document).scrollLeft(e(document).scrollLeft()+o.scrollSpeed))),r!==!1&&e.ui.ddmanager&&!o.dropBehaviour&&e.ui.ddmanager.prepareOffsets(this,t)),this.positionAbs=this._convertPositionTo("absolute"),this.options.axis&&"y"===this.options.axis||(this.helper[0].style.left=this.position.left+"px"),this.options.axis&&"x"===this.options.axis||(this.helper[0].style.top=this.position.top+"px"),i=this.items.length-1;i>=0;i--)if(s=this.items[i],a=s.item[0],n=this._intersectsWithPointer(s),n&&s.instance===this.currentContainer&&a!==this.currentItem[0]&&this.placeholder[1===n?"next":"prev"]()[0]!==a&&!e.contains(this.placeholder[0],a)&&("semi-dynamic"===this.options.type?!e.contains(this.element[0],a):!0)){if(this.direction=1===n?"down":"up","pointer"!==this.options.tolerance&&!this._intersectsWithSides(s))break;this._rearrange(t,s),this._trigger("change",t,this._uiHash());break}return this._contactContainers(t),e.ui.ddmanager&&e.ui.ddmanager.drag(this,t),this._trigger("sort",t,this._uiHash()),this.lastPositionAbs=this.positionAbs,!1},_mouseStop:function(t,i){if(t){if(e.ui.ddmanager&&!this.options.dropBehaviour&&e.ui.ddmanager.drop(this,t),this.options.revert){var s=this,a=this.placeholder.offset(),n=this.options.axis,o={};n&&"x"!==n||(o.left=a.left-this.offset.parent.left-this.margins.left+(this.offsetParent[0]===document.body?0:this.offsetParent[0].scrollLeft)),n&&"y"!==n||(o.top=a.top-this.offset.parent.top-this.margins.top+(this.offsetParent[0]===document.body?0:this.offsetParent[0].scrollTop)),this.reverting=!0,e(this.helper).animate(o,parseInt(this.options.revert,10)||500,function(){s._clear(t)})}else this._clear(t,i);return!1}},cancel:function(){if(this.dragging){this._mouseUp({target:null}),"original"===this.options.helper?this.currentItem.css(this._storedCSS).removeClass("ui-sortable-helper"):this.currentItem.show();for(var t=this.containers.length-1;t>=0;t--)this.containers[t]._trigger("deactivate",null,this._uiHash(this)),this.containers[t].containerCache.over&&(this.containers[t]._trigger("out",null,this._uiHash(this)),this.containers[t].containerCache.over=0)}return this.placeholder&&(this.placeholder[0].parentNode&&this.placeholder[0].parentNode.removeChild(this.placeholder[0]),"original"!==this.options.helper&&this.helper&&this.helper[0].parentNode&&this.helper.remove(),e.extend(this,{helper:null,dragging:!1,reverting:!1,_noFinalSort:null}),this.domPosition.prev?e(this.domPosition.prev).after(this.currentItem):e(this.domPosition.parent).prepend(this.currentItem)),this},serialize:function(t){var i=this._getItemsAsjQuery(t&&t.connected),s=[];return t=t||{},e(i).each(function(){var i=(e(t.item||this).attr(t.attribute||"id")||"").match(t.expression||/(.+)[\-=_](.+)/);i&&s.push((t.key||i[1]+"[]")+"="+(t.key&&t.expression?i[1]:i[2]))}),!s.length&&t.key&&s.push(t.key+"="),s.join("&")},toArray:function(t){var i=this._getItemsAsjQuery(t&&t.connected),s=[];return t=t||{},i.each(function(){s.push(e(t.item||this).attr(t.attribute||"id")||"")}),s},_intersectsWith:function(e){var t=this.positionAbs.left,i=t+this.helperProportions.width,s=this.positionAbs.top,a=s+this.helperProportions.height,n=e.left,o=n+e.width,r=e.top,h=r+e.height,l=this.offset.click.top,u=this.offset.click.left,d="x"===this.options.axis||s+l>r&&h>s+l,c="y"===this.options.axis||t+u>n&&o>t+u,p=d&&c;return"pointer"===this.options.tolerance||this.options.forcePointerForContainers||"pointer"!==this.options.tolerance&&this.helperProportions[this.floating?"width":"height"]>e[this.floating?"width":"height"]?p:t+this.helperProportions.width/2>n&&o>i-this.helperProportions.width/2&&s+this.helperProportions.height/2>r&&h>a-this.helperProportions.height/2},_intersectsWithPointer:function(e){var t="x"===this.options.axis||this._isOverAxis(this.positionAbs.top+this.offset.click.top,e.top,e.height),i="y"===this.options.axis||this._isOverAxis(this.positionAbs.left+this.offset.click.left,e.left,e.width),s=t&&i,a=this._getDragVerticalDirection(),n=this._getDragHorizontalDirection();return s?this.floating?n&&"right"===n||"down"===a?2:1:a&&("down"===a?2:1):!1},_intersectsWithSides:function(e){var t=this._isOverAxis(this.positionAbs.top+this.offset.click.top,e.top+e.height/2,e.height),i=this._isOverAxis(this.positionAbs.left+this.offset.click.left,e.left+e.width/2,e.width),s=this._getDragVerticalDirection(),a=this._getDragHorizontalDirection();return this.floating&&a?"right"===a&&i||"left"===a&&!i:s&&("down"===s&&t||"up"===s&&!t)},_getDragVerticalDirection:function(){var e=this.positionAbs.top-this.lastPositionAbs.top;return 0!==e&&(e>0?"down":"up")},_getDragHorizontalDirection:function(){var e=this.positionAbs.left-this.lastPositionAbs.left;return 0!==e&&(e>0?"right":"left")},refresh:function(e){return this._refreshItems(e),this._setHandleClassName(),this.refreshPositions(),this},_connectWith:function(){var e=this.options;return e.connectWith.constructor===String?[e.connectWith]:e.connectWith},_getItemsAsjQuery:function(t){function i(){r.push(this)}var s,a,n,o,r=[],h=[],l=this._connectWith();if(l&&t)for(s=l.length-1;s>=0;s--)for(n=e(l[s]),a=n.length-1;a>=0;a--)o=e.data(n[a],this.widgetFullName),o&&o!==this&&!o.options.disabled&&h.push([e.isFunction(o.options.items)?o.options.items.call(o.element):e(o.options.items,o.element).not(".ui-sortable-helper").not(".ui-sortable-placeholder"),o]);for(h.push([e.isFunction(this.options.items)?this.options.items.call(this.element,null,{options:this.options,item:this.currentItem}):e(this.options.items,this.element).not(".ui-sortable-helper").not(".ui-sortable-placeholder"),this]),s=h.length-1;s>=0;s--)h[s][0].each(i);return e(r)},_removeCurrentsFromItems:function(){var t=this.currentItem.find(":data("+this.widgetName+"-item)");this.items=e.grep(this.items,function(e){for(var i=0;t.length>i;i++)if(t[i]===e.item[0])return!1;return!0})},_refreshItems:function(t){this.items=[],this.containers=[this];var i,s,a,n,o,r,h,l,u=this.items,d=[[e.isFunction(this.options.items)?this.options.items.call(this.element[0],t,{item:this.currentItem}):e(this.options.items,this.element),this]],c=this._connectWith();if(c&&this.ready)for(i=c.length-1;i>=0;i--)for(a=e(c[i]),s=a.length-1;s>=0;s--)n=e.data(a[s],this.widgetFullName),n&&n!==this&&!n.options.disabled&&(d.push([e.isFunction(n.options.items)?n.options.items.call(n.element[0],t,{item:this.currentItem}):e(n.options.items,n.element),n]),this.containers.push(n));for(i=d.length-1;i>=0;i--)for(o=d[i][1],r=d[i][0],s=0,l=r.length;l>s;s++)h=e(r[s]),h.data(this.widgetName+"-item",o),u.push({item:h,instance:o,width:0,height:0,left:0,top:0})},refreshPositions:function(t){this.offsetParent&&this.helper&&(this.offset.parent=this._getParentOffset());var i,s,a,n;for(i=this.items.length-1;i>=0;i--)s=this.items[i],s.instance!==this.currentContainer&&this.currentContainer&&s.item[0]!==this.currentItem[0]||(a=this.options.toleranceElement?e(this.options.toleranceElement,s.item):s.item,t||(s.width=a.outerWidth(),s.height=a.outerHeight()),n=a.offset(),s.left=n.left,s.top=n.top);if(this.options.custom&&this.options.custom.refreshContainers)this.options.custom.refreshContainers.call(this);else for(i=this.containers.length-1;i>=0;i--)n=this.containers[i].element.offset(),this.containers[i].containerCache.left=n.left,this.containers[i].containerCache.top=n.top,this.containers[i].containerCache.width=this.containers[i].element.outerWidth(),this.containers[i].containerCache.height=this.containers[i].element.outerHeight();return this},_createPlaceholder:function(t){t=t||this;var i,s=t.options;s.placeholder&&s.placeholder.constructor!==String||(i=s.placeholder,s.placeholder={element:function(){var s=t.currentItem[0].nodeName.toLowerCase(),a=e("<"+s+">",t.document[0]).addClass(i||t.currentItem[0].className+" ui-sortable-placeholder").removeClass("ui-sortable-helper");return"tr"===s?t.currentItem.children().each(function(){e("<td>&#160;</td>",t.document[0]).attr("colspan",e(this).attr("colspan")||1).appendTo(a)}):"img"===s&&a.attr("src",t.currentItem.attr("src")),i||a.css("visibility","hidden"),a},update:function(e,a){(!i||s.forcePlaceholderSize)&&(a.height()||a.height(t.currentItem.innerHeight()-parseInt(t.currentItem.css("paddingTop")||0,10)-parseInt(t.currentItem.css("paddingBottom")||0,10)),a.width()||a.width(t.currentItem.innerWidth()-parseInt(t.currentItem.css("paddingLeft")||0,10)-parseInt(t.currentItem.css("paddingRight")||0,10)))}}),t.placeholder=e(s.placeholder.element.call(t.element,t.currentItem)),t.currentItem.after(t.placeholder),s.placeholder.update(t,t.placeholder)},_contactContainers:function(t){var i,s,a,n,o,r,h,l,u,d,c=null,p=null;for(i=this.containers.length-1;i>=0;i--)if(!e.contains(this.currentItem[0],this.containers[i].element[0]))if(this._intersectsWith(this.containers[i].containerCache)){if(c&&e.contains(this.containers[i].element[0],c.element[0]))continue;c=this.containers[i],p=i}else this.containers[i].containerCache.over&&(this.containers[i]._trigger("out",t,this._uiHash(this)),this.containers[i].containerCache.over=0);if(c)if(1===this.containers.length)this.containers[p].containerCache.over||(this.containers[p]._trigger("over",t,this._uiHash(this)),this.containers[p].containerCache.over=1);else{for(a=1e4,n=null,u=c.floating||this._isFloating(this.currentItem),o=u?"left":"top",r=u?"width":"height",d=u?"clientX":"clientY",s=this.items.length-1;s>=0;s--)e.contains(this.containers[p].element[0],this.items[s].item[0])&&this.items[s].item[0]!==this.currentItem[0]&&(h=this.items[s].item.offset()[o],l=!1,t[d]-h>this.items[s][r]/2&&(l=!0),a>Math.abs(t[d]-h)&&(a=Math.abs(t[d]-h),n=this.items[s],this.direction=l?"up":"down"));if(!n&&!this.options.dropOnEmpty)return;if(this.currentContainer===this.containers[p])return;n?this._rearrange(t,n,null,!0):this._rearrange(t,null,this.containers[p].element,!0),this._trigger("change",t,this._uiHash()),this.containers[p]._trigger("change",t,this._uiHash(this)),this.currentContainer=this.containers[p],this.options.placeholder.update(this.currentContainer,this.placeholder),this.containers[p]._trigger("over",t,this._uiHash(this)),this.containers[p].containerCache.over=1}},_createHelper:function(t){var i=this.options,s=e.isFunction(i.helper)?e(i.helper.apply(this.element[0],[t,this.currentItem])):"clone"===i.helper?this.currentItem.clone():this.currentItem;return s.parents("body").length||e("parent"!==i.appendTo?i.appendTo:this.currentItem[0].parentNode)[0].appendChild(s[0]),s[0]===this.currentItem[0]&&(this._storedCSS={width:this.currentItem[0].style.width,height:this.currentItem[0].style.height,position:this.currentItem.css("position"),top:this.currentItem.css("top"),left:this.currentItem.css("left")}),(!s[0].style.width||i.forceHelperSize)&&s.width(this.currentItem.width()),(!s[0].style.height||i.forceHelperSize)&&s.height(this.currentItem.height()),s},_adjustOffsetFromHelper:function(t){"string"==typeof t&&(t=t.split(" ")),e.isArray(t)&&(t={left:+t[0],top:+t[1]||0}),"left"in t&&(this.offset.click.left=t.left+this.margins.left),"right"in t&&(this.offset.click.left=this.helperProportions.width-t.right+this.margins.left),"top"in t&&(this.offset.click.top=t.top+this.margins.top),"bottom"in t&&(this.offset.click.top=this.helperProportions.height-t.bottom+this.margins.top)},_getParentOffset:function(){this.offsetParent=this.helper.offsetParent();var t=this.offsetParent.offset();return"absolute"===this.cssPosition&&this.scrollParent[0]!==document&&e.contains(this.scrollParent[0],this.offsetParent[0])&&(t.left+=this.scrollParent.scrollLeft(),t.top+=this.scrollParent.scrollTop()),(this.offsetParent[0]===document.body||this.offsetParent[0].tagName&&"html"===this.offsetParent[0].tagName.toLowerCase()&&e.ui.ie)&&(t={top:0,left:0}),{top:t.top+(parseInt(this.offsetParent.css("borderTopWidth"),10)||0),left:t.left+(parseInt(this.offsetParent.css("borderLeftWidth"),10)||0)}},_getRelativeOffset:function(){if("relative"===this.cssPosition){var e=this.currentItem.position();return{top:e.top-(parseInt(this.helper.css("top"),10)||0)+this.scrollParent.scrollTop(),left:e.left-(parseInt(this.helper.css("left"),10)||0)+this.scrollParent.scrollLeft()}}return{top:0,left:0}},_cacheMargins:function(){this.margins={left:parseInt(this.currentItem.css("marginLeft"),10)||0,top:parseInt(this.currentItem.css("marginTop"),10)||0}},_cacheHelperProportions:function(){this.helperProportions={width:this.helper.outerWidth(),height:this.helper.outerHeight()}},_setContainment:function(){var t,i,s,a=this.options;"parent"===a.containment&&(a.containment=this.helper[0].parentNode),("document"===a.containment||"window"===a.containment)&&(this.containment=[0-this.offset.relative.left-this.offset.parent.left,0-this.offset.relative.top-this.offset.parent.top,e("document"===a.containment?document:window).width()-this.helperProportions.width-this.margins.left,(e("document"===a.containment?document:window).height()||document.body.parentNode.scrollHeight)-this.helperProportions.height-this.margins.top]),/^(document|window|parent)$/.test(a.containment)||(t=e(a.containment)[0],i=e(a.containment).offset(),s="hidden"!==e(t).css("overflow"),this.containment=[i.left+(parseInt(e(t).css("borderLeftWidth"),10)||0)+(parseInt(e(t).css("paddingLeft"),10)||0)-this.margins.left,i.top+(parseInt(e(t).css("borderTopWidth"),10)||0)+(parseInt(e(t).css("paddingTop"),10)||0)-this.margins.top,i.left+(s?Math.max(t.scrollWidth,t.offsetWidth):t.offsetWidth)-(parseInt(e(t).css("borderLeftWidth"),10)||0)-(parseInt(e(t).css("paddingRight"),10)||0)-this.helperProportions.width-this.margins.left,i.top+(s?Math.max(t.scrollHeight,t.offsetHeight):t.offsetHeight)-(parseInt(e(t).css("borderTopWidth"),10)||0)-(parseInt(e(t).css("paddingBottom"),10)||0)-this.helperProportions.height-this.margins.top])
},_convertPositionTo:function(t,i){i||(i=this.position);var s="absolute"===t?1:-1,a="absolute"!==this.cssPosition||this.scrollParent[0]!==document&&e.contains(this.scrollParent[0],this.offsetParent[0])?this.scrollParent:this.offsetParent,n=/(html|body)/i.test(a[0].tagName);return{top:i.top+this.offset.relative.top*s+this.offset.parent.top*s-("fixed"===this.cssPosition?-this.scrollParent.scrollTop():n?0:a.scrollTop())*s,left:i.left+this.offset.relative.left*s+this.offset.parent.left*s-("fixed"===this.cssPosition?-this.scrollParent.scrollLeft():n?0:a.scrollLeft())*s}},_generatePosition:function(t){var i,s,a=this.options,n=t.pageX,o=t.pageY,r="absolute"!==this.cssPosition||this.scrollParent[0]!==document&&e.contains(this.scrollParent[0],this.offsetParent[0])?this.scrollParent:this.offsetParent,h=/(html|body)/i.test(r[0].tagName);return"relative"!==this.cssPosition||this.scrollParent[0]!==document&&this.scrollParent[0]!==this.offsetParent[0]||(this.offset.relative=this._getRelativeOffset()),this.originalPosition&&(this.containment&&(t.pageX-this.offset.click.left<this.containment[0]&&(n=this.containment[0]+this.offset.click.left),t.pageY-this.offset.click.top<this.containment[1]&&(o=this.containment[1]+this.offset.click.top),t.pageX-this.offset.click.left>this.containment[2]&&(n=this.containment[2]+this.offset.click.left),t.pageY-this.offset.click.top>this.containment[3]&&(o=this.containment[3]+this.offset.click.top)),a.grid&&(i=this.originalPageY+Math.round((o-this.originalPageY)/a.grid[1])*a.grid[1],o=this.containment?i-this.offset.click.top>=this.containment[1]&&i-this.offset.click.top<=this.containment[3]?i:i-this.offset.click.top>=this.containment[1]?i-a.grid[1]:i+a.grid[1]:i,s=this.originalPageX+Math.round((n-this.originalPageX)/a.grid[0])*a.grid[0],n=this.containment?s-this.offset.click.left>=this.containment[0]&&s-this.offset.click.left<=this.containment[2]?s:s-this.offset.click.left>=this.containment[0]?s-a.grid[0]:s+a.grid[0]:s)),{top:o-this.offset.click.top-this.offset.relative.top-this.offset.parent.top+("fixed"===this.cssPosition?-this.scrollParent.scrollTop():h?0:r.scrollTop()),left:n-this.offset.click.left-this.offset.relative.left-this.offset.parent.left+("fixed"===this.cssPosition?-this.scrollParent.scrollLeft():h?0:r.scrollLeft())}},_rearrange:function(e,t,i,s){i?i[0].appendChild(this.placeholder[0]):t.item[0].parentNode.insertBefore(this.placeholder[0],"down"===this.direction?t.item[0]:t.item[0].nextSibling),this.counter=this.counter?++this.counter:1;var a=this.counter;this._delay(function(){a===this.counter&&this.refreshPositions(!s)})},_clear:function(e,t){function i(e,t,i){return function(s){i._trigger(e,s,t._uiHash(t))}}this.reverting=!1;var s,a=[];if(!this._noFinalSort&&this.currentItem.parent().length&&this.placeholder.before(this.currentItem),this._noFinalSort=null,this.helper[0]===this.currentItem[0]){for(s in this._storedCSS)("auto"===this._storedCSS[s]||"static"===this._storedCSS[s])&&(this._storedCSS[s]="");this.currentItem.css(this._storedCSS).removeClass("ui-sortable-helper")}else this.currentItem.show();for(this.fromOutside&&!t&&a.push(function(e){this._trigger("receive",e,this._uiHash(this.fromOutside))}),!this.fromOutside&&this.domPosition.prev===this.currentItem.prev().not(".ui-sortable-helper")[0]&&this.domPosition.parent===this.currentItem.parent()[0]||t||a.push(function(e){this._trigger("update",e,this._uiHash())}),this!==this.currentContainer&&(t||(a.push(function(e){this._trigger("remove",e,this._uiHash())}),a.push(function(e){return function(t){e._trigger("receive",t,this._uiHash(this))}}.call(this,this.currentContainer)),a.push(function(e){return function(t){e._trigger("update",t,this._uiHash(this))}}.call(this,this.currentContainer)))),s=this.containers.length-1;s>=0;s--)t||a.push(i("deactivate",this,this.containers[s])),this.containers[s].containerCache.over&&(a.push(i("out",this,this.containers[s])),this.containers[s].containerCache.over=0);if(this.storedCursor&&(this.document.find("body").css("cursor",this.storedCursor),this.storedStylesheet.remove()),this._storedOpacity&&this.helper.css("opacity",this._storedOpacity),this._storedZIndex&&this.helper.css("zIndex","auto"===this._storedZIndex?"":this._storedZIndex),this.dragging=!1,this.cancelHelperRemoval){if(!t){for(this._trigger("beforeStop",e,this._uiHash()),s=0;a.length>s;s++)a[s].call(this,e);this._trigger("stop",e,this._uiHash())}return this.fromOutside=!1,!1}if(t||this._trigger("beforeStop",e,this._uiHash()),this.placeholder[0].parentNode.removeChild(this.placeholder[0]),this.helper[0]!==this.currentItem[0]&&this.helper.remove(),this.helper=null,!t){for(s=0;a.length>s;s++)a[s].call(this,e);this._trigger("stop",e,this._uiHash())}return this.fromOutside=!1,!0},_trigger:function(){e.Widget.prototype._trigger.apply(this,arguments)===!1&&this.cancel()},_uiHash:function(t){var i=t||this;return{helper:i.helper,placeholder:i.placeholder||e([]),position:i.position,originalPosition:i.originalPosition,offset:i.positionAbs,item:i.currentItem,sender:t?t.element:null}}})});
/*
 jQuery UI Sortable plugin wrapper

 @param [ui-sortable] {object} Options to pass to $.fn.sortable() merged onto ui.config
 */
angular.module('ui.sortable', [])
  .value('uiSortableConfig',{})
  .directive('uiSortable', [
    'uiSortableConfig', '$timeout', '$log',
    function(uiSortableConfig, $timeout, $log) {
      return {
        require: '?ngModel',
        link: function(scope, element, attrs, ngModel) {
          var savedNodes;

          function combineCallbacks(first,second){
            if(second && (typeof second === 'function')) {
              return function(e, ui) {
                first(e, ui);
                second(e, ui);
              };
            }
            return first;
          }

          var opts = {};

          var callbacks = {
            receive: null,
            remove:null,
            start:null,
            stop:null,
            update:null
          };

          angular.extend(opts, uiSortableConfig);

          if (!angular.element.fn || !angular.element.fn.jquery) {
            $log.error('ui.sortable: jQuery should be included before AngularJS!');
            return;
          }

          if (ngModel) {

            // When we add or remove elements, we need the sortable to 'refresh'
            // so it can find the new/removed elements.
            scope.$watch(attrs.ngModel+'.length', function() {
              // Timeout to let ng-repeat modify the DOM
              $timeout(function() {
                // ensure that the jquery-ui-sortable widget instance
                // is still bound to the directive's element
                if (!!element.data('ui-sortable')) {
                  element.sortable('refresh');
                }
              });
            });

            callbacks.start = function(e, ui) {
              // Save the starting position of dragged item
              ui.item.sortable = {
                index: ui.item.index(),
                cancel: function () {
                  ui.item.sortable._isCanceled = true;
                },
                isCanceled: function () {
                  return ui.item.sortable._isCanceled;
                },
                _isCanceled: false
              };
            };

            callbacks.activate = function(/*e, ui*/) {
              // We need to make a copy of the current element's contents so
              // we can restore it after sortable has messed it up.
              // This is inside activate (instead of start) in order to save
              // both lists when dragging between connected lists.
              savedNodes = element.contents();

              // If this list has a placeholder (the connected lists won't),
              // don't inlcude it in saved nodes.
              var placeholder = element.sortable('option','placeholder');

              // placeholder.element will be a function if the placeholder, has
              // been created (placeholder will be an object).  If it hasn't
              // been created, either placeholder will be false if no
              // placeholder class was given or placeholder.element will be
              // undefined if a class was given (placeholder will be a string)
              if (placeholder && placeholder.element && typeof placeholder.element === 'function') {
                var phElement = placeholder.element();
                // workaround for jquery ui 1.9.x,
                // not returning jquery collection
                phElement = angular.element(phElement);

                // exact match with the placeholder's class attribute to handle
                // the case that multiple connected sortables exist and
                // the placehoilder option equals the class of sortable items
                var excludes = element.find('[class="' + phElement.attr('class') + '"]');

                savedNodes = savedNodes.not(excludes);
              }
            };

            callbacks.update = function(e, ui) {
              // Save current drop position but only if this is not a second
              // update that happens when moving between lists because then
              // the value will be overwritten with the old value
              if(!ui.item.sortable.received) {
                ui.item.sortable.dropindex = ui.item.index();
                ui.item.sortable.droptarget = ui.item.parent();

                // Cancel the sort (let ng-repeat do the sort for us)
                // Don't cancel if this is the received list because it has
                // already been canceled in the other list, and trying to cancel
                // here will mess up the DOM.
                element.sortable('cancel');
              }

              // Put the nodes back exactly the way they started (this is very
              // important because ng-repeat uses comment elements to delineate
              // the start and stop of repeat sections and sortable doesn't
              // respect their order (even if we cancel, the order of the
              // comments are still messed up).
              if (element.sortable('option','helper') === 'clone') {
                // restore all the savedNodes except .ui-sortable-helper element
                // (which is placed last). That way it will be garbage collected.
                savedNodes = savedNodes.not(savedNodes.last());
              }
              savedNodes.appendTo(element);

              // If received is true (an item was dropped in from another list)
              // then we add the new item to this list otherwise wait until the
              // stop event where we will know if it was a sort or item was
              // moved here from another list
              if(ui.item.sortable.received && !ui.item.sortable.isCanceled()) {
                scope.$apply(function () {
                  ngModel.$modelValue.splice(ui.item.sortable.dropindex, 0,
                                             ui.item.sortable.moved);
                });
              }
            };

            callbacks.stop = function(e, ui) {
              // If the received flag hasn't be set on the item, this is a
              // normal sort, if dropindex is set, the item was moved, so move
              // the items in the list.
              if(!ui.item.sortable.received &&
                 ('dropindex' in ui.item.sortable) &&
                 !ui.item.sortable.isCanceled()) {

                scope.$apply(function () {
                  ngModel.$modelValue.splice(
                    ui.item.sortable.dropindex, 0,
                    ngModel.$modelValue.splice(ui.item.sortable.index, 1)[0]);
                });
              } else {
                // if the item was not moved, then restore the elements
                // so that the ngRepeat's comment are correct.
                if((!('dropindex' in ui.item.sortable) || ui.item.sortable.isCanceled()) && element.sortable('option','helper') !== 'clone') {
                  savedNodes.appendTo(element);
                }
              }
            };

            callbacks.receive = function(e, ui) {
              // An item was dropped here from another list, set a flag on the
              // item.
              ui.item.sortable.received = true;
            };

            callbacks.remove = function(e, ui) {
              // Remove the item from this list's model and copy data into item,
              // so the next list can retrive it
              if (!ui.item.sortable.isCanceled()) {
                scope.$apply(function () {
                  ui.item.sortable.moved = ngModel.$modelValue.splice(
                    ui.item.sortable.index, 1)[0];
                });
              }
            };

            scope.$watch(attrs.uiSortable, function(newVal /*, oldVal*/) {
              // ensure that the jquery-ui-sortable widget instance
              // is still bound to the directive's element
              if (!!element.data('ui-sortable')) {
                angular.forEach(newVal, function(value, key) {
                  if(callbacks[key]) {
                    if( key === 'stop' ){
                      // call apply after stop
                      value = combineCallbacks(
                        value, function() { scope.$apply(); });
                    }
                    // wrap the callback
                    value = combineCallbacks(callbacks[key], value);
                  }
                  
                  element.sortable('option', key, value);
                });
              }
            }, true);

            angular.forEach(callbacks, function(value, key) {
              opts[key] = combineCallbacks(value, opts[key]);
            });

          } else {
            $log.info('ui.sortable: ngModel not provided!', element);
          }

          // Create sortable
          element.sortable(opts);
        }
      };
    }
  ]);

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