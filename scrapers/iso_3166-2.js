const jsdom = require('jsdom').jsdom;

const document = jsdom('<html></html>', {});
const window = document.defaultView;
const $ = require('jquery')(window);

const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs-extra'));
const _ = require('lodash');
const Nightmare = require('nightmare');
// const stringify = require('json-stable-stringify');
const path = require('path');

/* eslint-disable camelcase */
const ISO_3166_1 = require('../data/iso_3166-1.json');

const TMP_DIR = 'tmp/iso_3166-2';
const OUTPUT_DIR = './data/';

const downloadDynamicPage = function (urlFn, loadSelector, nameFn) {
  return code => {
    return new Promise((resolve, reject) => {
      const nightmare = Nightmare();// { show: true });
      nightmare
        .goto(urlFn(code))
        .wait(loadSelector)
        .evaluate(() => {
          return document.getElementsByTagName('body')[0].innerHTML;
        })
        .end()
        .then((html) => {
          const name = nameFn(html);
          console.log(`Saving ${code}:${name}`);
          resolve(fs.writeFileAsync(`${TMP_DIR}/${code}`, html));
        })
        .catch((error) => {
          console.error('Search failed:', error);
          reject();
        });
    });
  };
};

const downloadISO_3166_2_page = downloadDynamicPage(
  code => `https://www.iso.org/obp/ui/#iso:code:3166:${code}`,
  '.core-view-header',
  (html) => {
    return $(html).find('.core-view-field-value').eq(1).text();
  }
);

const codes = _.chain(ISO_3166_1).values().reject('unofficial').map('alpha2').value();

const subdivisionKeys = {
  category: 0,
  code: 1,
  name: 2,
  language: 3,
  // romanizationSystem: 4,
  parentSubdivision: 5
};

const languageKeys = {
  alpha2: 0,
  alpha3: 1,
  localShortName: 2
};

const summaryHeadersToKey = {
  'Alpha-2 code': 'alpha2',
  'Alpha-3 code': 'alpha3',
  'Numeric code': 'numeric',
  'Short name': 'shortNameUC',
  'Short name lower case': 'shortName',
  'Full name': 'fullName',
  Independent: 'independent',
  Status: 'status',
  'Territory name': 'territory',
  Remarks: 'remarks', // appears to always be empty
  'Remark part 1': 'remark1',
  'Remark part 2': 'remark2',
  'Remark part 3': 'remark3',
  'Status remark': 'statusRemark'
};

const summaryValueTransforms = {
  independent: value => value === 'Yes'
};

const basicElementParser = function ($elem) {
  return $elem.text().trim();
};

const parseElements = function ($elems, keys, parser = basicElementParser) {
  const result = {};
  _.each(keys, (index, key) => {
    result[key] = parser($elems.eq(index));
  });
  return result;
};

const renderISO_3166_2_files = (filename, outputDir) => {
  return function ({ data, headers }) {
    const stringify = data => { return JSON.stringify(data, null, 4); };

    const formats = [
      { ext: '-all.json', data: _.keyBy(data, 'summary.alpha2'), serializer: stringify },
      { ext: '-countries.json',
        data: _.reduce(data, (result, value) => {
          const countryCode = value.summary.alpha2;
          result[countryCode] = value.subdivisions;
          return result;
        }, {}),
        serializer: stringify },
      { ext: '.json',
        data: data.reduce((result, row) => {
          const { alpha2, alpha3 } = row.summary;
          const countryCode = { alpha2, alpha3 };
          _.each(row.subdivisions, subdiv => {
          // subdiv.country = countryCode;
            const { code } = subdiv;
            result[code] = subdiv;
          });
          return result;
        }, {}),
        serializer: stringify },
      //{ext: '.csv', data: {data, fields: headers}, serializer: json2csv},
    ];

    return Promise.map(formats, ({ ext, data, serializer }) => {
      return fs.writeFileAsync(path.join(outputDir, `${filename}${ext}`), serializer(data));
    });
  };
};

fs.ensureDirAsync(TMP_DIR)
  .then(() => {
    return fs.readdirAsync(TMP_DIR).then((files) => {
      const skipped = _.intersection(files, codes);
      skipped.map(file => {
        console.log(`Skipping ${file}`);
      });

      const codesToDownload = _.difference(codes, skipped);
      codesToDownload.map(code => {
        console.log(`Scraping ${code}`);
      });

      console.log(`Skipped ${skipped.length}; Scraping ${codesToDownload.length}`);
      return codesToDownload;
    });
  })
  .map(downloadISO_3166_2_page, { concurrency: 5 })
  .then(() => {
    return fs.readdirAsync(TMP_DIR).then((files) => {
      return _.intersection(files, codes).map(code => {
        return {
          code,
          file: `${TMP_DIR}/${code}`
        };
      });
    });
  })
  // .then(files => files.filter(({code}) => ['IL', 'NZ', 'SC', 'GB', 'PY'].indexOf(code) !== -1))
  // .then(files => files.slice(0, 1))
  .map(({ code, file }) => {
    return fs.readFileAsync(file, { encoding: 'utf-8' })
      .then(html => {
        const $html = $(html);

        // summary
        const $summary = $html.find('.core-view-summary').find('.core-view-line');
        const summary = $summary.toArray().map(el => {
          return parseElements($(el).children(), {
            header: 0,
            value: 1
          });
        })
        .reduce((obj, { header, value }) => {
          key = summaryHeadersToKey[header];
          if (!key) {
            console.log(`No key found for ${header} on ${code}`);
          } else if (value) {
            const transform = summaryValueTransforms[key];
            obj[key] = transform ? transform(value) : value;
          }
          return obj;
        }, {});

        // languages
        const $languages = $html.find('#country-additional-info').find('table').first().find('tbody tr');
        const languages = $languages.toArray().map(row => {
          const data = parseElements($(row).find('td'), languageKeys);

          const { alpha2, alpha3, localShortName } = data;

          if (!alpha2 || !alpha3) {
            console.log(`No language for ${alpha2}:${alpha3}:${localShortName}`);
          }

          return data;
        });

        // subdivisions
        const $subdivisions = $html.find('#country-subdivisions').find('table').find('tbody tr');
        const subdivisions = $subdivisions.toArray().map(row => {
          return parseElements($(row).find('td'), subdivisionKeys);
        });

        return {
          summary,
          languages,
          subdivisions
        };
      });
  }, { concurrency: 10 })
  .then(data => {
    // manual overrides
    // Western Sahara
    const EH = _.find(data, ['summary.alpha2', 'EH']);
    if (!EH) {
      return data;
    }
    const props = 'shortName shortNameUC fullName remark1 remark2 remark3'.split(' ');
    props.forEach(prop => {
      const value = EH.summary[prop];
      if (!value) {
        return;
      }
      EH.summary[prop] = value.replace('*', '').trim();
    });

    return data;
  })
  .then(data => {
    // remove stars from subdivision codes
    data.forEach(country => {
      country.subdivisions.forEach(subdiv => {
        subdiv.code = subdiv.code.replace(/\*/g, '');
      });
    });
    return data;
  })
  .then(data => {
    data.forEach(country => {
      country.languages = _.keyBy(country.languages, 'alpha3');
    });
    return data;
  })
  .then(data => {
    // replace alpha2 subdivision language codes with alpha3 codes
    const iso_639_1 = require('iso-639').iso_639_1;
    data.forEach(country => {
      // mapping of alpha2 codes (including empty string) to non-empty alpha3 codes
      // todo: extend full list (see https://www.iso.org/obp/ui/#iso:code:3166:ES)
      const alpha2ToAlpha3 = _.chain(country.languages).reduce((result, value) => {
        const { alpha2, alpha3 } = value;
        result[alpha2] = alpha3;
        return result;
      }, {}).value();

      country.subdivisions.forEach(subdiv => {
        const { language } = subdiv;
        subdiv.language = alpha2ToAlpha3[language] || (iso_639_1[language]['639-2']);
      });
    });
    return data;
  })
  .then(data => {
    // remove empty parent subdivisions
    data.forEach(country => {
      country.subdivisions.forEach(subdiv => {
        if (!subdiv.parentSubdivision) {
          delete subdiv.parentSubdivision;
        }
      });
    });
    return data;
  })
  .then(data => {
    // group subdivisions with objects keyed by language code where relevant
    data.forEach(country => {
      country.subdivisions = country.subdivisions.reduce((result, sub) => {
        const { code, parentSubdivision, category, language } = sub;
        if (!result[code]) {
          result[code] = {
            parentSubdivision,
            code,
            category
          };
        }
        delete sub.parentSubdivision;
        delete sub.category;
        delete sub.language;

        _.each(sub, (value, key) => {
          result[code][key] = result[code][key] || {};
          result[code][key][language] = value;
        });

        return result;
      }, {});
    });
    return data;
  })
  .then(data => {
    return { data, headers: [] };
  })
  .then(renderISO_3166_2_files('iso_3166-2', OUTPUT_DIR));
