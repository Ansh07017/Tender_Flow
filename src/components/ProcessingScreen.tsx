import React, { useEffect, useState } from 'react';
import { Rfp, LogEntry, AgentName } from '../../types';

/* =========================
   PIPELINE CONFIG (ALIGNED)
========================= */

const agentPipeline: AgentName[] = [
  'PARSING_ENGINE',
  'TECHNICAL_AGENT',
  'PRICING_AGENT',
  'FINALIZING_AGENT',
];

const agentDisplayNames: Record<AgentName, string> = {
  PARSING_ENGINE: 'Parsing Document',
  TECHNICAL_AGENT: 'Technical Analysis',
  PRICING_AGENT: 'Pricing Analysis',
  FINALIZING_AGENT: 'Finalizing Report',
  MASTER_AGENT: 'Master Agent',
};

/* =========================
   STATUS RESOLUTION LOGIC
========================= */

type PipelineStatus = 'Pending' | 'In Progress' | 'Complete' | 'Error';

const getAgentStatus = (agent: AgentName, rfp: Rfp): PipelineStatus => {
  const agentIndex = agentPipeline.indexOf(agent);

  if (rfp.status === 'Error') {
    return agent === rfp.activeAgent ? 'Error' : 'Pending';
  }

  if (rfp.status === 'Complete') {
    return 'Complete';
  }

  if (!rfp.activeAgent) {
    return 'Pending';
  }

  const activeIndex = agentPipeline.indexOf(rfp.activeAgent);

  if (agentIndex < activeIndex) return 'Complete';
  if (agentIndex === activeIndex) return 'In Progress';

  return 'Pending';
};

/* =========================
   STATUS ICON
========================= */

const StatusIcon: React.FC<{ status: PipelineStatus }> = ({ status }) => {
  switch (status) {
    case 'Complete':
      return (
        <div className="w-6 h-6 rounded-full bg-success-700 text-white flex items-center justify-center font-bold">
          ✓
        </div>
      );
    case 'In Progress':
      return (
        <div className="w-6 h-6 rounded-full bg-accent-700 flex items-center justify-center">
          <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      );
    case 'Error':
      return (
        <div className="w-6 h-6 rounded-full bg-error-700 text-white flex items-center justify-center font-bold">
          !
        </div>
      );
    default:
      return <div className="w-6 h-6 rounded-full bg-base-300" />;
  }
};

/* =========================
   AGENT PIPELINE UI
========================= */

const AgentStatusTracker: React.FC<{ rfp: Rfp }> = ({ rfp }) => (
  <div className="bg-base-200 p-6 rounded-lg border border-base-300 h-full">
    <h3 className="text-lg font-bold mb-4">Agent Pipeline</h3>
    <div className="space-y-4">
      {agentPipeline.map((agent, idx) => {
        const status = getAgentStatus(agent, rfp);
        const isLast = idx === agentPipeline.length - 1;

        return (
          <div key={agent} className="flex items-start">
            <div className="flex flex-col items-center mr-4">
              <StatusIcon status={status} />
              {!isLast && <div className="w-px h-8 bg-base-300 mt-1" />}
            </div>
            <div>
              <p className="font-semibold text-ink-700">
                {agentDisplayNames[agent]}
              </p>
              <p className="text-sm text-ink-500">{status}</p>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

/* =========================
   PARSED DATA PREVIEW
========================= */

const ParsedDataPreview: React.FC<{ rfp: Rfp }> = ({ rfp }) => {
  const parsed = rfp.agentOutputs?.parsedData;
  if (!parsed) return null;

  return (
    <div className="bg-base-100 border border-base-300 rounded-lg p-4 text-sm">
      <h3 className="font-bold mb-2 text-ink-700">
        📄 Parsed RFP Snapshot
      </h3>

      <pre className="flex-grow overflow-auto text-xs bg-base-200 p-3 rounded h-full">
        {JSON.stringify(parsed, null, 2)}
      </pre>
    </div>
  );
};

/* =========================
   MAIN SCREEN
========================= */

// ProcessingScreen.tsx - MAIN SCREEN section
interface ProcessingScreenProps {
  rfp: Rfp;
  logs: LogEntry[];
  onViewResults: () => void;
  onBack: () => void;
  processingStartTime: Date | null;
}

export const ProcessingScreen: React.FC<ProcessingScreenProps> = ({
  rfp,
  onViewResults,
  onBack,
  processingStartTime,
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!processingStartTime) return;

    if (rfp.status === 'Complete' || rfp.status === 'Error') {
      if (rfp.processingDuration) setElapsed(rfp.processingDuration);
      return;
    }

    const timer = setInterval(() => {
      setElapsed(
        Math.round((Date.now() - processingStartTime.getTime()) / 1000)
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [rfp.status, processingStartTime, rfp.processingDuration]);

  return (
    <div className="space-y-4">
      {/* Header with Timer */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">
          Processing RFP:{' '}
          <span className="text-ink-500 font-normal">{rfp.id}</span>
        </h2>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-ink-400">
            Time Elapsed
          </p>
          <p className="text-2xl font-bold text-ink-700">{elapsed}s</p>
        </div>
      </div>

      {/* Simplified Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left Column: Pipeline Tracker */}
        <div className="lg:col-span-1">
          <AgentStatusTracker rfp={rfp} />
        </div>

        {/* Right Column: Parsed Snapshot ONLY */}
        <div className="lg:col-span-2 h-full">
           {/* If data isn't ready, show a cleaner placeholder */}
           {!rfp.agentOutputs?.parsedData ? (
             <div className="bg-base-200 border border-base-300 rounded-lg p-10 h-full flex flex-col items-center justify-center text-center">
                <div className="animate-pulse flex space-x-4 mb-4">
                  <div className="rounded-full bg-base-300 h-12 w-12"></div>
                </div>
                <h3 className="font-bold text-ink-700">Awaiting Agent Extraction...</h3>
                <p className="text-sm text-ink-500">The Parsing Engine is reading document structures.</p>
             </div>
           ) : (
             <ParsedDataPreview rfp={rfp} />
           )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 flex justify-center">
        {rfp.status === 'Complete' && (
          <button
            onClick={onViewResults}
            className="px-6 py-2 bg-success-700 text-white font-bold rounded-lg hover:bg-success-800 transition shadow-md"
          >
            View Analysis Results
          </button>
        )}

        {rfp.status === 'Error' && (
          <div className="text-center">
            <p className="text-error-700 font-semibold">Processing failed.</p>
            <button onClick={onBack} className="mt-2 px-4 py-2 bg-error-700 text-white rounded-lg">
              Back to RFP List
            </button>
          </div>
        )}

        {(rfp.status === 'Parsing' || rfp.status === 'Processing') && (
          <p className="text-ink-500 font-semibold animate-pulse">
            Worker agents are coordinating...
          </p>
        )}
      </div>
    </div>
  );
};
