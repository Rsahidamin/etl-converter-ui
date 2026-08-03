import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, FileCode, Sun, Moon, Server, X, Trash2, CheckCircle2, Download, History, Sparkles
} from 'lucide-react';

// Cloudflare Active Tunnel URL
const API_BASE_URL = "https://length-happy-surely-attachment.trycloudflare.com";



const axiosConfig = {
  headers: {
    'ngrok-skip-browser-warning': 'true'
  }
};

export default function App() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'converting' | 'completed'
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [history, setHistory] = useState([]);
  const [darkMode, setDarkMode] = useState(true);
  const [vdiOnline, setVdiOnline] = useState(false);

  // Health check polling
  useEffect(() => {
    const checkVDIHealth = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/health`, { 
          headers: axiosConfig.headers,
          timeout: 3000 
        });
        if (res.data.status === 'online' || res.data.status === 'ok') setVdiOnline(true);
      } catch (e) {
        setVdiOnline(false);
      }
    };

    checkVDIHealth();
    const interval = setInterval(checkVDIHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  // Secure file download
  const handleDownload = async (url, filename) => {
    const loadingToast = toast.loading("Preparing download...");
    try {
      const targetUrl = url || downloadUrl;
      const response = await axios.get(targetUrl, {
        headers: axiosConfig.headers,
        responseType: 'blob',
      });
      
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/octet-stream' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      
      const cleanName = filename ? filename.split('.')[0] : 'converted_trace';
      const finalName = `${cleanName}.pcapng`;
      link.setAttribute('download', finalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Download Started", { id: loadingToast });
    } catch (error) {
      console.error("[DOWNLOAD_ERROR]:", error);
      toast.error("Download Failed. File may have expired.", { id: loadingToast });
    }
  };

  // Dropzone handling
  const onDrop = useCallback((acceptedFiles) => {
    const selected = acceptedFiles[0];
    if (selected?.name.toLowerCase().endsWith('.etl')) {
      setFile(selected); 
      setDownloadUrl(''); 
      setProgress(0); 
      setStatus('idle');
      toast.success('ETL File Selected');
    } else {
      toast.error('Please upload a valid .ETL file');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/octet-stream': ['.etl'] }, maxFiles: 1
  });

  // Conversion process execution with real-time smooth progress
  const handleConvert = async () => {
    if (!vdiOnline) {
      toast.error("Cannot convert: Server is offline.");
      return;
    }
    if (!file) return;
    
    setStatus('converting'); 
    setProgress(5);
    
    // Smooth progress ticker for background conversion phase
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) {
          clearInterval(progressInterval);
          return 92; // Pause at 92% until server process completes
        }
        return prev + 2; // Increment smoothly every 200ms
      });
    }, 200);

    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await axios.post(`${API_BASE_URL}/api/convert`, formData, {
        headers: { 
          ...axiosConfig.headers,
          "Content-Type": "multipart/form-data"
        },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          // Scale upload phase to the first 40% of overall progress
          setProgress(Math.min(Math.round(percent * 0.4), 40));
        },
        timeout: 0 
      });

      clearInterval(progressInterval);

      if (res.data.success) {
        setProgress(100);
        const finalDownloadUrl = res.data.downloadUrl || res.data.pcapUrl || `${API_BASE_URL}/api/download/${res.data.filename}`;
        setDownloadUrl(finalDownloadUrl); 
        setStatus('completed');
        
        setHistory(prev => [
          { 
            id: res.data.id || Date.now(), 
            name: file.name, 
            size: (file.size / 1024 / 1024).toFixed(2), 
            url: finalDownloadUrl 
          }, 
          ...prev
        ]);
        toast.success('Conversion Complete!');
      } else {
        throw new Error("Conversion failed");
      }
    } catch (err) { 
      clearInterval(progressInterval);
      setStatus('idle'); 
      setProgress(0);
      toast.error('Server Transmission Error'); 
    }
  };

  const handleReset = () => {
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setDownloadUrl('');
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between items-center p-6 sm:p-10 relative font-sans transition-colors duration-300 overflow-hidden ${darkMode ? 'bg-[#121826] text-slate-100' : 'bg-[#e2e8f0] text-slate-900'}`}>
      
      {/* Pink Ambient Bottom-Corner Glow */}
      <div className="absolute bottom-[-100px] left-[-100px] w-[550px] h-[550px] rounded-full bg-pink-500/35 blur-[130px] pointer-events-none z-0" />
      <div className="absolute bottom-[40px] left-[40px] w-[320px] h-[320px] rounded-full bg-rose-500/30 blur-[100px] pointer-events-none z-0" />

      <Toaster position="top-right" />
      
      {/* Top Header Bar */}
      <header className="w-full max-w-5xl flex justify-between items-center py-2 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl border ${vdiOnline ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
            <Server className="w-4 h-4" />
          </div>
          <span className={`text-xs font-bold uppercase tracking-wider ${vdiOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
            {vdiOnline ? 'Engine Online' : 'Engine Offline'}
          </span>
        </div>

        {/* Theme Toggle Button */}
        <button 
          onClick={() => setDarkMode(!darkMode)} 
          className="p-2.5 rounded-2xl border border-slate-700 bg-[#0b0f19] text-slate-300 hover:bg-slate-800 shadow-sm transition-all"
          title="Toggle Theme"
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      {/* Main Grid Layout - Positioned Higher Up */}
      <main className="w-full max-w-5xl pt-12 sm:pt-20 mb-auto grid lg:grid-cols-3 gap-6 relative z-10 pb-12 items-stretch">
        
        {/* Main File Converter Card */}
        <div className="lg:col-span-2 rounded-3xl p-8 border border-slate-800/90 bg-[#0b0f19] shadow-2xl flex flex-col justify-between text-white transition-all duration-300">
          
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-white">
                  Upload Files <Sparkles className="w-4 h-4 text-rose-500" />
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Select .ETL trace file to convert into Wireshark .PCAPNG format.
                </p>
              </div>
              {file && (
                <button onClick={handleReset} className="text-slate-400 hover:text-white p-1">
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Dropzone Area */}
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
                isDragActive 
                  ? 'border-rose-500 bg-rose-500/10' 
                  : 'border-[#1e293b] hover:border-rose-500/50 bg-[#161f33]/40 hover:bg-[#161f33]/80'
              }`}
            >
              <input {...getInputProps()} />
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-base font-bold text-white">
                Choose a file or drag & drop it here.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supports .ETL trace logs up to 1 GB.
              </p>
            </div>
          </div>

          {/* File Card & Progress */}
          <AnimatePresence>
            {file && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }}
                className="mt-6"
              >
                <div className="p-4 rounded-2xl border border-[#1e293b] bg-[#161f33] flex items-center justify-between transition-all">
                  
                  <div className="flex items-center gap-3 w-full pr-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                      <FileCode size={20} />
                    </div>
                    
                    <div className="w-full min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-xs font-bold truncate text-white">
                          {file.name}
                        </p>
                        {status === 'completed' && (
                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 shrink-0">
                            <CheckCircle2 size={12} /> Completed
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
                        <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        {status === 'converting' && <span>Converting... {progress}%</span>}
                      </div>

                      {status === 'converting' && (
                        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div 
                            className="bg-rose-500 h-full transition-all duration-300 rounded-full" 
                            style={{ width: `${progress}%` }} 
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {status === 'idle' && (
                      <button 
                        onClick={handleConvert}
                        disabled={!vdiOnline}
                        className="bg-rose-500 hover:bg-rose-600 disabled:bg-slate-800 disabled:text-slate-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                      >
                        Convert
                      </button>
                    )}

                    {status === 'completed' && (
                      <button 
                        onClick={() => handleDownload(downloadUrl, file.name)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center"
                        title="Download PCAPNG"
                      >
                        <Download size={16} />
                      </button>
                    )}

                    {status !== 'converting' && (
                      <button 
                        onClick={handleReset} 
                        className="text-slate-400 hover:text-rose-400 transition-colors p-1"
                        title="Remove file"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Sidebar - Recent Conversions */}
        <div className="lg:col-span-1 rounded-3xl p-6 border border-slate-800/90 bg-[#0b0f19] shadow-2xl flex flex-col justify-between text-white transition-all duration-300">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-6 flex items-center gap-2 text-slate-300">
              <History size={15} className="text-rose-500" /> Recent Conversions
            </h3>

            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
              {history.length > 0 ? (
                history.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex justify-between items-center p-3.5 rounded-2xl border border-[#1e293b] bg-[#161f33] hover:border-slate-600 transition-all"
                  >
                    <div className="truncate pr-2">
                      <p className="text-xs font-bold truncate text-white">
                        {item.name}
                      </p>
                      <span className="text-[10px] text-slate-400">{item.size} MB</span>
                    </div>
                    <button 
                      onClick={() => handleDownload(item.url, item.name)} 
                      className="text-slate-400 hover:text-rose-400 transition-colors p-1.5 rounded-lg shrink-0"
                      title="Download File"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center flex flex-col items-center justify-center">
                  <History size={28} className="mb-2 text-slate-600" />
                  <p className="text-xs font-bold text-slate-400">No recent conversions</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </main>

    </div>
  );
}
