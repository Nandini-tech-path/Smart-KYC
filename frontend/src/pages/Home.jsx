import React from 'react';
import { Shield, Zap, Lock, Globe, CheckCircle2, UserCheck, ShieldAlert } from 'lucide-react';

const Home = () => {
  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {/* Hero Section */}
      <div className="glass p-12 relative overflow-hidden border-indigo-500/20 group">
        <div className="absolute top-0 right-0 p-8 opacity-5 overflow-hidden">
           <Shield size={300} />
        </div>
        
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                 <Shield size={24} />
              </div>
              <h1 className="text-4xl font-black gradient-text tracking-tighter">
                SecureKYC – One-Time Identity Verification System
              </h1>
           </div>
           <div className="space-y-4">
             <p className="text-xl text-slate-400 max-w-3xl leading-relaxed">
               Welcome to the future of digital identity. SecureKYC allows you to complete your verification process 
               just once and use that verified status everywhere.
             </p>
             <ul className="grid md:grid-cols-2 gap-4 text-slate-400 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-500" /> Users complete KYC once</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-500" /> System verifies identity securely</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-500" /> A token is generated after verification</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-500" /> This token can be reused across organizations</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-500" /> No need to share personal documents repeatedly</li>
             </ul>
           </div>
        </div>
      </div>

      {/* Process Visualization */}
      <div className="grid md:grid-cols-3 gap-8">
         {[
           { icon: <UserCheck className="text-indigo-400" />, title: "One-Time KYC", desc: "Complete our comprehensive 4-step verification once to anchor your binary identity." },
           { icon: <Lock className="text-indigo-400" />, title: "Zero-Knowledge Proof", desc: "Share your token, not your ID cards. Organizations only receive verification status." },
           { icon: <Globe className="text-indigo-400" />, title: "Multi-Platform Usage", desc: "Instantly link your identity to any partner portal in the ecosystem with a single click." }
         ].map((p, i) => (
           <div key={i} className="glass p-8 border-slate-700/50 hover:border-indigo-500/30 transition-all group">
              <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mb-6 border border-slate-800 shadow-inner group-hover:scale-110 transition">
                 {p.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{p.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{p.desc}</p>
           </div>
         ))}
      </div>

      {/* Feature List & Benefits */}
      <div className="grid lg:grid-cols-2 gap-12 pt-8">
         <div className="space-y-8">
            <h2 className="text-2xl font-black flex items-center gap-3 uppercase italic tracking-tighter">
               <Zap className="text-indigo-500" /> Key Ecosystem Features
            </h2>
            <div className="space-y-4">
               {[
                 "Unified Identity Token (JWT-based)",
                 "SHA-256 Blockchain Hashing Simulation",
                 "Multi-Factor Identity Comparison",
                 "Privacy-Preserving Verification API",
                 "Integrated Anti-Fraud Engine"
               ].map((f, i) => (
                 <div key={i} className="flex items-center gap-4 group">
                    <div className="w-8 h-8 bg-indigo-500/10 rounded-full flex items-center justify-center group-hover:bg-indigo-600 transition">
                       <CheckCircle2 size={16} className="text-indigo-500 group-hover:text-white" />
                    </div>
                    <span className="font-bold text-slate-300">{f}</span>
                 </div>
               ))}
            </div>
         </div>

         <div className="space-y-8">
            <h2 className="text-2xl font-black flex items-center gap-3 uppercase italic tracking-tighter">
               <ShieldAlert className="text-indigo-500" /> System Benefits
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
               {[
                 { title: "No Redundancy", desc: "Stop uploading files repeatedly." },
                 { title: "Enhanced Security", desc: "Reduced attack surface for users." },
                 { title: "Faster Onboarding", desc: "Go from signup to verified in seconds." },
                 { title: "Trust Network", desc: "Cross-organization identity trust." }
               ].map((b, i) => (
                 <div key={i} className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 hover:border-indigo-500/20 transition">
                    <h4 className="font-black text-indigo-400 text-xs uppercase mb-2">{b.title}</h4>
                    <p className="text-slate-500 text-xs leading-relaxed">{b.desc}</p>
                 </div>
               ))}
            </div>
         </div>
      </div>
      
      {/* Network Status */}
      <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-full flex items-center justify-center gap-8 text-[10px] font-mono text-slate-600 uppercase tracking-widest">
         <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Nodes Online: 1,492</span>
         <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Verifications (24h): 12,934</span>
         <span className="flex items-center gap-2 font-black text-indigo-500/80">Protocol Version 4.2.0-STABLE</span>
      </div>
    </div>
  );
};

export default Home;
