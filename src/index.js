'use strict';

const config = require('./config.json');
const MongoClient = require('mongodb').MongoClient;
const MarvelService = require('./marvel.js').MarvelService;
const ObjectId = require('mongodb').ObjectId;

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

function updateASeries(aSeries) {
  return getDB()
    .then(db => {
      const seriesCollection = db.collection('series');
      return seriesCollection.find({ marvelId: aSeries.marvelId }).limit(1)
        .next()
        .then(result => {
          if (!result) {
            return seriesCollection.insertOne(aSeries);
          }
          const id = new ObjectId(result._id);
          return seriesCollection.updateOne({ _id: id }, aSeries);
        })
        .catch(err => err);
    })
    .catch(err => err);
}

function crawlSeries() {
  return marvel.getResource('series', { limit: 100 })
    .then(seriesResponse => {
      const series = seriesResponse.data.results;
      const promises = [];

      series.map(aSeries => {
        aSeries.marvelId = aSeries.id;
        delete aSeries.id;
        return promises.push(updateASeries(aSeries));
      });

      return Promise.all(promises);
    })
    .catch(err => err);
}

crawlSeries()
  .then(() => {
    closeDB();
    console.log('updated successfuly database');
    process.exit();
  })
  .catch(err => {
    console.error(`Error while updating database: ${err}`);
    closeDB();
    process.exit();
  });

