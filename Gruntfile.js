/* 
 Grunt installation:
-------------------
npm install grunt -g 

Project Dependencies:
----------------------

npm install grunt --save-dev
npm install grunt-contrib-watch --save-dev
npm install grunt-contrib-uglify --save-dev
npm install grunt-contrib-concat --save-dev
npm install grunt-contrib-cssmin --save-dev
npm install grunt-contrib-compress --save-dev


To Watch Files: 
---------------
grunt watch

*/

module.exports = function (grunt) {
    grunt.initConfig({
        //Storing package file so we can reference its specific data whenever necessary
        pkg: grunt.file.readJSON('package.json'),
        copy: {
          main: {
            files: [
              // includes files within path 
              // {expand: true, flatten: true, src: ['dependencies/**/views/*.ejs'], dest: 'views/'}
            ],
          },
        },
        concat: {
          
        },
        concat: {
            appjs:{
                files:[
                    //concat app.js and add module routes
                    // {src:['app.js','dependencies/**/index.js'],dest:'server.js'},
                ]                                                   
            },
            navmodules:{
                files:[
                    //concat navigation link for sub modules
                    // {src:['dependencies/**/views/nav/*.ejs'],dest:'views/partials/nav-modules.ejs'},
                ]                                                   
            },
            css:{
                
                files:[
                    //concat image uploader css
                    {src:['private/stylesheets/pup.css','private/stylesheets/jquery.Jcrop.css'],dest:'public/stylesheets/pup.combo.css'},
                    //concat admin tool css
                    {src:['private/stylesheets/chosen.css','private/stylesheets/sub.css'],dest:'public/stylesheets/sub.combo.css'}                          
                    ]                                                   
                }
            },
            cssmin:{
               css:{

                  files:[
                //minify image uploader css
             {src:'public/stylesheets/pup.combo.css', dest:'public/stylesheets/pup.min.css'},
                //minify admin tool css
                {src:'public/stylesheets/sub.combo.css', dest:'public/stylesheets/sub.min.css'},  
                //minify AdminLTE css
                {src:'public/stylesheets/AdminLTE.css', dest:'public/stylesheets/AdminLTE.min.css'}

                ]                                           
            }
        },
        ngAnnotate:{
            js:{
            files:[
                {
                    src:[
                      //vendor resources
                        'public/javascripts/vendors/angular-file-upload/angular-file-upload.js',
                        'public/javascripts/vendors/angular-img-edit/angular-imgEditor.js',
                        'public/javascripts/factories/subServices.js', 
                        //pup
                        'public/javascripts/applications/PupApp.js',
                        'public/javascripts/controllers/PupControllers.js',
                        'public/javascripts/directives/PupDirectives.js',
                        'public/javascripts/directives/HostedDirectives.js',
                        'public/javascripts/factories/UuidFactories.js',
                        'public/javascripts/factories/loggingServices.js'
                    ],
                    dest:'public/javascripts/pup.annotated.js'
                },                
                {
                    src:[
                        //admin
                        'public/javascripts/vendors/angular-file-upload/angular-file-upload.js',
                        'public/javascripts/factories/subServices.js', 
                        'public/javascripts/factories/ModalService.js',
                        'public/javascripts/controllers/AdminControllers.js',
                        'public/javascripts/directives/AdminDirectives.js',
                        'public/javascripts/filters/AdminFilters.js',
                        'public/javascripts/factories/AdminFactories.js',
                        'public/javascripts/applications/AdminApp.js',

                        //profile
                        'public/javascripts/applications/ProfileApp.js',
                        'public/javascripts/controllers/ProfileControllers.js',
                        'public/javascripts/directives/ProfileDirectives.js',

                        //sorting
                        'public/javascripts/factories/UuidFactories.js',
                        'public/javascripts/vendors/jquery-ui/jquery-ui.min.js',
                        'public/javascripts/vendors/sortable/sortable.js',

                        // Logging
                        'public/javascripts/factories/loggingServices.js',

                        //vendor resource
                        'public/javascripts/vendors/angular-img-edit/angular-imgEditor.js'
                    ],
                    dest:'public/javascripts/sub.annotated.js'
                },
                {
                    src:[
                        'public/javascripts/factories/subServices.js', 
                        'public/javascripts/factories/loggingServices.js',
                        'public/javascripts/applications/HostedApp.js',
                        'public/javascripts/controllers/HostedController.js',
                        'public/javascripts/directives/HostedDirectives.js',
                        'public/javascripts/directives/SocialDirectives.js',
                        'public/javascripts/directives/GoogleAnalytics.js'
                    ],
                    dest:'public/javascripts/hosted.annotated.js'
                }
            ]
        }
        },
        uglify: {  
            options:{
                // beautify: true,
                // mangle: false,
                sourceMap: true
            },        
            js:{

              files:[
              //minigy sub module js
              {src:[
                        //custom files                      
                        'public/javascripts/modules.annotated.js'                        
                        ],
                        dest:'public/javascripts/modules.min.js'
                    },
              //minify image uploader js
              {src:[
                          
                        //custom files                      
                        'public/javascripts/pup.annotated.js'                        
                        ],
                        dest:'public/javascripts/pup.min.js'
                    },
              //minify admin tool js
                    {src:[                                                      
                        'public/javascripts/sub.annotated.js'                       
                        ],
                        dest:'public/javascripts/sub.min.js'},
                     //minify hosted js   
                     {src:[                                                      
                        'public/javascripts/hosted.annotated.js'                       
                        ],
                        dest:'public/javascripts/hosted.min.js'},   
                    //minify embed js
                    {src:'public/javascripts/embed/0.0.2/embed.js', dest:'public/javascripts/embed/0.0.2/embed.min.js'},
                    //minify embed js
                    {src:'public/javascripts/embed/0.0.3/embed.js', dest:'public/javascripts/embed/0.0.3/embed.min.js'},
                    //minify embed js
                    {src:'public/javascripts/embed/0.0.4/embed.js', dest:'public/javascripts/embed/0.0.4/embed.min.js'},
                    //minify embed js

                    {src:['public/javascripts/embed/0.0.5/embed.js'], dest:'public/javascripts/embed/0.0.5/embed.min.js'},
                    //minify bootstrap version of embed js
                    {src:'public/javascripts/embed/0.0.4/embed-bootstrap.js', dest:'public/javascripts/embed/0.0.4/embed-bootstrap.min.js'},
                    //minify vendor js
                    {src:[
                        'public/javascripts/vendors/angular-ui/ui-bootstrap-tpls-0.12.0.min.js',
                        'public/javascripts/resources/jcrop/js/jquery.Jcrop.min.js',
                        'public/javascripts/resources/ment.io/dist/mentio.min.js',
                        'public/javascripts/resources/angular-no-captcha/build/angular-no-captcha.min.js',
                        'public/javascripts/resources/angular-chosen-localytics/chosen.js',  
                        'public/javascripts/resources/jReject/js/jquery.reject.js',   
                        'public/javascripts/directives/GoogleAnalytics.js',
                        'public/javascripts/resources/angular-bindonce/bindonce.js'                     
                        ],
                        dest:'public/javascripts/vendor.min.js'
                                       },
                   //minify pup vendor js
                    {
                      src:[
                        'public/javascripts/vendors/es5-shim/2.3.0/es5-shim.min.js',
                        'public/javascripts/resources/jquery/jquery.min.js',
                        'public/javascripts/resources/bootstrap/dist/js/bootstrap.min.js',
                        'public/javascripts/resources/angular/angular.min.js',
                        'public/javascripts/resources/jcrop/js/jquery.Jcrop.min.js',
                        'public/javascripts/vendors/angular-ui/ui-bootstrap-tpls-0.12.0.min.js',
                        'public/javascripts/resources/angular-resource/angular-resource.js'
                      ],
                      dest:'public/javascripts/pup-vendor.min.js'
                    },
                    //minify AdminLTE js
                    {src:'public/javascripts/AdminLTE.js', dest:'public/javascripts/AdminLTE.min.js'}
                    



                    ]
                }
            },
            retire: {
              js: ['public/javascripts/*.js'], /** Which js-files to scan. **/
              node: ['/'] /** Which node directories to scan (containing package.json). **/
              // options: {
              //    proxy: 'http://something.something:8080',
              //    verbose: true,
              //    packageOnly: true, 
              //    jsRepository: 'https://raw.github.com/bekk/retire.js/master/repository/jsrepository.json',
              //    nodeRepository: 'https://raw.github.com/bekk/retire.js/master/repository/npmrepository.json',
              //    ignore: 'documents,java',
              //    ignorefile: '.retireignore' /** list of files to ignore **/
            },
             watch:{
               files:['private/stylesheets/*','public/javascripts/controllers/*','public/javascripts/directives/*','public/javascripts/factories/*','public/javascripts/applications/*','public/javascripts/filters/*','public/javascripts/resources/*','public/javascripts/vendor/*','public/javascripts/embed/0.0.2/*','public/javascripts/embed/0.0.3/*','public/javascripts/embed/0.0.4/*','public/javascripts/embed/0.0.5/*','dependencies/*', 'public/javascripts/vendors/angular-img-edit/*'],
               tasks:['concat:css', 'cssmin', 'ngAnnotate','uglify', 'retire:js']
            }
            

       });

      // Load the plugins
      grunt.loadNpmTasks('grunt-contrib-watch');
      grunt.loadNpmTasks('grunt-ng-annotate');
      grunt.loadNpmTasks('grunt-contrib-uglify');
      grunt.loadNpmTasks('grunt-contrib-concat');
      grunt.loadNpmTasks('grunt-contrib-cssmin');
      grunt.loadNpmTasks('grunt-contrib-copy');
      grunt.loadNpmTasks('grunt-retire');
    // grunt.loadNpmTasks('grunt-contrib-compress');


      // Default task(s).    
      grunt.registerTask('default', ['concat:css', 'cssmin:css','ngAnnotate:js','uglify:js', 'retire:js']);

       //defined grunt task to add submodules
      // grunt.registerTask('addsubmodules', function(){
      //     console.log('updating repository to add submodule changes...');
      //     grunt.task.run(['copy:main', 'concat:appjs', 'concat:navmodules', 'concat:css', 'cssmin:css','ngAnnotate:js','uglify:js','retire:js']);
      // });
    };
