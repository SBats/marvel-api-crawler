'use strict';

const fetch = require('node-fetch');
const md5 = require('md5');
const config = require('./config.json');

export default class MarvelService {

  static instance: MarvelService;
  privateKey: string = config.privateKey;
  publicKey: string = config.publicKey;
  baseUrl: string = 'http://gateway.marvel.com:80/v1/public/';

  constructor() {
    if (!MarvelService.instance) {
      MarvelService.instance = this;
    }

    return MarvelService.instance;
  }

  getResource(resource: string, options: any): Promise<any> {
    const ts: number = Date.now();
    const hash: string = md5(`${ts}${this.privateKey}${this.publicKey}`);
    const credentials: string = `ts=${ts}&apikey=${this.publicKey}&hash=${hash}`;
    const parameters:string[]  = [];
    const optionsKeys: string[] = options ? Object.keys(options) : [];
    let url: string = '';
    for (let i: number = 0; i < optionsKeys.length; i++) {
      parameters.push(`${optionsKeys[i]}=${options[optionsKeys[i]]}`);
    }
    url = `${this.baseUrl}${resource}?${credentials}`;
    if (optionsKeys.length > 0) url += `&${parameters.join('&')}`;

    return fetch(url)
      .then((res: any) => res.json())
      .catch((err: any) => err);
  }
};
