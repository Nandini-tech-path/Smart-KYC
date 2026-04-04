import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Shield, Upload, CheckCircle, AlertTriangle, Cpu, Copy, 
  ExternalLink, User, CreditCard, MapPin, Camera, ArrowRight, ArrowLeft, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';

const UpdateKYC = () => {
  const [kycStatus, setKycStatus] = useState('NOT_SUBMITTED');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const webcamRef = React.useRef(null);
  const [faceModelsLoaded, setFaceModelsLoaded] = useState(false);
  const [faceMatchResult, setFaceMatchResult] = useState(null); 
  const [faceMatchMessage, setFaceMatchMessage] = useState('');
  
  // Pre-filled data to simulate Update Mode
  const [formData, setFormData] = useState({
    name: 'John Doe',
    dob: '1990-01-01',
    gender: 'Male',
    nationality: 'Indian',
    idType: 'aadhaar',
    documentId: '123456789012',
    address: '123, Block C, Tech Park',
    city: 'Bangalore',
    state: 'Karnataka',
    zip: '560001'
  });

  const [files, setFiles] = useState({
    idProof: null,
    addressProof: null,
    selfie: null,
    passportPhoto: null
  });

  const [cachedDocs, setCachedDocs] = useState({});

  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [verifyingDoc, setVerifyingDoc] = useState(false);
  const [docError, setDocError] = useState('');
  const [duplicateError, setDuplicateError] = useState(false);
  const [classification, setClassification] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchKycStatus();
    loadFaceModels();
  }, []);

  const loadFaceModels = async () => {
    try {
      console.log('Loading face models...');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models')
      ]);
      setFaceModelsLoaded(true);
      console.log('Face models loaded successfully');
    } catch (err) {
      console.error('Error loading face models:', err);
    }
  };

  const fetchKycStatus = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/kyc/status', {
        headers: { 'x-auth-token': token }
      });
      
      const { kycUpdateCount, lastKycUpdateDate, status, isKycVerified } = res.data;
      setResult(res.data);
      
      if (status !== 'NOT_SUBMITTED') {
        const lastDate = lastKycUpdateDate ? new Date(lastKycUpdateDate) : null;
        const now = new Date();
        const oneDayMs = 24 * 60 * 60 * 1000;
        const diffMs = lastDate ? now - lastDate : Infinity;
        
        if (kycUpdateCount >= 5 && diffMs < oneDayMs) {
          // Locked out
          setKycStatus(isKycVerified ? 'VERIFIED' : 'FAILED');
          setError(`Update limit reached (5/5). Please try again after 24 hours.`);
        } else {
          // Open for updates
          // Pre-fill form if needed or let user modify
        }

        setFormData({
          name: res.data.name || '',
          dob: res.data.dob || '',
          gender: res.data.gender || '',
          nationality: res.data.nationality || '',
          idType: 'aadhaar', 
          documentId: res.data.documentId || '',
          address: res.data.address || '',
          city: res.data.city || '',
          state: res.data.state || '',
          zip: res.data.zip || ''
        });
      }
    } catch (err) {
      console.error('Error fetching KYC status');
    } finally {
      setLoading(false);
    }
  };

  const onTextChange = e => {
    let value = e.target.value;
    if (e.target.name === 'documentId') {
      value = value.toUpperCase();
    }
    setFormData({ ...formData, [e.target.name]: value });
  };
  
  const onDOBChange = e => {
    let value = e.target.value.replace(/\D/g, ''); 
    if (value.length > 8) value = value.slice(0, 8); 
    
    let formatted = value;
    if (value.length > 2) {
      formatted = value.slice(0, 2) + '/' + value.slice(2);
    }
    if (value.length > 4) {
      formatted = formatted.slice(0, 5) + '/' + formatted.slice(5);
    }
    
    setFormData({ ...formData, dob: formatted });
  };

  const onFileChange = e => setFiles({ ...files, [e.target.name]: e.target.files[0] });

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);

  const captureSelfie = React.useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
          setFiles(prev => ({ ...prev, selfie: file }));
        });
    }
  }, [webcamRef]);
  
  const retakeSelfie = () => {
    setFiles(prev => ({ ...prev, selfie: null }));
    setFaceMatchResult(null);
    setFaceMatchMessage('');
  };

  const removePassportPhoto = () => {
    setFiles(prev => ({ ...prev, passportPhoto: null }));
    setFaceMatchResult(null);
    setFaceMatchMessage('');
  };

  // Auto-run face match whenever both images are ready
  useEffect(() => {
    if (files.selfie && files.passportPhoto && faceModelsLoaded) {
      compareFaces(files.selfie, files.passportPhoto);
    }
  }, [files.selfie, files.passportPhoto, faceModelsLoaded]);

  const compareFaces = async (selfieFile, passportFile) => {
    setFaceMatchResult('loading');
    setFaceMatchMessage('');
    try {
      const toImg = (file) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });

      const [selfieImg, passportImg] = await Promise.all([toImg(selfieFile), toImg(passportFile)]);
      const opts = new faceapi.TinyFaceDetectorOptions();

      const selfieDesc = await faceapi.detectSingleFace(selfieImg, opts)
        .withFaceLandmarks().withFaceDescriptor();
      const passportDesc = await faceapi.detectSingleFace(passportImg, opts)
        .withFaceLandmarks().withFaceDescriptor();

      if (!selfieDesc) {
        setFaceMatchResult('error');
        setFaceMatchMessage('No face detected in the selfie. Please retake your photo.');
        return;
      }
      if (!passportDesc) {
        setFaceMatchResult('error');
        setFaceMatchMessage('No face detected in the passport photo. Please upload a clear front-facing photo.');
        return;
      }

      const distance = faceapi.euclideanDistance(selfieDesc.descriptor, passportDesc.descriptor);
      
      if (distance < 0.5) {
        setFaceMatchResult('match');
        setFaceMatchMessage(`Identity confirmed! Face similarity score: ${((1 - distance) * 100).toFixed(1)}%`);
      } else {
        setFaceMatchResult('no_match');
        setFaceMatchMessage('Faces do not match. Please retake your selfie or upload a different passport photo.');
      }
    } catch (err) {
      console.error('[FaceMatch] Error:', err);
      setFaceMatchResult('error');
      setFaceMatchMessage('Face comparison failed. Please try again.');
    }
  };

  const onSubmit = async e => {
    e.preventDefault();
    setVerifying(true);
    setError('');

    const data = new FormData();
    // Append all text fields
    Object.keys(formData).forEach(key => data.append(key, formData[key]));
    // Append files
    if (files.idProof) data.append('idProof', files.idProof);
    if (files.addressProof) data.append('addressProof', files.addressProof);
    if (files.selfie) data.append('selfie', files.selfie);
    if (files.passportPhoto) data.append('passportPhoto', files.passportPhoto);

    try {
      // Simulate AI Processing time for realism
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      const res = await axios.post('http://localhost:5000/api/kyc/update', data, {
        headers: { 
          'x-auth-token': token,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setResult(res.data);
      localStorage.setItem('kycToken', res.data.kycToken); // Store for portals
      setKycStatus('VERIFIED');
    } catch (err) {
      setError(err.response?.data?.message || 'KYC Submission failed');
      if (err.response?.data?.fraudFlag) {
        setKycStatus('FRAUD');
      }
    } finally {
      setVerifying(false);
    }
  };

  const copyToken = () => {
    const tokenToCopy = result?.kycToken || localStorage.getItem('kycToken');
    if (tokenToCopy) {
      navigator.clipboard.writeText(tokenToCopy);
      alert('KYC Token copied to clipboard!');
    }
  };

  const idTypes = [
    { id: 'aadhaar', label: 'Aadhaar Card', placeholder: 'Enter Aadhaar Number', pattern: '^\\d{12}$', errorMsg: 'Aadhaar must be exactly 12 digits' },
    { id: 'pan', label: 'PAN Card', placeholder: 'Enter PAN Number', pattern: '^[A-Z]{5}[0-9]{4}[A-Z]{1}$', errorMsg: 'Format must be ABCDE1234F' },
    { id: 'voter', label: 'Voter ID', placeholder: 'Enter Voter ID Number', pattern: '.*', errorMsg: 'Invalid Voter ID' }
  ];

  if (loading) return <div className="text-center py-20 text-slate-400 animate-pulse">Loading Identity Data...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <RefreshCw className="text-indigo-400" /> Update KYC Details
          </h1>
          <p className="text-slate-400 mt-1">Review and modify your identity documents for re-verification</p>
        </div>
        <div className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 self-start ${
          kycStatus === 'VERIFIED' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 
          kycStatus === 'FRAUD' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 
          'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            kycStatus === 'VERIFIED' ? 'bg-green-400 animate-pulse' : 
            kycStatus === 'FRAUD' ? 'bg-red-400' : 
            'bg-indigo-400 animate-pulse'
          }`} />
          {kycStatus === 'NOT_SUBMITTED' ? 'Update Mode Active' : kycStatus}
        </div>
      </div>

      {result && result.kycUpdateCount !== undefined && (
        <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
           <div className="text-xs uppercase font-black tracking-widest text-slate-500">Update Attempts</div>
           <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-1000 ${result.kycUpdateCount >= 5 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-indigo-500'}`} style={{ width: `${(result.kycUpdateCount / 5) * 100}%` }}></div>
           </div>
           <div className={`text-sm font-bold ${result.kycUpdateCount >= 5 ? 'text-red-400' : 'text-indigo-400'}`}>
              {result.kycUpdateCount}/5
           </div>
           {result.kycUpdateCount >= 5 && (
             <div className="text-[10px] text-red-500 font-bold uppercase animate-pulse">
               Locked for 24h
             </div>
           )}
        </div>
      )}

      {error && (
        <div className="glass border-l-4 border-l-red-500 p-6 flex items-start gap-4 animate-in slide-in-from-top-4">
           <AlertTriangle className="text-red-500 flex-shrink-0" size={24} />
           <div>
              <h3 className="text-red-500 font-bold">Access Restricted</h3>
              <p className="text-slate-400 text-sm mt-1">{error}</p>
           </div>
        </div>
      )}

      {kycStatus === 'NOT_SUBMITTED' && !verifying && !error && (
        <div className="max-w-3xl mx-auto">
          {/* Progress Indicator */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3, 4].map(num => (
                <div key={num} className="flex flex-col items-center flex-1 relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-500 z-10 ${
                    currentStep >= num ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {currentStep > num ? <CheckCircle size={20} /> : num}
                  </div>
                  <span className={`text-[10px] mt-2 font-semibold uppercase tracking-tighter ${currentStep >= num ? 'text-indigo-400' : 'text-slate-600'}`}>
                    {num === 1 ? 'Personal' : num === 2 ? 'Identity' : num === 3 ? 'Address' : 'Face'}
                  </span>
                  {num < 4 && (
                    <div className={`absolute left-1/2 top-5 w-full h-[2px] -z-0 transition-all duration-700 ${
                      currentStep > num ? 'bg-indigo-600' : 'bg-slate-800'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="glass p-8 border-t-4 border-t-indigo-500 shadow-2xl transition-all duration-500">
            <form onSubmit={onSubmit} className="space-y-6">
              
              {/* Step 1: Personal Details */}
              <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <User className="text-indigo-400" size={24} />
                    <h2 className="text-xl font-bold">Personal Details</h2>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400">Full Name (As per ID)</label>
                      <input 
                        type="text" name="name" value={formData.name} required 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        onChange={onTextChange} placeholder="e.g. John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400">Date of Birth</label>
                      <input 
                        type="text" 
                        name="dob" 
                        value={formData.dob} 
                        required 
                        maxLength={10}
                        placeholder="DD/MM/YYYY"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        onChange={onDOBChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400">Gender</label>
                      <select 
                        name="gender" value={formData.gender} required 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        onChange={onTextChange}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400">Nationality</label>
                      <input 
                        type="text" name="nationality" value={formData.nationality} required 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        onChange={onTextChange} placeholder="e.g. Indian"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="button" onClick={nextStep} className="flex items-center gap-2 bg-indigo-600 px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 transition">
                      Next Step <ArrowRight size={18} />
                    </button>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>

              {/* Step 2: Identity Verification */}
              <AnimatePresence mode="wait">
              {currentStep === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <CreditCard className="text-indigo-400" size={24} />
                    <h2 className="text-xl font-bold">Identity Verification</h2>
                  </div>
                  
                  {/* Document Type Tabs */}
                  <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
                    {idTypes.map(type => (
                      <button 
                        key={type.id}
                        type="button"
                        onClick={() => {
                          const newCache = { ...cachedDocs, [formData.idType]: { documentId: formData.documentId, idProof: files.idProof } };
                          setCachedDocs(newCache);
                          setFormData({...formData, idType: type.id, documentId: newCache[type.id]?.documentId || ''});
                          setFiles({...files, idProof: newCache[type.id]?.idProof || null});
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${formData.idType === type.id ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(79,70,229,0.5)]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl flex items-start gap-3">
                      <Shield className="text-indigo-400 mt-1 flex-shrink-0" size={18} />
                      <div className="text-xs text-slate-300 leading-relaxed">
                        <p className="font-bold text-indigo-300 mb-1">Tips for Instant Approval:</p>
                        <ul className="list-disc ml-4 space-y-1">
                          <li>Ensure the document headers (e.g., "Income Tax Dept", "UIDAI") are fully visible.</li>
                          <li>Avoid glare or shadows over the Name and ID number.</li>
                          <li>Place the document on a flat, dark background for better contrast.</li>
                        </ul>
                      </div>
                    </div>

                    {idTypes.filter(type => type.id === formData.idType).map(activeType => (
                      <div key={activeType.id} className="p-6 bg-slate-800/50 border border-slate-700 rounded-xl space-y-6 animate-in fade-in duration-300">
                        <div className="space-y-2 relative">
                          <label className="text-sm font-medium text-slate-400">{activeType.label} Number</label>
                          <div className="relative">
                            <input 
                              type="text" name="documentId" value={formData.documentId} required 
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none pr-10 uppercase transition-all"
                              onChange={onTextChange} placeholder={activeType.placeholder}
                            />
                            {formData.documentId.match(new RegExp(activeType.pattern)) && formData.documentId.length > 0 && (
                              <CheckCircle className="absolute right-3 top-3 text-green-500 animate-in zoom-in duration-300" size={20} />
                            )}
                          </div>
                          {formData.documentId.length > 0 && !formData.documentId.match(new RegExp(activeType.pattern)) && (
                            <p className="text-xs text-red-400 mt-1 animate-in slide-in-from-top-1">{activeType.errorMsg}</p>
                          )}
                          {docError && (
                            <p className="text-sm text-red-500 mt-2 bg-red-500/10 p-2 rounded border border-red-500/20 animate-in slide-in-from-top-1 font-bold flex items-center gap-2">
                              <AlertTriangle size={14} /> {docError}
                            </p>
                          )}

                          {duplicateError && (
                            <p className="text-xs text-red-500 mt-1 animate-in slide-in-from-top-1 font-bold">This {activeType.label} is already registered.</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-400">Upload {activeType.label} {(activeType.id === 'aadhaar' || activeType.id === 'voter') ? '(Front & Back)' : ''}</label>
                          <div className="group border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-indigo-500 transition-all cursor-pointer bg-slate-900/50 hover:bg-indigo-500/5">
                            <input type="file" name="idProof" className="hidden" id="id-upload" onChange={onFileChange} required accept=".pdf,.jpg,.jpeg,.png" />
                            <label htmlFor="id-upload" className="cursor-pointer flex flex-col items-center">
                              {files.idProof ? (
                                <div className="w-16 h-16 rounded-xl bg-green-500/20 text-green-500 flex items-center justify-center mb-3">
                                  <CheckCircle size={32} />
                                </div>
                              ) : (
                                <Upload className="mb-3 transition-colors text-slate-500 group-hover:text-indigo-400" size={40} />
                              )}
                              <span className="text-sm font-semibold">{files.idProof ? files.idProof.name : 'Click to upload (Front & Back if applicable)'}</span>
                              <span className="text-xs text-slate-500 mt-2">PDF, JPG, PNG supported (Max 5MB)</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between">
                    <button type="button" onClick={prevStep} className="flex items-center gap-2 text-slate-400 hover:text-white transition">
                      <ArrowLeft size={18} /> Back
                    </button>
                    <button 
                      type="button" 
                      disabled={verifyingDoc}
                      onClick={async () => {
                        const activeType = idTypes.find(t => t.id === formData.idType);
                        if(formData.documentId.match(new RegExp(activeType.pattern)) && formData.documentId.length > 0 && files.idProof) {
                          setVerifyingDoc(true);
                          setDocError('');
                          setDuplicateError(false);
                          
                          const verifyData = new FormData();
                          verifyData.append('idProof', files.idProof);
                          verifyData.append('documentId', formData.documentId);
                          verifyData.append('idType', formData.idType);
                          verifyData.append('name', formData.name);
                          verifyData.append('dob', formData.dob);

                          try {
                            const verifyRes = await axios.post('http://localhost:5000/api/kyc/verify-document', verifyData, {
                              headers: { 
                                'x-auth-token': token,
                                'Content-Type': 'multipart/form-data'
                              }
                            });
                            
                            if (verifyRes.data.status === 'VERIFIED') {
                              setClassification(verifyRes.data.classification);
                              // Add a small delay so user sees the AI classification result
                              setTimeout(() => {
                                nextStep();
                              }, 1500);
                            }
                          } catch (err) {
                            console.error('Document verification failed', err);
                            const msg = err.response?.data?.message || 'Verification failed. Please try a clearer image.';
                            setDocError(msg);
                            if (err.response?.data?.errorType === 'DUPLICATE_ID') {
                              setDuplicateError(true);
                            }
                          } finally {
                            setVerifyingDoc(false);
                          }
                        } else {
                          if (!files.idProof) alert('Please upload your document first.');
                          else if (!formData.documentId.match(new RegExp(activeType.pattern))) alert('Please enter a valid ID number.');
                        }
                      }} 
                      className="flex items-center gap-2 bg-indigo-600 px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {verifyingDoc ? (
                        <>
                          <Cpu className="animate-spin" size={18} /> Verifying...
                        </>
                      ) : (
                        <>
                          Next Step <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>

              {/* Step 3: Address Verification */}
              <AnimatePresence mode="wait">
              {currentStep === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <MapPin className="text-indigo-400" size={24} />
                    <h2 className="text-xl font-bold">Address Proof</h2>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-sm font-medium text-slate-400">Residential Address</label>
                      <textarea 
                        name="address" value={formData.address} required 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                        onChange={onTextChange} placeholder="House No, Street, Landmark..."
                      ></textarea>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400">City</label>
                      <input 
                        type="text" name="city" value={formData.city} required 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        onChange={onTextChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400">State / Province</label>
                      <input 
                        type="text" name="state" value={formData.state} required 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        onChange={onTextChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400">Postal / Zip Code</label>
                      <input 
                        type="text" name="zip" value={formData.zip} required 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        onChange={onTextChange}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Upload Address Proof (Utility Bill / Bank Statement)</label>
                    <div className="group border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-indigo-500 transition-all cursor-pointer bg-slate-900/50 hover:bg-indigo-500/5">
                      <input type="file" name="addressProof" className="hidden" id="address-upload" onChange={onFileChange} required />
                      <label htmlFor="address-upload" className="cursor-pointer flex flex-col items-center">
                        <Upload className={`mb-3 transition-colors ${files.addressProof ? 'text-green-500' : 'text-slate-500 group-hover:text-indigo-400'}`} size={40} />
                        <span className="text-sm font-semibold">{files.addressProof ? files.addressProof.name : 'Click to upload proof of address'}</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <button type="button" onClick={prevStep} className="flex items-center gap-2 text-slate-400 hover:text-white transition">
                      <ArrowLeft size={18} /> Back
                    </button>
                    <button type="button" onClick={nextStep} className="flex items-center gap-2 bg-indigo-600 px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 transition">
                      Next Step <ArrowRight size={18} />
                    </button>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>

              {/* Step 4: Face Verification */}
              <AnimatePresence mode="wait">
              {currentStep === 4 && (
                <motion.div 
                  key="step4"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Camera className="text-indigo-400" size={24} />
                    <h2 className="text-xl font-bold">Face Verification</h2>
                  </div>
                  <div className="p-6 bg-indigo-500/5 rounded-xl border border-indigo-500/20">
                    <p className="text-sm text-slate-400 italic">
                      "Please ensure you are in a well-lit area and looking directly at the camera."
                    </p>
                  </div>
                  <div className="space-y-4 flex flex-col items-center">
                    {!files.selfie ? (
                      <div className="relative rounded-2xl overflow-hidden border-4 border-slate-700 w-full max-w-sm aspect-[3/4] bg-slate-900 shadow-2xl">
                        <Webcam
                          audio={false}
                          ref={webcamRef}
                          screenshotFormat="image/jpeg"
                          videoConstraints={{ facingMode: "user" }}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 pointer-events-none border-[1px] border-indigo-500/30">
                           <div className="absolute top-[20%] left-[20%] right-[20%] bottom-[20%] border-2 border-dashed border-white/50 rounded-[40%]"></div>
                        </div>
                        <button
                          type="button"
                          onClick={captureSelfie}
                          className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white text-slate-900 w-16 h-16 rounded-full flex items-center justify-center font-bold shadow-xl hover:scale-105 active:scale-95 transition-all outline outline-4 outline-white/30"
                        >
                          <Camera size={24} />
                        </button>
                      </div>
                    ) : (
                      <div className="relative rounded-2xl overflow-hidden border-4 border-green-500 w-full max-w-sm aspect-[3/4] bg-slate-900 shadow-xl">
                        <img 
                          src={URL.createObjectURL(files.selfie)} 
                          alt="Captured selfie" 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-green-500/20 pointer-events-none flex items-center justify-center">
                           <CheckCircle size={64} className="text-white drop-shadow-md" />
                        </div>
                        <button
                          type="button"
                          onClick={retakeSelfie}
                          className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-md text-white px-6 py-2 rounded-full font-bold shadow-xl hover:bg-slate-800 transition-all border border-slate-700 text-sm"
                        >
                          Retake Photo
                        </button>
                      </div>
                    )}
                    {/* Section 2: Passport Photo Upload */}
                    <div className="space-y-3 w-full max-w-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${files.passportPhoto ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white'
                          }`}>{files.passportPhoto ? '✓' : '2'}</div>
                        <h3 className="font-bold text-sm uppercase tracking-widest text-slate-300">Passport Size Photo (Upload)</h3>
                      </div>

                      {!files.passportPhoto ? (
                        <div className="group border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-indigo-500 transition-all cursor-pointer bg-slate-900/50 hover:bg-indigo-500/5">
                          <input type="file" name="passportPhoto" className="hidden" id="passport-upload" onChange={onFileChange} accept=".jpg,.jpeg,.png" />
                          <label htmlFor="passport-upload" className="cursor-pointer flex flex-col items-center gap-2">
                            <Upload className="transition-colors text-slate-500 group-hover:text-indigo-400" size={36} />
                            <span className="text-base font-bold">Upload Passport Size Photo</span>
                            <span className="text-xs text-slate-500">Must match your appearance</span>
                          </label>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                          <img
                            src={URL.createObjectURL(files.passportPhoto)}
                            alt="Passport photo"
                            className="w-16 h-20 object-cover rounded-lg border-2 border-green-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                              <CheckCircle size={16} /> Passport photo uploaded
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{files.passportPhoto.name}</p>
                          </div>
                          <button
                            type="button"
                            onClick={removePassportPhoto}
                            className="text-slate-500 hover:text-red-400 transition text-xs font-bold"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Face Match Result Banner */}
                    {faceMatchResult && (
                      <div className={`w-full max-w-sm p-4 rounded-xl border flex items-start gap-3 transition-all ${faceMatchResult === 'loading' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' :
                          faceMatchResult === 'match' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                            'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}>
                        {faceMatchResult === 'loading' && (
                          <Cpu className="animate-spin flex-shrink-0 mt-0.5" size={18} />
                        )}
                        {faceMatchResult === 'match' && (
                          <CheckCircle className="flex-shrink-0 mt-0.5" size={18} />
                        )}
                        {(faceMatchResult === 'no_match' || faceMatchResult === 'error') && (
                          <AlertTriangle className="flex-shrink-0 mt-0.5" size={18} />
                        )}
                        <div>
                          <p className="font-bold text-sm">
                            {faceMatchResult === 'loading' && 'Comparing faces...'}
                            {faceMatchResult === 'match' && '✅ Face Match Confirmed'}
                            {faceMatchResult === 'no_match' && '❌ Face Mismatch Detected'}
                            {faceMatchResult === 'error' && '⚠️ Verification Error'}
                          </p>
                          {faceMatchMessage && (
                            <p className="text-xs mt-1 opacity-80">{faceMatchMessage}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <button type="button" onClick={prevStep} className="flex items-center gap-2 text-slate-400 hover:text-white transition">
                      <ArrowLeft size={18} /> Back
                    </button>
                    <button 
                      type="submit"
                      disabled={!files.selfie || !files.passportPhoto || (faceModelsLoaded && faceMatchResult !== 'match')}
                      className="flex items-center gap-2 bg-indigo-600 px-8 py-3 rounded-lg font-extrabold hover:bg-indigo-700 transition shadow-[0_0_20px_rgba(79,70,229,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Update Registration <Shield size={20} />
                    </button>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </form>
          </div>
        </div>
      )}

      {verifying && (
        <div className="glass p-12 text-center max-w-2xl mx-auto flex flex-col items-center gap-8 shadow-[0_0_50px_rgba(79,70,229,0.2)]">
          <div className="relative">
            <Cpu className="text-indigo-500 animate-[spin_3s_linear_infinite]" size={80} />
            <div className="absolute inset-0 bg-indigo-500/30 blur-3xl rounded-full scale-150" />
            <div className="absolute -inset-4 border-2 border-indigo-500/20 rounded-full animate-ping" />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-black gradient-text tracking-tighter">PROCESSING...</h2>
            <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed uppercase font-mono tracking-widest">
              Please wait while we verify your details
            </p>
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden max-w-md border border-slate-700">
            <div className="h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 animate-[loading_4s_ease-in-out_infinite] w-[40%]"></div>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-slate-500 font-mono">
            <span className="flex items-center gap-1"><span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span> OCR Active</span>
            <span className="flex items-center gap-1"><span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span> Liveness Check</span>
            <span className="flex items-center gap-1"><span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span> Fraud Scoring</span>
          </div>
        </div>
      )}

      {kycStatus === 'VERIFIED' && result && (
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-3 space-y-6">
            <div className="glass p-10 border-l-8 border-l-green-500 relative overflow-hidden group">
              <CheckCircle className="absolute -top-10 -right-10 text-green-500/10 group-hover:text-green-500/20 transition-all duration-1000" size={300} />
              
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                   <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500">
                      <CheckCircle size={40} />
                   </div>
                   <div>
                      <h2 className="text-3xl font-black text-white leading-tight">KYC VERIFIED SUCCESSFULLY</h2>
                      <p className="text-green-500/80 font-bold uppercase text-xs tracking-[0.2em]">Universal Identity Confirmed</p>
                   </div>
                </div>

                <p className="text-slate-400 text-lg leading-relaxed max-w-2xl">
                  Your documents have been updated successfully. You will have access to update your details again after 24 hours. Subject identity has been cross-referenced with global government databases and biometric data via SHA-256 anchoring.
                </p>
                
                <div className="mt-10 grid md:grid-cols-2 gap-8">
                   <div>
                     <h3 className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Digital Fingerprint</h3>
                     <div className="bg-black/50 p-4 rounded-xl font-mono text-[10px] text-indigo-400/80 break-all border border-slate-800 leading-relaxed">
                        {result.hash}
                     </div>
                   </div>
                   <div>
                     <h3 className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Universal KYC Token</h3>
                     <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-900/80 border border-indigo-500/30 p-4 rounded-xl font-mono text-[10px] text-slate-300 truncate">
                          {result.kycToken}
                        </div>
                        <button 
                          onClick={copyToken}
                          className="w-12 h-12 bg-indigo-600 rounded-xl hover:bg-indigo-700 transition flex items-center justify-center shadow-lg shadow-indigo-600/20 active:scale-95"
                          title="Copy Token"
                        >
                          <Copy size={20} />
                        </button>
                     </div>
                   </div>
                </div>
              </div>
            </div>

            {/* Instruction Card */}
            <div className="glass p-6 border-indigo-500/20 flex flex-col md:flex-row items-center gap-6">
               <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400">
                  <ExternalLink size={24} />
               </div>
               <div className="flex-1">
                  <h4 className="font-bold text-white">How to use your token?</h4>
                  <p className="text-sm text-slate-400 mt-1">Visit any partner organization portal in the sidebar and paste your KYC token for instant, privacy-preserving verification.</p>
               </div>
               <div className="flex gap-2">
                 <span className="px-3 py-1 bg-slate-800 rounded text-[10px] text-slate-400 font-bold border border-slate-700 uppercase">Aadhaar Verified</span>
                 <span className="px-3 py-1 bg-slate-800 rounded text-[10px] text-slate-400 font-bold border border-slate-700 uppercase">Liveness Verified</span>
               </div>
            </div>
          </div>

          {/* Side Card / Stats */}
          <div className="space-y-6">
            <div className="glass p-6 text-center border-indigo-500/20 group relative">
               <div className="absolute top-0 right-0 p-2 opacity-50"><Shield size={16} /></div>
               <div className="w-full aspect-square bg-slate-900 mx-auto rounded-3xl flex items-center justify-center border border-slate-800 relative group-hover:border-indigo-500/50 transition-all duration-700 overflow-hidden shadow-inner">
                  <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition" />
                  <div className="z-10 text-center space-y-2">
                     <span className="text-[10px] text-slate-500 font-black tracking-[0.3em] uppercase">Identity Card</span>
                     <div className="w-12 h-12 bg-indigo-600/20 rounded-full mx-auto flex items-center justify-center text-indigo-400">
                        <User size={24} />
                     </div>
                     <p className="text-sm font-black text-white text-center px-2">{result?.name || formData.name || 'ANONYMOUS'}</p>
                     <span className="px-2 py-0.5 bg-green-500/20 text-green-500 text-[8px] font-black rounded border border-green-500/30 uppercase tracking-widest">Level 3 • Full KYC</span>
                  </div>
               </div>
               <div className="mt-6 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-[10px]">
                     <span className="text-slate-500 uppercase font-black tracking-widest">Identity Score</span>
                     <span className="text-green-400 font-black">98.4%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                     <div className="h-full bg-green-500 w-[98%]"></div>
                  </div>
               </div>
            </div>
            
            <div className="glass p-4 text-[10px] font-mono text-slate-500 leading-tight border-slate-800">
               TIMESTAMP: {new Date().toISOString()}<br/>
               NETWORK: SECURE_KYC_MAINNET<br/>
               NODE_ID: 0x4f...ed9a
            </div>
          </div>
        </div>
      )}

      {kycStatus === 'FRAUD' && (
        <div className="glass p-12 text-center max-w-2xl mx-auto border-t-8 border-t-red-500 shadow-[0_0_50px_rgba(239,68,68,0.2)] animate-shake">
          <div className="w-20 h-20 bg-red-500/20 rounded-3xl flex items-center justify-center text-red-500 mx-auto mb-8 border border-red-500/30">
            <AlertTriangle size={48} />
          </div>
          <h2 className="text-4xl font-black text-red-500 tracking-tighter">POTENTIAL FRAUD DETECTED</h2>
          <p className="text-slate-300 mt-6 leading-relaxed text-lg max-w-md mx-auto">
            {error || 'Our secure engine has flagged this submission for duplicate document usage or biometric inconsistency.'}
          </p>
          <div className="mt-8 p-6 bg-red-500/10 rounded-2xl border border-red-500/20 text-red-400 text-xs text-left font-mono">
            <strong>ERROR CODE:</strong> E11000_DUP_ENTRY<br/>
            <strong>REASON:</strong> ID number already indexed in SecureKYC database.<br/>
            <strong>STATUS:</strong> Permanent Block of Identity Token.
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-10 bg-slate-800 px-8 py-3 rounded-xl text-white font-bold hover:bg-slate-700 transition flex items-center gap-2 mx-auto"
          >
            Go Back <ArrowLeft size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default UpdateKYC;
