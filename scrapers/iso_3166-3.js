const jsdom = require('jsdom').jsdom;
const document = jsdom('<html></html>', {});
const window = document.defaultView;
const $ = require('jquery')(window);
const Promise = require("bluebird");
const rp = require('request-promise');
const request = require('request');
const fs = Promise.promisifyAll(require('fs-extra'));
const json2csv = require('json2csv');

const path = require('path');
const url = require('url');
const stringify = require('json-stable-stringify');
const _ = require('lodash');


const ISO_3166_3_URL = 'https://en.wikipedia.org/wiki/ISO_3166-3';
const OUTPUT_DIR = './data';

const getHTML = function(url, name, transform = $) {
  return function() {
    console.log(`Retrieving ${name} content.`)
    return rp({
        uri: url,
        transform
    }).then(data => {
        console.log(`Retrieved ${name} content.`);
        return data;
    });
  }
}



const nextAnywhere = function($elem, selector) {
  if(!$elem.length) {
    return null;
  }

  while(true) {
    const $nextCandidate = $elem.nextAll(selector).first();
    if($nextCandidate.length) {
      return $nextCandidate;
    }
    $elem = $elem.parent();
    if($elem.is('body')) {
      return null;
    }
  }

  return null;
}

const processISO_3166_3 = function(baseUrl) {
  return function($html) {
    $html.find('sup').remove();
    const $header = $html.find('#Current_codes');
    const $table = nextAnywhere($header, 'table');
    const $rows = $table.find('tbody').find('tr').slice(1);

    const result = $rows.toArray().map(row => {
      const $tds = $(row).children();
      const $link = $tds.eq(0).find('a');
      const name = $link.text();
      const officialName = $link.attr('title');
      const wikiEntry = url.resolve(baseUrl, $link.attr('href'));
      const formerCodes = $tds.eq(1).find('span').toArray().map((node) => {
        return node.innerHTML;
      });

      const [formerAlpha2, formerAlpha3, formerNumeric] = formerCodes;

      const code = $tds.eq(3).text();
      const period = $tds.eq(2).text();
      const notes = $tds.eq(5).text();

      return {
        code,
        period,
        officialName,
        name,
        wikiEntry,
        formerAlpha2,
        formerAlpha3,
        formerNumeric,
        notes
      }
    });

    const headers = [
      'code',
      'period',
      'officialName',
      'name',
      'wikiEntry',
      'formerAlpha2',
      'formerAlpha3',
      'formerNumeric',
      'notes'
    ];

    return {
      headers,
      data: result
    }
  }
};

const renderISO_3166_3_files = (filename, outputDir) => {
  return function({data, headers}) {

    const formats = [
      {ext: '.json', data: _.keyBy(data, 'code'), serializer: stringify},
      {ext: '.csv', data: {data, fields: headers}, serializer: json2csv},
    ];

    return Promise.map(formats, ({ext, data, serializer}) => {
      return fs.writeFileAsync(path.join(outputDir, `${filename}${ext}`), serializer(data));
    })
  }
};

const generateISO_3166_3 = function() {
  const dir = OUTPUT_DIR;
  return fs.ensureDirAsync(dir)
    .then(getHTML(ISO_3166_3_URL, 'ISO 3166-3'))
    .then(processISO_3166_3(ISO_3166_3_URL))
    .then(renderISO_3166_3_files('iso_3166-3', OUTPUT_DIR))
}

generateISO_3166_3();
