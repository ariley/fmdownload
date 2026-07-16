# FM Download Index

A fast, searchable interface for the public Claris software download catalog.
Search by catalog code, product, version, platform, filename, or URL, then open
the original Claris-hosted download in a new tab.

## Development

```bash
npm install
npm run sync:catalog
npm run dev
```

The catalog snapshot lives in `src/data/catalog.json`. Refresh it at any time
with `npm run sync:catalog`.

## Production

```bash
npm run build
npm start
```

The production server respects Railway's `PORT` environment variable.

## Data source

[Claris software catalog](https://www.claris.com/redirects/ss.txt)

This project is an independent index and is not affiliated with Claris.
