export type CatalogEntry = {
  file: string
  url: string
}

export type Product = 'pro' | 'advanced' | 'server' | 'other'
export type Platform = 'mac' | 'windows' | 'linux' | 'other'

export type ParsedEntry = {
  file: string
  url: string
  filename: string
  product: Product
  productLabel: string
  platform: Platform
  platformLabel: string
  version: number | null
  versionLabel: string
  fileVersion: number[]
  fileVersionText: string
  language: string
  isEnglish: boolean
  searchText: string
}

const PRODUCT_LABELS: Record<Product, string> = {
  pro: 'FileMaker Pro',
  advanced: 'FileMaker Pro Advanced',
  server: 'FileMaker Server',
  other: 'Claris tool',
}

const PLATFORM_LABELS: Record<Platform, string> = {
  mac: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
  other: 'Other',
}

// Extra words folded into each entry's search text so natural queries match.
const PRODUCT_ALIASES: Record<Product, string> = {
  pro: 'fmp',
  advanced: 'fmpa fmp',
  server: 'fms',
  other: 'claris',
}

const PLATFORM_ALIASES: Record<Platform, string> = {
  mac: 'macos osx apple',
  windows: 'windows pc',
  linux: 'linux',
  other: '',
}

// Language/region suffixes on catalog codes, e.g. PRO26MACDE. The bare code
// (PRO26MAC) is the English build. Longer suffixes must come first so CAFR
// is not misread as FR.
const LANGUAGE_SUFFIXES: Array<[string, string]> = [
  ['CAFR', 'French (Canada)'],
  ['CHFR', 'French (Switzerland)'],
  ['BR', 'Portuguese (Brazil)'],
  ['CN', 'Chinese (Simplified)'],
  ['DE', 'German'],
  ['ES', 'Spanish'],
  ['FR', 'French'],
  ['IT', 'Italian'],
  ['JA', 'Japanese'],
  ['KR', 'Korean'],
  ['NL', 'Dutch'],
  ['SE', 'Swedish'],
  ['AU', 'English (Australia)'],
  ['CA', 'English (Canada)'],
  ['DK', 'English (Denmark)'],
  ['FI', 'English (Finland)'],
  ['IE', 'English (Ireland)'],
  ['LA', 'English (Latin America)'],
  ['NO', 'English (Norway)'],
  ['UK', 'English (UK)'],
]

export function productFor(code: string): Product {
  if (code.startsWith('PROADV')) return 'advanced'
  if (code.startsWith('PRO')) return 'pro'
  if (code.startsWith('SRV')) return 'server'
  return 'other'
}

export function versionFor(code: string): number | null {
  const digits = code.replace(/^(PROADV|PRO|SRV)/, '').match(/^\d+/)?.[0]
  if (!digits) return null
  // Four digits ending in 64 mark an x64 build: PRO2664WIN is Pro 26, 64-bit.
  if (digits.length === 4 && digits.endsWith('64')) {
    return Number(digits.slice(0, 2))
  }
  return Number(digits)
}

export function platformFor(entry: CatalogEntry): Platform {
  const haystack = `${entry.file} ${entry.url}`.toUpperCase()
  if (haystack.includes('MAC') || haystack.endsWith('.DMG')) return 'mac'
  if (haystack.includes('WIN') || haystack.endsWith('.EXE')) return 'windows'
  if (
    haystack.includes('LINUX') ||
    haystack.includes('UBUNTU') ||
    haystack.includes('RHEL')
  ) {
    return 'linux'
  }
  return 'other'
}

export function languageFor(code: string): { language: string; isEnglish: boolean } {
  for (const [suffix, language] of LANGUAGE_SUFFIXES) {
    if (!code.endsWith(suffix)) continue
    // Only treat the tail as a language code when the rest still ends in a
    // platform token, so codes like MACCON or WIN32CON are not misparsed.
    if (/(WIN|MAC|LINUX|CON|\d)$/.test(code.slice(0, -suffix.length))) {
      return { language, isEnglish: false }
    }
  }
  return { language: 'English', isEnglish: true }
}

export function filenameFor(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').pop() || url)
  } catch {
    return url
  }
}

export function parseEntry(entry: CatalogEntry): ParsedEntry {
  const product = productFor(entry.file)
  const platform = platformFor(entry)
  const version = versionFor(entry.file)
  const filename = filenameFor(entry.url)
  const fileVersionText = filename.match(/\d+(?:\.\d+)+/)?.[0] ?? ''
  const fileVersion = fileVersionText ? fileVersionText.split('.').map(Number) : []
  const { language, isEnglish } = languageFor(entry.file)

  const searchText = [
    entry.file,
    entry.url,
    filename,
    PRODUCT_LABELS[product],
    PRODUCT_ALIASES[product],
    PLATFORM_LABELS[platform],
    PLATFORM_ALIASES[platform],
    language,
    fileVersionText,
  ]
    .join(' ')
    .toLowerCase()

  return {
    file: entry.file,
    url: entry.url,
    filename,
    product,
    productLabel: PRODUCT_LABELS[product],
    platform,
    platformLabel: PLATFORM_LABELS[platform],
    version,
    versionLabel: version === null ? '—' : String(version),
    fileVersion,
    fileVersionText,
    language,
    isEnglish,
    searchText,
  }
}

// Words that carry no meaning for matching ("fmp 26 for windows").
const STOPWORDS = new Set([
  'a', 'an', 'and', 'by', 'download', 'downloads', 'file', 'filemaker', 'fm',
  'for', 'from', 'in', 'installer', 'of', 'on', 'or', 'release', 'the', 'to',
  'ver', 'version', 'with',
])

const SYNONYMS: Record<string, string> = {
  fmp: 'filemaker pro',
  fmpro: 'filemaker pro',
  fmpa: 'advanced',
  fms: 'filemaker server',
  fmserver: 'filemaker server',
  pc: 'windows',
  win: 'windows',
  osx: 'macos',
  macintosh: 'mac',
}

export function parseQuery(query: string): string[] {
  return query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((term) => term.replace(/^v(?=\d)/, ''))
    .map((term) => SYNONYMS[term] ?? term)
    .filter((term) => term && !STOPWORDS.has(term))
    // Unrecognized fm-shorthand ("fmo") should not zero out the results —
    // every entry here is a FileMaker download anyway.
    .filter((term) => !/^fm[a-z]{1,3}$/.test(term))
}

function termMatches(entry: ParsedEntry, term: string): boolean {
  // One- or two-digit numbers mean the product version, so "26" finds
  // Pro 26 without also matching the 22-x64 code PRO2264WIN.
  if (/^\d{1,2}$/.test(term)) {
    return entry.version === Number(term)
  }
  // Dotted numbers match the build version from the filename.
  if (/^\d+(\.\d+)+$/.test(term)) {
    return entry.fileVersionText.startsWith(term)
  }
  return entry.searchText.includes(term)
}

export function matchesQuery(entry: ParsedEntry, terms: string[]): boolean {
  return terms.every((term) => termMatches(entry, term))
}

const PRODUCT_ORDER: Record<Product, number> = { pro: 0, advanced: 1, server: 2, other: 3 }
const PLATFORM_ORDER: Record<Platform, number> = { mac: 0, windows: 1, linux: 2, other: 3 }

// Newest version first; ties broken by build version, product, platform,
// then English before localized builds.
export function compareEntries(a: ParsedEntry, b: ParsedEntry): number {
  const byVersion = (b.version ?? -1) - (a.version ?? -1)
  if (byVersion) return byVersion

  const depth = Math.max(a.fileVersion.length, b.fileVersion.length)
  for (let i = 0; i < depth; i++) {
    const byBuild = (b.fileVersion[i] ?? 0) - (a.fileVersion[i] ?? 0)
    if (byBuild) return byBuild
  }

  const byProduct = PRODUCT_ORDER[a.product] - PRODUCT_ORDER[b.product]
  if (byProduct) return byProduct

  const byPlatform = PLATFORM_ORDER[a.platform] - PLATFORM_ORDER[b.platform]
  if (byPlatform) return byPlatform

  if (a.isEnglish !== b.isEnglish) return a.isEnglish ? -1 : 1
  return a.file.localeCompare(b.file)
}
