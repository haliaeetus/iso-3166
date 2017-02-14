const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs-extra'));
const json2csv = require('json2csv');
const stringify = require('json-stable-stringify');
const _ = require('lodash');
const scrapeUtil = require('scrape-util');

const OUTPUT_DIR = './data';
const FILE_PREFIX = 'iso_3166-1';
const INCLUDE_UNOFFICIAL = true;

const unofficial = require('../config/unofficial.json');

const FORMATS = (data) => [
  { ext: '.json', data, serializer: d => stringify(d, { space: 2 }) },
  { ext: '.min.json', data, serializer: stringify },
  { ext: '.csv',
    data: {
      data: _.values(data),
      fields: 'name officialName alpha2 alpha3 numeric wikiUrl'.split(' ')
    },
    serializer: json2csv },
];

const configs = [
  {
    id: 'wiki',
    url: 'https://en.wikipedia.org/wiki/ISO_3166-1',
    name: 'ISO 3166-1 Wiki',
    library: '$',
    transforms: [
      'init',
      'absolutifyUrls'
    ],
    parsers: [
      {
        id: 'iso_3166_1',
        name: 'ISO 3166-1',
        type: 'table',
        options: {
          rowParser: function parseRow(data) {
            const $link = data.link.find('a');
            delete data.link;

            data.name = $link.text();
            data.officialName = $link.attr('title');
            data.wikiUrl = $link.attr('href');
            return data;
          },
          selector: $html => {
            return $html.find('#Officially_assigned_code_elements').nextRelative('table');
          },
          parsers: {
            link: $el => $el
          },
          parseIndices: {
            link: 0,
            alpha2: 1,
            alpha3: 2,
            numeric: 3
          },
          key: 'alpha2' // returns object keyed accordingly, else null or undefined for an array
        }
      }
    ]
  }
];

// eslint-disable-next-line camelcase
function generateISO_3166_1() {
  return fs.ensureDirAsync(OUTPUT_DIR)
    .then(scrapeUtil.logger('Ensured output directory exists.'))
    .then(() => scrapeUtil.scrapePages(configs))
    .then(({ wiki }) => {
      return wiki.iso_3166_1;
    })
    .then(data => {
      if (INCLUDE_UNOFFICIAL) {
        unofficial.forEach((value, key) => {
          data[value.alpha2] = value;
        });
      }
      return data;
    })
    .then(scrapeUtil.renderFiles(FORMATS, FILE_PREFIX, OUTPUT_DIR))
    .then(scrapeUtil.logger('Rendered output files.'))
    .catch(err => console.error(err));
}

generateISO_3166_1();
