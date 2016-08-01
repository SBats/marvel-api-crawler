'use strict';

import MarvelService from './marvel';
import DBManager from './database';

const config = require('./config.json');

class MarvelAPICrawler {
  marvel: MarvelService;
  dbManager: DBManager;

  constructor() {
    this.marvel = new MarvelService();
    this.dbManager = new DBManager();
  }

  start(): Promise<any> {
    return this.dbManager.connectDB(config.dbUrl)
      .then(() => {
        return this.crawlAPI()
          .then(() => {
            console.log('updated successfuly database');
            this.dbManager.logDBOperations();
            return this.dbManager.db.close();
          })
          .catch((err: Error) => {
            console.error(`Error while updating database: ${err}`);
            this.dbManager.logDBOperations();
            return this.dbManager.db.close();
          });
      })
      .catch(err => err);
  }

  crawlAPI(): Promise<any> {
    const promises: Promise<any>[] = [];
    const endpoints: string[] = config.endpoints;

    for (let i = 0; i < endpoints.length; i++) {
      promises.push(
        this.crawlResourceByType(endpoints[i])
          .then(resources => {
            console.log(`${resources.length} resources from ${endpoints[i]} to fetch`);
            return this.updateDb(endpoints[i], resources)
          })
          .catch(err => err)
      );
    }

    return Promise.all(promises)
      .then(res => res)
      .catch(err => err);
  }

  crawlResourceByType(type: string): Promise<any> {
    let data: any[] = [];
    return this.loadFirstResource(type)
      .then(response => {
        const loadingIterations = Math.ceil(response.total / 100);
        data = data.concat(response.results);
        if (loadingIterations > 1) {
          return this.loadFollowingResources(type, loadingIterations)
            .then(data => {
              data = data.concat(response.results);
              return data;
            })
            .catch(err => err);
        }
        return data;
      })
      .catch(err => err);
  }

  loadFirstResource(type: string): Promise<any> {
    return this.marvel.getResource(type, { limit: 100 })
      .then(response => response.data)
      .catch((err: Error) => err);
  }

  loadFollowingResources(type: string, iterations: number): Promise<any> {
    const promises: Promise<any>[] = [];
    const data: any[] = [];
    for (let i = 0; i < iterations; i++) {
      promises.push(
        this.marvel.getResource(type, { limit: 100, offset: 100 * (i + 1) })
          .then(response => data.push(response.data.results))
          .catch((err: Error) => err)
      );
    }

    return Promise.all(promises)
      .then(() => [].concat(...data))
      .catch((err: Error) => err);
  }

  updateDb(type: string, resources: any[]): Promise<any> {
    const promises: any[] = [];

    for (let i = 0; i < resources.length; i++) {
      var resource = resources[i];
      promises.push(this.updateOrInsert(type, resource));
    }

    return Promise.all(promises);
  }

  updateOrInsert(type: string, resource: any): Promise<any> {
    return this.dbManager.getResourceByMarvelId(type, resource)
      .then(response => {
        if (response === null) {
          return this.dbManager.createResource(type, resource);
        }
        return this.dbManager.updateResourceById(type, resource);
      })
      .catch(err => err);
  }

}

const crawler = new MarvelAPICrawler();
crawler.start()
  .then(() => process.exit())
  .catch(() => process.exit());