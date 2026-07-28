import { useEffect, useMemo, useRef, useState } from 'react'
import catalog from './data/catalog.json'
import {
  compareEntries,
  matchesQuery,
  parseEntry,
  parseQuery,
  type CatalogEntry,
  type Platform,
  type Product,
} from './catalog'
import './App.css'

type ProductFilter = 'all' | Product
type PlatformFilter = 'all' | Platform

const PAGE_SIZE = 30

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

const parsedEntries = (catalog.entries as CatalogEntry[])
  .map(parseEntry)
  .sort(compareEntries)

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
  const [englishOnly, setEnglishOnly] = useState(true)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filteredEntries = useMemo(() => {
    const terms = parseQuery(query)

    return parsedEntries.filter((entry) => {
      if (product !== 'all' && entry.product !== product) return false
      if (platform !== 'all' && entry.platform !== platform) return false
      if (englishOnly && !entry.isEnglish) return false
      return matchesQuery(entry, terms)
    })
  }, [englishOnly, platform, product, query])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [englishOnly, platform, product, query])

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
  const hasFilters = query || product !== 'all' || platform !== 'all' || !englishOnly

  const clearFilters = () => {
    setQuery('')
    setProduct('all')
    setPlatform('all')
    setEnglishOnly(true)
    searchRef.current?.focus()
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="FM Download home">
          <span className="brand-mark" aria-hidden="true">FM</span>
          <span>Download Index</span>
        </a>
        <a
          className="source-link"
          href={catalog.source}
          target="_blank"
          rel="noreferrer"
        >
          View source catalog <span aria-hidden="true">↗</span>
        </a>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="page-title">
          <div className="eyebrow"><span /> Claris software catalog</div>
          <h1 id="page-title">Find the right FileMaker download.</h1>
          <p>
            Search {parsedEntries.length.toLocaleString()} direct links from the
            Claris software catalog by version, platform, product, or catalog
            code. Results are sorted newest version first.
          </p>
        </section>

        <section className="search-panel" aria-label="Download search">
          <label className="search-box">
            <span className="search-icon" aria-hidden="true" />
            <span className="sr-only">Search downloads</span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try “pro 26 windows” or “server 26 ubuntu”"
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

            <div className="filter-group" aria-label="Filter by language">
              <span className="filter-label">Language</span>
              <div className="chips">
                <label className={englishOnly ? 'chip check active' : 'chip check'}>
                  <input
                    type="checkbox"
                    checked={englishOnly}
                    onChange={(event) => setEnglishOnly(event.target.checked)}
                  />
                  English only
                </label>
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
                <article className="result-card" key={`${entry.file}-${entry.url}`}>
                  <div className="result-primary">
                    <span className="product-name">{entry.productLabel}</span>
                    <h2>{entry.displayName}</h2>
                    <code>{entry.file} · {entry.filename}</code>
                  </div>
                  <dl className="result-meta">
                    <div>
                      <dt>Version</dt>
                      <dd>{entry.versionLabel}</dd>
                    </div>
                    <div>
                      <dt>Platform</dt>
                      <dd>{entry.platformLabel}</dd>
                    </div>
                    <div>
                      <dt>Language</dt>
                      <dd>{entry.language}</dd>
                    </div>
                  </dl>
                  <a
                    className="download-link"
                    href={entry.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open download for ${entry.file} in a new tab`}
                  >
                    Open download <span aria-hidden="true">↗</span>
                  </a>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span aria-hidden="true">⌕</span>
              <h2>No matching downloads</h2>
              <p>Try a different catalog code, version, product, or platform.</p>
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
