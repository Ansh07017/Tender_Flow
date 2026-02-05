import React, { useEffect, useRef, useState } from 'react';
import { Rfp, LogEntry, AgentName } from '../../types';

/* =========================
   PIPELINE CONFIG
========================= */

const agentPipeline: AgentName[] = [
  'EXTRACTOR',
  'PARSING_ENGINE',
  'SALES_AGENT',
  'TECHNICAL_AGENT',
  'PRICING_AGENT',
  'FINALIZING_AGENT',
];

const agentDisplayNames: Record<AgentName, string> = {
  EXTRACTOR: 'Extracting Text',
  PARSING_ENGINE: 'Parsing Document',
  SALES_AGENT: 'Eligibility Check',
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
  const activeIndex = rfp.activeAgent
    ? agentPipeline.indexOf(rfp.activeAgent)
    : -1;

  if (rfp.status === 'Error') {
    if (agentIndex < activeIndex) return 'Complete';
    if (agentIndex === activeIndex) return 'Error';
    return 'Pending';
  }

  if (rfp.status === 'Complete') {
    return 'Complete';
  }

  if (activeIndex === -1) {
    return 'Pending';
  }

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
          <svg
            className="animate-spin h-4 w-4 text-white"
            viewBox="0 0 24 24"
            fill="none"
          >
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
              <p
                className={`font-semibold ${
                  status === 'In Progress'
                    ? 'text-accent-700'
                    : 'text-ink-700'
                }`}
              >
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
   LOG VIEWER
========================= */

const LogViewer: React.FC<{ logs: LogEntry[] }> = ({ logs }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-base-100 rounded-lg p-4 border border-base-300 h-full flex flex-col font-mono">
      <h3 className="text-md font-semibold mb-2 text-ink-700">
        Live Execution Log
      </h3>
      <div className="flex-grow overflow-y-auto text-xs pr-2 space-y-1">
        {logs.map((log, idx) => (
          <div key={idx} className="flex gap-3">
            <div className="text-ink-400 w-20 shrink-0">
              {log.timestamp.toLocaleTimeString()}
            </div>
            <div className="w-32 shrink-0 font-semibold text-cyan-600">
              [{log.agent}]
            </div>
            <div className="text-ink-600 whitespace-pre-wrap">
              {log.message}
              {log.data && (
                <pre className="mt-1 p-2 bg-base-200 rounded text-ink-700">
                  {log.data}
                </pre>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};

/* =========================
   UTIL
========================= */

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
};

const ParsedDataPreview: React.FC<{ rfp: Rfp }> = ({ rfp }) => {
  const parsed = rfp.agentOutputs.parsedData;
  if (!parsed) return null;

  return (
    <div className="bg-base-100 border border-base-300 rounded-lg p-4 text-sm">
      <h3 className="font-bold mb-2 text-ink-700">
        📄 Parsed RFP Snapshot
      </h3>

      <pre className="max-h-64 overflow-auto text-xs bg-base-200 p-3 rounded">
        {JSON.stringify(parsed, null, 2)}
      </pre>

      <p className="text-xs text-ink-400 mt-2">
        Live parsed output (read-only)
      </p>
    </div>
  );
};

/* =========================
   MAIN SCREEN
========================= */

interface ProcessingScreenProps {
  rfp: Rfp;
  logs: LogEntry[];
  onViewResults: () => void;
  onBack: () => void;
  processingStartTime: Date | null;
}

export const ProcessingScreen: React.FC<ProcessingScreenProps> = ({
  rfp,
  logs,
  onViewResults,
  onBack,
  processingStartTime,
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!processingStartTime) return;

    if (rfp.status === 'Complete' || rfp.status === 'Error') {
      if (rfp.processingDuration) {
        setElapsed(rfp.processingDuration);
      }
      return;
    }

    const timer = setInterval(() => {
      setElapsed(
        Math.round(
          (Date.now() - processingStartTime.getTime()) / 1000
        )
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [rfp.status, processingStartTime, rfp.processingDuration]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">
          Processing RFP:{' '}
          <span className="text-ink-500 font-normal">{rfp.id}</span>
        </h2>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-ink-400">
            Time Elapsed
          </p>
          <p className="text-2xl font-bold text-ink-700">
            {formatDuration(elapsed)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh]">
  <AgentStatusTracker rfp={rfp} />

  <div className="lg:col-span-2 flex flex-col gap-4">
    <LogViewer logs={logs} />

    {(rfp.status === 'Parsing' ||
      rfp.status === 'Processing') && (
      <ParsedDataPreview rfp={rfp} />
    )}
  </div>
</div>


      <div className="pt-4 flex justify-center">
        {rfp.status === 'Complete' && (
          <button
            onClick={onViewResults}
            className="px-6 py-2 bg-success-700 text-white font-bold rounded-lg"
          >
            View Analysis Results
          </button>
        )}

        {rfp.status === 'Error' && (
          <div className="text-center">
            <p className="text-error-700 font-semibold">
              An error occurred during processing.
            </p>
            <button
              onClick={onBack}
              className="mt-2 px-4 py-2 bg-error-700 text-white rounded-lg"
            >
              Back to RFP List
            </button>
          </div>
        )}

        {(rfp.status === 'Extracting' ||
          rfp.status === 'Parsing' ||
          rfp.status === 'Processing') && (
          <p className="text-ink-500 font-semibold">
            Please wait while agents complete their tasks…
          </p>
        )}
      </div>
    </div>
  );
};
