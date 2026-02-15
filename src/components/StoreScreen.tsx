import * as React from 'react';
import { useState, useMemo, useRef } from 'react';
import { SKU } from '../../types';
import { AddItemModal } from './AddItemModal';

interface StoreScreenProps {
  inventory: SKU[];
  setInventory: React.Dispatch<React.SetStateAction<SKU[]>>;
}

const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export const StoreScreen: React.FC<StoreScreenProps> = ({ inventory, setInventory }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SKU | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(false); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredInventory = useMemo(() => {
    return inventory.filter(sku => 
      sku.productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      sku.skuId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [inventory, searchTerm]);

  // --- Handlers ---
  const handleOpenAdd = () => {
    setEditingItem(undefined); // Fresh state for new items
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: SKU) => {
    setEditingItem(item); // Load existing row data into state
    setIsModalOpen(true);
  };

  const handleSaveItem = (item: SKU) => {
    setInventory(prev => {
      const exists = prev.find(i => i.skuId === item.skuId);
      if (exists) {
        // Update only the specific columns that changed
        return prev.map(i => i.skuId === item.skuId ? item : i);
      }
      return [...prev, item];
    });
    setIsModalOpen(false);
  };

  return (
    /* FIXED HEIGHT CONTAINER: Prevents page-level scroll, forces internal scroll */
    <div className="h-[calc(100vh-140px)] w-full flex flex-col bg-slate-950 text-slate-200 font-sans relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold-500/5 blur-[120px] rounded-full pointer-events-none" />
      
      {/* MODAL PLACEMENT: Ensure it is lower or relative to the viewport. 
        Note: The actual vertical offset should be managed within AddItemModal's wrapper. 
      */}
      <AddItemModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveItem} 
        initialData={editingItem} 
      />
      
      <input type="file" accept=".csv" ref={fileInputRef} className="hidden" />

      {/* HEADER SECTION: Fills full width */}
      <div className="shrink-0 bg-slate-900/40 border border-slate-800 rounded-3xl p-6 flex items-center justify-between backdrop-blur-xl mb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase italic">
            Store <span className="text-gold-500">Inventory</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">
            Authorized Master Logistics Control
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <input 
            type="text" 
            placeholder="Filter SKUs..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:border-gold-500 outline-none w-64 transition-all"
          />
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-700 transition-all"
          >
            {isExpanded ? 'Show Basic' : 'Show Detailed'}
          </button>
          <button 
            onClick={handleOpenAdd}
            className="bg-white text-slate-950 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)]"
          >
            + Add SKU
          </button>
        </div>
      </div>

      {/* SCROLLABLE AREA: flex-grow and overflow-auto ensures the table 
        scrolls vertically within the frame 
      */}
      <div className="flex-grow bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-xl flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-grow scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 bg-slate-900 z-10 border-b border-slate-800">
              <tr>
                {/* 8 Core Columns */}
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Master ID</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Description</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Category</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Qty</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">OEM Brand</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Warehouse</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Unit Price</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Lead Time</th>
                
                {/* Detailed View Columns */}
                {isExpanded && (
                  <>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Sub-Category</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Cost Price</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">GST %</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Truck Type</th>
                  </>
                )}
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center sticky right-0 bg-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredInventory.map((sku) => (
                <tr key={sku.skuId} className="hover:bg-gold-500/5 transition-colors group">
                  <td className="px-6 py-4 font-mono text-[10px] text-slate-500 uppercase">{sku.skuId}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-white group-hover:text-gold-500 transition-colors text-sm">{sku.productName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400 font-bold uppercase">{sku.productCategory}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <div className={`w-1.5 h-1.5 rounded-full mb-1 ${sku.availableQuantity > 10 ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500'}`} />
                      <span className="text-sm font-medium text-slate-300">{sku.availableQuantity}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400 italic">{sku.oemBrand}</td>
                  <td className="px-6 py-4 text-[10px] text-slate-500 uppercase tracking-widest font-bold">{sku.warehouseLocation.split(',')[0]}</td>
                  <td className="px-6 py-4 text-right font-mono text-gold-500 font-bold">{currencyFormatter.format(sku.unitSalesPrice)}</td>
                  <td className="px-6 py-4 text-center text-sm text-slate-400">{sku.leadTime}d</td>
                  
                  {isExpanded && (
                    <>
                      <td className="px-6 py-4 text-xs text-slate-500">{sku.productSubCategory}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-mono">{currencyFormatter.format(sku.costPrice)}</td>
                      <td className="px-6 py-4 text-center text-sm text-slate-500">{sku.gstRate}%</td>
                      <td className="px-6 py-4 text-[9px] font-black text-blue-400 uppercase">{sku.truckType.replace('_', ' ')}</td>
                    </>
                  )}
                  
                  <td className="px-6 py-4 sticky right-0 bg-slate-900/80 backdrop-blur-sm group-hover:bg-slate-800 transition-all border-l border-slate-800/50">
                    <div className="flex justify-center gap-3">
                      <button 
                        onClick={() => handleOpenEdit(sku)}
                        className="text-slate-500 hover:text-gold-500 transition-colors"
                        title="Edit SKU"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button 
                        onClick={() => setInventory(prev => prev.filter(i => i.skuId !== sku.skuId))}
                        className="text-slate-500 hover:text-red-500 transition-colors"
                        title="Delete SKU"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FOOTER: Fixed at bottom */}
        <div className="shrink-0 p-4 border-t border-slate-800 bg-slate-900/60 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
          <div>Total Master Records: {inventory.length}</div>
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Compliance Active</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gold-500" /> High-Margin Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};