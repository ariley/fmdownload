import { mkdir, writeFile } from 'node:fs/promises'

const sourceUrl = 'https://www.claris.com/redirects/ss.txt'
const outputPath = new URL('../src/data/catalog.json', import.meta.url)

const response = await fetch(sourceUrl)

if (!response.ok) {
  throw new Error(`Catalog request failed with ${response.status}`)
}

const payload = await response.json()

if (!Array.isArray(payload.listitem)) {
  throw new Error('Catalog response is missing listitem[]')
}

const entries = payload.listitem.filter(
  (item) => typeof item?.file === 'string' && typeof item?.url === 'string',
)

if (entries.length < 1) {
  throw new Error('Catalog did not contain any valid entries')
}

await mkdir(new URL('../src/data/', import.meta.url), { recursive: true })
await writeFile(
  outputPath,
  `${JSON.stringify(
    {
      source: sourceUrl,
      retrievedAt: new Date().toISOString(),
      entries,
    },
    null,
    2,
  )}\n`,
)

console.log(`Saved ${entries.length} catalog entries to src/data/catalog.json`)
