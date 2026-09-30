# jsdiff 8.0.3 (BSD-3-Clause)

Source: https://github.com/kpdecker/jsdiff/tree/v8.0.3

Pinned npm archive: https://registry.npmjs.org/diff/-/diff-8.0.3.tgz

Only `libesm/diff/base.js`, `libesm/diff/array.js` and `LICENSE` are copied, unchanged. No patch parser, editor, runtime CDN or npm installation is required. The local package.json enables Node's ESM tests.

SHA-256:

- base.js: faa81734df6ea7f8034efc5572ad1bbf19c50b300fdd183baf0d7813c5eec3b2
- array.js: 5bcc1320c7ee74e565421a556d81ed3fdd82ff2f366e6151beebac6b425f528f

The upstream release notes and license were reviewed on 2026-10-01. Version 8.0.3 includes patch parser security fixes; this tool only uses the Myers sequence comparison core. Grapheme segmentation is supplied by `Intl.Segmenter`, rather than English word tokenization.
