
/**
 * Module dependencies
 */

import Mongoose from 'mongoose';
import elasticConfig from 'config/elastic';

/**
 * Database connection
 */

let db;

// Fetch the configuration file based on the  NODE_ENV environment variable
const environments = ['DEV', 'QA', 'STAGE', 'PROD'];
const isLocal = -1 === environments.indexOf(process.env.NODE_ENV);
const env = isLocal ? 'QA' : process.env.NODE_ENV;
const dbPath = `config/db_${isLocal ? 'local' : env.toLowerCase()}`;
const { url, assetsBase, applicationBase } = require(dbPath);

// Set the elastic search prefix
elasticConfig.prefix = process.env.NODE_ENV === 'Local' ? 'dev' : env;

// Connect to the db
export const configDB = app => {
  db = Mongoose.createConnection(dbConfig.url);
  console.log("Action=DBConnect Message='Connected to "+ env +" MongoDB'");
  app.locals.environment = { assetsBase, applicationBase, deployTime: Date.now() };

  db.on('error', err => {
    // console.log("Error Message=Something went wrong with DB connection: " + err);
    if (err) {
      // couldn't connect
      // hack the driver to allow re-opening after initial network error
      db.readyState=0;
    }
  });
};

export default db;
