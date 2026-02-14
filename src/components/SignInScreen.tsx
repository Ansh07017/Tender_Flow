import React, { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { ShieldCheck, Lock, Activity } from 'lucide-react';
import type { UserData } from '../../types';

interface SignInScreenProps {
  onAuthSuccess: (userData: UserData) => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({ onAuthSuccess }) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!credentialResponse.credential) {
        throw new Error("No credential received from Google");
      }

      // 1. Send Google Token to Backend for Verification & User Status
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: credentialResponse.credential 
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Authentication failed');
      }

      // 2. Receive User Status (Has PIN? Setup Complete?)
      const userData: UserData = await res.json();
      
      // 3. Pass data up to App.tsx to trigger the correct gate (Dashboard vs. Onboarding)
      onAuthSuccess(userData);

    } catch (err: any) {
      console.error("Login Error:", err);
      setError(err.message || "Failed to sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden font-sans">
      
      {/* Background Ambient Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-500/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Main Login Card */}
      <div className="z-10 w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl relative">
        
        {/* Decorative Top Border */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 opacity-50 rounded-t-2xl" />

        <div className="flex flex-col items-center text-center mb-8">
          <div className="h-16 w-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 shadow-lg border border-slate-700">
            <ShieldCheck className="w-8 h-8 text-blue-400" />
          </div>
          
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
            TenderFlow <span className="text-blue-500">Vault</span>
          </h1>
          <p className="text-slate-400 text-sm">
            Secure Procurement Intelligence Console
          </p>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 flex items-center justify-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-300">End-to-End Encrypted</span>
          </div>
          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 flex items-center justify-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-slate-300">Real-time Monitoring</span>
          </div>
        </div>

        {/* Google Login Section */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-center w-full">
            {isLoading ? (
              <div className="flex items-center gap-3 text-slate-400 bg-slate-800 px-6 py-3 rounded-full animate-pulse">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span>Verifying Identity...</span>
              </div>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google Sign-In failed. Please try again.')}
                theme="filled_black"
                shape="pill"
                size="large"
                width="100%"
                text="continue_with"
              />
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-500">
            Restricted Access. Authorized Personnel Only. <br />
            IP Address Logged for Security Audits.
          </p>
        </div>
      </div>
    </div>
  );
};