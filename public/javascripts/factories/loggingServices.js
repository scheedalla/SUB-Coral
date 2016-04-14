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