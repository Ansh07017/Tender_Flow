import React, { useState } from 'react';
import { AppConfig, CompanyConfig, SigningAuthority } from '../../types';

interface ConfigScreenProps {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
}

export const ConfigScreen: React.FC<ConfigScreenProps> = ({ config, setConfig }) => {
  const [companyDetails, setCompanyDetails] = useState<CompanyConfig>(config.companyDetails);
  const [isAddingAuthority, setIsAddingAuthority] = useState(false);
  const [newAuth, setNewAuth] = useState({ name: '', designation: '', din: '' });

  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCompanyDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    setConfig(prev => ({ ...prev, companyDetails }));
    alert('System Configuration Updated');
  };

  const addAuthority = () => {
    if (!newAuth.name || !newAuth.din) return;
    const authority: SigningAuthority = { id: `DIR-${Date.now()}`, ...newAuth };
    setConfig(prev => ({ ...prev, signingAuthorities: [...prev.signingAuthorities, authority] }));
    setNewAuth({ name: '', designation: '', din: '' });
    setIsAddingAuthority(false);
  };

  return (
    <div className="h-full flex flex-col space-y-6 overflow-hidden text-slate-200">
      {/* 1. Header Section */}      

        <div className="h-[20%] bg-slate-900/40 border border-slate-800 rounded-3xl p-6 flex items-center justify-between backdrop-blur-xl">
          <div className="space-y-1">
            <h1 className="text-3xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-gold-500 uppercase">
              Company <span className="text-gold-500">Profile</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold leading-relaxed max-w-xs uppercase tracking-widest">
              Master Identity & Authorization Control
            </p>
          </div>
        
        <button 
          onClick={handleSave}
          className="bg-white text-slate-950 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)]"
        >
          Push Changes to Cloud
        </button>
      </div>

      {/* 2. Main Config Grid - No Scrolling */}
      <div className="grid grid-cols-12 gap-6 flex-grow overflow-hidden">
        
        {/* LEFT: COMPANY IDENTITY */}
        <div className="col-span-5 bg-slate-900/40 border border-slate-800 rounded-3xl p-6 flex flex-col backdrop-blur-xl">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gold-500/60 mb-6">Corporate Identity</h3>
          
          <div className="space-y-5 flex-grow">
            <ConfigInput label="Registered Entity Name" name="companyName" value={companyDetails.companyName} onChange={handleCompanyChange} />
            <div className="grid grid-cols-2 gap-4">
              <ConfigInput label="GSTIN (Tax ID)" name="gstin" value={companyDetails.gstin} onChange={handleCompanyChange} />
              <ConfigInput label="PAN (Tax ID)" name="pan" value={companyDetails.pan} onChange={handleCompanyChange} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black uppercase text-slate-500 ml-2">Headquarters Address</label>
              <textarea 
                name="companyAddress"
                value={companyDetails.companyAddress}
                onChange={handleCompanyChange}
                rows={4}
                className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm focus:border-gold-500 outline-none transition-all resize-none"
              />
            </div>
          </div>
          <div className="mt-4 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
            <p className="text-[9px] text-blue-400 font-bold uppercase">System Note</p>
            <p className="text-[10px] text-slate-500 leading-tight mt-1">This data is injected into auto-generated tender documents and technical compliance certificates.</p>
          </div>
        </div>

        {/* RIGHT: SIGNING AUTHORITIES */}
        <div className="col-span-7 bg-slate-900/40 border border-slate-800 rounded-3xl p-6 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gold-500/60">Authorized Signatories</h3>
            <button 
              onClick={() => setIsAddingAuthority(true)}
              className="text-[9px] font-black px-3 py-1 bg-slate-800 rounded border border-slate-700 hover:text-gold-500 transition-colors"
            >
              + ADD NEW
            </button>
          </div>

          <div className="flex-grow space-y-3 overflow-y-auto pr-2 scrollbar-hide">
            {config.signingAuthorities.map(auth => (
              <div key={auth.id} className="group flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-gold-500/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-lg border border-slate-800">👤</div>
                  <div>
                    <p className="text-sm font-bold text-white uppercase">{auth.name}</p>
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{auth.designation} DIN: {auth.din}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setConfig(prev => ({...prev, signingAuthorities: prev.signingAuthorities.filter(a => a.id !== auth.id)}))}
                  className="text-[9px] font-black text-slate-600 hover:text-red-500 transition-colors uppercase"
                >
                  Revoke
                </button>
              </div>
            ))}

            {isAddingAuthority && (
              <div className="p-4 bg-slate-900 border-2 border-dashed border-gold-500/30 rounded-2xl animate-in zoom-in-95 duration-300">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <input placeholder="Name" className="auth-input" value={newAuth.name} onChange={e => setNewAuth({...newAuth, name: e.target.value})} />
                  <input placeholder="Role" className="auth-input" value={newAuth.designation} onChange={e => setNewAuth({...newAuth, designation: e.target.value})} />
                  <input placeholder="DIN" className="auth-input" value={newAuth.din} onChange={e => setNewAuth({...newAuth, din: e.target.value})} />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setIsAddingAuthority(false)} className="text-[9px] font-bold px-3 py-1 uppercase">Cancel</button>
                  <button onClick={addAuthority} className="bg-gold-500 text-slate-350 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)]">Save Authority</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`.auth-input { @apply bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs outline-none transition-all font-medium; }
      .auth-input::placeholder {
    color: #000000;
    opacity: 1;    
  }

  .auth-input:focus {
    @apply border border-slate-800 rounded-xl px-3 py-2 text-xs outline-none transition-all font-medium;
    color: #000000;
  }

  .scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
};

const ConfigInput = ({ label, name, value, onChange }: any) => (
  <div className="flex flex-col gap-1">
    <label className="text-[9px] font-black uppercase text-slate-900 ml-2 italic tracking-widest">{label}</label>
    <input 
      type="text" 
      name={name}
      value={value}
      onChange={onChange}
      className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-sm focus:border-gold-500 outline-none transition-all placeholder:text-slate-600"
    />
  </div>
);