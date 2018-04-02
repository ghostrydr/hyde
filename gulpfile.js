const gulp = require('gulp');
const Liquid = require('liquid-node');
const es = require('event-stream');
// const changed = require('changed');
const frontmatter = require('gulp-front-matter');
const fs = require('fs');
const autoload = require('auto-load');
const path = require('path');
const yaml = require('js-yaml');
const winston = require('winston');

const engine = new Liquid.Engine();
engine.registerFileSystem(new Liquid.LocalFileSystem('./_includes'));


// load and parse _config.yml
let _config = null;
try {
    _config = yaml.safeLoad(fs.readFileSync(path.resolve(__dirname, '_config.yml'), 'utf8'));
} catch (e) {
    winston.log('error', '', e);
}

// try to autoload plugins
try {
    const plugins = autoload(path.resolve(__dirname, '_plugins'));
    Object.keys(plugins).forEach((key) => {
        if (typeof plugins[key] === 'object') {
            Object.keys(plugins[key]).forEach((alias) => {
                engine.registerTag(alias, plugins[key][alias]);
            });
        } else {
            engine.registerTag(key, plugins[key]);
        }
    });
} catch (e) {
    winston.log('error', '', e);
}

// move assets to _site
gulp.task('move-assets', () => {
    gulp.src(['css/**/*.css', 'js/**/*.js', 'images/**/*.*'], { base: './' })
        .pipe(gulp.dest('_site/'));
});

// compile templates
// https://medium.com/@chrisssycollins/compile-liquid-jekyll-front-matter-with-gulp-and-node-without-ruby-6feb6acccc3f
// https://gist.githubusercontent.com/chrisssycollins/e30d3540c46bfa52854f6bdd5fa3486b/raw/1bdbf57c1830bd23a0366f76b39271b799ee11f6/gulpfile.js
gulp.task('compile', ['move-assets'], () =>
    gulp.src(['_posts/**/*.html'])
        // only compile pages that have changed
        // .pipe(changed('./_site/', {
        //     extension: '.html',
        // }))
        // get the frontmatter, accessible via file.meta
        .pipe(frontmatter({
            property: 'meta',
        }))
        .pipe(es.map((file, cb) => {
            // if layout is defined in the frontmatter, if not use default.html
            let template = '';
            if (file.meta.layout) {
                template = String(fs.readFileSync(`./_layouts/${file.meta.layout}.html`));
            } else {
                template = String(fs.readFileSync('./_layouts/default.html'));
            }
            // run the main layout through node-liquid putting frontmatter in 'page' namespace.
            engine.parseAndRender(template, {
                page: file.meta,
                content: String(file.contents),
                site: _config,
            }).then((result) => {
                // compile page content with no namespace on the frontmatter
                engine.parseAndRender(result, file.meta).then((final) => {
                    file.contents = Buffer.from(final); // eslint-disable-line no-param-reassign
                    cb(null, file);
                }).catch((e) => {
                    winston.log('error', '', e);
                });
            }).catch((e) => {
                winston.log('error', '', e);
            });
            return true;
        }))
        .pipe(gulp.dest('./_site/')));
