Submission Platform
===================
--------------------
Authors - Matthew Cwalinski, Kat Styons, Sruti Cheedalla <br>
Created Date - January 30, 2014 <br>

## Synopsis

The Submission Platform is a dynamic form builder that lets you collect and manage user submissions of text, images, and other data. It is built entirely on the MEAN (MongoDB, Express, Angular, Node.js) stack.

## Installation

To run this project, make sure you have Node.js installed: https://nodejs.org/en/download/ or via Homebrew on Mac. <br>
1. Set up a local Mongo database. You can dump the data from here: https://s3.amazonaws.com/wpentdev/coral/mongodump.zip<br>
2. Set up a local Elastic search instance.<br> Follow the instructions here: https://www.elastic.co/guide/en/elasticsearch/guide/current/running-elasticsearch.html  <br>
3. Throughout the app, there are references to photo uploaders. This functionality will not work as it points to an external service.<br>


<pre>
	$ npm install <br>
	$ bower install<br>
	$ node server.js
</pre>

## There are no users so you must register before signing in.

## Grunt  
Grunt is used to combine and minify css and javascript files. You can use the "grunt" and "grunt watch" tasks. Please see Gruntfile.js.
