import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { ShieldCheck, Mail, ArrowRight, KeyRound } from 'lucide-react';
import type { UserData } from '../../types';

interface SignInScreenProps {
  onAuthSuccess: (userData: UserData) => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<'EMAIL_ENTRY' | 'PIN_ENTRY' | 'OTP_ENTRY'>('EMAIL_ENTRY');
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Check if Email Exists
  const handleEmailSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:3001/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      
      if (data.exists) {
        setMode('PIN_ENTRY');
      } else {
        // New User -> Send OTP to verify email first
        await fetch('http://localhost:3001/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        setMode('OTP_ENTRY');
      }
    } catch (err) {
      setError("Connection failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Verify OTP (For New Users or PIN Reset)
  const handleOtpSubmit = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      
      if (data.success) {
        // OTP Verified -> Log them in (will trigger PIN Setup in App.tsx)
        onAuthSuccess({
            email,
            is_setup_complete: false,
            has_pin: false
        });
      } else {
        setError("Invalid or expired code.");
      }
    } catch (err) {
      setError("Verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Verify PIN (For Returning Users)
  const handlePinLogin = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/vault/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin, mode: 'PIN' }),
      });
      const data = await res.json();
      
      if (data.success) {
        onAuthSuccess({
            email,
            is_setup_complete: true, // Assuming if they have a PIN, they are set up
            has_pin: true
        });
      } else {
        setError("Incorrect PIN.");
      }
    } catch (err) {
      setError("Login failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4 text-blue-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white">TenderFlow Vault</h1>
        </div>

        {/* STEP 1: EMAIL */}
        {mode === 'EMAIL_ENTRY' && (
          <div className="space-y-4">
             <GoogleLogin
                onSuccess={(credentialResponse) => {
                  // Keep your existing Google logic here for speed
                  console.log("Google Success:", credentialResponse);
                }}
                onError={() => setError('Google Sign-In failed')}
                theme="filled_black"
                shape="pill"
            />
            
            <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-700"></div>
                <span className="flex-shrink-0 mx-4 text-slate-500 text-xs">OR CONTINUE WITH EMAIL</span>
                <div className="flex-grow border-t border-slate-700"></div>
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
              <input 
                type="email" 
                placeholder="work@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button 
              onClick={handleEmailSubmit}
              disabled={isLoading || !email}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: PIN ENTRY (Returning User) */}
        {mode === 'PIN_ENTRY' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <div className="text-center">
              <p className="text-slate-400 text-sm mb-4">Welcome back, {email}</p>
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
              <input 
                type="password" 
                maxLength={6}
                placeholder="Enter 6-digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-slate-950 border border-slate-700 text-white pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none tracking-widest"
              />
            </div>
            <button 
              onClick={handlePinLogin}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-all"
            >
              Unlock Vault
            </button>
            <button 
              onClick={() => {
                 // Trigger Forgot PIN Logic
                 fetch('http://localhost:3001/api/auth/send-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                 });
                 setMode('OTP_ENTRY');
              }}
              className="w-full text-slate-500 text-sm hover:text-white transition-colors"
            >
              Forgot PIN?
            </button>
          </div>
        )}

        {/* STEP 3: OTP ENTRY (New User / Reset) */}
        {mode === 'OTP_ENTRY' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <div className="text-center">
              <p className="text-slate-400 text-sm mb-4">We sent a temporary code to <br/><span className="text-white">{email}</span></p>
            </div>
            <input 
              type="text" 
              placeholder="Enter 6-digit Code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white text-center text-2xl tracking-widest py-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button 
              onClick={handleOtpSubmit}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all"
            >
              Verify & Continue
            </button>
            <p className="text-xs text-slate-600 text-center mt-4">
              (Check your server console for the code in this demo)
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 text-red-400 text-sm text-center rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};