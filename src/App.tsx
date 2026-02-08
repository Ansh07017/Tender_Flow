import React, { useState, useCallback,useEffect } from 'react';
import { RfpListScreen } from './components/RfpListScreen';
import { LogScreen } from './components/LogScreen';
import { ConfigScreen } from './components/ConfigScreen';
import { AnalysisScreen } from './components/AnalysisScreen';
import { ProcessingScreen } from './components/ProcessingScreen';
import { DiscoveryScreen } from './components/DiscoveryScreen';
import { Header } from './components/Header';
import { StoreScreen } from './components/StoreScreen';
import { FrontPage } from './components/Frontpage';
import { productInventory as initialInventory } from '../data/storeData';

import type { View, Tender } from '../types';
import {
  AgentName,
  LogEntry,
  Rfp,
  AppConfig,
} from '../types';

import { initialRfpList } from '../data/rfpData';
import { initialConfig } from '../data/configData';

/* ------------------------------------------------------------------
    Backend Service (Frontend → Backend ONLY)
------------------------------------------------------------------- */
const apiService = {
  parseRFP: async (rfpContent: string) => {
    const res = await fetch('http://localhost:3001/api/parse-rfp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: rfpContent }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Backend Error ${res.status}: ${errorText}`);
    }

    const json = await res.json();
    return json.data;
  },
};
let hasTriggeredDiscovery = false;
const App: React.FC = () => {
  // 1. Initialized to 'frontpage' for the new command center feel
  const [currentView, setCurrentView] = useState<View | 'frontpage'>('frontpage');
  const [rfps, setRfps] = useState<Rfp[]>(initialRfpList);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedRfpId, setSelectedRfpId] = useState<string | null>(null);
  const [config, setConfig] = useState<AppConfig>(initialConfig);
  const [processingStartTime, setProcessingStartTime] = useState<Date | null>(null);
  const [inventory, setInventory] = useState(initialInventory);
  const [discoveryResults, setDiscoveryResults] = useState<Tender[]>([]);
  const [isDiscoveryScanning, setIsDiscoveryScanning] = useState(false);

  /* -------------------- Logging -------------------- */
  const addLog = useCallback(
    (agent: AgentName | 'SYSTEM', message: string, data?: any) => {
      setLogs(prev => [
        ...prev,
        {
          timestamp: new Date(),
          agent,
          message,
          data: data ? JSON.stringify(data, null, 2) : undefined,
        },
      ]);
    },
    []
  );
  /* -------------------- Automated Discovery Logic -------------------- */
useEffect(() => {
  if (hasTriggeredDiscovery) return;
  hasTriggeredDiscovery = true;
  const triggerAutomatedDiscovery = async () => {
    // 1. Find the item with the highest available quantity in Jalandhar stock
    const heroProduct = [...inventory]
  .filter(item => item.availableQuantity > 0) // Only items we actually have
  .sort((a, b) => b.availableQuantity - a.availableQuantity)[0];
    
    if (!heroProduct) return;

    setIsDiscoveryScanning(true);
    addLog('MASTER_AGENT', `Auto-Discovery: Identifying tenders for high-stock item: ${heroProduct.productCategory}`);

    try {
      const response = await fetch('http://localhost:3001/api/discover', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    portal: 'gem', 
    category: heroProduct.productCategory, 
    filters: {
      ...config.discoveryFilters, 
      bypassFilters: true      
    },
    inventory 
  }),
});

      const result = await response.json();
      if (result.success) {
        setDiscoveryResults(result.data); // Updates discoveryResults state
        addLog('MASTER_AGENT', `Auto-Discovery complete. Found ${result.data.length} matches for ${heroProduct.productCategory}`);
      }
    } catch (error) {
      addLog('SYSTEM', 'Automated Discovery background task failed');
    } finally {
      setIsDiscoveryScanning(false);
    }
  };
  triggerAutomatedDiscovery();
}, []); 

  /* -------------------- RFP State -------------------- */
  const updateRfpState = (rfpId: string, updates: Partial<Rfp>) => {
    setRfps(prev =>
      prev.map(rfp =>
        rfp.id === rfpId
          ? {
              ...rfp,
              ...updates,
              agentOutputs: {
                ...rfp.agentOutputs,
                ...updates.agentOutputs,
              },
            }
          : rfp
      )
    );
  };

  /* -------------------- Main Process Pipeline -------------------- */
    const processRfp = async (rfpId: string, override?: Rfp) => {
      const rfp = override || rfps.find(r => r.id === rfpId);
      if (!rfp) return;

      const startTime = Date.now();
      try {
        addLog('SYSTEM', `Processing started for ${rfpId}`);

        let contentToParse = rfp.rawDocument;
        if (rfp.source === 'URL') {
          updateRfpState(rfpId, { status: 'Extracting', activeAgent: 'SALES_AGENT' });
      addLog('DISCOVERY_AGENT', 'Fetching document from GeM portal...');

      const fetchRes = await fetch('http://localhost:3001/api/fetch-rfp-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rfp.rawDocument }),
      });

      if (!fetchRes.ok) throw new Error('Failed to fetch document text from URL');
      
      const fetchData = await fetchRes.json();
      contentToParse = fetchData.content; // The actual PDF text
      addLog('SALES_AGENT', 'Text extraction successful');
    }
        updateRfpState(rfpId, { status: 'Parsing', activeAgent: 'PARSING_ENGINE' });
        addLog('PARSING_ENGINE', 'Sending document to backend');
        
        //const backendResult = await apiService.parseRFP(rfp.rawDocument);
        const backendResult = await apiService.parseRFP(contentToParse);
        
        
        addLog('PARSING_ENGINE', 'Backend completed', backendResult);
        updateRfpState(rfpId, {
          status: 'Complete',
          activeAgent: 'FINALIZING_AGENT',
          agentOutputs: backendResult,
          processingDuration: Math.round((Date.now() - startTime) / 1000),
        });
        addLog('FINALIZING_AGENT', 'Report finalized');
      } catch (err: any) {
        updateRfpState(rfpId, { status: 'Error' });
        addLog('SYSTEM', err.message || 'Processing failed');
      }
    };

  /* -------------------- Navigation Helpers -------------------- */
  const handleStartProcessing = (rfpId: string, rfpObject?: Rfp) => {
    setProcessingStartTime(new Date());
    setSelectedRfpId(rfpId);
    setCurrentView('processing');
    processRfp(rfpId, rfpObject);
  };

  const handleViewAnalysis = (rfpId: string) => {
    setSelectedRfpId(rfpId);
    setCurrentView('analysis');
  };

  const handleBackToList = () => {
    setSelectedRfpId(null);
    setCurrentView('rfps');
    setProcessingStartTime(null);
  };

  const addRfp = (newRfpData: { source: 'URL' | 'File'; content: string; fileName?: string; }) => {
    const tempId = `TDR-${Date.now()}`;
    const newRfp: Rfp = {
      id: tempId,
      organisation: 'Parsing...',
      bidType: 'Parsing...',
      closingDate: new Date(),
      status: 'Pending',
      rawDocument: newRfpData.content,
      source: newRfpData.source,
      fileName: newRfpData.fileName,
      agentOutputs: {},
    };
    setRfps(prev => [newRfp, ...prev]);
    handleStartProcessing(tempId, newRfp);
  };

  /* -------------------- Render Content -------------------- */
  const renderContent = () => {
    const selectedRfp = rfps.find(r => r.id === selectedRfpId);

    switch (currentView) {
      // 2. Integration of the new Front Page with data bridges
      case 'frontpage':
  return (
    <FrontPage 
      onNavigateToDiscovery={() => setCurrentView('discovery')}
      onDirectUpload={() => setCurrentView('rfps')}
      tenders={discoveryResults}
      isScanning={isDiscoveryScanning} // Pass the scanning state
      onProcessDiscovery={(url) => {
        // This takes the real GeM URL and starts the deep parse
        const bidId = url.replace(/\/$/, '').split('/').pop(); 
        addRfp({ source: 'URL', content: url, fileName: `GeM_${bidId}` });
      }}
      onRefreshDiscovery={() => {
        window.location.reload();
      }}
    />
  );

      case 'config':
        return <ConfigScreen config={config} setConfig={setConfig} />;

      case 'logs':
        return <LogScreen logs={logs} />;

      case 'store':
        return <StoreScreen inventory={inventory} setInventory={setInventory} />;

      case 'discovery':
        return (
          <DiscoveryScreen 
            inventory={inventory} 
            results={discoveryResults}
            isScanning={isDiscoveryScanning} 
            onSearch={async (portal, category, filters) => {
              setIsDiscoveryScanning(true);
              addLog('MASTER_AGENT', `Searching ${portal} for ${category}...`);
              try {
                const response = await fetch('http://localhost:3001/api/discover', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ portal, category, filters, inventory }),
                });
                const result = await response.json();
                if (result.success) {
                  setDiscoveryResults(result.data); //
                  addLog('MASTER_AGENT', `Found ${result.data.length} qualified bids.`);
                }
              } catch (error) {
                addLog('SYSTEM', 'Discovery failed');
              } finally {
                setIsDiscoveryScanning(false);
              }
            }}
            onProcessDiscovery={(url) => {
              const bidId = url.replace(/\/$/, '').split('/').pop(); // Fixes extraction logic
              addRfp({ source: 'URL', content: url, fileName: `GeM_${bidId}` });
            }} 
          />
        );

      case 'analysis':
        return selectedRfp ? <AnalysisScreen rfp={selectedRfp} onBack={handleBackToList} /> : null;

      case 'processing':
        return selectedRfp ? (
          <ProcessingScreen
            rfp={selectedRfp}
            logs={logs.filter(l => processingStartTime && l.timestamp >= processingStartTime)}
            onViewResults={() => handleViewAnalysis(selectedRfp.id)}
            onBack={handleBackToList}
            processingStartTime={processingStartTime}
          />
        ) : null;

      case 'rfps':
      default:
        return (
          <RfpListScreen
            rfps={rfps}
            onProcessRfp={addRfp}
            onProcessExistingRfp={handleStartProcessing}
            onViewAnalysis={handleViewAnalysis}
          />
        );
    }
  };

  return (
    <div className="min-h-screen font-sans bg-slate-950 text-slate-50">
      {/* 3. Navigation Header - Pass 'frontpage' to the header for highlighting */}
      <Header 
        currentView={currentView as View} 
        setCurrentView={(view) => setCurrentView(view)} 
      />
      <main className="w-full h-full p-2 md:p-4">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;