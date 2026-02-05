import React, { useState, useCallback } from 'react';
import { RfpListScreen } from './components/RfpListScreen';
import { LogScreen } from './components/LogScreen';
import { ConfigScreen } from './components/ConfigScreen';
import { AnalysisScreen } from './components/AnalysisScreen';
import { ProcessingScreen } from './components/ProcessingScreen';

import type { View } from '../types';
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
    return json.data; // ← FULL backend response
  },
};

/* ------------------------------------------------------------------ */

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('rfps');
  const [rfps, setRfps] = useState<Rfp[]>(initialRfpList);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedRfpId, setSelectedRfpId] = useState<string | null>(null);
  const [config, setConfig] = useState<AppConfig>(initialConfig);
  const [processingStartTime, setProcessingStartTime] = useState<Date | null>(null);

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

  /* ------------------------------------------------------------------
     MAIN PROCESS PIPELINE (Backend-Driven)
  ------------------------------------------------------------------- */
  const processRfp = async (rfpId: string, override?: Rfp) => {
    const rfp = override || rfps.find(r => r.id === rfpId);
    if (!rfp) return;

    const startTime = Date.now();

    try {
      addLog('SYSTEM', `Processing started for ${rfpId}`);

      updateRfpState(rfpId, {
        status: 'Parsing',
        activeAgent: 'PARSING_ENGINE',
      });

      addLog('PARSING_ENGINE', 'Sending document to backend for processing');

      const backendResult = await apiService.parseRFP(rfp.rawDocument);

      //addLog('PARSING_ENGINE', 'Backend processing completed', backendResult);

      updateRfpState(rfpId, {
        status: 'Complete',
        activeAgent: 'FINALIZING_AGENT',
        agentOutputs: backendResult,
        processingDuration: Math.round((Date.now() - startTime) / 1000),
      });

      addLog('FINALIZING_AGENT', 'Report finalized');
      addLog(
        'SYSTEM',
        `Processing completed in ${Math.round(
          (Date.now() - startTime) / 1000
        )}s`
      );
    } catch (err: any) {
      updateRfpState(rfpId, { status: 'Error' });
      addLog('SYSTEM', err.message || 'Processing failed');
    }
  };

  /* -------------------- Logs (current session) -------------------- */
  const processingLogs = logs.filter(
    log => processingStartTime && log.timestamp >= processingStartTime
  );

  /* -------------------- Navigation -------------------- */
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

  const addRfp = (newRfpData: {
    source: 'URL' | 'File';
    content: string;
    fileName?: string;
  }) => {
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

  /* -------------------- Render -------------------- */
  const renderContent = () => {
    const selectedRfp = rfps.find(r => r.id === selectedRfpId);

    switch (currentView) {
      case 'config':
        return <ConfigScreen config={config} setConfig={setConfig} />;

      case 'logs':
        return <LogScreen logs={logs} />;

      case 'analysis':
        return selectedRfp ? (
          <AnalysisScreen rfp={selectedRfp} onBack={handleBackToList} />
        ) : null;

      case 'processing':
        return selectedRfp ? (
          <ProcessingScreen
            rfp={selectedRfp}
            logs={processingLogs}
            onViewResults={() => handleViewAnalysis(selectedRfp.id)}
            onBack={handleBackToList}
            processingStartTime={processingStartTime}
          />
        ) : null;

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
    <div className="min-h-screen font-sans">
      <main className="p-4 md:p-6 lg:p-8">{renderContent()}</main>
    </div>
  );
};

export default App;
