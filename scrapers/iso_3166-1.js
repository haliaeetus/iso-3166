const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs-extra'));
const json2csv = require('json2csv');
const stringify = require('json-stable-stringify');
const _ = require('lodash');
const scrapeUtil = require('scrape-util');
const url = require('url');

const URL = 'https://en.wikipedia.org/wiki/ISO_3166-1';
const OUTPUT_DIR = './data';
const FILE_PREFIX = 'iso_3166-1';
const INCLUDE_UNOFFICIAL = true;

const unofficial = require('../config/unofficial.json');

const HEADERS = 'name officialName alpha2 alpha3 numeric wikiEntry'.split(' ');

const FORMATS = (data, headers) => [
  { ext: '.json', data: _.keyBy(data, 'alpha2'), serializer: stringify },
  { ext: '.csv', data: { data, fields: headers }, serializer: json2csv },
];

function parseRow(data) {
  /* eslint-disable no-param-reassign */
  const $link = data.link.find('a');
  delete data.link;

  data.name = $link.text();
  data.officialName = $link.attr('title');
  data.wikiEntry = url.resolve(URL, $link.attr('href'));
  return data;
  /* eslint-enable no-param-reassign */
}

// eslint-disable-next-line camelcase
function processHTML(headers) {
  const sentinelId = '#Officially_assigned_code_elements';
  const parseIndices = {
    link: 0,
    alpha2: 1,
    alpha3: 2,
    numeric: 3
  };

  const parsers = {
    link: $elem => $elem
  };

  return ($html) => {
    const result = scrapeUtil.parseTableAfterSentinel($html, sentinelId, parseIndices, parsers);

    return {
      headers,
      data: result.map(parseRow)
    };
  };
}

// eslint-disable-next-line camelcase
function generateISO_3166_1(includeUnofficial = INCLUDE_UNOFFICIAL) {
  return fs.ensureDirAsync(OUTPUT_DIR)
    .then(scrapeUtil.logger('Ensured output directory exists.'))
    .then(scrapeUtil.getHTML(URL))
    .then(scrapeUtil.logger('Retrieved HTML.'))
    .then(processHTML(HEADERS))
    .then(files => {
      if (includeUnofficial) {
        // eslint-disable-next-line no-param-reassign
        files.data = files.data.concat(unofficial);
      }
      return files;
    })
    .then(scrapeUtil.logger('Processed HTML.'))
    .then(scrapeUtil.renderFiles(FORMATS, FILE_PREFIX, OUTPUT_DIR))
    .then(scrapeUtil.logger('Rendered output files.'))
    .catch(err => console.error(err));
}

generateISO_3166_1();
