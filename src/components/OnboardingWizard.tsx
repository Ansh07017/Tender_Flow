import React, { useState, useEffect } from 'react';
import { Shield, Key, Smartphone, ArrowRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { OnboardingStep } from '../../types';

interface OnboardingWizardProps {
  step: OnboardingStep;
  email: string;
  onComplete: () => void;
  onStepChange: (step: OnboardingStep) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ 
  step, 
  email, 
  onComplete, 
  onStepChange 
}) => {
  // State for PIN Setup
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  
  // State for 2FA Setup
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');

  // General UI State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- EFFECT: Fetch QR Code when entering 2FA step ---
  useEffect(() => {
    if (step === 'TWO_FA_BIND' && !qrCodeUrl) {
      const fetchQR = async () => {
        setIsLoading(true);
        try {
          const res = await fetch('http://localhost:3001/api/vault/setup-2fa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          const data = await res.json();
          if (data.qrCode) {
            setQrCodeUrl(data.qrCode);
            setManualCode(data.manualCode);
          }
        } catch (err) {
          setError("Failed to generate 2FA QR Code.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchQR();
    }
  }, [step, email, qrCodeUrl]);

  // --- HANDLER: Submit PIN ---
  const handlePinSubmit = async () => {
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      setError("PIN must be exactly 6 digits.");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:3001/api/vault/setup-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin }),
      });

      if (!res.ok) throw new Error("Failed to save PIN.");

      // Success: Move to next step
      onStepChange('TWO_FA_BIND');
    } catch (err) {
      setError("System error saving PIN. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- HANDLER: Verify 2FA ---
  const handle2FAVerify = async () => {
    if (totpCode.length !== 6) {
      setError("Please enter the 6-digit code from your app.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:3001/api/vault/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userCode: totpCode, isSetupMode: true }),
      });

      const data = await res.json();

      if (data.success) {
        onComplete(); // Triggers the dashboard in App.tsx
      } else {
        setError("Invalid code. Please wait for a new code and try again.");
      }
    } catch (err) {
      setError("Verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden font-sans p-4">
      
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10">
        
        {/* Progress Header */}
        <div className="flex items-center justify-center space-x-4 mb-8">
          <div className={`flex items-center gap-2 ${step === 'PIN_SETUP' ? 'text-blue-400' : 'text-slate-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step === 'PIN_SETUP' ? 'border-blue-400 bg-blue-400/10' : 'border-slate-700'}`}>1</div>
            <span className="text-sm font-medium">Secure PIN</span>
          </div>
          <div className="w-8 h-[1px] bg-slate-700" />
          <div className={`flex items-center gap-2 ${step === 'TWO_FA_BIND' ? 'text-blue-400' : 'text-slate-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step === 'TWO_FA_BIND' ? 'border-blue-400 bg-blue-400/10' : 'border-slate-700'}`}>2</div>
            <span className="text-sm font-medium">2FA Link</span>
          </div>
        </div>

        {/* STEP 1: PIN SETUP */}
        {step === 'PIN_SETUP' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4 text-blue-400">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">Set Master PIN</h2>
              <p className="text-slate-400 text-sm mt-2">Create a 6-digit PIN. You will need this to access the Compliance Vault.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enter 6-Digit PIN</label>
                <input 
                  type="password" 
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-center text-2xl tracking-[0.5em] p-4 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-700"
                  placeholder="••••••"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Confirm PIN</label>
                <input 
                  type="password" 
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  className={`w-full bg-slate-950 border border-slate-700 text-white text-center text-2xl tracking-[0.5em] p-4 rounded-lg focus:ring-2 outline-none transition-all placeholder-slate-700 ${pin && confirmPin && pin !== confirmPin ? 'border-red-500' : ''}`}
                  placeholder="••••••"
                />
              </div>
            </div>

            <button 
              onClick={handlePinSubmit}
              disabled={isLoading || pin.length !== 6 || pin !== confirmPin}
              className="w-full mt-8 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continue <ArrowRight className="w-5 h-5" /></>}
            </button>
          </div>
        )}

        {/* STEP 2: 2FA SETUP */}
        {step === 'TWO_FA_BIND' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4 text-emerald-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">Two-Factor Auth</h2>
              <p className="text-slate-400 text-sm mt-2">Scan this code with Google Authenticator or Microsoft Authenticator.</p>
            </div>

            <div className="flex flex-col items-center justify-center mb-6">
              {isLoading && !qrCodeUrl ? (
                <div className="w-48 h-48 bg-slate-800 rounded-xl flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              ) : (
                <div className="p-4 bg-white rounded-xl shadow-lg">
                  {/* QR Code Image */}
                  {qrCodeUrl && <img src={qrCodeUrl} alt="2FA QR Code" className="w-40 h-40" />}
                </div>
              )}
              
              {manualCode && (
                <div className="mt-4 text-center">
                  <p className="text-xs text-slate-500 mb-1">Or enter manual key:</p>
                  <code className="bg-slate-950 px-3 py-1 rounded text-blue-400 text-sm font-mono tracking-wide">{manualCode}</code>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block text-center">Enter 6-Digit Code from App</label>
              <input 
                type="text" 
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-slate-950 border border-slate-700 text-white text-center text-3xl tracking-[0.5em] p-4 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder-slate-700"
                placeholder="000000"
              />
            </div>

            <button 
              onClick={handle2FAVerify}
              disabled={isLoading || totpCode.length !== 6}
              className="w-full mt-6 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify & Complete Setup <CheckCircle className="w-5 h-5" /></>}
            </button>
          </div>
        )}

        {/* Error Message Toast */}
        {error && (
          <div className="mt-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span className="text-red-400 text-sm font-medium">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};