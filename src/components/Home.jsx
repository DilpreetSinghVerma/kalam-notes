import React, { useState } from 'react';
import { Plus, Trash2, Sun, Moon, Search, Pin, BookOpen, User, CheckSquare, Square, X, MoreVertical, LayoutGrid, LayoutList, Palette, RotateCcw, Trash, Share2 } from 'lucide-react';

const NOTE_COLORS = [
  { name: 'Default', value: '' },
  { name: 'Rose', value: '#be123c' },
  { name: 'Orange', value: '#c2410c' },
  { name: 'Amber', value: '#b45309' },
  { name: 'Emerald', value: '#047857' },
  { name: 'Blue', value: '#1d4ed8' },
  { name: 'Violet', value: '#6d28d9' },
  { name: 'Pink', value: '#a21caf' },
];

const Home = ({ notes, createNewNote, openNote, deleteNote, togglePin, formatDate, theme, toggleTheme, searchQuery, setSearchQuery, onOpenDictionary, user, onOpenAuth, deleteMultipleNotes, togglePinMultiple, setNoteColor, trash = [], restoreFromTrash, permanentDelete, emptyTrash }) => {
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [isListView, setIsListView] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(null);

  const toggleSelection = (e, id) => {
    e.stopPropagation();
    if (selectedNotes.includes(id)) {
      setSelectedNotes(selectedNotes.filter(nid => nid !== id));
    } else {
      setSelectedNotes([...selectedNotes, id]);
    }
  };

  const handleCardClick = (e, id) => {
    if (selectedNotes.length > 0) {
      toggleSelection(e, id);
    } else {
      openNote(id);
    }
  };

  const handleDeleteSelected = () => {
    if(window.confirm(`Delete ${selectedNotes.length} selected notes?`)) {
      deleteMultipleNotes(selectedNotes);
      setSelectedNotes([]);
    }
  };

  const handlePinSelected = (state) => {
    togglePinMultiple(selectedNotes, state);
    setSelectedNotes([]);
  };

  const shareNote = (note) => {
    const text = (note.title ? note.title + '\n\n' : '') + (note.content || '').replace(/<[^>]*>?/gm, '');
    if (navigator.share) {
      navigator.share({ title: note.title || 'Kalam Note', text });
    } else {
      navigator.clipboard.writeText(text);
      alert('Note copied to clipboard!');
    }
  };

  const getDaysLeft = (deletedAt) => {
    const days = Math.ceil((30 * 24 * 60 * 60 * 1000 - (Date.now() - new Date(deletedAt).getTime())) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  // Trash View
  if (showTrash) {
    return (
      <div className="home-container" onClick={() => setShowMenu(false)}>
        <div className="home-header">
          <div className="home-title" style={{ cursor: 'pointer' }} onClick={() => setShowTrash(false)}>
            <X size={20} style={{ marginRight: '8px' }} />
            Recently Deleted
          </div>
          {trash.length > 0 && (
            <button className="icon-btn" style={{ color: '#ef4444', width: 'auto', padding: '0 12px' }} onClick={() => { if(window.confirm('Permanently delete all notes in trash?')) emptyTrash(); }}>
              Empty Trash
            </button>
          )}
        </div>
        <div className="notes-grid">
          {trash.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
              <Trash size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <p>Trash is empty</p>
            </div>
          ) : trash.map(note => (
            <div key={note.id} className="note-card" style={{ position: 'relative', borderColor: note.color ? note.color + '44' : undefined, background: note.color ? note.color + '11' : undefined }}>
              <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px', zIndex: 2 }}>
                <button className="icon-btn small hover-show" onClick={() => restoreFromTrash(note.id)} title="Restore" style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#22c55e' }}>
                  <RotateCcw size={16} />
                </button>
                <button className="delete-card-btn" onClick={() => { if(window.confirm('Permanently delete this note?')) permanentDelete(note.id); }} title="Delete Permanently" style={{ position: 'static' }}>
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="note-card-title" style={{ paddingRight: '60px' }}>{note.title || 'Untitled Note'}</div>
              <div className="note-card-date">{formatDate(note.date)}</div>
              <div className="note-card-preview" dangerouslySetInnerHTML={{ __html: note.content || '<i>No content</i>' }} />
              <div style={{ marginTop: 'auto', paddingTop: '8px', fontSize: '12px', color: '#ef4444' }}>
                Auto-deletes in {getDaysLeft(note.deletedAt)} days
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="home-container" style={{ paddingBottom: selectedNotes.length > 0 ? '80px' : '0' }} onClick={() => { setShowMenu(false); setShowColorPicker(null); }}>
      {selectedNotes.length > 0 ? (
        <div className="home-header" style={{ background: 'var(--panel-bg)', justifyContent: 'space-between' }}>
          <button className="icon-btn" style={{color: '#eab308', width: 'auto', padding: '0 12px'}} onClick={() => setSelectedNotes([])}>
            Cancel
          </button>
          <div style={{fontSize: '20px', fontWeight: 'bold'}}>{selectedNotes.length} selected</div>
          <button className="icon-btn" style={{color: '#eab308', width: 'auto', padding: '0 12px'}} onClick={() => setSelectedNotes(notes.map(n => n.id))}>
            Select all
          </button>
        </div>
      ) : (
        <div className="home-header">
          <div className="home-title">
            <img src="./logo.png" alt="Kalam Logo" style={{ width: '40px', height: '40px', borderRadius: '8px' }} />
            Kalam Notes
          </div>
          <div className="search-bar" style={{ display: 'flex', alignItems: 'center', background: 'var(--panel-bg)', padding: '8px 16px', borderRadius: '20px', flex: 1, maxWidth: '400px', margin: '0 20px' }}>
            <Search size={18} style={{ color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Search notes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'transparent', color: 'var(--text-color)', marginLeft: '8px', flex: 1, outline: 'none' }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}>
              <MoreVertical size={20} />
            </button>

            {showMenu && (
              <div className="custom-dropdown-menu" style={{ right: 0, left: 'auto', minWidth: '200px', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                <div className="custom-dropdown-item" style={{display: 'flex', alignItems: 'center'}} onClick={() => { setIsListView(!isListView); setShowMenu(false); }}>
                  {isListView ? <><LayoutGrid size={16} style={{marginRight: '12px'}} /> Grid view</> : <><LayoutList size={16} style={{marginRight: '12px'}} /> List view</>}
                </div>
                <div className="custom-dropdown-item" style={{display: 'flex', alignItems: 'center'}} onClick={() => { setShowTrash(true); setShowMenu(false); }}>
                  <Trash size={16} style={{marginRight: '12px'}} /> Recently Deleted
                  {trash.length > 0 && <span style={{marginLeft: 'auto', background: '#ef4444', color: '#fff', borderRadius: '10px', padding: '2px 8px', fontSize: '12px'}}>{trash.length}</span>}
                </div>
                <div className="custom-dropdown-item" style={{display: 'flex', alignItems: 'center'}} onClick={() => { onOpenDictionary(); setShowMenu(false); }}>
                  <BookOpen size={16} style={{marginRight: '12px'}} /> Custom Dictionary
                </div>
                <div className="custom-dropdown-item" style={{display: 'flex', alignItems: 'center'}} onClick={() => { toggleTheme(); setShowMenu(false); }}>
                  {theme === 'dark' ? <><Sun size={16} style={{marginRight: '12px'}} /> Switch to Light</> : <><Moon size={16} style={{marginRight: '12px'}} /> Switch to Dark</>}
                </div>
                <div className="custom-dropdown-item" style={{display: 'flex', alignItems: 'center', color: user ? '#eab308' : 'inherit'}} onClick={() => { onOpenAuth(); setShowMenu(false); }}>
                  <User size={16} style={{marginRight: '12px'}} /> {user ? "Sign Out" : "Sign In"}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className={isListView ? "notes-list" : "notes-grid"}>
        {selectedNotes.length === 0 && (
          <div className="note-card create-new-card" onClick={createNewNote}>
            <div className="create-icon-wrapper">
              <Plus size={32} />
            </div>
            <h3>Create New Note</h3>
          </div>
        )}
        
        {notes.map(note => {
          const isSelected = selectedNotes.includes(note.id);
          const selectionMode = selectedNotes.length > 0;
          return (
            <div 
              key={note.id} 
              className={`note-card ${isSelected ? 'selected' : ''}`} 
              style={{ 
                position: 'relative', 
                border: isSelected ? '2px solid #eab308' : note.color ? `1px solid ${note.color}44` : '1px solid var(--border-color)',
                background: note.color ? note.color + '11' : undefined,
                cursor: 'pointer' 
              }} 
              onClick={(e) => handleCardClick(e, note.id)}
            >
              {note.color && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: note.color, borderRadius: '12px 12px 0 0' }} />
              )}
              <div className="card-actions" style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '6px', zIndex: 2 }}>
                {selectionMode ? (
                  <button className="icon-btn small" onClick={(e) => toggleSelection(e, note.id)} style={{ padding: 0, background: 'transparent', border: 'none' }}>
                    {isSelected ? <CheckSquare size={20} color="#eab308" /> : <Square size={20} color="var(--text-secondary)" />}
                  </button>
                ) : (
                  <>
                    <button 
                      className="icon-btn small hover-show" 
                      onClick={(e) => toggleSelection(e, note.id)} 
                      title="Select"
                      style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                    >
                      <Square size={14} />
                    </button>
                    <button 
                      className="icon-btn small hover-show" 
                      onClick={(e) => { e.stopPropagation(); togglePin(e, note.id); }} 
                      title={note.pinned ? "Unpin Note" : "Pin Note"}
                      style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: note.pinned ? '#eab308' : 'var(--text-secondary)' }}
                    >
                      <Pin size={14} fill={note.pinned ? '#eab308' : 'none'} />
                    </button>
                    <button 
                      className="delete-card-btn" 
                      onClick={(e) => { e.stopPropagation(); deleteNote(e, note.id); }} 
                      title="Delete Note"
                      style={{ position: 'static' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
              <div className="note-card-title" style={{ paddingRight: '60px' }}>{note.title || 'Untitled Note'}</div>
              <div className="note-card-date">{formatDate(note.date)}</div>
              <div 
                className="note-card-preview"
                dangerouslySetInnerHTML={{ __html: note.content || '<i>No content</i>' }}
              />
            </div>
          );
        })}
      </div>

      {selectedNotes.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: '60px', right: 0, background: 'var(--panel-bg)', display: 'flex', justifyContent: 'center', gap: '24px', padding: '16px', borderTop: '1px solid var(--border-color)', zIndex: 100, animation: 'slideUp 0.3s ease-out' }}>
          <button className="icon-btn" style={{ flexDirection: 'column', gap: '4px', height: 'auto', width: '60px' }} onClick={() => handlePinSelected(true)}>
            <Pin size={20} />
            <span style={{ fontSize: '12px' }}>Pin</span>
          </button>
          <button className="icon-btn" style={{ flexDirection: 'column', gap: '4px', height: 'auto', width: '60px' }} onClick={() => handlePinSelected(false)}>
            <X size={20} />
            <span style={{ fontSize: '12px' }}>Unpin</span>
          </button>
          <button className="icon-btn" style={{ flexDirection: 'column', gap: '4px', height: 'auto', width: '60px', color: '#3b82f6' }} onClick={() => {
            if (selectedNotes.length === 1) {
              const note = notes.find(n => n.id === selectedNotes[0]);
              if (note) shareNote(note);
            } else {
              alert('Please select only one note to share.');
            }
          }}>
            <Share2 size={20} />
            <span style={{ fontSize: '12px' }}>Share</span>
          </button>
          <button className="icon-btn" style={{ flexDirection: 'column', gap: '4px', height: 'auto', width: '60px' }} onClick={() => {
            setShowColorPicker('bottom');
          }}>
            <Palette size={20} />
            <span style={{ fontSize: '12px' }}>Color</span>
          </button>
          <button className="icon-btn" style={{ flexDirection: 'column', gap: '4px', height: 'auto', width: '60px', color: '#ef4444' }} onClick={handleDeleteSelected}>
            <Trash2 size={20} />
            <span style={{ fontSize: '12px' }}>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;
