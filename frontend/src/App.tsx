import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Trash2, ArrowRightLeft } from 'lucide-react';

interface Item {
  id: string;
  name: string;
  category: string;
  supremeValue: number;
  starpetsPrice: number;
  image: string;
}

export default function App() {
  const [myOffer, setMyOffer] = useState<Item[]>([]);
  const [theirOffer, setTheirOffer] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchItems = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      try {
        const response = await fetch(`https://mm2-trade-analyzer.onrender.com/api/items?query=${searchQuery}`);
        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        console.error("Failed to fetch items:", error);
      }
    };
    
    const timeoutId = setTimeout(() => {
      fetchItems();
    }, 250);
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addItem = (item: Item, side: 'my' | 'their') => {
    if (side === 'my') {
      setMyOffer([...myOffer, item]);
    } else {
      setTheirOffer([...theirOffer, item]);
    }
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  const removeItem = (id: string, side: 'my' | 'their') => {
    if (side === 'my') {
      setMyOffer(myOffer.filter(item => item.id !== id));
    } else {
      setTheirOffer(theirOffer.filter(item => item.id !== id));
    }
  };

  const calculateLivePrices = async () => {
    setIsCalculating(true);
    const itemNames = [...new Set([...myOffer, ...theirOffer].map(i => i.name))];
    
    if (itemNames.length === 0) {
      setIsCalculating(false);
      return;
    }

    try {
      const response = await fetch('https://mm2-trade-analyzer.onrender.com/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemNames })
      });
      const livePrices = await response.json();
      
      // Update offers with exact live prices
      setMyOffer(prev => prev.map(item => ({
        ...item,
        starpetsPrice: livePrices[item.name] ?? item.starpetsPrice
      })));
      
      setTheirOffer(prev => prev.map(item => ({
        ...item,
        starpetsPrice: livePrices[item.name] ?? item.starpetsPrice
      })));
      
    } catch (error) {
      console.error("Failed to fetch live prices:", error);
    }
    
    setIsCalculating(false);
  };

  const calculateTotal = (offer: Item[]) => {
    return offer.reduce(
      (totals, item) => {
        totals.supreme += item.supremeValue;
        totals.starpets += item.starpetsPrice;
        return totals;
      },
      { supreme: 0, starpets: 0 }
    );
  };

  const myTotals = calculateTotal(myOffer);
  const theirTotals = calculateTotal(theirOffer);

  const valueDifference = myTotals.supreme - theirTotals.supreme;
  const priceDifference = myTotals.starpets - theirTotals.starpets;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans selection:bg-brand-500 selection:text-white">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10 text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-slate-900 rounded-2xl shadow-xl shadow-brand-500/10 border border-slate-800">
            <ArrowRightLeft className="text-brand-500 w-8 h-8 mr-3" />
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500">
              MM2 Trade Analyzer
            </h1>
          </div>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Evaluate your trades in real-time. Compare Supreme Values vs. Real Market Prices.
          </p>
        </header>

        {/* SEARCH BAR WITH DROPDOWN */}
        <div className="relative w-full max-w-2xl mx-auto mb-10 z-50" ref={searchRef}>
          <div className="relative group">
            <Search className="absolute left-4 top-4 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={24} />
            <input
              type="text"
              placeholder="Search for an item (e.g., Chroma Raygun)..."
              className="w-full bg-slate-900/80 text-white rounded-2xl pl-12 pr-6 py-4 text-lg border-2 border-slate-800 focus:outline-none focus:border-brand-500 shadow-lg shadow-black/20 backdrop-blur-sm transition-all"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
            />
          </div>

          {isDropdownOpen && searchQuery.trim() !== '' && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
              {searchResults.length === 0 ? (
                <div className="p-6 text-center text-slate-400">No items found matching "{searchQuery}"</div>
              ) : (
                <div className="max-h-80 overflow-y-auto p-2">
                  {searchResults.map(item => (
                    <div key={item.id} className="flex items-center gap-4 p-3 hover:bg-slate-800 rounded-xl transition-colors group">
                      <img src={item.image} alt={item.name} className="w-14 h-14 rounded-lg bg-slate-950 object-cover border border-slate-700 shadow-sm" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-100 truncate text-lg">{item.name}</h3>
                        <div className="flex items-center gap-3 text-sm mt-1">
                          <span className="text-amber-400 font-medium">Val: {item.supremeValue.toLocaleString()}</span>
                          <span className="text-emerald-400 font-medium">${item.starpetsPrice.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 transition-opacity">
                        <button 
                          onClick={() => addItem(item, 'my')}
                          className="px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1"
                        >
                          <Plus size={14} /> Mine
                        </button>
                        <button 
                          onClick={() => addItem(item, 'their')}
                          className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/30 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1"
                        >
                          <Plus size={14} /> Theirs
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* TRADE PANELS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          
          {/* MY OFFER */}
          <div className="bg-slate-900/50 backdrop-blur-md rounded-3xl p-6 border border-blue-900/50 shadow-[0_0_30px_rgba(37,99,235,0.05)] flex flex-col h-[500px]">
            <h2 className="text-2xl font-black mb-6 text-blue-400 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
              My Offer
            </h2>
            
            <div className="bg-slate-950/80 rounded-2xl p-5 mb-6 border border-slate-800">
              <div className="flex justify-between items-end mb-3">
                <span className="text-slate-400 font-medium">Total Value</span>
                <span className="text-3xl font-black text-amber-400">{myTotals.supreme.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-slate-400 font-medium">Real Price</span>
                <span className="text-2xl font-bold text-emerald-400">${myTotals.starpets.toFixed(2)}</span>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 pr-2 space-y-3 custom-scrollbar">
              {myOffer.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-700/50 rounded-2xl bg-slate-800/20">
                  <Plus className="w-10 h-10 mb-2 opacity-50" />
                  <p>Search & add items above</p>
                </div>
              ) : (
                myOffer.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-3 flex items-center gap-4 border border-slate-700/50 hover:border-slate-600 transition-colors group">
                    <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl bg-slate-900 object-cover shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-200 truncate">{item.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Val: {item.supremeValue} • ${item.starpetsPrice}</p>
                    </div>
                    <button 
                      onClick={() => removeItem(item.id, 'my')}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* THEIR OFFER */}
          <div className="bg-slate-900/50 backdrop-blur-md rounded-3xl p-6 border border-red-900/50 shadow-[0_0_30px_rgba(220,38,38,0.05)] flex flex-col h-[500px]">
            <h2 className="text-2xl font-black mb-6 text-red-400 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
              Their Offer
            </h2>
            
            <div className="bg-slate-950/80 rounded-2xl p-5 mb-6 border border-slate-800">
              <div className="flex justify-between items-end mb-3">
                <span className="text-slate-400 font-medium">Total Value</span>
                <span className="text-3xl font-black text-amber-400">{theirTotals.supreme.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-slate-400 font-medium">Real Price</span>
                <span className="text-2xl font-bold text-emerald-400">${theirTotals.starpets.toFixed(2)}</span>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 pr-2 space-y-3 custom-scrollbar">
              {theirOffer.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-700/50 rounded-2xl bg-slate-800/20">
                  <Plus className="w-10 h-10 mb-2 opacity-50" />
                  <p>Search & add items above</p>
                </div>
              ) : (
                theirOffer.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-3 flex items-center gap-4 border border-slate-700/50 hover:border-slate-600 transition-colors group">
                    <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl bg-slate-900 object-cover shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-200 truncate">{item.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Val: {item.supremeValue} • ${item.starpetsPrice}</p>
                    </div>
                    <button 
                      onClick={() => removeItem(item.id, 'their')}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
        
        {/* LIVE CALCULATION BUTTON */}
        <div className="mt-8 flex justify-center z-10 relative">
          <button 
            onClick={calculateLivePrices}
            disabled={isCalculating || (myOffer.length === 0 && theirOffer.length === 0)}
            className={`
              relative group overflow-hidden px-8 py-4 rounded-2xl font-black text-xl tracking-wide transition-all duration-300
              ${isCalculating 
                ? 'bg-slate-800 text-slate-400 cursor-wait' 
                : (myOffer.length === 0 && theirOffer.length === 0)
                  ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-brand-500 text-slate-950 hover:scale-105 hover:shadow-[0_0_40px_rgba(245,158,11,0.4)] hover:text-white'
              }
            `}
          >
            {isCalculating ? (
              <span className="flex items-center gap-3">
                <div className="w-5 h-5 border-4 border-slate-600 border-t-slate-400 rounded-full animate-spin"></div>
                Fetching Live Market Data...
              </span>
            ) : (
              <span className="flex items-center gap-2 relative z-10">
                Calculate Exact Live Prices
              </span>
            )}
            
            {/* Hover flare effect */}
            {!isCalculating && (myOffer.length > 0 || theirOffer.length > 0) && (
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></div>
            )}
          </button>
        </div>

        {/* ANALYSIS FOOTER */}
        <div className="mt-8 bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl p-8 border border-slate-700 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-red-500"></div>
           
           <h3 className="text-2xl font-black mb-6 text-center text-slate-200">Final Trade Verdict</h3>
           <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16">
             
             <div className="text-center bg-slate-950/50 p-6 rounded-2xl border border-slate-800 min-w-[250px]">
               <p className="text-slate-400 font-medium mb-2">Value Difference</p>
               <p className={`text-3xl font-black ${valueDifference > 0 ? 'text-red-400' : valueDifference < 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                 {valueDifference > 0 ? `Loses ${valueDifference.toLocaleString()}` : valueDifference < 0 ? `Wins ${Math.abs(valueDifference).toLocaleString()}` : 'Fair'}
               </p>
             </div>
             
             <div className="text-center bg-slate-950/50 p-6 rounded-2xl border border-slate-800 min-w-[250px]">
               <p className="text-slate-400 font-medium mb-2">Real Money Difference</p>
               <p className={`text-3xl font-black ${priceDifference > 0 ? 'text-red-400' : priceDifference < 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                 {priceDifference > 0 ? `Loses $${priceDifference.toFixed(2)}` : priceDifference < 0 ? `Wins $${Math.abs(priceDifference).toFixed(2)}` : 'Fair'}
               </p>
             </div>
             
           </div>
        </div>

      </div>
    </div>
  );
}