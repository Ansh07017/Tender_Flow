import React, { useState } from 'react';
import { SKU,Tender,DiscoveryFilters} from '../../types';


interface DiscoveryScreenProps {
  inventory: SKU[];
  onSearch: (portal: string, category: string, filters: DiscoveryFilters) => void;
  onProcessDiscovery: (url: string) => void;
  isScanning: boolean;
  results: Tender[];
}

const portals = [
  { id: 'gem', name: 'GeM Portal', icon: '🏛️' },
  { id: 'nexarc', name: 'Tata Nexarc', icon: '🏢' },
  { id: 'cppp', name: 'CPPP Portal', icon: '🇮🇳' }
];

export const DiscoveryScreen: React.FC<DiscoveryScreenProps> = ({ 
results = [],
onSearch, 
onProcessDiscovery,
isScanning,
}) => {
  const [selectedPortal, setSelectedPortal] = useState('gem');
  const [category, setCategory] = useState('');
  
  // Qualification Agent State
  const [radius, setRadius] = useState(500);
  const [deliveryType, setDeliveryType] = useState<'Pan India' | 'Intra State' | 'Zonal'>('Pan India');
  const [allowEMD, setAllowEMD] = useState(false);
  const [minMatchThreshold, setMinMatchThreshold] = useState(20);

  const handleSearchTrigger = () => {
    if (!category) return;
    onSearch(selectedPortal, category, {
      radius,
      deliveryType,
      allowEMD,
      minMatchThreshold
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* --- SIDEBAR: QUALIFICATION AGENT CONTROLS --- */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-base-200 p-5 rounded-xl border border-base-300 shadow-sm h-full">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-700 mb-6 flex items-center gap-2 border-b border-base-300 pb-2">
            ⚙️ Qualification Agent
          </h3>
          
          <div className="space-y-8">
            {/* 1. Logistics & Distance */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <label className="text-xs font-bold text-ink-500 uppercase">Max Radius</label>
                <span className="text-accent-700 font-bold text-sm">{radius} km</span>
              </div>
              <input 
                type="range" min="0" max="2000" step="50"
                value={radius} onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full h-1.5 bg-base-300 rounded-lg appearance-none cursor-pointer accent-accent-700"
              />
              <div className="grid grid-cols-1 gap-2 mt-2">
                {(['Pan India', 'Intra State', 'Zonal'] as const).map(type => (
                  <button 
                    key={type}
                    onClick={() => setDeliveryType(type)}
                    className={`text-[10px] py-2 px-2 rounded border font-bold transition-all ${
                      deliveryType === type 
                        ? 'bg-accent-700 text-white border-accent-700 shadow-sm' 
                        : 'bg-base-100 text-ink-500 border-base-300 hover:bg-base-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Financial Compliance */}
            <div className="space-y-3 pt-4 border-t border-base-300">
              <label className="text-xs font-bold text-ink-500 uppercase">Financial Risk</label>
              <label className="flex items-center gap-3 p-3 bg-base-100 rounded-lg border border-base-300 cursor-pointer hover:bg-base-50 transition-colors">
                <input 
                  type="checkbox" checked={allowEMD} 
                  onChange={(e) => setAllowEMD(e.target.checked)}
                  className="w-4 h-4 rounded border-base-300 text-accent-700 focus:ring-accent-700"
                />
                <span className="text-xs font-semibold text-ink-700">Allow EMD/ePBG Bids</span>
              </label>
            </div>

            {/* 3. Technical Threshold */}
            <div className="space-y-3 pt-4 border-t border-base-300">
              <div className="flex justify-between">
                <label className="text-xs font-bold text-ink-500 uppercase">Min SKU Match</label>
                <span className="text-accent-700 font-bold text-sm">{minMatchThreshold}%</span>
              </div>
              <input 
                type="range" min="0" max="100" step="5"
                value={minMatchThreshold} onChange={(e) => setMinMatchThreshold(Number(e.target.value))}
                className="w-full h-1.5 bg-base-300 rounded-lg appearance-none cursor-pointer accent-accent-700"
              />
              <p className="text-[10px] text-ink-400 italic">
                Suggesting bids where at least {minMatchThreshold}% of items are in stock.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* --- MAIN AREA: PORTALS & RESULTS --- */}
      <div className="lg:col-span-3 space-y-6">
        <div className="bg-base-200 p-6 rounded-xl border border-base-300 shadow-sm">
          <div className="grid grid-cols-3 gap-4 mb-6">
            {portals.map(portal => (
              <button
                key={portal.id}
                onClick={() => setSelectedPortal(portal.id)}
                className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${
                  selectedPortal === portal.id 
                    ? 'border-accent-700 bg-white text-accent-700 shadow-md' 
                    : 'border-transparent bg-base-100 text-ink-500 hover:bg-base-300'
                }`}
              >
                <span className="text-3xl">{portal.icon}</span>
                <span className="font-bold text-xs uppercase tracking-tighter">{portal.name}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder={`Search ${selectedPortal.toUpperCase()} by category (e.g. Industrial AC)...`}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex-grow p-4 bg-base-100 border border-base-300 rounded-xl focus:ring-2 focus:ring-accent-700 outline-none font-medium"
            />
            <button 
              onClick={handleSearchTrigger}
              disabled={isScanning || !category}
              className="bg-accent-700 text-white px-10 py-4 rounded-xl font-bold hover:bg-accent-800 disabled:bg-base-300 flex items-center gap-2 shadow-lg transition-all active:scale-95"
            >
              {isScanning ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Scanning...</>
              ) : (
                'Run Agent Scan'
              )}
            </button>
          </div>
        </div>

              
{isScanning && (
  <div className="bg-black text-green-400 p-4 rounded-xl font-mono text-[10px] mb-6 shadow-inner border border-base-300">
    <div className="flex items-center gap-2 mb-2 border-b border-green-900 pb-1">
      <span className="animate-pulse">●</span> LIVE AGENT TELEMETRY
    </div>
    <div className="space-y-1">
      <p>[{new Date().toLocaleTimeString()}] [MASTER_AGENT] Delegating to GEM_WORKER...</p>
      <p className="text-blue-400">[{new Date().toLocaleTimeString()}] [SALES_AGENT] Scanning portal for "{category}"...</p>
      <p className="text-yellow-400">[{new Date().toLocaleTimeString()}] [SALES_AGENT] Found 10 potential RFPs. Analyzing dates...</p>
      <p className="text-green-500 animate-bounce">[{new Date().toLocaleTimeString()}] [QUALIFICATION_AGENT] 10 Bids Qualified for Jalandhar Branch.</p>
    </div>
  </div>
)}

        {(results || []).length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-lg font-bold text-ink-700 flex items-center gap-2 px-2">
              🎯 Qualified Recommendations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {results.slice(0, 3).map((bid) => (
                <div key={bid.id} className="bg-white border-2 border-accent-700 rounded-2xl p-6 shadow-xl relative flex flex-col hover:shadow-2xl transition-shadow">
                  <div className="absolute top-0 right-0 bg-accent-700 text-white text-[9px] font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-widest">
                    Best Match
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-xs font-bold text-success-600 uppercase tracking-tight">{bid.matchScore}% Win Probability</div>
                    <h4 className="font-bold text-ink-900 line-clamp-2 mt-1 leading-tight h-10">{bid.title}</h4>
                  </div>
                  
                  <div className="space-y-2 mb-6 text-xs text-ink-500 font-medium">
                    <div className="flex items-center gap-2">🏢 <span>{bid.org}</span></div>
                    <div className="flex items-center gap-2">📅 <span>Ends: {bid.endDate}</span></div>
                    <div className="flex items-center gap-2">📍 <span>Distance: {bid.distance || 120} km</span></div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6 mt-auto">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase border ${
                      bid.risk === 'Low' ? 'bg-success-50 text-success-700 border-success-200' : 'bg-warning-50 text-warning-700 border-warning-200'
                    }`}>
                      {bid.risk === 'Low' ? '🛡️ Low Risk' : '⚠️ Med Risk'}
                    </span>
                    {bid.inStock && (
                      <span className="text-[9px] font-black bg-blue-50 text-blue-700 px-2 py-1 rounded-md uppercase border border-blue-200">
                        📦 In Stock
                      </span>
                    )}
                  </div>

                  <button 
                    onClick={() => onProcessDiscovery(bid.url)}
                    className="w-full bg-accent-700 text-white py-3 rounded-xl font-bold text-xs hover:bg-accent-800 shadow-md transition-all active:scale-95"
                  >
                    Initiate Deep Analysis
                  </button>
                </div>
              ))}
            </div>

            {/* Other Results Table */}
            <div className="bg-base-200 border border-base-300 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-base-300 text-ink-700 font-bold">
                  <tr>
                    <th className="px-6 py-4">Other Bids Identified</th>
                    <th className="px-6 py-4">Closing Date</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-300 bg-white/50">
                  {results.slice(3).map(bid => (
                    <tr key={bid.id} className="hover:bg-base-100 transition-colors">
                      <td className="px-6 py-4 font-semibold text-ink-800">{bid.title}</td>
                      <td className="px-6 py-4 text-xs font-mono">{bid.endDate}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => onProcessDiscovery(bid.url)} 
                          className="text-accent-700 font-black text-xs uppercase hover:underline"
                        >
                          Analyze
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};