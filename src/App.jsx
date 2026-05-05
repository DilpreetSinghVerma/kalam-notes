import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { PenLine, BookOpen, Clock, FileText, Wifi, WifiOff, Trash2, Sun, Moon, Download, Maximize, Minimize, ChevronDown, Layout, CheckCircle, Plus, ArrowLeft } from 'lucide-react';
import PunjabiEditor from './components/PunjabiEditor';
import './index.css';

function App() {
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('kalam_notes') || localStorage.getItem('qalam_notes');
    return saved ? JSON.parse(saved) : [{ id: 1, title: '', content: '', date: new Date().toISOString() }];
  });
  
  // App state
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [view, setView] = useState('home'); // 'home' or 'editor'
  const [activeNoteId, setActiveNoteId] = useState(notes[0]?.id || 1);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [language, setLanguage] = useState(() => localStorage.getItem('kalam_language') || 'punjabi');
  
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
  const pageSizeMenuRef = useRef(null);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pageSizeMenuRef.current && !pageSizeMenuRef.current.contains(e.target)) {
        setShowPageSizeMenu(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    // Simulate loading progress
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

  useEffect(() => {
    localStorage.setItem('kalam_notes', JSON.stringify(notes));
  }, [notes]);

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
      date: new Date().toISOString()
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
    setView('editor');
  };

  const deleteNote = (e, id) => {
    e.stopPropagation();
    const newNotes = notes.filter(n => n.id !== id);
    if (newNotes.length === 0) {
      const freshNote = { id: Date.now(), title: '', content: '', date: new Date().toISOString() };
      setNotes([freshNote]);
      setActiveNoteId(freshNote.id);
    } else {
      setNotes(newNotes);
      if (activeNoteId === id) {
        setActiveNoteId(newNotes[0].id);
      }
    }
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

  const exportToTXT = () => {
    setShowExportMenu(false);
    const text = activeNote?.content.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ') || '';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${activeNote?.title || 'Kalam_Document'}.txt`;
    link.click();
  };

  const exportToWord = () => {
    setShowExportMenu(false);
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

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-overlay"></div>
        <div className="loading-content">
          <img src="./logo.png" alt="Kalam Logo" className="loading-logo" />
          <h1 className="loading-text">Kalam</h1>
          <p className="loading-subtext">Awakening the magic of words...</p>
          
          <div className="loading-bar-wrapper">
            <div className="loading-bar-container">
              <div 
                className="loading-bar-progress" 
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
            <div className="loading-percentage">{loadingProgress}%</div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'home') {
    return (
      <div className="home-container">
        <div className="home-header">
          <div className="home-title">
            <img src="./logo.png" alt="Kalam Logo" style={{ width: '40px', height: '40px', borderRadius: '8px' }} />
            Kalam Notes
          </div>
          <button className="icon-btn" onClick={toggleTheme} title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
        
        <div className="notes-grid">
          <div className="note-card create-new-card" onClick={createNewNote}>
            <div className="create-icon-wrapper">
              <Plus size={32} />
            </div>
            <h3>Create New Note</h3>
          </div>
          
          {notes.map(note => (
            <div key={note.id} className="note-card" onClick={() => openNote(note.id)}>
              <button 
                className="delete-card-btn" 
                onClick={(e) => deleteNote(e, note.id)} 
                title="Delete Note"
              >
                <Trash2 size={16} />
              </button>
              <div className="note-card-title">{note.title || 'Untitled Note'}</div>
              <div className="note-card-date">{formatDate(note.date)}</div>
              <div 
                className="note-card-preview"
                dangerouslySetInnerHTML={{ __html: note.content || '<i>No content</i>' }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      {!isFocusMode && (
        <div className="sidebar">
          <div className="sidebar-header">
            <div className="app-logo">
              <img src="./logo.png" alt="Kalam Logo" style={{ width: '28px', height: '28px', borderRadius: '4px' }} />
              <span>Kalam</span>
            </div>
          </div>
          
          <div className="notes-list">
            {notes.map(note => (
              <div 
                key={note.id} 
                className={`note-item ${activeNoteId === note.id ? 'active' : ''}`}
                onClick={() => setActiveNoteId(note.id)}
              >
                <div className="note-info">
                  <h4>{note.title || 'Untitled'}</h4>
                  <p>{formatDate(note.date)}</p>
                </div>
                <button className="delete-btn" onClick={(e) => deleteNote(e, note.id)} title="Delete Note">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <button className="new-note-btn" onClick={createNewNote}>
            <FileText size={18} />
            Nava Panna (New Page)
          </button>
        </div>
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
}

export default App;
