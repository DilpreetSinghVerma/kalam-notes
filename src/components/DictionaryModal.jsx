import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

const DictionaryModal = ({ dictionary, setDictionary, onClose }) => {
  const [engWord, setEngWord] = useState('');
  const [localWord, setLocalWord] = useState('');

  const handleAdd = () => {
    if (engWord.trim() && localWord.trim()) {
      setDictionary(prev => ({
        ...prev,
        [engWord.trim().toLowerCase()]: localWord.trim()
      }));
      setEngWord('');
      setLocalWord('');
    }
  };

  const handleRemove = (key) => {
    const newDict = { ...dictionary };
    delete newDict[key];
    setDictionary(newDict);
  };

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="modal-content" style={{ background: 'var(--panel-bg)', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 40px rgba(0,0,0,0.3)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={20} />
        </button>
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-color)' }}>Custom Dictionary</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
          Map English words to exact Punjabi/Hindi spellings to override Google's suggestions.
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <input 
            type="text" 
            placeholder="English" 
            value={engWord}
            onChange={(e) => setEngWord(e.target.value)}
            style={{ flex: 1, minWidth: 0, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-line)', background: 'var(--bg-color)', color: 'var(--text-color)' }}
          />
          <input 
            type="text" 
            placeholder="Local Script" 
            value={localWord}
            onChange={(e) => setLocalWord(e.target.value)}
            style={{ flex: 1, minWidth: 0, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-line)', background: 'var(--bg-color)', color: 'var(--text-color)' }}
          />
          <button onClick={handleAdd} style={{ padding: '8px', borderRadius: '6px', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={18} />
          </button>
        </div>

        <div className="dictionary-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {Object.keys(dictionary).length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px 0' }}>No custom words added yet.</div>
          ) : (
            Object.entries(dictionary).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-color)', borderRadius: '6px', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-color)' }}><strong>{key}</strong> &rarr; {val}</span>
                <button onClick={() => handleRemove(key)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DictionaryModal;
