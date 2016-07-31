'use strict';

const fetch = require('node-fetch');
const md5 = require('md5');
const config = require('./config.json');

let instance = null;

module.exports.MarvelService = class MarvelService {

  constructor() {
    if (!instance) {
      this.privateKey = config.privateKey;
      this.publicKey = config.publicKey;
      this.baseUrl = 'http://gateway.marvel.com:80/v1/public/';
      instance = this;
    }

    return instance;
  }

  getSeries(options) {
    const ts = Date.now();
    const hash = md5(`${ts}${this.privateKey}${this.publicKey}`);
    const credentials = `ts=${ts}&apikey=${this.publicKey}&hash=${hash}`;
    const parameters = [];
    const optionsKeys = options ? Object.keys(options) : [];
    let url = '';
    for (let i = 0; i < optionsKeys.length; i++) {
      parameters.push(`${optionsKeys[i]}=${options[optionsKeys[i]]}`);
    }
    url = `${this.baseUrl}series?${credentials}`;
    if (optionsKeys.length > 0) url += `&${parameters.join('&')}`;
    console.log(url);
    return fetch(url)
      .then(res => res.json())
      .catch(err => err);
  }
};
