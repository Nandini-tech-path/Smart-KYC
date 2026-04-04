import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, Landmark, Smartphone, ShoppingBag, LogOut, RefreshCw } from 'lucide-react';

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('kycToken');
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-slate-900 text-white w-full">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 border-r border-slate-700 hidden md:flex flex-col">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold gradient-text">
            <Shield className="text-indigo-500" />
            <span>SecureKYC</span>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <Link to="/dashboard" className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${location.pathname === '/dashboard' ? 'bg-indigo-600 shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-700'}`}>
            <LayoutDashboard size={20} />
            <span>Home</span>
          </Link>
          <Link to="/dashboard/kyc" className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${location.pathname === '/dashboard/kyc' ? 'bg-indigo-600 shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-700'}`}>
            <Shield size={20} />
            <span>Complete KYC</span>
          </Link>
          <Link to="/dashboard/update-kyc" className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${location.pathname === '/dashboard/update-kyc' ? 'bg-indigo-600 shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-700'}`}>
            <RefreshCw size={20} />
            <span>Update KYC</span>
          </Link>
          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Organization Portals
          </div>
          <Link to="/dashboard/bank" className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${location.pathname === '/dashboard/bank' ? 'bg-indigo-600 shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-700'}`}>
            <Landmark size={20} />
            <span>Bank Portal</span>
          </Link>
          <Link to="/dashboard/upi" className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${location.pathname === '/dashboard/upi' ? 'bg-indigo-600 shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-700'}`}>
            <Smartphone size={20} />
            <span>UPI Portal</span>
          </Link>
          <Link to="/dashboard/ecommerce" className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${location.pathname === '/dashboard/ecommerce' ? 'bg-indigo-600 shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-700'}`}>
            <ShoppingBag size={20} />
            <span>E-commerce Portal</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-700">
          {token ? (
            <div className="flex flex-col gap-2">
              <div className="px-4 py-2 text-sm text-slate-400">
                Logged in as <span className="text-indigo-400 block font-medium">{user.username}</span>
              </div>
              <button 
                onClick={logout}
                className="flex items-center gap-3 px-4 py-2 w-full text-left rounded-lg hover:bg-red-500/10 hover:text-red-400 transition"
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Link to="/login" className="block px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-center font-medium">
                Login
              </Link>
              <Link to="/register" className="block px-4 py-2 rounded-lg border border-indigo-600/30 hover:bg-indigo-600/10 text-center font-medium">
                Register
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 border-b border-slate-700 md:hidden flex items-center justify-between px-6 bg-slate-800">
           <Link to="/" className="flex items-center gap-2 text-xl font-bold gradient-text">
            <Shield className="text-indigo-500" />
            <span>SecureKYC</span>
          </Link>
        </header>
        <div className="p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
