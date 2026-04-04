import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Register from './pages/Register';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Home from './pages/Home';
import CompleteKYC from './pages/CompleteKYC';
import UpdateKYC from './pages/UpdateKYC';
import BankPortal from './pages/BankPortal';
import UPI from './pages/UPI';
import Ecommerce from './pages/Ecommerce';
import { Navigate } from 'react-router-dom';

// Simple Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        {/* Private Dashboard Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Home />} />
          <Route path="kyc" element={<CompleteKYC />} />
          <Route path="update-kyc" element={<UpdateKYC />} />
          <Route path="bank" element={<BankPortal />} />
          <Route path="upi" element={<UPI />} />
          <Route path="ecommerce" element={<Ecommerce />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
