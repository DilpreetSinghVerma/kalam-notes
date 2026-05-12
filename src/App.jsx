import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Wifi, WifiOff, Sun, Moon, Download, Maximize, Minimize, ChevronDown, Layout, CheckCircle, ArrowLeft, BookOpen, Cloud, CloudOff } from 'lucide-react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import PunjabiEditor from './components/PunjabiEditor';
import LoadingScreen from './components/LoadingScreen';
import Home from './components/Home';
import Sidebar from './components/Sidebar';
import DictionaryModal from './components/DictionaryModal';
import LoginScreen from './components/LoginScreen';
import './index.css';

function App() {
  const [notes, setNotes] = useState([{ id: 1, title: '', content: '', date: new Date().toISOString(), pinned: false, color: '' }]);
  const [dictionary, setDictionary] = useState({});
  const [trash, setTrash] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // App state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [view, setView] = useState('home'); // 'home' or 'editor'
  const [activeNoteId, setActiveNoteId] = useState(notes[0]?.id || 1);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [language, setLanguage] = useState(() => localStorage.getItem('kalam_language') || 'punjabi');
  
  // Sync state
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('kalam_theme') || 'dark';
  });

  // Focus Mode & Page Size state
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [pageSize, setPageSize] = useState('Fluid');
  
  // Custom Dropdown refs and state
  const [showPageSizeMenu, setShowPageSizeMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [showDictionary, setShowDictionary] = useState(false);
  const pageSizeMenuRef = useRef(null);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    const loadInitialData = async () => {
      if (window.require) {
        try {
          const { ipcRenderer } = window.require('electron');
          const data = await ipcRenderer.invoke('load-data');
          if (data && data.notes) {
             setNotes(data.notes);
          } else {
             const saved = localStorage.getItem('kalam_notes');
             if (saved) setNotes(JSON.parse(saved));
          }
          if (data && data.dictionary) {
             setDictionary(data.dictionary);
          } else {
             const savedDict = localStorage.getItem('kalam_dictionary');
             if (savedDict) setDictionary(JSON.parse(savedDict));
          }
          if (data && data.trash) {
             setTrash(data.trash);
          } else {
             const savedTrash = localStorage.getItem('kalam_trash');
             if (savedTrash) setTrash(JSON.parse(savedTrash));
          }
        } catch (e) {
          console.error(e);
        }
      } else {
          const saved = localStorage.getItem('kalam_notes');
          if (saved) setNotes(JSON.parse(saved));
          const savedDict = localStorage.getItem('kalam_dictionary');
          if (savedDict) setDictionary(JSON.parse(savedDict));
          const savedTrash = localStorage.getItem('kalam_trash');
          if (savedTrash) setTrash(JSON.parse(savedTrash));
       }
    };
    loadInitialData();

    const handleClickOutside = (e) => {
      if (pageSizeMenuRef.current && !pageSizeMenuRef.current.contains(e.target)) {
        setShowPageSizeMenu(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 12) + 4;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        setTimeout(() => setIsLoading(false), 600);
      }
      setLoadingProgress(currentProgress);
    }, 150);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearInterval(interval);
    };
  }, []);

  const isUpdatingFromCloud = useRef(false);

  useEffect(() => {
    let unsubscribeSnapshot;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setShowAuthModal(false);
        const docRef = doc(db, 'users', currentUser.uid);
        unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
          // If the update came from the server (not a local pending write)
          if (docSnap.exists() && !docSnap.metadata.hasPendingWrites) {
            isUpdatingFromCloud.current = true;
            const data = docSnap.data();
            if (data.notes && data.notes.length > 0) setNotes(data.notes);
            if (data.dictionary) setDictionary(data.dictionary);
            if (data.trash) setTrash(data.trash);
            
            // Prevent auto-save from triggering immediately after pulling from cloud
            setTimeout(() => {
               isUpdatingFromCloud.current = false;
            }, 1000);
          }
        });
      }
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  // Auto-purge trash items older than 30 days
  useEffect(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const purged = trash.filter(t => new Date(t.deletedAt).getTime() > thirtyDaysAgo);
    if (purged.length !== trash.length) setTrash(purged);
  }, []);

  useEffect(() => {
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.invoke('save-data', { notes, dictionary });
      } catch (e) { }
    }
    localStorage.setItem('kalam_notes', JSON.stringify(notes));
    localStorage.setItem('kalam_dictionary', JSON.stringify(dictionary));
    localStorage.setItem('kalam_trash', JSON.stringify(trash));

    if (user && !isLoading && !isUpdatingFromCloud.current) {
      setIsSyncing(true);
      setDoc(doc(db, 'users', user.uid), { notes, dictionary, trash }, { merge: true })
        .then(() => setIsSyncing(false))
        .catch((err) => {
           console.error("Firebase sync failed:", err);
           setIsSyncing(false);
        });
    }
  }, [notes, dictionary, trash, user, isLoading]);

  useEffect(() => {
    localStorage.setItem('kalam_language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('kalam_theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  // Handle Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        setShowSavedToast(true);
        setTimeout(() => setShowSavedToast(false), 2000);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeNote = notes.find(n => n.id === activeNoteId) || notes[0];

  const updateActiveNote = (updates) => {
    setNotes(notes.map(n => n.id === activeNoteId ? { ...n, ...updates, date: new Date().toISOString() } : n));
  };

  const createNewNote = () => {
    const newNote = {
      id: Date.now(),
      title: '',
      content: '',
      date: new Date().toISOString(),
      pinned: false,
      color: ''
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
    setView('editor');
  };

  const setNoteColor = (id, color) => {
    setNotes(notes.map(n => n.id === id ? { ...n, color } : n));
  };

  const togglePin = (e, id) => {
    e.stopPropagation();
    setNotes(notes.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  };

  const deleteNote = (e, id) => {
    if (e) e.stopPropagation();
    const noteToTrash = notes.find(n => n.id === id);
    if (noteToTrash) {
      setTrash([{ ...noteToTrash, deletedAt: new Date().toISOString() }, ...trash]);
    }
    const newNotes = notes.filter(n => n.id !== id);
    if (newNotes.length === 0) {
      const freshNote = { id: Date.now(), title: '', content: '', date: new Date().toISOString(), color: '' };
      setNotes([freshNote]);
      setActiveNoteId(freshNote.id);
    } else {
      setNotes(newNotes);
      if (activeNoteId === id) {
        setActiveNoteId(newNotes[0].id);
      }
    }
  };

  const deleteMultipleNotes = (ids) => {
    const notesToTrash = notes.filter(n => ids.includes(n.id));
    setTrash([...notesToTrash.map(n => ({ ...n, deletedAt: new Date().toISOString() })), ...trash]);
    const newNotes = notes.filter(n => !ids.includes(n.id));
    if (newNotes.length === 0) {
      const freshNote = { id: Date.now(), title: '', content: '', date: new Date().toISOString(), color: '' };
      setNotes([freshNote]);
      setActiveNoteId(freshNote.id);
    } else {
      setNotes(newNotes);
      if (ids.includes(activeNoteId)) {
        setActiveNoteId(newNotes[0].id);
      }
    }
  };

  const restoreFromTrash = (id) => {
    const note = trash.find(n => n.id === id);
    if (note) {
      const { deletedAt, ...restoredNote } = note;
      setNotes([restoredNote, ...notes]);
      setTrash(trash.filter(n => n.id !== id));
    }
  };

  const permanentDelete = (id) => {
    setTrash(trash.filter(n => n.id !== id));
  };

  const emptyTrash = () => {
    setTrash([]);
  };

  const togglePinMultiple = (ids, pinState) => {
    setNotes(notes.map(n => ids.includes(n.id) ? { ...n, pinned: pinState } : n));
  };

  const formatDate = (dateString) => {
    const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const exportToPDF = () => {
    setShowExportMenu(false);
    window.print();
  };

  const exportToTXT = async () => {
    setShowExportMenu(false);
    const text = activeNote?.content.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ') || '';
    
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        await ipcRenderer.invoke('save-file', { type: 'txt', content: text, title: activeNote?.title });
        return;
      } catch (e) {
        console.error("IPC save failed", e);
      }
    }

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${activeNote?.title || 'Kalam_Document'}.txt`;
    link.click();
  };

  const exportToWord = async () => {
    setShowExportMenu(false);
    
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        await ipcRenderer.invoke('save-file', { type: 'docx', content: activeNote?.content || '', title: activeNote?.title });
        return;
      } catch (e) {
        console.error("IPC save failed", e);
      }
    }

    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML to Word</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + (activeNote?.content || '') + footer;
    const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${activeNote?.title || 'Kalam_Document'}.doc`;
    link.click();
  };

  const exportToJPG = async () => {
    setShowExportMenu(false);
    const element = document.querySelector('.textarea-wrapper');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: document.body.classList.contains('light-theme') ? '#ffffff' : '#1e1e24' });
      const link = document.createElement('a');
      link.download = `${activeNote?.title || 'Kalam_Document'}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    } catch (e) {
      console.error('Export to JPG failed', e);
    }
  };

  // Calculate Word Count
  const getWordCount = (html) => {
    if (!html) return 0;
    const text = html.replace(/<[^>]*>?/gm, ' ').trim();
    return text === '' ? 0 : text.split(/\s+/).filter(word => word.length > 0).length;
  };
  const getCharCount = (html) => {
    if (!html) return 0;
    const text = html.replace(/<[^>]*>?/gm, '');
    return text.length;
  };

  const wordCount = getWordCount(activeNote?.content);
  const charCount = getCharCount(activeNote?.content);

  const openNote = (id) => {
    setActiveNoteId(id);
    setView('editor');
  };

  const filteredNotes = notes
    .filter(note => 
      (note.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (note.content || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.date) - new Date(a.date);
    });

  const renderContent = () => {
    if (isLoading) {
      return <LoadingScreen onLoaded={() => setIsLoading(false)} />;
    }

    if (view === 'home') {
      return (
        <Home 
          notes={filteredNotes}
          createNewNote={createNewNote}
          openNote={openNote}
          deleteNote={deleteNote}
          togglePin={togglePin}
          formatDate={formatDate}
          theme={theme}
          toggleTheme={toggleTheme}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenDictionary={() => setShowDictionary(true)}
          user={user}
          onOpenAuth={() => {
            if (user) {
              if (window.confirm("Are you sure you want to sign out? Your notes will remain saved locally.")) {
                auth.signOut();
              }
            } else {
              setShowAuthModal(true);
            }
          }}
          deleteMultipleNotes={deleteMultipleNotes}
          togglePinMultiple={togglePinMultiple}
          setNoteColor={setNoteColor}
          trash={trash}
          restoreFromTrash={restoreFromTrash}
          permanentDelete={permanentDelete}
          emptyTrash={emptyTrash}
        />
      );
    }

    return (
      <div className="app-container">
        {/* Sidebar */}
        {!isFocusMode && (
          <Sidebar 
            notes={filteredNotes}
            activeNoteId={activeNoteId}
            setActiveNoteId={setActiveNoteId}
            deleteNote={deleteNote}
            createNewNote={createNewNote}
            togglePin={togglePin}
            formatDate={formatDate}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}

      {/* Main Editor */}
      <div className="main-content">
        {showSavedToast && (
          <div className="save-toast">
            <CheckCircle size={18} /> Note Saved Successfully
          </div>
        )}
        <div className="editor-header">
          {!isFocusMode && (
            <button className="back-btn" onClick={() => setView('home')} style={{ marginRight: '16px' }}>
              <ArrowLeft size={20} />
              Back
            </button>
          )}
          <div style={{ flex: 1, minWidth: '150px' }}>
            <input 
              type="text" 
              className="editor-title" 
              value={activeNote?.title || ''}
              onChange={(e) => updateActiveNote({ title: e.target.value })}
              placeholder="Enter your heading..."
            />
          </div>
          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {!isFocusMode && (
              <>
                <div className="language-toggle">
                  <button className={`lang-switch ${language === 'punjabi' ? 'active' : ''}`} onClick={() => setLanguage('punjabi')}>ਪੰਜਾਬੀ</button>
                  <button className={`lang-switch ${language === 'hindi' ? 'active' : ''}`} onClick={() => setLanguage('hindi')}>हिंदी</button>
                  <button className={`lang-switch ${language === 'english' ? 'active' : ''}`} onClick={() => setLanguage('english')}>Eng</button>
                </div>
                
                <div className="status-indicator">
                  {user ? (
                    isSyncing ? (
                      <div style={{width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#eab308'}} title="Syncing..."></div>
                    ) : (
                      <Cloud size={16} color="#64748b" title="Saved to cloud" />
                    )
                  ) : (
                    <CloudOff size={16} color="#9ca3af" title="Local Only" />
                  )}
                </div>
                
                <div className="status-indicator">
                  {isOnline ? (
                    <><Wifi size={14} color="#22c55e" /> <span style={{color: '#22c55e'}}>{language === 'english' ? 'Online' : 'Auto-Translate'}</span></>
                  ) : (
                    <><WifiOff size={14} color="#ef4444" /> <span style={{color: '#ef4444'}}>Offline Mode</span></>
                  )}
                </div>
                <div ref={pageSizeMenuRef} style={{ position: 'relative' }}>
                  <div className="custom-dropdown-btn" onClick={() => setShowPageSizeMenu(!showPageSizeMenu)} title="Select Canvas Size">
                    <Layout size={16} />
                    <span>{pageSize === 'Fluid' ? 'Fluid (Web)' : pageSize === 'Mobile' ? 'Mobile Screen' : pageSize + ' Page'}</span>
                    <ChevronDown size={14} />
                  </div>
                  {showPageSizeMenu && (
                    <div className="custom-dropdown-menu">
                      <div className={`custom-dropdown-item ${pageSize === 'Fluid' ? 'active' : ''}`} onClick={() => { setPageSize('Fluid'); setShowPageSizeMenu(false); }}>Fluid (Web)</div>
                      <div className={`custom-dropdown-item ${pageSize === 'A4' ? 'active' : ''}`} onClick={() => { setPageSize('A4'); setShowPageSizeMenu(false); }}>A4 Page</div>
                      <div className={`custom-dropdown-item ${pageSize === 'A5' ? 'active' : ''}`} onClick={() => { setPageSize('A5'); setShowPageSizeMenu(false); }}>A5 Page</div>
                      <div className={`custom-dropdown-item ${pageSize === 'Letter' ? 'active' : ''}`} onClick={() => { setPageSize('Letter'); setShowPageSizeMenu(false); }}>US Letter</div>
                      <div className={`custom-dropdown-item ${pageSize === 'Mobile' ? 'active' : ''}`} onClick={() => { setPageSize('Mobile'); setShowPageSizeMenu(false); }}>Mobile Screen</div>
                    </div>
                  )}
                </div>
              </>
            )}
            
            <button className="icon-btn" onClick={() => setShowDictionary(true)} title="Custom Dictionary">
              <BookOpen size={18} />
            </button>
            <button className="icon-btn" onClick={() => setIsFocusMode(!isFocusMode)} title={isFocusMode ? "Exit Focus Mode" : "Enter Focus Mode"}>
              {isFocusMode ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>

            <button className="icon-btn" onClick={toggleTheme} title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div ref={exportMenuRef} style={{ position: 'relative' }}>
              <button className="icon-btn" onClick={() => setShowExportMenu(!showExportMenu)} title="Export Options">
                <Download size={18} />
              </button>
              {showExportMenu && (
                <div className="custom-dropdown-menu" style={{ right: 0, left: 'auto' }}>
                  <div className="custom-dropdown-item" onClick={exportToPDF}>Export as PDF</div>
                  <div className="custom-dropdown-item" onClick={exportToWord}>Export as Word (.doc)</div>
                  <div className="custom-dropdown-item" onClick={exportToTXT}>Export as Text (.txt)</div>
                  <div className="custom-dropdown-item" onClick={exportToJPG}>Export as Image (.jpg)</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="editor-container">
          <PunjabiEditor 
            content={activeNote?.content || ''} 
            onChange={(val) => updateActiveNote({ content: val })}
            onOfflineStatus={setIsOnline}
            pageSize={pageSize}
            language={language}
            dictionary={dictionary}
          />
        </div>

        {/* Book Writing Footer */}
        <div className="editor-footer">
          <div className="footer-stats">
            <span><strong>{wordCount}</strong> Words</span>
            <span className="footer-divider">•</span>
            <span><strong>{charCount}</strong> Characters</span>
            <span className="footer-divider">•</span>
            <span>{Math.max(1, Math.ceil(wordCount / 200))} min read</span>
          </div>
        </div>
      </div>
    </div>
    );
  };

  return (
    <>
      {showAuthModal && (
        <LoginScreen onClose={() => setShowAuthModal(false)} />
      )}
      {showDictionary && (
        <DictionaryModal 
          dictionary={dictionary} 
          setDictionary={setDictionary} 
          onClose={() => setShowDictionary(false)} 
        />
      )}
      {renderContent()}
    </>
  );
}

export default App;
