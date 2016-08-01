'use strict'

const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const ObjectId = mongodb.ObjectId;

export default class DBManager {

  db: any = null;
  operations: any = {};

  connectDB(url: string): Promise<any> {
    return MongoClient.connect(url)
      .then((datab: IDBDatabase) => {
        this.db = datab;
        console.log('Connected to database');
        return this.db;
      })
      .catch((err: Error) => `Couldn't connect to databse: ${err}`);
  }

  closeDB(): Promise<any> {
    if (this.db) {
      return this.db.close()
        .then(() => {
          this.db = null;
          console.log('Close database connection');
          return true;
        })
        .catch((err: Error) => `Couldn't close databse connection: ${err}`);
    }

    return Promise.reject('Database connection already closed');
  }

  getResourceById(collectionName:string, resource: any): Promise<any> {
    const resourceCollection = this.db.collection(collectionName);
    const id = new ObjectId(resource._id);
    this.updateOperations('read', collectionName);
    return resourceCollection.find({ marvelId: id }).limit(1).next();
  }

  getResourceByMarvelId(collectionName:string, resource: any): Promise<any> {
    const resourceCollection = this.db.collection(collectionName);
    this.updateOperations('read', collectionName);
    return resourceCollection.find({ marvelId: resource.marvelId }).limit(1).next();
  }

  updateResourceById(collectionName: string, resource: any): Promise<any> {
    const resourceCollection = this.db.collection(collectionName);
    const id = new ObjectId(resource._id);
    this.updateOperations('update', collectionName);
    return resourceCollection.updateOne({ _id: id }, resource);
  }

  createResource(collectionName: string, resource: any): Promise<any> {
    const resourceCollection = this.db.collection(collectionName);
    if (resource.id) {
      resource.marvelId = resource.id;
      delete resource.id;
    }
    this.updateOperations('create', collectionName);
    return resourceCollection.insertOne(resource);
  }

  updateOperations(action: string, collectionName: string): void {
    if (!this.operations[collectionName]) {
      this.operations[collectionName] = {};
    }
    if (!this.operations[collectionName][action]) {
      this.operations[collectionName][action] = 0;
    }
    [action]
    this.operations[collectionName][action]++;
  }

  logDBOperations(): void {
    console.log(this.operations);
  }
}