import React, { useState } from 'react';
import { ShieldAlert, Lock, User, KeyRound } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';

interface Props {
  onLogin: (token: string) => void;
}

export const Login: React.FC<Props> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) {
      setError('Please complete the CAPTCHA verification.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://127.0.0.1:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // For the demo, we always send admin/123 to get the real token
        body: JSON.stringify({ username: 'admin', password: '123', captcha_token: captchaToken })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        onLogin(data.token);
      } else {
        setError(data.detail || 'Authentication failed. Backend unavailable.');
      }
    } catch (err) {
      setError('Network error. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1220] bg-cover bg-center" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%)' }}>
      
      {/* Fixed Demo Warning Banner */}
      <div className="fixed top-0 left-0 w-full bg-gov-red text-white text-center py-2 text-sm font-bold tracking-widest uppercase shadow-md z-[1000] border-b-4 border-red-900">
        PROTOTYPE SYSTEM — SYNTHETIC DATA — FOR HACKATHON DEMONSTRATION ONLY — NOT AN OPERATIONAL GOVERNMENT SYSTEM
      </div>

      <div className="w-full max-w-md bg-white border border-gov-border shadow-2xl overflow-hidden mt-12">
        {/* Top Strip */}
        <div className="h-1.5 w-full flex">
          <div className="h-full w-1/3 bg-[#FF9933]"></div>
          <div className="h-full w-1/3 bg-white"></div>
          <div className="h-full w-1/3 bg-[#138808]"></div>
        </div>
        
        <div className="p-8">
          <div className="flex flex-col items-center mb-8 border-b border-gray-200 pb-6">
            <ShieldAlert size={48} className="text-gov-navy mb-4" />
            <h1 className="text-xl font-bold text-gov-navy uppercase tracking-widest text-center">GovNet Secure Portal</h1>
            <h2 className="text-sm font-bold text-gov-text-muted mt-2 text-center uppercase">Predictive Cash-Withdrawal Intelligence System (PCWIS)</h2>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-gov-red p-3 text-xs font-bold uppercase mb-4 text-center rounded-sm">
              {error}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 p-3 text-[11px] text-gov-amber font-mono font-bold text-center mb-6 rounded-sm uppercase leading-relaxed">
            DEMO LOGIN — Use any credentials to proceed. This prototype authenticates as 'admin' automatically to fetch live API data.
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="relative">
              <User size={16} className="absolute left-3 top-3 text-gray-400" />
              <input 
                type="text" 
                placeholder="Officer ID / Badge" 
                className="w-full border border-gov-border pl-10 pr-4 py-2.5 text-sm font-mono text-black focus:outline-none focus:border-gov-navy"
              />
            </div>
            
            <div className="relative">
              <KeyRound size={16} className="absolute left-3 top-3 text-gray-400" />
              <input 
                type="password" 
                placeholder="Secure Password" 
                className="w-full border border-gov-border pl-10 pr-4 py-2.5 text-sm font-mono text-black focus:outline-none focus:border-gov-navy"
              />
            </div>

            <select className="w-full border border-gov-border px-4 py-2.5 text-sm font-bold uppercase text-gov-navy focus:outline-none focus:border-gov-navy bg-white">
              <option>Delhi NCR - Cyber Cell</option>
              <option>UP Police - STF</option>
              <option>I4C HQ Desk</option>
            </select>

            <div className="flex justify-center mt-2 mb-1">
              <ReCAPTCHA
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                onChange={(token) => setCaptchaToken(token)}
                theme="light"
              />
            </div>

            <button type="submit" disabled={loading || !captchaToken} className="gov-btn gov-btn-primary w-full py-3 mt-2 flex items-center justify-center gap-2 text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'AUTHENTICATING...' : <><Lock size={16} /> SECURE SIGN IN</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
