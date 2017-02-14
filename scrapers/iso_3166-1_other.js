const jsdom = require('jsdom').jsdom;
const document = jsdom('<html></html>', {});
const window = document.defaultView;
const $ = require('jquery')(window);

const Promise = require("bluebird");
const fs = Promise.promisifyAll(require('fs-extra'));
const _ = require('lodash');
const Nightmare = require('nightmare');

const ISO_3166_1 = require('../data/1/1.json');
const TMP_DIR = 'tmp/iso_3166-2_other';

const CODE_URL = 'https://www.iso.org/obp/ui/#search/code/';

const navigateToOtherCodes = function(pageUrl, loadSelector) {
  const nightmare = Nightmare({show: true});
  nightmare.goto(pageUrl)
    .inject("js", "./node_modules/jquery/dist/jquery.min.js")
    .wait(loadSelector)
    .click('.v-customcomponent-code-type>div>div:not(.facet-header) .v-slot:not(.v-slot-selected)')
    .wait(function() {
      return !!$;
    })
    .evaluate(function() {
      console.log('hi')
    })
    .wait(function() {

    })
    .run();
}

navigateToOtherCodes(CODE_URL, '.core-view-header')

//
//
// const downloadDynamicPage = function(urlFn, loadSelector, nameFn){
//   return code => {
//     return new Promise((resolve, reject) => {
//       const nightmare = Nightmare();//{ show: true });
//       nightmare
//         .goto(urlFn(code))
//         .wait(loadSelector)
//         .evaluate(function () {
//           return document.getElementsByTagName('body')[0].innerHTML;
//         })
//         .end()
//         .then(function (html) {
//           const name = nameFn(html)
//           console.log(`Saving ${code}:${name}`);
//           resolve(fs.writeFileAsync(`${TMP_DIR}/${code}`, html));
//         })
//         .catch(function (error) {
//           console.error('Search failed:', error);
//           reject();
//         });
//     });
//   };
// };
//
// const downloadISO_3166_2_page = downloadDynamicPage(
//   code => `https://www.iso.org/obp/ui/#iso:code:3166:${code}`,
//   '.core-view-header',
//   (html) => {
//     return $(html).find('.core-view-field-value').eq(1).text();
//   }
// );
//
// const codes = Object.keys(ISO_3166_1);
//
// const subDivisionKeys = {
//   category: 0,
//   code: 1,
//   name: 2,
//   language: 3,
//   //romanizationSystem: 4,
//   parentSubDivision: 5
// };
//
// const languageKeys = {
//   alpha2: 0,
//   alpha3: 1,
//   localShortName: 2
// };
//
// const summaryHeadersToKey = {
//   'Alpha-2 code': 'alpha2',
//   'Alpha-3 code': 'alpha3',
//   'Numeric code': 'numeric',
//   'Short name': 'shortNameUC',
//   'Short name lower case': 'shortName',
//   'Full name': 'fullName',
//   'Independent': 'independent',
//   'Status': 'status',
//   'Territory name': 'territory',
//   'Remarks': 'remarks', // appears to always be empty
//   "Remark part 1": "remark1",
//   "Remark part 2": "remark2",
//   "Remark part 3": "remark3",
//   "Status remark": "statusRemark"
// };
//
// const summaryValueTransforms = {
//   'independent': value => value === 'Yes'
// }
//
// const basicElementParser = function($elem) {
//   return $elem.text().trim();
// }
//
// const parseElements = function($elems, keys, parser = basicElementParser) {
//   const result = {};
//   _.each(keys, (index, key) => {
//     result[key] = parser($elems.eq(index));
//   });
//   return result;
// }
//
// fs.ensureDirAsync(TMP_DIR)
//   .then(() => {
//     return fs.readdirAsync(TMP_DIR).then((files) => {
//       const skipped = _.intersection(files, codes);
//       skipped.map(file => {
//         console.log(`Skipping ${file}`);
//       })
//
//       const codesToDownload = _.difference(codes, skipped);
//       codesToDownload.map(code => {
//         console.log(`Scraping ${code}`)
//       });
//
//       console.log(`Skipped ${skipped.length}; Scraping ${codesToDownload.length}`);
//       return codesToDownload
//     })
//   })
//   .map(downloadISO_3166_2_page, {concurrency: 5})
//   .then(() => {
//     return fs.readdirAsync(TMP_DIR).then((files) => {
//       return _.intersection(files, codes).map(code => {
//         return {
//           code,
//           file: `${TMP_DIR}/${code}`
//         }
//       });
//     });
//   })
//   //.then(files => files.filter(({code}) => ['SC', 'AQ', 'GB', 'PY'].indexOf(code) !== -1))
//   //.then(files => files.slice(0, 1))
//   .map(({code, file}) => {
//     return fs.readFileAsync(file, {encoding: 'utf-8'})
//       .then(html => {
//         const $html = $(html);
//
//         // summary
//         const $summary = $html.find('.core-view-summary').find('.core-view-line');
//         const summary = $summary.toArray().map(el => {
//           return parseElements($(el).children(), {
//             header: 0,
//             value: 1
//           });
//         })
//         .reduce((obj, {header, value}) => {
//           key = summaryHeadersToKey[header];
//           if(!key) {
//             console.log(`No key found for ${header} on ${code}`);
//           } else if (value) {
//             const transform = summaryValueTransforms[key];
//             obj[key] = transform ? transform(value) : value;
//           }
//           return obj;
//         }, {});
//
//         // languages
//         const $languages = $html.find('#country-additional-info').find('table').first().find('tbody tr');
//         const languages = $languages.toArray().map(row => {
//           const data = parseElements($(row).find('td'), languageKeys)
//
//           const {alpha2, alpha3, localShortName} = data;
//
//           if(!alpha2||!alpha3) {
//             console.log(`No language for ${alpha2}:${alpha3}:${localShortName}`)
//           }
//
//           return data;
//         });
//
//         // subdivisions
//         const $subDivisions = $html.find('#country-subdivisions').find('table').find('tbody tr');
//         const subDivisions = $subDivisions.toArray().map(row => {
//           return parseElements($(row).find('td'), subDivisionKeys);
//         });
//
//         return {
//           summary,
//           languages,
//           subDivisions
//         }
//       })
//   }, {concurrency: 10})
//   .then(data => {
//     // manual overrides
//     // Western Sahara
//     const EH = _.find(data, ['summary.alpha2', 'EH']);
//     const props = 'shortName shortNameUC fullName remark1 remark2 remark3'.split(' ');
//     props.forEach(prop => {
//       const value = EH.summary[prop];
//       if(!value) {
//         return;
//       }
//       EH.summary[prop] = value.replace('*', '').trim();
//     });
//
//     return data;
//   })
//   .then(data => {
//     data = _.chain(data)
//     // Review Status remarks
//     //data = data.map("summary.statusRemark").uniq();
//
//     // Check for any names with asterisks
//     // data = data.filter(c => {
//     //   const props = 'shortName shortNameUC fullName'.split(' ');
//     //   return props.some(prop => {
//     //     return c.summary[prop] && c.summary[prop].indexOf('*') !== -1;
//     //   });
//     // });
//
//     // Territory name
//     data = data.map('summary.territory').uniq();
//
//     // Status
//     //data = data.map('summary.status').uniq();
//
//     data = data.value();
//
//     console.log(JSON.stringify(data, null, 4));
//     console.log(data.length);
//     //console.log(JSON.stringify(data, null, 4))
//   });
