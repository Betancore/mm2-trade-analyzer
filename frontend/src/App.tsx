import { useEffect, useRef, useState } from 'react';
import { ArrowRightLeft, Check, LoaderCircle, Plus, Search, Trash2, TriangleAlert } from 'lucide-react';

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  rare: string;
  chroma: boolean;
  year: number | null;
  subtype: string;
  image: string;
}

interface SourceResult<T> {
  status: 'pending' | 'ok' | 'unavailable' | 'permission_required';
  error?: string;
  source?: string;
  sourceUrl?: string;
  observedAt?: string;
  value?: T;
  price?: number;
  currency?: 'USD';
}

interface CalculatedItem extends CatalogItem {
  supreme: SourceResult<number>;
  starpets: SourceResult<number>;
}

interface CalculationResponseItem {
  id: string;
  name: string;
  supreme: SourceResult<number>;
  starpets: SourceResult<number>;
}

const API_URL = (import.meta.env.VITE_API_URL || 'https://mm2-trade-analyzer.onrender.com').replace(/\/$/, '');
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function total(items: CalculatedItem[], key: 'supreme' | 'starpets'): number | null {
  if (!items.length) return 0;
  const values = items.map(item => key === 'supreme' ? item.supreme.value : item.starpets.price);
  if (values.some(value => typeof value !== 'number' || !Number.isFinite(value))) return null;
  return (values as number[]).reduce((sum, value) => sum + value, 0);
}

function formatPrice(value: number | null): string {
  return value === null ? 'Unavailable' : usd.format(value);
}

function formatDifference(value: number | null, label: string): string {
  if (value === null) return 'Unavailable';
  if (value === 0) return 'Even';
  return `${value > 0 ? 'You give' : 'You get'} ${label === 'USD' ? usd.format(Math.abs(value)) : Math.abs(value).toLocaleString()}`;
}

export default function App() {
  const [myOffer, setMyOffer] = useState<CalculatedItem[]>([]);
  const [theirOffer, setTheirOffer] = useState<CalculatedItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CatalogItem[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [calculationError, setCalculationError] = useState('');
  const [fetchedAt, setFetchedAt] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchQuery.trim()) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError('');
      try {
        const response = await fetch(`${API_URL}/api/items?query=${encodeURIComponent(searchQuery.trim())}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Live item search failed.');
        setSearchResults(data);
      } catch (error) {
        if (!controller.signal.aborted) {
          setSearchResults([]);
          setSearchError(error instanceof Error ? error.message : 'Live item search failed.');
        }
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setIsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addItem = (item: CatalogItem, side: 'my' | 'their') => {
    const pending: CalculatedItem = {
      ...item,
      supreme: { status: 'pending' },
      starpets: { status: 'pending' }
    };
    const invalidate = (offer: CalculatedItem[]) => offer.map(item => ({ ...item, supreme: { status: 'pending' as const }, starpets: { status: 'pending' as const } }));
    if (side === 'my') setMyOffer(current => invalidate([...current, pending]));
    else setMyOffer(invalidate);
    if (side === 'their') setTheirOffer(current => invalidate([...current, pending]));
    else setTheirOffer(invalidate);
    setSearchQuery('');
    setIsDropdownOpen(false);
    setCalculationError('');
    setFetchedAt('');
  };

  const removeItem = (id: string, side: 'my' | 'their', index: number) => {
    const invalidate = (offer: CalculatedItem[]) => offer.map(item => ({
      ...item,
      supreme: { status: 'pending' as const },
      starpets: { status: 'pending' as const }
    }));
    if (side === 'my') setMyOffer(current => invalidate(current.filter((item, itemIndex) => !(item.id === id && itemIndex === index))));
    else setTheirOffer(current => invalidate(current.filter((item, itemIndex) => !(item.id === id && itemIndex === index))));
    if (side === 'my') setTheirOffer(invalidate);
    else setMyOffer(invalidate);
    setCalculationError('');
    setFetchedAt('');
  };

  const calculateLiveValues = async () => {
    const trade = [...myOffer, ...theirOffer];
    if (!trade.length) return;
    setIsCalculating(true);
    setCalculationError('');

    try {
      const response = await fetch(`${API_URL}/api/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: trade.map(({ id, name }) => ({ id, name })) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Live calculation failed.');

      const results = data.items as CalculationResponseItem[];
      const byId = new Map<string, CalculationResponseItem>(results.map(result => [result.id, result]));
      const update = (offer: CalculatedItem[]) => offer.map(item => {
        const result = byId.get(item.id);
        return result ? { ...item, supreme: result.supreme, starpets: result.starpets } : item;
      });
      setMyOffer(update);
      setTheirOffer(update);
      setFetchedAt(data.fetchedAt || new Date().toISOString());

      const errors = results.flatMap(item => [item.supreme, item.starpets])
        .filter(source => source.status !== 'ok')
        .map(source => source.error)
        .filter((message, index, all): message is string => Boolean(message) && all.indexOf(message) === index);
      if (errors.length) setCalculationError(errors.join(' '));
    } catch (error) {
      setCalculationError(error instanceof Error ? error.message : 'Live calculation failed.');
      setFetchedAt('');
    } finally {
      setIsCalculating(false);
    }
  };

  const myValue = total(myOffer, 'supreme');
  const theirValue = total(theirOffer, 'supreme');
  const myPrice = total(myOffer, 'starpets');
  const theirPrice = total(theirOffer, 'starpets');
  const valueDifference = myValue === null || theirValue === null ? null : myValue - theirValue;
  const priceDifference = myPrice === null || theirPrice === null ? null : myPrice - theirPrice;
  const hasTrade = myOffer.length + theirOffer.length > 0;
  const sourceLabel = (source: SourceResult<number>, formatter: (value: number) => string) => {
    if (source.status === 'pending') return 'Not calculated';
    if (source.status === 'permission_required') return 'Authorization required';
    if (source.status !== 'ok' || typeof source.value !== 'number' && typeof source.price !== 'number') return 'Unavailable';
    const value = source.value ?? source.price;
    return typeof value === 'number' && Number.isFinite(value) ? formatter(value) : 'Unavailable';
  };

  const renderOffer = (offer: CalculatedItem[], side: 'my' | 'their') => (
    <div className={`bg-slate-900/60 backdrop-blur-md rounded-3xl p-5 md:p-6 border ${side === 'my' ? 'border-blue-900/60' : 'border-red-900/60'} flex flex-col min-h-[430px]`}>
      <h2 className={`text-2xl font-black mb-5 ${side === 'my' ? 'text-blue-400' : 'text-red-400'}`}>
        <span className="mr-2">●</span>{side === 'my' ? 'My Offer' : 'Their Offer'}
      </h2>
      <div className="bg-slate-950/80 rounded-2xl p-4 md:p-5 mb-5 border border-slate-800 space-y-3">
        <div className="flex justify-between items-center gap-4">
          <span className="text-slate-400 font-medium">Supreme Value</span>
          <span className="text-2xl md:text-3xl font-black text-amber-400">{hasTrade ? ((side === 'my' ? myValue : theirValue) === null ? (fetchedAt ? 'Unavailable' : 'Calculate first') : (side === 'my' ? myValue : theirValue)?.toLocaleString()) : '—'}</span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="text-slate-400 font-medium">Current StarPets listings</span>
          <span className="text-xl md:text-2xl font-bold text-emerald-400">{hasTrade ? ((side === 'my' ? myPrice : theirPrice) === null ? (fetchedAt ? 'Unavailable' : 'Calculate first') : formatPrice(side === 'my' ? myPrice : theirPrice)) : '—'}</span>
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {offer.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-slate-500 border-2 border-dashed border-slate-700/50 rounded-2xl">Add items using search</div>
        ) : offer.map((item, index) => (
          <div key={`${item.id}-${index}`} className="bg-slate-800/90 rounded-2xl p-3 flex items-center gap-3 border border-slate-700/60">
            <img src={item.image} alt="" className="w-12 h-12 rounded-xl bg-slate-950 object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-100 truncate">{item.name}</h3>
              <p className="text-xs text-slate-400 mt-1">
                Supreme: {sourceLabel(item.supreme, value => value.toLocaleString())}
                <span className="mx-1">·</span>
                StarPets: {sourceLabel(item.starpets, value => usd.format(value))}
              </p>
              {(item.supreme.sourceUrl || item.starpets.sourceUrl) && <div className="mt-1 flex gap-3 text-[11px]">{item.supreme.sourceUrl && <a href={item.supreme.sourceUrl} target="_blank" rel="noreferrer" className="text-slate-500 underline">Supreme source</a>}{item.starpets.sourceUrl && <a href={item.starpets.sourceUrl} target="_blank" rel="noreferrer" className="text-slate-500 underline">StarPets listing</a>}</div>}
            </div>
            <button onClick={() => removeItem(item.id, side, index)} aria-label={`Remove ${item.name}`} className="p-2 text-slate-500 hover:text-red-400 rounded-lg shrink-0">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="mb-9 text-center space-y-3">
          <div className="inline-flex items-center p-3 bg-slate-900 rounded-2xl border border-slate-800">
            <ArrowRightLeft className="text-amber-400 w-8 h-8 mr-3" />
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500">MM2 Trade Analyzer</h1>
          </div>
          <p className="text-slate-400">Current USD listings from StarPets. Supreme Values integration is pending data authorization.</p>
        </header>

        <div className="relative w-full max-w-2xl mx-auto mb-8 z-50" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-4 top-4 text-slate-400" size={22} />
            <input
              type="search"
              placeholder="Search current StarPets listings..."
              aria-label="Search current StarPets listings"
              className="w-full bg-slate-900 text-white rounded-2xl pl-12 pr-5 py-4 text-lg border-2 border-slate-800 focus:outline-none focus:border-amber-500"
              value={searchQuery}
              onChange={event => {
                const query = event.target.value;
                setSearchQuery(query);
                setSearchResults([]);
                setSearchError('');
                if (!query.trim()) setIsSearching(false);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
            />
          </div>
          {isDropdownOpen && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
              {isSearching ? (
                <div className="p-5 flex items-center justify-center gap-2 text-slate-400"><LoaderCircle className="animate-spin" size={18} />Searching the live StarPets catalog…</div>
              ) : searchError ? (
                <div className="p-5 text-center text-amber-300">{searchError}</div>
              ) : searchResults.length === 0 ? (
                <div className="p-5 text-center text-slate-400">No current StarPets listings match “{searchQuery}”.</div>
              ) : (
                <div className="max-h-96 overflow-y-auto p-2">
                  {searchResults.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-xl">
                      <img src={item.image} alt="" className="w-12 h-12 rounded-lg bg-slate-950 object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold truncate">{item.name}</h3>
                        <p className="text-xs text-slate-400 mt-1">{item.chroma ? 'Chroma' : item.rare} {item.subtype}{item.year ? ` · ${item.year}` : ''}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => addItem(item, 'my')} className="px-3 py-2 bg-blue-600/20 text-blue-300 border border-blue-500/40 rounded-lg text-sm font-semibold hover:bg-blue-600 hover:text-white"><Plus size={14} className="inline" /> Mine</button>
                        <button onClick={() => addItem(item, 'their')} className="px-3 py-2 bg-red-600/20 text-red-300 border border-red-500/40 rounded-lg text-sm font-semibold hover:bg-red-600 hover:text-white"><Plus size={14} className="inline" /> Theirs</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{renderOffer(myOffer, 'my')}{renderOffer(theirOffer, 'their')}</div>

        <div className="mt-7 flex flex-col items-center gap-3">
          <button
            onClick={calculateLiveValues}
            disabled={isCalculating || (!myOffer.length && !theirOffer.length)}
            className="px-7 py-4 rounded-2xl font-black text-lg bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
          >
            {isCalculating ? <><LoaderCircle className="inline mr-2 animate-spin" size={20} />Fetching current source data…</> : 'Calculate Live Trade'}
          </button>
          {fetchedAt && <p className="text-xs text-slate-500">Source requests completed {new Date(fetchedAt).toLocaleString()}.</p>}
          {calculationError && <div role="status" className="max-w-2xl flex gap-2 items-start text-sm text-amber-200 bg-amber-950/40 border border-amber-800/70 rounded-xl px-4 py-3"><TriangleAlert size={18} className="shrink-0 mt-0.5" />{calculationError}</div>}
        </div>

        <section className="mt-7 bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-700">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 -mt-6 md:-mt-8 mb-6 rounded-full" />
          <h2 className="text-2xl font-black text-center mb-6">Trade Difference</h2>
          <div className="flex flex-col sm:flex-row justify-center gap-4 md:gap-8">
            <div className="text-center bg-slate-950/70 p-5 rounded-2xl border border-slate-800 min-w-56">
              <p className="text-slate-400 mb-2">Supreme value difference</p>
              <p className="text-2xl font-black text-amber-300">{hasTrade ? formatDifference(valueDifference, 'value') : 'Add items to compare'}</p>
            </div>
            <div className="text-center bg-slate-950/70 p-5 rounded-2xl border border-slate-800 min-w-56">
              <p className="text-slate-400 mb-2">StarPets USD difference</p>
              <p className="text-2xl font-black text-emerald-300">{hasTrade ? formatDifference(priceDifference, 'USD') : 'Add items to compare'}</p>
            </div>
          </div>
          {hasTrade && <p className="mt-5 text-center text-xs text-slate-500 flex justify-center items-center gap-1"><Check size={14} /> Totals appear only when every item in that comparison has a verified live source result.</p>}
        </section>
      </div>
    </main>
  );
}
