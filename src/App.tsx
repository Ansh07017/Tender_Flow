import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { LogScreen } from './components/LogScreen';
import { ConfigScreen } from './components/ConfigScreen';
import { AnalysisScreen } from './components/AnalysisScreen';
import { ProcessingScreen } from './components/ProcessingScreen';
import { DiscoveryScreen } from './components/DiscoveryScreen';
import { Header } from './components/Header';
import { StoreScreen } from './components/StoreScreen';
import { FrontPage } from './components/Frontpage';
import { productInventory as initialInventory } from '../data/storeData';
import { HelperBot } from './components/Helperbot';
import { SignInScreen } from './components/SignInScreen';
import { OnboardingWizard } from './components/OnboardingWizard';
import { AdvancedSearchScreen } from './components/AdvancedSearchScreen';
import { VaultScreen } from './components/VaultScreen';
import { FinalRecommendation } from './components/FinalRecommendation';
import type { View, Tender, UserData, OnboardingStep } from '../types';
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
  parseRFP: async (rfpContent: string, inventory: any[], extractedLinks: string[] = []) => {
    const res = await fetch('http://localhost:3001/api/parse-rfp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        content: rfpContent, 
        inventory,
        extractedLinks
      }),
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
  const [user, setUser] = useState<UserData | null>(null);
  const [isAuthSessionActive, setIsAuthSessionActive] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<'NONE' | 'PIN_SETUP' | 'TWO_FA_BIND'>('NONE');
  const [currentView, setCurrentView] = useState<View | 'frontpage'>('frontpage');
  const [rfps, setRfps] = useState<Rfp[]>(initialRfpList);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedRfpId, setSelectedRfpId] = useState<string | null>(null);
  const [config, setConfig] = useState<AppConfig>(initialConfig);
  const [processingStartTime, setProcessingStartTime] = useState<Date | null>(null);
  const [inventory, setInventory] = useState(initialInventory);
  const [discoveryResults, setDiscoveryResults] = useState<Tender[]>([]);
  const [isDiscoveryScanning, setIsDiscoveryScanning] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [analysisContext, setAnalysisContext] = useState<any>(null);
  
  // --- STATE: VAULT LOCK ---
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);

  // Auto-lock vault when navigating away
  useEffect(() => {
    if (currentView !== 'vault') {
      setIsVaultUnlocked(false);
    }
  }, [currentView]);

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

  /* -------------------- Authentication Check (UPDATED) -------------------- */
  useEffect(() => {
    const savedUser = localStorage.getItem('tf_auth_user');
    const setupDone = localStorage.getItem('tf_setup_complete') === 'true';

    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setIsAuthSessionActive(true);
      
      // FIX: Ensure we resume onboarding if the user hit refresh mid-setup
      if (setupDone) {
        setOnboardingStep('NONE');
      } else {
        setOnboardingStep(parsedUser.has_pin ? 'TWO_FA_BIND' : 'PIN_SETUP');
      }
    }
  }, []);

  /* -------------------- AUTH ACTIONS -------------------- */
  const handleLogout = () => {
    setUser(null);
    setIsAuthSessionActive(false);
    setOnboardingStep('NONE');
    setCurrentView('frontpage');
    setIsVaultUnlocked(false); 
    
    localStorage.removeItem('tf_auth_user');
    localStorage.removeItem('tf_setup_complete');
  };

  const handleChangePin = () => {
    setOnboardingStep('PIN_SETUP');
  };

  /* -------------------- Automated Discovery Logic -------------------- */
  useEffect(() => {
    if (!isAuthSessionActive) return;
    if (hasTriggeredDiscovery) return;
    hasTriggeredDiscovery = true;
    
    const triggerAutomatedDiscovery = async () => {
      const heroProduct = [...inventory]
        .filter(item => item.availableQuantity > 0)
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
            filters: { ...config.discoveryFilters, bypassFilters: true },
            inventory 
          }),
        });

        const result = await response.json();
        if (result.success) {
          setDiscoveryResults(result.data);
          addLog('MASTER_AGENT', `Auto-Discovery complete. Found ${result.data.length} matches for ${heroProduct.productCategory}`);
        }
      } catch (error) {
        addLog('SYSTEM', 'Automated Discovery background task failed');
      } finally {
        setIsDiscoveryScanning(false);
      }
    };
    triggerAutomatedDiscovery();
  }, [isAuthSessionActive, config.discoveryFilters, inventory, addLog]); 

  /* -------------------- RFP State & Processing -------------------- */
  const updateRfpState = (rfpId: string, updates: Partial<Rfp>) => {
    setRfps(prev =>
      prev.map(rfp =>
        rfp.id === rfpId
          ? { ...rfp, ...updates, agentOutputs: { ...rfp.agentOutputs, ...updates.agentOutputs } }
          : rfp
      )
    );
  };

  const processRfp = async (rfpId: string, override?: Rfp) => {
    const rfp = override || rfps.find(r => r.id === rfpId);
    if (!rfp) return;

    const startTime = Date.now();
    try {
      addLog('SYSTEM', `Processing started for ${rfpId}`);

      let contentToParse = rfp.rawDocument;
      let pdfLinks: string[] = [];

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
        contentToParse = fetchData.content;
        pdfLinks = fetchData.extractedLinks || []; 
        
        addLog('SALES_AGENT', `Extraction successful. Found ${pdfLinks.length} embedded documents.`);
      }
      
      updateRfpState(rfpId, { status: 'Parsing', activeAgent: 'PARSING_ENGINE' });
      addLog('PARSING_ENGINE', 'Sending document to backend');
      
      const backendResult = await apiService.parseRFP(contentToParse, inventory, pdfLinks);
      
      addLog('PARSING_ENGINE', 'Backend completed', backendResult);
      updateRfpState(rfpId, {
        status: 'Complete',
        activeAgent: 'FINALIZING_AGENT',
        agentOutputs: {
          parsedData: { ...backendResult.parsedData, riskAnalysis: backendResult.riskAnalysis },
          technicalAnalysis: backendResult.technicalAnalysis, 
          pricing: backendResult.pricing 
        },
        processingDuration: Math.round((Date.now() - startTime) / 1000),
      });
      addLog('FINALIZING_AGENT', 'Report finalized');
    } catch (err: any) {
      updateRfpState(rfpId, { status: 'Error' });
      addLog('SYSTEM', err.message || 'Processing failed');
    }
  };

  const handleProcessRfp = (data: { source: 'URL' | 'File'; content: string; fileName?: string }) => {
    addLog('SYSTEM', `Manual Ingestion Started: Source [${data.source}] ${data.fileName || ''}`);
    const tempId = `TDR-MANUAL-${Date.now()}`;
    const newRfp: Rfp = {
      id: tempId,
      organisation: 'Manual Ingestion',
      bidType: 'Parsing...',
      closingDate: new Date(),
      status: 'Pending',
      rawDocument: data.content,
      source: data.source,
      fileName: data.fileName,
      agentOutputs: {},
    };

    setRfps(prev => [newRfp, ...prev]);
    setProcessingStartTime(new Date());
    setSelectedRfpId(tempId);
    setCurrentView('processing');
    processRfp(tempId, newRfp);
  };

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
      case 'frontpage':
        return (
          <FrontPage 
            onNavigateToDiscovery={() => setCurrentView('discovery')}
            onProcessRfp={handleProcessRfp}
            tenders={discoveryResults}
            isScanning={isDiscoveryScanning}
            onProcessDiscovery={(url: string) => {
              const bidId = url.replace(/\/$/, '').split('/').pop(); 
              addRfp({ source: 'URL', content: url, fileName: `GeM_${bidId}` });
            }}
            onRefreshDiscovery={() => window.location.reload()}
          />
        );

      case 'config':
        return (
          <ConfigScreen 
            config={config} 
            setConfig={setConfig} 
            onOpenVault={() => setCurrentView('vault')}
            onLogout={handleLogout}       
            onChangePin={handleChangePin} 
          />
        );

      case 'vault':
        if (!isVaultUnlocked) {
          return (
            <SignInScreen 
              initialEmail={user?.email} 
              onAuthSuccess={() => setIsVaultUnlocked(true)}
            />
          );
        }
        return (
          <VaultScreen 
            onBack={() => {
              setIsVaultUnlocked(false); 
              setCurrentView('config');
            }} 
          />
        );

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
            hasSearched={hasSearched}
            onOpenAdvanced={() => setCurrentView('advanced_search')} 
            onSearch={async (portal: string, category: string, filters: any) => {
              setIsDiscoveryScanning(true);
              setHasSearched(false);
              addLog('MASTER_AGENT', `Searching ${portal} for ${category}...`);
              try {
                const response = await fetch('http://localhost:3001/api/discover', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ portal, category, filters, inventory }),
                });
                const result = await response.json();
                if (result.success) {
                  setDiscoveryResults(result.data);
                  addLog('MASTER_AGENT', `Found ${result.data.length} qualified bids.`);
                }
              } catch (error) {
                addLog('SYSTEM', 'Discovery failed');
              } finally {
                setIsDiscoveryScanning(false);
                setHasSearched(true);
              }
            }}
            onProcessDiscovery={(url: string) => {
              const bidId = url.replace(/\/$/, '').split('/').pop();
              addRfp({ source: 'URL', content: url, fileName: `GeM_${bidId}` });
            }} 
          />
        );

      case 'advanced_search':
        return (
          <AdvancedSearchScreen 
            isScanning={isDiscoveryScanning}
            onBack={() => setCurrentView('discovery')}
            onRunAdvancedSearch={async (params) => {
              setIsDiscoveryScanning(true);
              setHasSearched(false);
              addLog('MASTER_AGENT', `Initiating Advanced Search: ${params.activeTab}`);
              try {
                const response = await fetch('http://localhost:3001/api/discover', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    portal: 'gem', 
                    category: 'ADVANCED_MODE',
                    filters: params, 
                    inventory 
                  }),
                });
                const result = await response.json();
                if (result.success) {
                  setDiscoveryResults(result.data);
                  addLog('MASTER_AGENT', `Advanced Search found ${result.data.length} bids.`);
                  setCurrentView('discovery');
                }
              } catch (e) {
                addLog('SYSTEM', 'Advanced Search Failed');
              } finally {
                setIsDiscoveryScanning(false);
                setHasSearched(true);
              }
            }}
          />
        );

     case 'final_recommendation': 
        return selectedRfp ? (
          <FinalRecommendation 
            rfp={selectedRfp}
            // ADD THIS NEW PROP:
            analysisContext={analysisContext} 
            onBack={() => setCurrentView('analysis')}
            onCancel={() => {
              setSelectedRfpId(null);
              setCurrentView('frontpage');
              setProcessingStartTime(null);
              setAnalysisContext(null);
            }}
          />
        ) : null;

      case 'analysis':
        return selectedRfp ? (
          <AnalysisScreen 
            rfp={selectedRfp}
            config={config} 
            onBack={() => setCurrentView('processing')} 
            onCancel={() => {
              setSelectedRfpId(null);
              setCurrentView('frontpage');
              setProcessingStartTime(null);
            }}
            onProceed={() => setCurrentView('final_recommendation')}
          />
        ) : null;

      case 'processing':
        return selectedRfp ? (
          <ProcessingScreen
            rfp={selectedRfp}
            logs={logs.filter(l => processingStartTime && l.timestamp >= processingStartTime)}
            onViewResults={() => handleViewAnalysis(selectedRfp.id)}
            onBack={handleBackToList}
            processingStartTime={processingStartTime}
            priorPhasesDuration={0}
          />
        ) : null;
    }
  };

  // --- GATE 1: AUTHENTICATION ---
  if (!isAuthSessionActive) {
    return (
      <SignInScreen 
        onAuthSuccess={(userData: UserData) => {
          localStorage.setItem('tf_auth_user', JSON.stringify(userData));
          localStorage.setItem('tf_setup_complete', String(userData.is_setup_complete));

          setUser(userData); 
          setIsAuthSessionActive(true);
          
          if (!userData.is_setup_complete) {
            const nextStep = userData.has_pin ? 'TWO_FA_BIND' : 'PIN_SETUP';
            setOnboardingStep(nextStep);
          }
        }} 
      />
    );
  }

  // --- GATE 2: ONBOARDING / CHANGE PIN (UPDATED) ---
  if (onboardingStep !== 'NONE') {
    return (
      <OnboardingWizard 
        step={onboardingStep} 
        email={user?.email || ''}
        isSetupComplete={user?.is_setup_complete}
        onComplete={() => {
          // FIX: Force App to remember you finished the setup!
          setOnboardingStep('NONE');
          if (user) {
             const updatedUser = { ...user, is_setup_complete: true, has_pin: true };
             setUser(updatedUser);
             localStorage.setItem('tf_auth_user', JSON.stringify(updatedUser));
             localStorage.setItem('tf_setup_complete', 'true');
          }
        }} 
        onStepChange={(nextStep: OnboardingStep) => setOnboardingStep(nextStep)}
        onBack={() => {
           if (!user?.is_setup_complete) {
             handleLogout();
           } else {
             setOnboardingStep('NONE');
           }
        }}
      />
    );
  }

  return (
    <div className="h-screen w-full bg-slate-950 flex flex-col overflow-hidden font-sans">
      <Header currentView={currentView} setCurrentView={setCurrentView} />

      <main className="flex-grow relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gold-500/5 blur-[150px] rounded-full pointer-events-none" />
        <div className="h-full w-full p-8 relative z-10 overflow-hidden">
          {renderContent()}
        </div>
      </main>
      
      <HelperBot currentRfp={selectedRfpId ? rfps.find(r => r.id === selectedRfpId) || null : null} />
      
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};
export default App;