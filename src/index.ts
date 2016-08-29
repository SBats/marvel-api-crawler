'use strict';

import MarvelService from './marvel';
import KintoManager from './kinto';

const config = require('./config.json');

class MarvelAPICrawler {
  marvel: MarvelService;
  kintoManager: KintoManager;

  constructor() {
    this.marvel = new MarvelService();
    this.kintoManager = new KintoManager(config.dbUrl, config.bucketName, config.userSecret);
  }

  start(): Promise<any> {
    console.log(`
      --------------------------
      Start Crawler
      --------------------------
    `);
    return this.kintoManager.createBucket()
      .then(() => {
        return this.crawlAPI();
      })
      .then(() => {
        console.log('updated successfuly database');
      })
      .catch((err: Error) => {
        console.error(`Error while running script: ${err}`);
      });
  }

  crawlAPI(): Promise<any> {
    const promises: Promise<any>[] = [];
    const endpoints: string[] = config.endpoints;

    console.log(`
      --------------------------
      Crawling API
      --------------------------
    `);

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
    console.log(`
      --------------------------
      Crawling ressource ${type}
      --------------------------
    `);
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
    console.log(`
      --------------------------
      Update ${type} collection
      --------------------------
    `);

    return this.kintoManager.createCollection(type)
      .then(() => {
        for (let i = 0; i < resources.length; i++) {
          var resource = Object.assign({}, resources[i]);
          resource.id = `marvel-${type}-${resource.id}`;
          promises.push(this.kintoManager.createRecord(type, resource));
        }

        return Promise.all(promises);
      })
      .catch((err: Error) => {
        console.error(err);
      });
  }

}

const crawler = new MarvelAPICrawler();
crawler.start()
  .then(() => process.exit())
  .catch(() => process.exit());