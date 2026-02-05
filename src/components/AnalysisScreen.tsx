import React, { useState, useMemo } from 'react';
import { Rfp } from '../../types';
import { ImpactSummary } from './ImpactSummary';
import { FinalRecommendation } from './FinalRecommendation';

const AgentSection: React.FC<{ title: string; agentName: string; children: React.ReactNode }> = ({ title, agentName, children }) => (
  <div className="bg-base-200 p-6 rounded-lg shadow-sm border border-base-300">
    <div className="border-b border-base-300 pb-3 mb-4">
      <h3 className="text-xl font-bold text-ink-700">{title}</h3>
      <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mt-1">
        Handled by: {agentName}
      </p>
    </div>
    <div className="space-y-4 text-sm text-ink-700">{children}</div>
  </div>
);
const CertificationBadge: React.FC<{ cert: string }> = ({ cert }) => (
  <span className="bg-base-300 text-ink-600 text-xs px-2 py-1 rounded-full">
    {cert}
  </span>
);

const DataPair: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">{label}</p>
    <p className="font-medium text-lg">{children}</p>
  </div>
);

const Pill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="bg-accent-100 text-accent-700 text-sm font-semibold px-2.5 py-0.5 rounded-full">
    {children}
  </span>
);

const StoreMasterLabel = () => (
  <p className="text-xs text-ink-400 mt-1">
    Source: Store Master (verified pricing & availability)
  </p>
);

const getComplianceStatusIcon = (status: 'Found' | 'Referenced' | 'NotFound') => {
  if (status === 'Found' || status === 'Referenced') {
    return <span className="text-success-400 font-bold">✓</span>;
  }
  return <span className="text-warning-400 font-bold">⚠</span>;
};

const getEligibilityStatusIcon = (status: 'Pass' | 'Warn' | 'Info' | 'Fail') => {
  if (status === 'Pass') return '✅';
  if (status === 'Warn') return '⚠️';
  if (status === 'Fail') return '❌';
  return 'ℹ️';
};

const getRiskIcon = (level: 'Low' | 'Medium' | 'High') => {
  if (level === 'Low') return '🟢';
  if (level === 'Medium') return '🟠';
  return '🔴';
};

export const AnalysisScreen: React.FC<{ rfp: Rfp; onBack: () => void }> = ({ rfp, onBack }) => {
  const { parsedData, technicalAnalysis, pricing, eligibilityAnalysis, riskAnalysis } =
    rfp.agentOutputs;

  const isBidClosed = parsedData?.metadata?.isBidClosed === true;

  /* ---------------- Compliance State ---------------- */

  const initialComplianceState = useMemo(() => {
    return (
      technicalAnalysis?.lineItemAnalyses.map((analysis) =>
        analysis.complianceChecks.map((check) => ({ ...check }))
      ) || []
    );
  }, [technicalAnalysis]);

  const [lineItemComplianceChecks, setLineItemComplianceChecks] =
    useState(initialComplianceState);

  const handleVerificationChange = (lineItemIndex: number, checkIndex: number) => {
    const updated = [...lineItemComplianceChecks];
    updated[lineItemIndex][checkIndex].verified =
      !updated[lineItemIndex][checkIndex].verified;
    setLineItemComplianceChecks(updated);
  };

  const allVerified = useMemo(
    () => lineItemComplianceChecks.flat().every((c) => c.verified),
    [lineItemComplianceChecks]
  );

  /* ---------------- UI ---------------- */

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={onBack}
          className="text-sm text-accent-700 hover:underline mb-2 font-semibold"
        >
          ← Back to RFP List
        </button>

        <h2 className="text-2xl font-bold">
          Analysis Report:{' '}
          <span className="font-semibold text-ink-400">{rfp.id}</span>
        </h2>
      </div>

      {/* 🔴 BID CLOSED WARNING */}
      {isBidClosed && (
        <div className="bg-error-100 border border-error-400 p-4 rounded-lg text-error-700 font-semibold">
          🚫 This bid is already closed. Analysis shown for reference only.
        </div>
      )}

      <ImpactSummary rfp={rfp} />

      {/* ================= SALES AGENT ================= */}
      {parsedData && (
        <AgentSection title="RFP Discovery & Eligibility" agentName="SALES_AGENT">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <DataPair label="Bid Number">{parsedData.metadata.bidNumber}</DataPair>
            <DataPair label="Organisation">
              {parsedData.metadata.issuingOrganization}
            </DataPair>
            <DataPair label="Bid Type">
              <Pill>{parsedData.metadata.bidType}</Pill>
            </DataPair>
            <DataPair label="Bid End Date">
              {parsedData.metadata.bidEndDate}
            </DataPair>
            <DataPair label="Offer Validity">
              {parsedData.metadata.offerValidity} days
            </DataPair>
            <DataPair label="Item Category">
              {parsedData.metadata.itemCategory ?? 'N/A'}
            </DataPair>
            <DataPair label="Total Quantity">
              {parsedData.metadata.totalQuantity ?? 'N/A'}
            </DataPair>
            <DataPair label="Consignee">
              {parsedData.consignee.split(',')[0]}
            </DataPair>
          </div>

          {eligibilityAnalysis && eligibilityAnalysis.length > 0 && (
            <div className="mt-4 p-4 bg-base-100 rounded-md border border-base-300">
              <h4 className="font-bold mb-2">Eligibility Snapshot</h4>
              <ul className="space-y-2">
                {eligibilityAnalysis.map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    {getEligibilityStatusIcon(item.status)}
                    <span>
                      <strong>{item.criterion}:</strong> {item.statusText}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </AgentSection>
      )}

      {/* ================= TECHNICAL AGENT ================= */}
      {technicalAnalysis?.lineItemAnalyses && (
        <AgentSection
          title="SKU Matching & Specification Alignment"
          agentName="TECHNICAL_AGENT"
        >
          <p className="text-xs text-ink-400 mb-3">
            Human-in-the-loop verification required.
          </p>

          {technicalAnalysis.lineItemAnalyses.map((analysis, lineItemIndex) => (
            <div
              key={lineItemIndex}
              className="p-4 bg-base-100 rounded-lg border border-base-300"
            >
              <h4 className="font-bold text-lg">
                Line Item {lineItemIndex + 1}: {analysis.rfpLineItem.name}
              </h4>

              <p className="text-sm mb-3">
                Required Quantity: {analysis.rfpLineItem.quantity}
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-semibold mb-2">Compliance Checklist</h5>
                  {(lineItemComplianceChecks[lineItemIndex] || []).map(
                    (check, checkIndex) => (
                      <label
                        key={checkIndex}
                        className="flex items-center gap-2 mb-2"
                      >
                        <input
                          type="checkbox"
                          checked={check.verified}
                          onChange={() =>
                            handleVerificationChange(lineItemIndex, checkIndex)
                          }
                        />
                        {getComplianceStatusIcon(check.status)}
                        <span>
                          {check.standard} – <strong>{check.source}</strong>
                        </span>
                      </label>
                    )
                  )}
                </div>
                {/* ===== CERTIFICATIONS (INFORMATIONAL) ===== */}
{analysis.rfpLineItem.certifications &&
  analysis.rfpLineItem.certifications.length > 0 && (
    <div className="mt-4 p-3 bg-base-200 rounded-md">
      <p className="text-xs font-semibold text-ink-500 uppercase mb-2">
        Certifications Detected (RFP)
      </p>

      <div className="space-y-2">
        {analysis.rfpLineItem.certifications.map((cert, certIndex) => (
          <label
            key={certIndex}
            className="flex items-center gap-3 text-sm"
          >
            <input
              type="checkbox"
              checked={cert.verified ?? false}
              onChange={() => {
                cert.verified = !cert.verified;
              }}
            />

            <CertificationBadge cert={cert.name} />

            <span className="text-ink-500">
              Source: {cert.source}
            </span>
          </label>
        ))}
      </div>

      <p className="text-xs text-ink-400 mt-2">
        Certifications do not affect SKU match score. Used for compliance &
        risk visibility only.
      </p>
    </div>
)}


                <div className="bg-base-200 p-3 rounded">
                  <p className="text-xs uppercase">Selected SKU</p>
                  <p className="font-bold text-lg text-accent-700">
                    {analysis.selectedSku.skuId}
                  </p>
                  <p className="text-xs">
                    {analysis.selectedSku.productName} (
                    {analysis.selectedSku.matchPercentage?.toFixed(0)}% match)
                  </p>
                </div>
              </div>
            </div>
          ))}
        </AgentSection>
      )}

      {/* ================= PRICING AGENT ================= */}
      {pricing && (
        <AgentSection title="Cost, Logistics & Compliance" agentName="PRICING_AGENT">
          <StoreMasterLabel />

          <ul className="divide-y divide-base-300">
            {Object.entries(pricing).map(([key, value]) => (
              <li key={key} className="py-2 flex justify-between">
                <span>{key}</span>
                <span className="font-semibold">
                  {(value as number).toLocaleString('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                  })}
                </span>
              </li>
            ))}
          </ul>
        </AgentSection>
      )}

      {/* ================= RISK ================= */}
      {riskAnalysis && (
        <div className="bg-base-200 p-6 rounded-lg border border-warning-400">
          <h3 className="font-bold mb-3">Key Risks</h3>
          {riskAnalysis.map((risk, i) => (
            <div key={i} className="flex gap-2 mb-2">
              {getRiskIcon(risk.riskLevel)}
              <span>
                <strong>{risk.category}:</strong> {risk.statement}
              </span>
            </div>
          ))}
        </div>
      )}

      <FinalRecommendation rfp={rfp} />

      {/* ================= FINAL ACTION ================= */}
      <div className="text-center mt-6">
        <button
          disabled={!allVerified || isBidClosed}
          className="bg-success-600 text-white px-8 py-3 rounded-lg font-bold disabled:bg-base-300"
        >
          Finalize & Approve Report
        </button>

        {isBidClosed && (
          <p className="text-error-400 mt-2">
            Bid closed — submission disabled
          </p>
        )}
      </div>
    </div>
  );
};
