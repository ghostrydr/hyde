// Target parity https://github.com/Anthony-Gaudino/jekyll-multiple-languages-plugin
const Liquid = require('liquid-node');
const yaml = require('js-yaml');
const I18n = require('i18n-2');
const path = require('path');

let i18n = null;

class translate extends Liquid.Tag {
    constructor(template, tagName, key) {
        super();
        i18n = new (I18n)({
            directory: path.resolve(__dirname, '..', '_i18n'),
            locales: ['en'],
            extension: '.yml',
            parse: data => yaml.safeLoad(data),
            dump: data => yaml.safeDump(data),
        });

        this.key = key.trim();
    }

    render() {
        const value = i18n.__(this.key);
        return value.toString();
    }
}

module.exports = {
    translate,
    t: translate,
};
