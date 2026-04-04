import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, Lock, Globe, ArrowRight } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-2 group">
          <Shield className="text-indigo-500 group-hover:scale-110 transition shrink-0" size={32} />
          <span className="text-2xl font-black tracking-tighter uppercase italic">SecureKYC</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="px-6 py-2 rounded-full font-bold text-slate-400 hover:text-white transition">Login</Link>
          <Link to="/register" className="px-6 py-2 rounded-full font-bold bg-indigo-600 hover:bg-indigo-700 transition shadow-[0_0_15px_rgba(79,70,229,0.4)]">Sign Up</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-7xl mx-auto px-6 pt-20 pb-32 text-center md:text-left grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-8 animate-in slide-in-from-left-8 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-black uppercase tracking-widest">
            <Zap size={14} /> Powering Digital Trust
          </div>
          <h1 className="text-6xl md:text-7xl font-black leading-tight tracking-tighter">
            Digital Identity <br />
            <span className="gradient-text">for the Future.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-xl leading-relaxed">
            The world's first universal, token-based KYC verification platform. 
            Register once, verify everywhere—without ever sharing your raw personal documents again.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link to="/register" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 px-10 py-4 rounded-xl font-black text-lg hover:bg-indigo-700 transition shadow-2xl">
              Start Verification <ArrowRight size={20} />
            </Link>
            <div className="flex items-center -space-x-4">
               {[1,2,3,4].map(i => (
                 <div key={i} className={`w-10 h-10 rounded-full border-2 border-slate-950 bg-slate-800 flex items-center justify-center text-[10px] font-bold`}>
                    U{i}
                 </div>
               ))}
               <span className="ml-6 text-sm font-bold text-slate-500">10k+ Verified Users</span>
            </div>
          </div>
        </div>
        <div className="relative animate-in zoom-in-75 duration-1000 delay-200">
           <div className="absolute inset-0 bg-indigo-600/20 blur-[120px] rounded-full scale-125" />
           <div className="glass aspect-square rounded-[2rem] border-indigo-500/20 flex flex-col items-center justify-center p-12 text-center space-y-6 relative overflow-hidden group">
              <Shield size={120} className="text-indigo-500 drop-shadow-[0_0_30px_rgba(99,102,241,0.5)] group-hover:scale-110 transition-transform duration-500" />
              <div className="space-y-2">
                 <h3 className="text-2xl font-black italic">TRUSTED IDENTITY</h3>
                 <p className="text-slate-500 text-sm font-mono tracking-widest uppercase">Secured by SHA-256 Anchoring</p>
              </div>
           </div>
        </div>
      </header>

      {/* Feature Grids */}
      <section className="bg-slate-900/50 py-32 border-y border-white/5">
         <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-12">
            {[
              { icon: <Lock className="text-indigo-400" />, title: "Zero Data Leakage", desc: "Organizations only see your verification status, never your personal documents." },
              { icon: <Zap className="text-indigo-400" />, title: "Instant Onboarding", desc: "Single-click verification across banking, UPI, and e-commerce platforms." },
              { icon: <Globe className="text-indigo-400" />, title: "Universal Token", desc: "One secure identity token anchored to your biometric verification." }
            ].map((f, i) => (
              <div key={i} className="space-y-4 group">
                 <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition duration-500 group-hover:text-white text-indigo-400">
                    {f.icon}
                 </div>
                 <h3 className="text-2xl font-bold">{f.title}</h3>
                 <p className="text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
         </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 text-center text-slate-500 text-sm font-bold uppercase tracking-widest">
         &copy; 2026 SECUREKYC NETWORK • ALL IDENTITY RESERVED
      </footer>
    </div>
  );
};

export default Landing;
