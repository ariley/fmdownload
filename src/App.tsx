import { useEffect, useMemo, useRef, useState } from 'react'
import catalog from './data/catalog.json'
import './App.css'

type CatalogEntry = {
  file: string
  url: string
}

type IndexedCatalogEntry = CatalogEntry & {
  catalogIndex: number
}

type ProductFilter = 'all' | 'pro' | 'advanced' | 'server' | 'other'
type PlatformFilter = 'all' | 'mac' | 'windows' | 'linux' | 'other'
type LanguageFilter =
  | 'all'
  | 'english'
  | 'french'
  | 'german'
  | 'spanish'
  | 'italian'
  | 'japanese'
  | 'dutch'
  | 'swedish'
  | 'chinese'
  | 'portuguese'
  | 'korean'

const PAGE_SIZE = 30
const entries: IndexedCatalogEntry[] = (catalog.entries as CatalogEntry[]).map(
  (entry, catalogIndex) => ({ ...entry, catalogIndex }),
)

const productOptions: Array<{ value: ProductFilter; label: string }> = [
  { value: 'all', label: 'All products' },
  { value: 'pro', label: 'FileMaker Pro' },
  { value: 'advanced', label: 'Pro Advanced' },
  { value: 'server', label: 'FileMaker Server' },
  { value: 'other', label: 'Other tools' },
]

const platformOptions: Array<{ value: PlatformFilter; label: string }> = [
  { value: 'all', label: 'All platforms' },
  { value: 'mac', label: 'macOS' },
  { value: 'windows', label: 'Windows' },
  { value: 'linux', label: 'Linux' },
  { value: 'other', label: 'Other' },
]

const languageOptions: Array<{ value: LanguageFilter; label: string }> = [
  { value: 'all', label: 'All languages' },
  { value: 'english', label: 'English' },
  { value: 'french', label: 'French' },
  { value: 'german', label: 'German' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'italian', label: 'Italian' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'dutch', label: 'Dutch' },
  { value: 'swedish', label: 'Swedish' },
  { value: 'chinese', label: 'Simplified Chinese' },
  { value: 'portuguese', label: 'Brazilian Portuguese' },
  { value: 'korean', label: 'Korean' },
]

const languageSuffixes: Array<{
  codes: string[]
  language: Exclude<LanguageFilter, 'all'>
}> = [
  { codes: ['BR'], language: 'portuguese' },
  { codes: ['CN'], language: 'chinese' },
  { codes: ['DE'], language: 'german' },
  { codes: ['ES', 'LA'], language: 'spanish' },
  { codes: ['FR'], language: 'french' },
  { codes: ['IT'], language: 'italian' },
  { codes: ['JA'], language: 'japanese' },
  { codes: ['NL'], language: 'dutch' },
  { codes: ['SE'], language: 'swedish' },
  { codes: ['KR'], language: 'korean' },
]

const languageLabels: Record<Exclude<LanguageFilter, 'all'>, string> = {
  english: 'English',
  french: 'French',
  german: 'German',
  spanish: 'Spanish',
  italian: 'Italian',
  japanese: 'Japanese',
  dutch: 'Dutch',
  swedish: 'Swedish',
  chinese: 'Simplified Chinese',
  portuguese: 'Brazilian Portuguese',
  korean: 'Korean',
}

const languageSearchTerms: Record<
  string,
  Exclude<LanguageFilter, 'all'>
> = {
  en: 'english',
  eng: 'english',
  english: 'english',
  fr: 'french',
  french: 'french',
  de: 'german',
  german: 'german',
  es: 'spanish',
  spanish: 'spanish',
  it: 'italian',
  italian: 'italian',
  ja: 'japanese',
  jp: 'japanese',
  japanese: 'japanese',
  nl: 'dutch',
  dutch: 'dutch',
  sv: 'swedish',
  se: 'swedish',
  swedish: 'swedish',
  zh: 'chinese',
  cn: 'chinese',
  chinese: 'chinese',
  pt: 'portuguese',
  br: 'portuguese',
  portuguese: 'portuguese',
  ko: 'korean',
  kr: 'korean',
  korean: 'korean',
}

const platformSearchTerms: Record<
  string,
  Exclude<PlatformFilter, 'all'>
> = {
  mac: 'mac',
  macos: 'mac',
  osx: 'mac',
  win: 'windows',
  windows: 'windows',
  linux: 'linux',
}

function productFor(code: string): Exclude<ProductFilter, 'all'> {
  if (code.startsWith('PROADV')) return 'advanced'
  if (code.startsWith('PRO')) return 'pro'
  if (code.startsWith('SRV')) return 'server'
  return 'other'
}

function productLabel(code: string) {
  const labels = {
    pro: 'FileMaker Pro',
    advanced: 'FileMaker Pro Advanced',
    server: 'FileMaker Server',
    other: 'Claris tool',
  }
  return labels[productFor(code)]
}

function platformFor(entry: CatalogEntry): Exclude<PlatformFilter, 'all'> {
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

function platformLabel(entry: CatalogEntry) {
  const labels = {
    mac: 'macOS',
    windows: 'Windows',
    linux: 'Linux',
    other: 'Other',
  }
  return labels[platformFor(entry)]
}

function languageFor(code: string): Exclude<LanguageFilter, 'all'> {
  if (code.endsWith('CAFR') || code.endsWith('CHFR')) return 'french'

  return (
    languageSuffixes.find(({ codes }) =>
      codes.some((suffix) => code.endsWith(suffix)),
    )?.language ?? 'english'
  )
}

function languageLabel(code: string) {
  return languageLabels[languageFor(code)]
}

function matchesSearchTerm(entry: CatalogEntry, term: string, searchText: string) {
  if (/^\d+$/.test(term)) return versionFor(entry.file) === term

  const language = languageSearchTerms[term]
  if (language) return languageFor(entry.file) === language

  const platform = platformSearchTerms[term]
  if (platform) return platformFor(entry) === platform

  if (term === 'ubuntu' || term === 'rhel') {
    return `${entry.file} ${entry.url}`.toLowerCase().includes(term)
  }

  if (term === 'server') return productFor(entry.file) === 'server'
  if (term === 'advanced') return productFor(entry.file) === 'advanced'

  return searchText.includes(term)
}

function versionFor(code: string) {
  const withoutPrefix = code.replace(/^(PROADV|PRO|SRV)/, '')
  return withoutPrefix.match(/^\d+/)?.[0] ?? '—'
}

function filenameFor(url: string) {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').pop() || url)
  } catch {
    return url
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function App() {
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [product, setProduct] = useState<ProductFilter>('all')
  const [platform, setPlatform] = useState<PlatformFilter>('all')
  const [language, setLanguage] = useState<LanguageFilter>('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filteredEntries = useMemo(() => {
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)

    return entries.filter((entry) => {
      if (product !== 'all' && productFor(entry.file) !== product) return false
      if (platform !== 'all' && platformFor(entry) !== platform) return false
      if (language !== 'all' && languageFor(entry.file) !== language) return false

      const searchText = [
        entry.file,
        entry.url,
        filenameFor(entry.url),
        productLabel(entry.file),
        platformLabel(entry),
        languageLabel(entry.file),
        versionFor(entry.file),
      ]
        .join(' ')
        .toLowerCase()

      return terms.every((term) => matchesSearchTerm(entry, term, searchText))
    })
  }, [language, platform, product, query])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [language, platform, product, query])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  const visibleEntries = filteredEntries.slice(0, visibleCount)
  const hasFilters =
    query || product !== 'all' || platform !== 'all' || language !== 'all'

  const clearFilters = () => {
    setQuery('')
    setProduct('all')
    setPlatform('all')
    setLanguage('all')
    searchRef.current?.focus()
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="FM Download home">
          <span className="brand-mark" aria-hidden="true">FM</span>
          <span>Download Index</span>
        </a>
      </header>

      <main id="top">
        <h1 className="sr-only">FM Download Index</h1>

        <section className="search-panel" aria-label="Download search">
          <label className="search-box">
            <span className="search-icon" aria-hidden="true" />
            <span className="sr-only">Search downloads</span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try “Server 26 Ubuntu” or “PRO19MAC”"
              autoComplete="off"
            />
            <kbd>⌘ K</kbd>
          </label>

          <div className="filter-groups">
            <div className="filter-group" aria-label="Filter by product">
              <span className="filter-label">Product</span>
              <div className="chips">
                {productOptions.map((option) => (
                  <button
                    type="button"
                    className={product === option.value ? 'chip active' : 'chip'}
                    aria-pressed={product === option.value}
                    onClick={() => setProduct(option.value)}
                    key={option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group" aria-label="Filter by platform">
              <span className="filter-label">Platform</span>
              <div className="chips">
                {platformOptions.map((option) => (
                  <button
                    type="button"
                    className={platform === option.value ? 'chip active' : 'chip'}
                    aria-pressed={platform === option.value}
                    onClick={() => setPlatform(option.value)}
                    key={option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="filter-group language-filter"
              aria-label="Filter by language"
            >
              <span className="filter-label">Language</span>
              <div className="chips">
                {languageOptions.map((option) => (
                  <button
                    type="button"
                    className={language === option.value ? 'chip active' : 'chip'}
                    aria-pressed={language === option.value}
                    onClick={() => setLanguage(option.value)}
                    key={option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="results" aria-live="polite" aria-busy="false">
          <div className="results-heading">
            <div>
              <span className="status-dot" aria-hidden="true" />
              <strong>{filteredEntries.length.toLocaleString()}</strong>{' '}
              {filteredEntries.length === 1 ? 'download' : 'downloads'}
            </div>
            {hasFilters && (
              <button type="button" className="clear-button" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>

          {visibleEntries.length > 0 ? (
            <div className="result-list">
              {visibleEntries.map((entry) => (
                <article className="result-card" key={entry.catalogIndex}>
                  <div className="result-primary">
                    <span className="product-name">{productLabel(entry.file)}</span>
                    <h2>{filenameFor(entry.url)}</h2>
                    <code>{entry.file}</code>
                  </div>
                  <dl className="result-meta">
                    <div>
                      <dt>Version</dt>
                      <dd>{versionFor(entry.file)}</dd>
                    </div>
                    <div>
                      <dt>Platform</dt>
                      <dd>{platformLabel(entry)}</dd>
                    </div>
                    <div>
                      <dt>Language</dt>
                      <dd>{languageLabel(entry.file)}</dd>
                    </div>
                  </dl>
                  <a
                    className="download-link"
                    href={entry.url}
                    aria-label={`Download ${entry.file}`}
                  >
                    Download <span aria-hidden="true">↓</span>
                  </a>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span aria-hidden="true">⌕</span>
              <h2>No matching downloads</h2>
              <p>
                Try a different catalog code, version, product, platform, or
                language.
              </p>
              <button type="button" onClick={clearFilters}>Reset search</button>
            </div>
          )}

          {visibleCount < filteredEntries.length && (
            <button
              type="button"
              className="load-more"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            >
              Show {Math.min(PAGE_SIZE, filteredEntries.length - visibleCount)} more
            </button>
          )}
        </section>
      </main>

      <footer>
        <div>
          <span className="live-indicator" aria-hidden="true" />
          Catalog snapshot from {formatDate(catalog.retrievedAt)}
        </div>
        <p>Links open files hosted by Claris. This index is not affiliated with Claris.</p>
      </footer>
    </div>
  )
}

export default App
