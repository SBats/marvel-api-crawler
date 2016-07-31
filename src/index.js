'use strict';

const config = require('./config.json');
const MongoClient = require('mongodb').MongoClient;
const MarvelService = require('./marvel.js').MarvelService;
// const ObjectId = require('mongodb').ObjectId;

const dbUrl = config.dbUrl;
let dbInstace = null;
const marvel = new MarvelService();

function connectDB(url) {
  return MongoClient.connect(url)
    .then(datab => {
      dbInstace = datab;
      return dbInstace;
    })
    .catch(err => `Couldn't connect to databse: ${err}`);
}

function closeDB() {
  if (dbInstace) {
    return dbInstace.close()
      .then(() => {
        dbInstace = null;
      })
      .catch(err => `Couldn't close databse connection: ${err}`);
  }

  return Promise.reject('Database connection already closed');
}

function getDB() {
  if (dbInstace) {
    return Promise.resolve(dbInstace);
  }

  return connectDB(dbUrl);
}

function crawlSeries() {
  return getDB()
    .then((db) => {
      const seriesCollection = db.collection('series');
      return marvel.getSeries({})
        .then(series => series)
        .catch(err => err);
    })
    .catch(err => err);
}

crawlSeries()
  .then(series => {
    console.log(series);
    closeDB();
  })
  .catch(err => console.error(err));

