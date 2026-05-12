import React from 'react';
import { FileText, Trash2, Pin } from 'lucide-react';

const Sidebar = ({ notes, activeNoteId, setActiveNoteId, deleteNote, createNewNote, formatDate }) => {
  return (
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
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {note.pinned && <Pin size={12} fill="#eab308" color="#eab308" />}
                {note.title || 'Untitled'}
              </h4>
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
  );
};

export default Sidebar;
