const gulp = require('gulp');
const Liquid = require('liquid-node');
const es = require('event-stream');
// const changed = require('changed');
const frontmatter = require('gulp-front-matter');
const fs = require('fs');
const autoload = require('auto-load');
const path = require('path');

const engine = new Liquid.Engine();
engine.registerFileSystem(new Liquid.LocalFileSystem('./_includes'));


// load plugins
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

gulp.task('compile', () =>
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
            }).then((result) => {
                // compile page content with no namespace on the frontmatter
                engine.parseAndRender(result, file.meta).then((final) => {
                    file.contents = Buffer.from(final); // eslint-disable-line no-param-reassign
                    cb(null, file);
                }).catch((e) => {
                    console.log('err', e);
                });
            }).catch((e) => {
                console.log('catch', e);
            });
            return true;
        }))
        .pipe(gulp.dest('./_site/')));
