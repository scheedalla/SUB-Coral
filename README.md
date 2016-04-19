Submission Platform
===================
--------------------
Authors - The Washington Post

## Synopsis

The Submission Platform is a dynamic form builder that lets you collect and manage user submissions of text, images, and other data. It is built entirely on the MEAN (MongoDB, Express, Angular, Node.js) stack.

##Component Versions
MongoDB - v 3.2 ExpressJS - v 4.12.4 AngularJS - v 1.4.7 NodeJS - v 10.25

## Installation

1. Install node: https://nodejs.org/download/ (You can also install NodeJS using homebrew or any package manager.)

Hosted Services

There are several config files located in the config directory.  They contain connection strings to hosted instances of ElasticSearch and MongoDB.<br>
These can be used for testing, but the data is publicly available, so do not create users with sensitive passwords, etc. <br>

	Mongo Config - config/db_local.js <br>
	ElasticSearch Config - config/elastic.js

Check both config files to make sure you have commented out the local connection string and use the hosted connection string. <br>

The app also uses a hosted media service for uploaders. Currently we aren't providing a hosted or local variation of this, but will be asap.<br>

Local Services

2. Install mongodb: https://docs.mongodb.org/manual/installation/
	2.1  Start the Mongo service
	2.2  Create a database names sub
	2.3  Add user sub_test to the sub database.  Make sure the user has readWrite role on the DB and the PW matches the one in the connection string in config/db_local.js
	2.4  Optionally you can import this data dump to your database: https://s3.amazonaws.com/wpentdev/coral/mongodump.zip
	2.5  Check config/db_local.js to make sure you have commented out the hosted connection string and use the local connection string. <br>

3. Set up a local Elastic search instance.<br> Follow the instructions here: https://www.elastic.co/guide/en/elasticsearch/guide/current/running-elasticsearch.html  <br>
	3.1  Check config/elastic.js to make sure you have commented out the hosted connection string and use the local connection string. <br>

4.  Navigate to your project folder via command line and run the following commands in order. 
<pre>
	$ npm install <br>
	$ bower install<br>
	$ grunt
</pre>

5. Now all of your dependencies, assets and services are installed and configured.  Run command <pre> $ node server.js </pre>  You will see a series of messages, starting with this "Action=DBConnect Message='Connected to QA MongoDB'"  That means you have successfully started your app and connected to your DB.

6. In your browser visit localhost:3000 the app will load up there.

## Help

This is a guide to MongoDB shell commands. Shell Commands

Create a database: Once you have installed your MongoDB server and entered into the shell, you can create a new database with the following: 
Example: use sub 
This will create the database and save it as long as you add a document to it.

Create a collection: When in a database, to create a collection, you need to add a document by pointing to the desired name of the new collection and the collection will be created. 
Example: db.myCollection.insert ({value: "my first document"})

Create a user: You can create a user for any database when in the mongo shell. There are many different rolse and settings that can be created, but here is the basic way to create a user for a specific database. 
Example: use myDatabase db.createUser( { user: "sub_test", pwd: "mysecretpassword", roles: [ "readWrite", "sub" ] } )