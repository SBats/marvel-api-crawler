'use strict';

const base64 = require('base-64');
const fetch = require('node-fetch');

export default class KintoManager {
  dbUrl: string = null;
  bucketName: string = null;
  userSecret: string = null;
  commonHeader: any = {};

  constructor(dbUrl: string, bucketName: string, userSecret: string) {
    this.dbUrl = dbUrl;
    this.bucketName = bucketName;
    this.userSecret = base64.encode(`token:${userSecret}`);
    this.commonHeader = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Basic ${this.userSecret}`
    };
  };

  checkStatus(response: any) {
    if (response.status >= 200 && response.status < 300) {
      return response
    } else {
      var error = new Error(response.statusText)
      error.response = response
      throw error
    }
  }

  parseJSON(response: any) {
    return response.json()
  }

  parseResponse(res: any): Promise<any> {
    console.log(res.headers);
    if (res.ok) {
      return Promise.resolve(res.json());
    }
    return Promise.reject(res.statusText);
  }

  createBucket(): Promise<any> {
    const url = `${this.dbUrl}/buckets/`;
    const body = {
      data: {
        id: this.bucketName
      }
    };
    console.log(`
      --------------------------
      Create bucket ${this.bucketName}
      --------------------------
    `);
    return fetch(url, {
      method: 'POST',
      headers: this.commonHeader,
      body: JSON.stringify(body)
    })
    .then(this.checkStatus)
    .then(this.parseJSON);
  }

  deleteBucket(): Promise<any> {
    const url = `${this.dbUrl}/buckets/${this.bucketName}`;
    console.log(`
      --------------------------
      Delete bucket ${this.bucketName}
      --------------------------
    `);
    return fetch(url, {
      method: 'DELETE',
      headers: this.commonHeader
    })
    .then(this.checkStatus)
    .then(this.parseJSON);
  }

  createCollection(collectionName: string): Promise<any> {
    const url = `${this.dbUrl}/buckets/${this.bucketName}/collections/`;
    const body = {
      data: {
        id: collectionName
      }
    };
    console.log(`
      --------------------------
      Create ${collectionName} collection
      --------------------------
    `);
    return fetch(url, {
      method: 'POST',
      headers: this.commonHeader,
      body: JSON.stringify(body)
    })
    .then(this.checkStatus)
    .then(this.parseJSON);
  }

  createRecord(collectionName: string, record: any[]): any {
    const url = `${this.dbUrl}/buckets/${this.bucketName}/collections/${collectionName}/records`;
    const body = {
      data: record
    };
    console.log(`
      --------------------------
      Create record in ${collectionName} collection
      --------------------------
    `);
    return fetch(url, {
      method: 'POST',
      headers: this.commonHeader,
      body: JSON.stringify(body)
    })
    .then(this.checkStatus)
    .then(this.parseJSON);
  }



}