
/**
 * Module dependencies.
 */

import path from 'path';
import domain from 'domain';
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import session from 'express-session';
import methodOverride from 'method-override';
import favicon = from 'serve-favicon';
import errorhandler from 'errorhandler';
import helmet from 'helmet';
import consoleStamp from 'console-stamp';
import passport from 'passport';
import { configDB } from 'db';
import routes from 'routes';
import configAuth from 'auth';
import 'jobs';

/**
 * Instanciate a new express app and attach
 * common midlewares
 */

const app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs'); // set up ejs for templating
app.use(favicon(`${__dirname}/public/images/wp-favicon.ico`));

// Configure the database
configDB(app);

// Server middleware
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: 'keyboard cat',
  cookie:{maxAge:8 * 3600 * 1000},
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride());

app.engine('html', require('ejs').__express);

// development only
if ('development' == app.get('env')) {
  app.use(errorhandler())
}

app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  reportOnly: false,
  setAllHeaders: false,
  safari5: false
}));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication strategies
configAuth(app);

// Get routes from subrouters
app.use('/', routes);

// Handle top-level errors - TODO: log
const d = domain.create();
d.on('error', error => { });

// Patch the console adding time format
consoleStamp(console, '[yyyy-mm-dd HH:MM:ss.l]');

// Server listen at the desired port
app.listen(app.get('port'), () => {
  const msg = `Express server listening on port ${app.get('port')}`;
  console.log(`Action=StartUp Message="${msg}"`);
});
