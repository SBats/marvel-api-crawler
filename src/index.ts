'use strict';

import MarvelService from './marvel';

const config = require('./config.json');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;

const dbUrl: string = config.dbUrl;
let dbInstace: any = null;
const marvel: MarvelService = new MarvelService();

function connectDB(url: string): Promise<any> {
  return MongoClient.connect(url)
    .then((datab: IDBDatabase) => {
      dbInstace = datab;
      return dbInstace;
    })
    .catch((err: Error) => `Couldn't connect to databse: ${err}`);
}

function closeDB(): Promise<any> {
  if (dbInstace) {
    return dbInstace.close()
      .then(() => {
        dbInstace = null;
      })
      .catch((err: Error) => `Couldn't close databse connection: ${err}`);
  }

  return Promise.reject('Database connection already closed');
}

function getDB(): Promise<any> {
  if (dbInstace) {
    return Promise.resolve(dbInstace);
  }

  return connectDB(dbUrl);
}

function updateResource(type: string, resource: any): Promise<any> {
  return getDB()
    .then(db => {
      const resourceCollection = db.collection(type);
      return resourceCollection.find({ marvelId: resource.marvelId }).limit(1)
        .next()
        .then((result: any) => {
          if (!result) {
            return resourceCollection.insertOne(resource);
          }
          const id = new ObjectId(result._id);
          return resourceCollection.updateOne({ _id: id }, resource);
        })
        .catch((err: Error) => err);
    })
    .catch(err => err);
}

function getCrawlingResults(type: string, options: any): Promise<any> {
  return marvel.getResource(type, options)
    .then(response => {
      const data = response.data;
      const promises: Promise<any>[] = [];

      data.results.map((resource: any) => {
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

function crawlResourceByType(type: string): Promise<any> {
  const loadPromises: Promise<any>[] = [];
  let updatePromises: Promise<any>[] = [];

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
            .catch((err: Error) => err)
        );
      }

      return Promise.all(loadPromises)
        .then(() => Promise.all(updatePromises))
        .catch((err: Error) => err);
    })
    .catch((err: Error) => err);
}

function crawlAPI(): Promise<any> {
  const promises: Promise<any>[] = [];
  const endpoints: string[] = config.endpoints;

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
  .catch((err: Error) => {
    console.error(`Error while updating database: ${err}`);
    closeDB();
    process.exit();
  });

