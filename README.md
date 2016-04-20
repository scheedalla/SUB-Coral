Submission Platform
===================
--------------------
Authors - The Washington Post

## Synopsis

The Submission Platform is a dynamic form builder that lets you collect and manage user submissions of text, images, and other data. It is built entirely on the MEAN (MongoDB, Express, Angular, Node.js) stack.

##Component Versions
MongoDB - v 3.2 <br>
ExpressJS - v 4.12.4 <br>
AngularJS - v 1.4.7 <br>
NodeJS - v 10.25 <br>

## Installation

<b>IMPORTANT</b>:  You can choose either the hosted or local methods for Mongo and Elasticsearch.  You can mix and match if you prefer.

Install node: https://nodejs.org/download/ (You can also install NodeJS using homebrew or any package manager.)

<b>Hosted Services</b>

There are several config files located in the config directory.  They contain connection strings to hosted instances of ElasticSearch and MongoDB.<br>
These can be used for testing, but the data is publicly available, so do not create users with sensitive passwords, etc. <br>

	Mongo Config - config/db_local.js
	ElasticSearch Config - config/elastic.js

Check both config files to make sure you have commented out the local connection string and use the hosted connection string. <br>

The app also uses a hosted media service for uploaders. Currently we aren't providing a hosted or local variation of this, but will be asap.<br>

<b>Local Services</b>

1. Install mongodb: https://www.mongodb.org/downloads#production <br>
	1.1  Start the Mongo service<br>
	1.2  Create a database named sub <pre> use sub </pre><br>
	1.3  Add user sub_test to the sub database.  Make sure the user has readWrite role on the DB and the PW matches the one in the connection string in config/db_local.js  (example below in help section) <br>
	1.4  Optionally you can import this data dump to your database: https://s3.amazonaws.com/wpentdev/coral/mongodump.zip<br>
		1.4.1 Import command will be: <pre> mongorestore --host 127.0.0.1 --port 27017 --db sub /location/of/download/dump/sub </pre>
	1.5  Check config/db_local.js to make sure you have commented out the hosted connection string and use the local connection string. <br>

2. Set up a local Elastic search instance.<br> Follow the instructions here: <br> https://www.elastic.co/guide/en/elasticsearch/guide/current/running-elasticsearch.html  <br>
	2.1  Check config/elastic.js to make sure you have commented out the hosted connection string and use the local connection string. <br>

3.  Navigate to your project folder via command line and run the following commands in order. 
<pre>
	$ npm install <br>
	$ bower install<br>
	$ grunt
</pre>

4. Now all of your dependencies, assets and services are installed and configured.  Run command <pre> $ node server.js </pre>  You will see a series of messages, starting with this "Action=DBConnect Message='Connected to QA MongoDB'"  That means you have successfully started your app and connected to your DB.

5. In your browser visit localhost:3000 the app will load up there.

## Help

<h4>MongoDB</h4>

This is a guide to MongoDB shell commands.

<b>Create a database</b>: Once you have installed your MongoDB server and entered into the shell, you can create a new database with the following: <br>
Example: <pre> use sub </pre>
This will create the database and save it as long as you add a document to it.

Create a collection: When in a database, to create a collection, you need to add a document by pointing to the desired name of the new collection and the collection will be created. <br>
Example:  <pre> db.myCollection.insert ({value: "my first document"}) </pre>

Create a user: You can create a user for any database when in the mongo shell. There are many different rolse and settings that can be created, but here is the basic way to create a user for a specific database. <br>
Example: <pre> use sub db.createUser( { user: "sub_test", pwd: "mysecretpassword", roles: [ "readWrite", "sub" ] } ) </pre>

<h4>ElasticSearch</h4>

<p>This is a guide to ElasticSearch queries.</p>

You can access elasticsearch at the endpoint in the config file and add :9200 at the end of the url in your browser. <br>

<b> Marvel Sense </b> <br>
There is a plugin called Marvel Sense installed that allows you to run queries in your browser against your cluster.

The plugin can be viewed here:  http://coralsearch.wpentdev.com:9200/_plugin/marvel/sense/

Queries to run are:

GET /_cluster/health
(gets cluster health)
<br>
GET /_cluster/stats
(gets cluster stats)
<br>
GET /_nodes/stats
(gets node stats)
<br>
GET /_cat/indices?v
(gets index stats)
<br>

<b> Big Desk </b> <br>
There is a plugin called Big Desk installed that allows you to visualize your cluster.

The plugin can be seen here:  http://coralsearch.wpentdev.com:9200/_plugin/bigdesk/#cluster
