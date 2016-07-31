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

function crawlResourceByType(type) {
  return marvel.getResource(type, { limit: 100 })
    .then(response => {
      const resources = response.data.results;
      const promises = [];

      resources.map(resource => {
        resource.marvelId = resource.id;
        delete resource.id;
        return promises.push(updateResource(type, resource));
      });

      return Promise.all(promises);
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

