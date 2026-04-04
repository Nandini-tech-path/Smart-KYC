import React, { useState } from 'react';
import axios from 'axios';
import { ShoppingBag, ShieldCheck, ShieldAlert, Key, Search, ShoppingCart, UserCheck } from 'lucide-react';

const Ecommerce = () => {
  const [kycToken, setKycToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [tokenError, setTokenError] = useState(false);

  const verifyToken = async e => {
    if (e) e.preventDefault();
    setTokenError(false);
    setLoading(true);
    setStatus(null);

    const tokenToVerify = kycToken || localStorage.getItem('kycToken');
    if (!tokenToVerify) {
      setLoading(false);
      setTokenError(true);
      return;
    }

    try {
      const res = await axios.post('http://localhost:5000/api/kyc/verify-token', { kycToken: tokenToVerify });
      setStatus({ success: true, ...res.data });
    } catch (err) {
      setStatus({ success: false, ...err.response?.data });
      if (err.response?.status === 401 && err.response?.data?.message?.includes('database')) {
         setTokenError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const useStoredToken = () => {
    setTokenError(false);
    const stored = localStorage.getItem('kycToken');
    if (stored) {
      setKycToken(stored);
    } else {
      setTokenError(true);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500">
      <div className="text-center">
        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700 shadow-xl shadow-orange-500/10">
          <ShoppingCart className="text-orange-500" size={32} />
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">E-commerce KYC Hub</h1>
        <p className="text-slate-400 mt-2">Verified Merchant and Customer Access Control</p>
      </div>

      <div className="glass p-10 border-t-8 border-t-orange-500 shadow-2xl">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Key className="text-orange-400" />
            Marketplace Identity Check
          </h2>
          <button 
            onClick={useStoredToken}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-orange-400 px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-2"
          >
            <UserCheck size={14} /> Link Account Token
          </button>
        </div>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          To prevent fraudulent transactions and support high-value orders, identity verification is required. Paste your secure KYC token below to confirm your status.
        </p>

        <form onSubmit={verifyToken} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input 
              type="text" 
              placeholder="Enter SECURE KYC TOKEN here..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white font-mono text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              value={kycToken}
              onChange={e => {
                setKycToken(e.target.value);
                setTokenError(false);
              }}
              required
            />
            {tokenError && (
              <p className="text-sm text-red-500 mt-2 font-bold animate-in slide-in-from-top-1">Token number is not generated.</p>
            )}
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="px-8 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 h-[58px]"
          >
            {loading ? 'Processing...' : (
              <>
                <ShoppingBag size={20} />
                <span>Verify Access</span>
              </>
            )}
          </button>
        </form>

        {status && (
          <div className={`mt-10 p-8 rounded-2xl border animate-in slide-in-from-bottom-4 duration-500 shadow-xl ${
            status.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-start gap-6">
              <div className={`p-4 rounded-full ${
                status.success ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                {status.success ? (
                  <ShieldCheck className="text-green-500" size={40} />
                ) : (
                  <ShieldAlert className="text-red-500" size={40} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className={`text-2xl font-black tracking-tighter uppercase ${
                    status.success ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {status.status}
                  </h3>
                  {status.success && (
                    <span className="px-3 py-1 bg-green-500/20 text-green-500 text-[10px] font-black rounded uppercase tracking-widest border border-green-500/30">
                       TRUST SCORE: HIGH
                    </span>
                  )}
                </div>
                <p className="text-slate-300 mt-2 font-medium">
                  {status.message}
                </p>
                {status.success && (
                  <div className="mt-6 grid grid-cols-2 gap-4 pt-4 border-t border-green-500/10">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">Verification Proof</p>
                      <p className="text-xs text-slate-300 font-mono mt-1 italic">Anchored via SecureKYC</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">Purchase Eligibility</p>
                      <p className="text-xs text-green-500 font-bold mt-1 tracking-wider uppercase">Unlocked: Max Tier</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-8 mt-12">
        <div className="glass p-8 group hover:border-orange-500 transition-all duration-500">
          <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500 mb-4">
             <ShieldCheck size={28} />
          </div>
          <h4 className="text-white font-bold mb-3 flex items-center gap-2 text-xl tracking-tight">
             Buyer Protection
          </h4>
          <p className="text-slate-400 text-sm leading-relaxed">
            Verify your identity to unlock higher transaction limits and enhanced buyer guarantees. Verified buyers get preferential shipping and standard fraud protection insurance automatically.
          </p>
        </div>
        <div className="glass p-8 group hover:border-orange-500 transition-all duration-500">
          <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500 mb-4">
             <UserCheck size={28} />
          </div>
          <h4 className="text-white font-bold mb-3 flex items-center gap-2 text-xl tracking-tight">
             Merchant Trust
          </h4>
          <p className="text-slate-400 text-sm leading-relaxed">
            Verified accounts attract more business by showing proof of record via the secure KYC system. Merchant verification is mandatory for selling in the 'Luxury' and 'Electronics' categories.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Ecommerce;
