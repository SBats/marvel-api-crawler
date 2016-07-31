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

function updateResource(type, resource) {
  return getDB()
    .then(db => {
      const resourceCollection = db.collection(type);
      return resourceCollection.find({ marvelId: resource.marvelId }).limit(1)
        .next()
        .then(result => {
          if (!result) {
            return resourceCollection.insertOne(resource);
          }
          const id = new ObjectId(result._id);
          return resourceCollection.updateOne({ _id: id }, resource);
        })
        .catch(err => err);
    })
    .catch(err => err);
}

function getCrawlingResults(type, options) {
  return marvel.getResource(type, options)
    .then(response => {
      const data = response.data;
      const promises = [];

      data.results.map(resource => {
        resource.marvelId = resource.id;
        delete resource.id;
        return promises.push(updateResource(type, resource));
      });

      return {
        total: data.total,
        promises,
      };
    })
    .catch(err => err);
}

function crawlResourceByType(type) {
  const loadPromises = [];
  let updatePromises = [];

  return getCrawlingResults(type, { limit: 100 })
    .then(results => {
      const loadingIterations = Math.ceil(results.total / 100);
      updatePromises = updatePromises.concat(results.promises);

      for (let i = 0; i < loadingIterations; i++) {
        loadPromises.push(
          getCrawlingResults(type, { limit: 100, offset: 100 * (i + 1) })
            .then(subResults => {
              updatePromises = updatePromises.concat(subResults.promises);
            })
            .catch(err => err)
        );
      }

      return Promise.all(loadPromises)
        .then(() => Promise.all(updatePromises))
        .catch(err => err);
    })
    .catch(err => err);
}

function crawlAPI() {
  const promises = [];
  const endpoints = config.endpoints;

  for (let i = 0; i < endpoints.length; i++) {
    promises.push(crawlResourceByType(endpoints[i]));
  }

  return Promise.all(promises);
}

crawlAPI()
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

