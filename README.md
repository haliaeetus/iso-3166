# ISO 3166
ISO 3166 country & subdivision codes in JSON, CSV, & as a NodeJS module.

See https://en.wikipedia.org/wiki/ISO_3166

## Table of Contents
1. [Overview](#overview)
1. [Examples](#examples)
1. [Sources](#sources)

### Overview
This repository consists of three parts. For a detailed description, see http://www.iso.org/iso/country_codes_glossary.html

### Country Codes (ISO 3166-1 & ISO 3166-3)
#### Current
1. **ISO 3166-1 alpha-2** - a two-letter code that represents a country name, recommended as the general purpose code
1. **ISO 3166-1 alpha-3** - a three-letter code that represents a country name, which is usually more closely related to the country name
1. **ISO 3166-1 numeric** - a numeric code that represents a country name, independent of any type of script (Latin, Arabic, etc.)
1. **ISO 3166-3 alpha-4** - a four-letter code that represents a country name that is no longer in use

#### Reserved
Reserved codes have been reserved for a certain use and do not represent a country name in the standard.

### Subdivision Codes (ISO 3166-2)

1. ***TODO***


### Examples

#### Node Module
```
npm install node-iso-3166
```

This module is a work in progress. At present, it exposes two properties:
* `iso_3166_1`: contains the contents of [data/iso_3166-1.json](data/iso_3166-1.json)
* `iso_3166_2`: contains the contents of [data/iso_3166-2.json](data/iso_3166-2.json)
* `iso_3166_3`: contains the contents of [data/iso_3166-3.json](data/iso_3166-3.json)
***TODO***


### Sources

Data is sourced entirely from the following pages:
* https://en.wikipedia.org/wiki/ISO_3166-1
* https://en.wikipedia.org/wiki/ISO_3166-3
* http://www.iso.org/iso/home/standards/country_codes.htm
