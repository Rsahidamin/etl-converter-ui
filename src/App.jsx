import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, FileCode, Activity, Zap, Sun, Moon, ShieldCheck, Cpu, FolderHeart, History, Download 
} from 'lucide-react';

// 🌐 1. REPLACE THIS with your exact Ngrok HTTPS link!
const API_BASE_URL = 'https://numbing-walrus-unwitting.ngrok-free.dev';

// 🔒 2. This exact header permanently bypasses the Ngrok warning screen for your team
const axiosConfig = {
  headers: {
    'ngrok-skip-browser-warning': 'true'
  }
};

export default function App() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); 
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [history, setHistory] = useState([]);
  const [darkMode, setDarkMode] = useState(true);
  const [vdiOnline, setVdiOnline] = useState(false);

  useEffect(() => {
    const checkVDIHealth = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/health`, { 
          headers: axiosConfig.headers,
          timeout: 3000 
        });
        if (res.data.status === 'online') setVdiOnline(true);
      } catch (e) {
        setVdiOnline(false);
      }
    };

    checkVDIHealth();
    const interval = setInterval(checkVDIHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDownload = async (url, filename) => {
    const loadingToast = toast.loading("Preparing secure download...");
    try {
      const response = await axios.get(url, {
        headers: axiosConfig.headers,
        responseType: 'blob',
      });
      
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/octet-stream' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      
      const finalName = filename.toLowerCase().endsWith('.pcap') ? filename : `${filename.split('.')[0]}.pcap`;
      link.setAttribute('download', finalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Download Started", { id: loadingToast });
    } catch (error) {
      console.error("[DOWNLOAD_ERROR]:", error);
      toast.error("Download Failed. File may have expired (1-hour limit).", { id: loadingToast });
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    const selected = acceptedFiles[0];
    if (selected?.name.endsWith('.etl')) {
      setFile(selected); setDownloadUrl(''); setProgress(0); setStatus('idle');
      toast.success('ETL File Ready');
    } else {
      toast.error('Format Error: Please provide a .ETL file');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/octet-stream': ['.etl'] }, maxFiles: 1
  });

  const handleConvert = async () => {
    if (!vdiOnline) {
      toast.error("Cannot convert: VDI engine is offline.");
      return;
    }
    if (!file) return;
    setStatus('uploading'); setProgress(15);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await axios.post(`${API_BASE_URL}/api/convert`, formData, {
        headers: { 
          ...axiosConfig.headers,
          "Content-Type": "multipart/form-data"
        },
        timeout: 0 
      });
      
      const taskId = res.data.taskId;
      setStatus('converting');

      const interval = setInterval(async () => {
        try {
          const statusRes = await axios.get(`${API_BASE_URL}/api/status/${taskId}`, {
            headers: axiosConfig.headers
          });
          
          if (statusRes.data.progress > progress) setProgress(statusRes.data.progress);
          
          if (statusRes.data.status === 'completed') {
            clearInterval(interval);
            
            const rawFilename = `${taskId}.pcap`;
            const fullUrl = `${API_BASE_URL}/api/download/${rawFilename}`;
            
            setDownloadUrl(fullUrl); 
            setStatus('completed');
            
            setHistory(prev => [{ id: taskId, name: file.name, size: (file.size / 1024 / 1024).toFixed(2), url: fullUrl }, ...prev]);
            toast.success('Conversion Successful');
          }
        } catch (e) { clearInterval(interval); setStatus('idle'); }
      }, 2000); 
    } catch (err) { setStatus('idle'); toast.error('VDI Transmission Timeout'); }
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans selection:bg-blue-500/30 relative overflow-x-hidden ${darkMode ? 'bg-[#07090e] text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      
      <div className="absolute inset-0 pointer-events-none z-0">
        <div 
          className="absolute inset-0 opacity-[0.03] transition-opacity duration-500" 
          style={{ 
            backgroundImage: `radial-gradient(${darkMode ? '#ffffff' : '#000000'} 1px, transparent 1px)`, 
            backgroundSize: '24px 24px' 
          }} 
        />
        <div 
          className="absolute inset-0 transition-opacity duration-500" 
          style={{ 
            backgroundImage: `linear-gradient(${darkMode ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.015)'} 1px, transparent 1px), linear-gradient(90deg, ${darkMode ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.015)'} 1px, transparent 1px)`, 
            backgroundSize: '120px 120px' 
          }} 
        />
        <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] mix-blend-screen transition-all duration-500 ${darkMode ? 'bg-blue-950/20' : 'bg-blue-200/20'}`} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] mix-blend-screen transition-all duration-500 ${darkMode ? 'bg-indigo-950/15' : 'bg-indigo-200/15'}`} />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        <Toaster position="top-right" />
        
        <nav className={`border-b p-6 shadow-sm sticky top-0 backdrop-blur-md z-50 transition-colors duration-500 ${darkMode ? 'bg-[#0d1117]/80 border-white/5' : 'bg-white/80 border-slate-200'}`}>
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className={`text-xl font-bold tracking-tight uppercase ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                ETL Converter
              </h1>
            </div>

            <div className="flex items-center gap-6">
              <button 
                onClick={() => setDarkMode(!darkMode)} 
                className={`p-2 rounded-xl border transition-all duration-300 ${darkMode ? 'border-white/10 bg-white/5 text-yellow-400 hover:bg-white/10' : 'border-slate-200 bg-slate-100 text-indigo-600 hover:bg-slate-200'}`}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full transition-all duration-300 ${vdiOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className={`text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${vdiOnline ? 'text-green-500' : 'text-red-500'}`}>
                  {vdiOnline ? 'VDI Online' : 'VDI Down'}
                </span>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-3 gap-8 flex-grow w-full items-start">
          
          <div className="lg:col-span-2 space-y-6">
            <div className={`border rounded-3xl p-8 shadow-xl transition-all duration-500 backdrop-blur-sm ${darkMode ? 'bg-[#12161f]/90 border-white/5' : 'bg-white/90 border-slate-200'}`}>
              <h2 className={`text-2xl font-bold mb-6 flex items-center gap-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                <Zap className="text-blue-500 w-5 h-5" /> PCAP Reconstruction
              </h2>

              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <div className={`p-4 rounded-xl border space-y-1 ${darkMode ? 'bg-white/[0.01] border-white/5' : 'bg-slate-50 border-slate-200/60'}`}>
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck size={12}/> 1. Upload</span>
                  <p className="text-[11px] leading-relaxed opacity-70">Pass .ETL files straight to your dedicated AWS Cloud engine.</p>
                </div>
                <div className={`p-4 rounded-xl border space-y-1 ${darkMode ? 'bg-white/[0.01] border-white/5' : 'bg-slate-50 border-slate-200/60'}`}>
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1.5"><Cpu size={12}/> 2. Convert</span>
                  <p className="text-[11px] leading-relaxed opacity-70">VDI background processing runs native trace compilation 24/7.</p>
                </div>
                <div className={`p-4 rounded-xl border space-y-1 ${darkMode ? 'bg-white/[0.01] border-white/5' : 'bg-slate-50 border-slate-200/60'}`}>
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1.5"><FolderHeart size={12}/> 3. Download</span>
                  <p className="text-[11px] leading-relaxed opacity-70">Retrieve Wireshark-ready .PCAP traces instantly to local tabs.</p>
                </div>
              </div>
              
              <div {...getRootProps()} className={`group border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-300 ${isDragActive ? 'border-blue-500 bg-blue-500/5' : darkMode ? 'border-slate-800 hover:border-blue-500/40 hover:bg-white/[0.01]' : 'border-slate-300 hover:border-blue-500/40 hover:bg-slate-50'}`}>
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400 group-hover:text-blue-500 transition-colors duration-300" />
                <p className="text-lg">Drop ETL trace or <span className="text-blue-500 font-semibold">browse files</span></p>
              </div>

              <AnimatePresence>
                {file && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
                    <div className={`p-5 rounded-2xl flex justify-between items-center border transition-colors duration-500 ${darkMode ? 'bg-black/30 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl"><FileCode className="text-blue-400 w-5 h-5" /></div>
                        <div>
                          <p className={`text-sm font-bold truncate max-w-[250px] ${darkMode ? 'text-white' : 'text-slate-900'}`}>{file.name}</p>
                          <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      {status === 'idle' ? (
                        <button 
                          onClick={handleConvert} 
                          disabled={!vdiOnline}
                          className={`px-8 py-3 rounded-xl font-bold text-sm shadow-lg transition-all active:scale-95 ${!vdiOnline ? 'bg-slate-400 cursor-not-allowed text-slate-100 shadow-none' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'}`}
                        >
                          INITIATE CONVERSION
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 text-blue-500 font-bold text-sm uppercase italic">
                          <Activity className="w-4 h-4 animate-spin" /> {status}...
                        </div>
                      )}
                    </div>
                    {status !== 'idle' && (
                      <div className="mt-6 px-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                          <span>Optimizing Packet Headers</span>
                          <span>{progress}%</span>
                        </div>
                        <div className={`h-1.5 w-full rounded-full overflow-hidden transition-colors duration-500 ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                          <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {status === 'completed' && (
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`mt-6 p-6 border rounded-2xl flex justify-between items-center transition-colors duration-500 ${darkMode ? 'bg-green-500/5 border-green-500/20' : 'bg-green-50/50 border-green-200'}`}>
                  <div className="flex items-center gap-3 text-green-600">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center font-bold text-lg">✓</div>
                    <div>
                      <p className="font-bold text-sm">Processing Complete</p>
                      <p className="text-[10px] opacity-70 italic font-mono uppercase">AWS Storage Lifecycle Flagged: Purge scheduled in 1 Hour</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDownload(downloadUrl, file.name)}
                    className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-green-600/20 active:scale-95"
                  >
                    DOWNLOAD PCAP
                  </button>
                </motion.div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className={`border rounded-3xl p-6 shadow-xl transition-all duration-500 backdrop-blur-sm ${darkMode ? 'bg-[#12161f]/90 border-white/5' : 'bg-white/90 border-slate-200'}`}>
              <h3 className="text-xs font-bold text-slate-400 uppercase mb-5 flex items-center gap-2 tracking-widest">
                <History size={14} className="text-blue-500"/> Recent Sessions
              </h3>
              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-2 custom-scrollbar">
                {history.length > 0 ? history.map((h, i) => (
                  <div key={i} className={`flex justify-between items-center p-3 rounded-xl border transition-all duration-300 ${darkMode ? 'bg-white/[0.02] border-white/5 hover:border-blue-500/30' : 'bg-slate-50 border-slate-200 hover:border-blue-500/30'}`}>
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-[8px] shrink-0">PCAP</div>
                      <span className="text-[11px] font-bold truncate">{h.name}</span>
                    </div>
                    <button onClick={() => handleDownload(h.url, h.name)} className="text-slate-400 hover:text-blue-500 transition-colors pl-2 shrink-0">
                      <Download size={14}/>
                    </button>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-16 opacity-30">
                     <History size={32} className="mb-2" />
                     <p className="text-[10px] text-center font-bold uppercase tracking-widest">No Active Sessions</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </main>

        <footer className={`py-12 border-t mt-auto transition-all duration-500 ${darkMode ? 'border-white/5 bg-[#0b0e14]/50' : 'border-slate-200 bg-slate-100'}`}>
          <div className="max-w-6xl mx-auto px-6 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <p>© 2026 ETL CONVERTER | HOSTED ON AWS</p>
            <div className="flex items-center gap-2">
                <span className="italic opacity-70">Designed by:</span>
                <span className="text-blue-500 tracking-widest">Sahil Amin</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
