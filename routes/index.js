
/**
 * Module dependencies
 */

import { Router } from 'express';
import application from 'routes/aplication';
import submission from 'routes/submission';
import query from 'routes/query';

// Create a new Router
const app = Router();

// Mount inner routers
app.use('/', application);
app.use('/', submission);
app.use('/', query);

// Extra routes
app.get('/logout', (req, res) => req.session.destroy(err =>  {
  console.log('Action=logout Status=success');
  res.redirect('/login');
}));

// 404
app.use((req, res) => {
  res.status(404);

  // respond with html page
  if (req.accepts('html')) {
    return res.render('404', { url: req.url });
  }

  // respond with json
  if (req.accepts('json')) {
    return res.send({ error: 'Not found' });
  }

  res.type('txt').send('Not found');
});

// Expose router
export default app;
