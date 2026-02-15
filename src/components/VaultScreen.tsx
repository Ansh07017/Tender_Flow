import * as React from 'react';
import { useState } from 'react';
import { 
  ShieldCheck, Upload, FileText, AlertTriangle, 
  Eye, Download, RefreshCw, ArrowLeft, Lock, Trash2, Bell
} from 'lucide-react';

interface VaultItem {
  id: number;
  cert_name: string;
  category: 'FINANCIAL' | 'TECHNICAL' | 'LEGAL';
  is_valid: boolean;
  expiry_date: string;
  file_path: string;
}

interface VaultScreenProps {
  onBack: () => void;
}

export const VaultScreen: React.FC<VaultScreenProps> = ({ onBack }) => {
  // Mock data - In production, fetch this from /api/compliance-check
  const [documents, setDocuments] = useState<VaultItem[]>([
    { id: 1, cert_name: 'GST Registration (GSTIN)', category: 'FINANCIAL', is_valid: true, expiry_date: '2099-12-31', file_path: 'gst_cert.pdf' },
    { id: 2, cert_name: 'PAN Card', category: 'FINANCIAL', is_valid: true, expiry_date: '2099-12-31', file_path: 'pan_card.pdf' },
    { id: 3, cert_name: 'ISO 9001:2015', category: 'TECHNICAL', is_valid: true, expiry_date: '2025-08-15', file_path: 'iso_9001.pdf' },
    { id: 4, cert_name: 'Class-I Local Supplier (MII)', category: 'LEGAL', is_valid: false, expiry_date: '2024-01-01', file_path: 'mii_decl.pdf' },
  ]);

  const [uploadingId, setUploadingId] = useState<number | null>(null);

  // --- 1. REAL UPLOAD LOGIC ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, docId: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingId(docId);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docId', String(docId));

    try {
        const res = await fetch('http://localhost:3001/api/vault/upload', { 
            method: 'POST', 
            body: formData 
        });
        
        const data = await res.json();

        if (data.success) {
            setDocuments(prev => prev.map(d => 
                d.id === docId 
                ? { ...d, is_valid: true, expiry_date: '2027-12-31', file_path: data.filePath } 
                : d
            ));
        }
    } catch (e) {
        console.error("Upload failed", e);
        alert("Document upload failed. Check server console.");
    } finally {
        setUploadingId(null);
    }
  };

  // --- 2. DOWNLOAD LOGIC ---
  const handleDownload = (path: string) => {
    if (!path) return;
    const filename = path.split(/[/\\]/).pop(); 
    if (!filename) return;
    window.open(`http://localhost:3001/api/vault/download/${filename}`, '_blank');
  };

  // --- 3. DELETE LOGIC ---
  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to remove this document? This may affect your bid eligibility.")) {
        // In production: await fetch(`/api/vault/delete/${id}`, { method: 'DELETE' });
        setDocuments(prev => prev.filter(doc => doc.id !== id));
    }
  };

  // --- 4. REMINDER LOGIC ---
  const handleSetReminder = (doc: VaultItem) => {
    alert(`Reminder set! You will be notified 30 days before ${doc.cert_name} expires on ${doc.expiry_date}.`);
  };

  return (
    <div className="h-full flex flex-col text-slate-200">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8 p-6 bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-slate-950 rounded-xl border border-slate-800 hover:text-white transition-all">
             <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="p-3 bg-blue-900/20 rounded-xl border border-blue-500/30">
            <ShieldCheck className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Compliance Vault</h2>
            <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-widest font-bold">
                <Lock className="w-3 h-3" /> Secure Storage • AES-256
            </div>
          </div>
        </div>
        <div className="flex gap-4">
            <button className="flex items-center gap-2 px-6 py-3 bg-slate-950 border border-slate-800 rounded-xl hover:border-blue-500 transition-all text-xs font-black uppercase tracking-widest">
                <RefreshCw className="w-4 h-4" /> Sync Registry
            </button>
        </div>
      </div>

      {/* DOCUMENT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-8 scrollbar-hide">
        {documents.map((doc) => (
          <div key={doc.id} className={`relative group p-6 rounded-3xl border transition-all ${doc.is_valid ? 'bg-slate-900/40 border-slate-800 hover:border-blue-500/50' : 'bg-red-900/10 border-red-500/30'}`}>
            
            {/* TOP ACTIONS (Delete & Reminder) */}
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={() => handleSetReminder(doc)}
                    className="p-2 bg-slate-950 rounded-lg border border-slate-800 hover:text-amber-400 hover:border-amber-400/50 transition-colors"
                    title="Set Expiry Reminder"
                >
                    <Bell className="w-3 h-3" />
                </button>
                <button 
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 bg-slate-950 rounded-lg border border-slate-800 hover:text-red-500 hover:border-red-500/50 transition-colors"
                    title="Delete Document"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>

            {/* Status Badge (Moved slightly down to avoid buttons) */}
            <div className={`absolute top-4 left-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${doc.is_valid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                {doc.is_valid ? 'Active' : 'Expired'}
            </div>

            <div className="mb-6 mt-8">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${doc.is_valid ? 'bg-slate-950 text-blue-500' : 'bg-red-900/20 text-red-500'}`}>
                    <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{doc.cert_name}</h3>
                <p className="text-xs text-slate-500 font-mono">EXP: {doc.expiry_date}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-auto">
                <button 
                    onClick={() => handleDownload(doc.file_path)}
                    className="flex-1 py-3 bg-slate-950 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                    {doc.is_valid ? <Download className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {doc.is_valid ? 'Download' : 'Preview'}
                </button>
                
                <div className="relative">
                    <input 
                        type="file" 
                        id={`upload-${doc.id}`}
                        className="hidden" 
                        onChange={(e) => handleFileUpload(e, doc.id)}
                    />
                    <label 
                        htmlFor={`upload-${doc.id}`}
                        className={`cursor-pointer px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 transition-all
                            ${doc.is_valid 
                                ? 'bg-slate-950 border-slate-800 hover:text-blue-400' 
                                : 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20'
                            }`}
                    >
                        {uploadingId === doc.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                            <Upload className="w-3 h-3" />
                        )}
                        {doc.is_valid ? 'Update' : 'Upload'}
                    </label>
                </div>
            </div>

            {!doc.is_valid && (
                <div className="mt-4 flex items-center gap-2 text-red-400 text-[10px] font-bold uppercase tracking-widest">
                    <AlertTriangle className="w-3 h-3" />
                    Action Required
                </div>
            )}
          </div>
        ))}

        {/* Add New Placeholder */}
        <button className="border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-4 text-slate-600 hover:text-blue-500 hover:border-blue-500/50 hover:bg-slate-900/40 transition-all min-h-[240px]">
            <div className="p-4 rounded-full bg-slate-900">
                <Upload className="w-6 h-6" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest">Add New Document</span>
        </button>
      </div>
    </div>
  );
};