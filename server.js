 /******************************************************
 * PLEASE DO NOT EDIT THIS FILE
 * the verification process may break
 * ***************************************************/

'use strict';

var url = require('url');

var mongodb = require('mongodb');

var MongoClient = mongodb.MongoClient;

var mongoUrl = process.env.MONGO_URL;

var fs = require('fs');
var express = require('express');
var app = express();

if (!process.env.DISABLE_XORIGIN) {
  app.use(function(req, res, next) {
    var allowedOrigins = ['https://narrow-plane.gomix.me', 'https://www.freecodecamp.com'];
    var origin = req.headers.origin || '*';
    if(!process.env.XORIG_RESTRICT || allowedOrigins.indexOf(origin) > -1){
         console.log(origin);
         res.setHeader('Access-Control-Allow-Origin', origin);
         res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    }
    next();
  });
}

app.use('/public', express.static(process.cwd() + '/public'));

app.route('/_api/package.json')
  .get(function(req, res, next) {
    console.log('requested');
    fs.readFile(__dirname + '/package.json', function(err, data) {
      if(err) return next(err);
      res.type('txt').send(data.toString());
    });
  });
  
app.route('/')
    .get(function(req, res) {
		  res.sendFile(process.cwd() + '/views/index.html');
    });

app.use(function(req, res, next){
  if (req.path.startsWith('/new/')) {
    var longURL = req.path.substring(5);
    var response = {};
    try {
      var parsedURL = url.parse(longURL);
      if (parsedURL.protocol !== 'http:' && parsedURL.protocol !== 'https:') {
        throw new Error('Protocol should be http');
      }
      MongoClient.connect(mongoUrl, function (err, db) {
        if (err) {
          throw err;
        }
        var urls = db.collection('urls');
        urls.count(function(err, count) {
          if (err) {
            throw err;
          }
          urls.insertOne({
            id: count,
            url: longURL
          }, function(err, result) {
            if (err) {
              throw err;
            }
            response.longURL = longURL;
            response.shortURL = 'https://cclerger-url-shortener-microservice.glitch.me/' + count;
            db.close();
            res.send(JSON.stringify(response));
          });
        });
      });
    } catch (e) {
      response.error = e.message;
      res.send(JSON.stringify(response));
    }
  } else {
    var id = parseInt(req.path.substring(1));
    if (isNaN(id)) {
      res.send('Invalid link, the id should be a number');
    }
    MongoClient.connect(mongoUrl, function (err, db) {
      if (err) {
        db.close();
        res.send(err.message);
      }
      var urls = db.collection('urls');
      urls.findOne({
        id: id
      }, function(err, doc) {
        if (err) {
          db.close();
          res.send(err.message);
        }
        if (doc !== null) {
          var longURL = doc.url;
          db.close();
          res.redirect(longURL);
        } else {
          db.close();
          res.send('Invalid link, no such id');
        }
        
      });
    });
  }
  /*res.status(404);
  res.type('txt').send('Not found');*/
});

// Error Middleware
app.use(function(err, req, res, next) {
  if(err) {
    res.status(err.status || 500)
      .type('txt')
      .send(err.message || 'SERVER ERROR');
  }  
})

app.listen(process.env.PORT, function () {
  console.log('Node.js listening ...');
});

