import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, User } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', formData);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      localStorage.removeItem('kycToken');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md glass p-8 shadow-2xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold gradient-text">Create Account</h1>
          <p className="text-slate-400 mt-2">Join the Universal KYC Identity System</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="relative">
            <User className="absolute left-3 top-3 text-slate-400" size={20} />
            <input
              type="text"
              name="username"
              placeholder="Username"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              onChange={onChange}
              required
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-slate-400" size={20} />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              onChange={onChange}
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
            <input
              type="password"
              name="password"
              placeholder="Password"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              onChange={onChange}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition transform hover:scale-[1.02] disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : (
              <>
                <UserPlus size={20} />
                <span>Register Now</span>
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-slate-400 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium ml-1">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
