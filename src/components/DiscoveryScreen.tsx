import React, { useState } from 'react';
import { SKU } from '../../types';

interface DiscoveryScreenProps {
    inventory: SKU[];
    onProcessDiscovery: (url: string) => void;
}

interface Tender {
    id: string;
    title: string;
    org: string;
    endDate: string;
    category: string;
    matchScore: number;
    risk: 'Low' | 'Medium' | 'High';
    inStock: boolean;
    url: string;
}

const portals = [
    { id: 'gem', name: 'GeM Portal', icon: '🏛️' },
    { id: 'nexarc', name: 'Tata Nexarc', icon: '🏢' },
    { id: 'cppp', name: 'CPPP Portal', icon: '🇮🇳' }
];

export const DiscoveryScreen: React.FC<DiscoveryScreenProps> = ({ inventory, onProcessDiscovery }) => {
    const [selectedPortal, setSelectedPortal] = useState('gem');
    const [category, setCategory] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [results, setResults] = useState<Tender[]>([]);

    const handleSearch = () => {
        if (!category) return;
        setIsScanning(true);
        setResults([]);

        // Simulate Agent Discovery Logic
        setTimeout(() => {
            const mockResults: Tender[] = [
                { id: '1', title: 'Supply of Industrial Air Conditioners', org: 'BHEL', endDate: '2026-02-15', category: 'HVAC', matchScore: 98, risk: 'Low', inStock: true, url: 'https://gem.gov.in/bid/1' },
                { id: '2', title: 'Precision Cooling Units for Data Center', org: 'ISRO', endDate: '2026-02-18', category: 'HVAC', matchScore: 92, risk: 'Low', inStock: true, url: 'https://gem.gov.in/bid/2' },
                { id: '3', title: 'Centralized AC System Maintenance', org: 'DRDO', endDate: '2026-02-12', category: 'HVAC', matchScore: 85, risk: 'Medium', inStock: false, url: 'https://gem.gov.in/bid/3' },
                { id: '4', title: 'Split AC Units - 2 Ton', org: 'Railways', endDate: '2026-03-01', category: 'HVAC', matchScore: 70, risk: 'Low', inStock: true, url: 'https://gem.gov.in/bid/4' },
            ];
            setResults(mockResults);
            setIsScanning(false);
        }, 2000);
    };

    return (
        <div className="space-y-6">
            <div className="bg-base-200 p-6 rounded-lg shadow-sm border border-base-300">
                <h2 className="text-xl font-bold mb-1 text-ink-700">Tender Discovery Agent</h2>
                <p className="text-sm text-ink-500 mb-6">Agent scans national portals for qualified bids based on your SKU inventory.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {portals.map(portal => (
                        <button
                            key={portal.id}
                            onClick={() => setSelectedPortal(portal.id)}
                            className={`p-4 border-2 rounded-xl flex items-center gap-3 transition-all ${selectedPortal === portal.id ? 'border-accent-700 bg-accent-50 shadow-md' : 'border-base-300 bg-base-100 hover:border-accent-300'}`}
                        >
                            <span className="text-2xl">{portal.icon}</span>
                            <span className={`font-bold ${selectedPortal === portal.id ? 'text-accent-700' : 'text-ink-500'}`}>{portal.name}</span>
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Search Category (e.g. HVAC, Transformer, Chemicals)..."
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="flex-grow p-3 bg-base-100 border border-base-300 rounded-lg focus:ring-2 focus:ring-accent-700 outline-none"
                    />
                    <button 
                        onClick={handleSearch}
                        disabled={isScanning || !category}
                        className="bg-accent-700 text-white px-8 py-3 rounded-lg font-bold hover:bg-opacity-90 disabled:bg-base-300 disabled:cursor-not-allowed"
                    >
                        {isScanning ? 'Scanning...' : 'Start Agent Scan'}
                    </button>
                </div>
            </div>

            {results.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-ink-700 flex items-center gap-2">
                        🎯 Top Suggestions for you
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {results.slice(0, 3).map(bid => (
                            <div key={bid.id} className="bg-white border-2 border-accent-700 rounded-xl p-5 shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-accent-700 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase">Best Match</div>
                                <div className="text-xs font-bold text-success-600 mb-1">{bid.matchScore}% Selection Probability</div>
                                <h4 className="font-bold text-ink-900 line-clamp-2 mb-2">{bid.title}</h4>
                                <div className="space-y-1 mb-4">
                                    <p className="text-xs text-ink-500">🏢 {bid.org}</p>
                                    <p className="text-xs text-ink-500">📅 Ends: {bid.endDate}</p>
                                </div>
                                <div className="flex gap-2 mb-4">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${bid.risk === 'Low' ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'}`}>
                                        {bid.risk === 'Low' ? '🛡️ LOW RISK' : '⚠️ MED RISK'}
                                    </span>
                                    {bid.inStock && <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">📦 IN STOCK</span>}
                                </div>
                                <button 
                                    onClick={() => onProcessDiscovery(bid.url)}
                                    className="w-full bg-accent-700 text-white py-2 rounded-lg font-bold text-sm hover:shadow-inner"
                                >
                                    Respond & Analyze
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="bg-base-200 border border-base-300 rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-base-300 text-ink-700">
                                <tr>
                                    <th className="px-6 py-3">Other Bids Identified</th>
                                    <th className="px-6 py-3">Closing Date</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-base-300">
                                {results.slice(3).map(bid => (
                                    <tr key={bid.id} className="hover:bg-base-100">
                                        <td className="px-6 py-4 font-medium">{bid.title}</td>
                                        <td className="px-6 py-4 text-xs">{bid.endDate}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => onProcessDiscovery(bid.url)} className="text-accent-700 font-bold hover:underline">Quick Analyze</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};