//get and post requests
var format;

//display helloWorld
exports.helloWorld = function() {
  return function(req, res) {
    res.render('helloWorld.ejs', {
      });
    }
  };