# js-md5 0.8.3

Upstream: https://github.com/emn178/js-md5
Source: https://cdn.jsdelivr.net/npm/js-md5@0.8.3/src/md5.js
License: MIT; original header retained, full license in `LICENSE.txt`.

`md5.mjs` adds a local CommonJS export capture and ESM default export, and shadows
`process` / `require` to use the portable JavaScript implementation in Workers and
Node ESM. The upstream implementation is otherwise unchanged.

SHA-256 (`md5.mjs`):
`7756fa073976abce9702aaf125818165bd308b908bbf0b59941225dbe0b33147`

Used only for the Bilibili WBI API signature, not for password storage or security tokens.
