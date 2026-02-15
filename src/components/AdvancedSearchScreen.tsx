import * as React from 'react';
import { useState} from 'react';
import { Search, Building2, MapPin, FileText, ArrowLeft, PlayCircle } from 'lucide-react';

interface AdvancedSearchProps {
  onBack: () => void;
  onRunAdvancedSearch: (params: any) => void;
  isScanning: boolean;
}

type TabType = 'BID_DETAILS' | 'MINISTRY' | 'LOCATION' | 'BOQ';

export const AdvancedSearchScreen: React.FC<AdvancedSearchProps> = ({ onBack, onRunAdvancedSearch, isScanning }) => {
  const [activeTab, setActiveTab] = useState<TabType>('MINISTRY'); 
  const [formData, setFormData] = useState({
    bidNo: '',
    ministry: '',
    organization: 'Hindustan Aeronautics Limited', // Auto-fill for your B2B goal
    state: '',
    city: '',
    boqTitle: '',
    bidValue: ''
  });

  const handleSearch = () => {
    onRunAdvancedSearch({
      searchMode: 'ADVANCED',
      activeTab,
      ...formData
    });
  };

  const tabs = [
    { id: 'BID_DETAILS', label: 'Bid / RA Details', icon: Search, desc: 'Search by specific GeM Bid Number' },
    { id: 'MINISTRY', label: 'Ministry / Org', icon: Building2, desc: 'Target specific PSUs like HAL or MOD' },
    { id: 'LOCATION', label: 'Consignee Location', icon: MapPin, desc: 'Find tenders in specific States/Cities' },
    { id: 'BOQ', label: 'BOQ Title', icon: FileText, desc: 'Search by Item Name or Keywords' },
  ];

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-6 overflow-hidden text-slate-200">
      
      {/* --- SIDEBAR: SEARCH MODE SELECTOR --- */}
      <div className="w-full lg:w-80 flex flex-col h-full bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800/50 flex items-center gap-3">
          <button onClick={onBack} className="hover:text-gold-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gold-500">
            Advanced Search
          </h3>
        </div>
        
        <div className="flex-grow overflow-y-auto p-4 space-y-2 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`w-full text-left p-4 rounded-2xl border transition-all group relative overflow-hidden ${
                activeTab === tab.id 
                  ? 'bg-gold-500 border-gold-500 text-slate-950 shadow-[0_0_20px_rgba(212,175,55,0.4)]' 
                  : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 relative z-10">
                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-slate-950' : 'text-gold-500'}`} />
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest">{tab.label}</div>
                  <div className={`text-[10px] mt-1 ${activeTab === tab.id ? 'text-slate-800 font-bold' : 'text-slate-600'}`}>
                    {tab.desc}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* --- MAIN AREA: CONFIGURATION FORM --- */}
      <div className="flex-grow flex flex-col h-full bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-xl shadow-2xl overflow-hidden relative">
        
        {/* Dynamic Form Content */}
        <div className="p-12 flex-grow overflow-y-auto">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
            <span className="text-gold-500">Configure</span> {tabs.find(t => t.id === activeTab)?.label}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
            
            {activeTab === 'BID_DETAILS' && (
              <div className="col-span-2 space-y-4">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Bid / RA Number</label>
                <input 
                  type="text" placeholder="e.g. GEM/2026/B/..." 
                  value={formData.bidNo}
                  onChange={(e) => setFormData({...formData, bidNo: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 p-6 rounded-2xl text-white outline-none focus:border-gold-500 focus:shadow-[0_0_30px_rgba(212,175,55,0.1)] transition-all text-lg font-mono"
                />
              </div>
            )}

            {activeTab === 'MINISTRY' && (
              <>
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Ministry Name</label>
                  <input 
                    type="text" placeholder="e.g. Ministry of Defence" 
                    value={formData.ministry}
                    onChange={(e) => setFormData({...formData, ministry: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 p-5 rounded-2xl text-white outline-none focus:border-gold-500 transition-all" 
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Organization</label>
                  <input 
                     type="text" placeholder="e.g. Hindustan Aeronautics Limited" 
                     value={formData.organization}
                     onChange={(e) => setFormData({...formData, organization: e.target.value})}
                     className="w-full bg-slate-950 border border-slate-800 p-5 rounded-2xl text-white outline-none focus:border-gold-500 transition-all" 
                  />
                </div>
              </>
            )}

            {activeTab === 'LOCATION' && (
              <>
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">State</label>
                  <input 
                    type="text" placeholder="e.g. Maharashtra" 
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 p-5 rounded-2xl text-white outline-none focus:border-gold-500 transition-all" 
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">City</label>
                  <input 
                    type="text" placeholder="e.g. Nashik" 
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 p-5 rounded-2xl text-white outline-none focus:border-gold-500 transition-all" 
                  />
                </div>
              </>
            )}

            {activeTab === 'BOQ' && (
              <div className="col-span-2 space-y-4">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">BOQ Title / Keywords</label>
                <input 
                  type="text" placeholder="e.g. Industrial Exhaust Fan 450mm" 
                  value={formData.boqTitle}
                  onChange={(e) => setFormData({...formData, boqTitle: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 p-6 rounded-2xl text-white outline-none focus:border-gold-500 transition-all text-lg" 
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-8 border-t border-slate-800/50 flex justify-end bg-slate-900/80 backdrop-blur-md">
          <button 
            onClick={handleSearch}
            disabled={isScanning}
            className="flex items-center gap-3 bg-gold-500 text-slate-950 px-8 py-4 rounded-xl font-black uppercase tracking-widest hover:scale-105 hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isScanning ? (
              <>Scanning Portal...</>
            ) : (
              <>Run Advanced Discovery <PlayCircle className="w-5 h-5" /></>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};