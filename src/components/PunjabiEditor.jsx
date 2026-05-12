import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Indent, Outdent,
  Heading1, Heading2, Type, Undo, Redo, Image as ImageIcon
} from 'lucide-react';

const PunjabiEditor = ({ content, onChange, onOfflineStatus, pageSize = 'Fluid', language = 'punjabi', dictionary = {} }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState({ start: -1, end: -1, node: null });
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const editorRef = useRef(null);
  const suggestionCache = useRef({});
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        editorRef.current.focus();
        document.execCommand('insertImage', false, base64);
        if (editorRef.current) {
          onChange(editorRef.current.innerHTML);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    // Only update innerHTML if it completely differs to prevent losing caret position while typing
    if (editorRef.current && content !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = content || '';
    }
  }, [content]);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); onOfflineStatus(true); };
    const handleOffline = () => { setIsOnline(false); onOfflineStatus(false); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onOfflineStatus]);

  const getTopSuggestion = async (word) => {
    if (!word || !isOnline || language === 'english') return null;
    
    const cacheKey = `${language}_${word}`;
    if (suggestionCache.current[cacheKey]) return suggestionCache.current[cacheKey][0];
    
    const itc = language === 'hindi' ? 'hi-t-i0-und' : 'pa-t-i0-und';
    
    try {
      const response = await fetch(`https://inputtools.google.com/request?text=${encodeURIComponent(word)}&itc=${itc}&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`);
      const data = await response.json();
      if (data[0] === 'SUCCESS' && data[1][0]) {
        const sugs = data[1][0][1];
        suggestionCache.current[cacheKey] = sugs;
        return sugs[0];
      }
    } catch (error) {
      console.error("Transliteration error:", error);
    }
    return null;
  };

  const fetchSuggestions = async (word, node) => {
    if (!word || !isOnline || language === 'english') {
      setSuggestions([]);
      return;
    }
    
    const cacheKey = `${language}_${word}`;
    if (suggestionCache.current[cacheKey]) {
      setSuggestions(suggestionCache.current[cacheKey]);
      setSelectedIndex(0);
      return;
    }
    
    const itc = language === 'hindi' ? 'hi-t-i0-und' : 'pa-t-i0-und';
    
    try {
      const response = await fetch(`https://inputtools.google.com/request?text=${encodeURIComponent(word)}&itc=${itc}&num=5&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`);
      const data = await response.json();
      if (data[0] === 'SUCCESS' && data[1][0]) {
        const sugs = data[1][0][1];
        if (!sugs.includes(word)) sugs.push(word);
        suggestionCache.current[cacheKey] = sugs;
        
        // Ensure cursor hasn't moved away from the word before showing dropdown
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && selection.getRangeAt(0).startContainer === node) {
          setSuggestions(sugs);
          setSelectedIndex(0);
        }
      }
    } catch (error) {
      console.error("Transliteration error:", error);
    }
  };

  const updateCurrentWord = () => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    
    if (range.startContainer.nodeType !== Node.TEXT_NODE) {
       setSuggestions([]);
       return;
    }

    const text = range.startContainer.textContent;
    const cursorPosition = range.startOffset;

    let start = cursorPosition;
    let end = cursorPosition;
    
    while (start > 0 && !/\s/.test(text[start - 1])) start--;
    while (end < text.length && !/\s/.test(text[end])) end++;
    
    const word = text.substring(start, end);
    setCurrentWordIndex({ start, end, node: range.startContainer });
    
    if (word && /^[a-zA-Z]+$/.test(word)) {
      fetchSuggestions(word, range.startContainer);
      
      const rect = range.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();
      
      setDropdownPos({
        top: rect.bottom - editorRect.top + editorRef.current.scrollTop + 5,
        left: rect.left - editorRect.left + editorRef.current.scrollLeft
      });
    } else {
      setSuggestions([]);
    }
  };

  const handleInput = (e) => {
    onChange(e.currentTarget.innerHTML);
    updateCurrentWord();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const applySuggestionDirect = (suggestion, start, end, node, addSpace) => {
    if (!node) return;
    const selection = window.getSelection();
    const range = document.createRange();
    
    try {
      range.setStart(node, start);
      range.setEnd(node, end);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Native insertText beautifully replaces text and handles HTML nodes gracefully
      document.execCommand('insertText', false, suggestion + (addSpace ? ' ' : ''));
      
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    } catch(e) {
      console.error("Error applying suggestion:", e);
    }
    
    setSuggestions([]);
  };

  const handleKeyDown = async (e) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        applySuggestionDirect(suggestions[selectedIndex], currentWordIndex.start, currentWordIndex.end, currentWordIndex.node, e.key === ' ');
        return;
      } else if (e.key === 'Escape') {
        setSuggestions([]);
        return;
      } else if (/^[1-9]$/.test(e.key)) {
        const numIndex = parseInt(e.key, 10) - 1;
        if (numIndex >= 0 && numIndex < suggestions.length) {
          e.preventDefault();
          applySuggestionDirect(suggestions[numIndex], currentWordIndex.start, currentWordIndex.end, currentWordIndex.node, true);
          return;
        }
      }
    }

    // Fast typing fallback
    if (e.key === 'Enter' || e.key === ' ') {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      const range = selection.getRangeAt(0);
      
      if (range.startContainer.nodeType === Node.TEXT_NODE) {
        const text = range.startContainer.textContent;
        const cursorPosition = range.startOffset;

        let start = cursorPosition;
        let end = cursorPosition;
        
        while (start > 0 && !/\s/.test(text[start - 1])) start--;
        while (end < text.length && !/\s/.test(text[end])) end++;
        
        const word = text.substring(start, end);
        if (word && /^[a-zA-Z]+$/.test(word)) {
          if (dictionary[word.toLowerCase()] && language !== 'english') {
            e.preventDefault();
            applySuggestionDirect(dictionary[word.toLowerCase()], start, end, range.startContainer, e.key === ' ');
            return;
          }
          if (isOnline && language !== 'english') {
            e.preventDefault();
            const topSuggestion = await getTopSuggestion(word);
            if (topSuggestion) {
              applySuggestionDirect(topSuggestion, start, end, range.startContainer, e.key === ' ');
            } else {
               document.execCommand('insertText', false, e.key === ' ' ? ' ' : '\n');
            }
          }
          // If english or offline, do nothing and let the browser insert the space/newline naturally.
        }
      }
    }
  };

  const handleFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current.focus();
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleFormatBlock = (tag) => {
    document.execCommand('formatBlock', false, tag);
    editorRef.current.focus();
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="editor-toolbar" style={{ flexWrap: 'wrap' }}>
         <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />
         <button className="format-btn" onClick={() => handleFormat('undo')} title="Undo"><Undo size={18} /></button>
         <button className="format-btn" onClick={() => handleFormat('redo')} title="Redo"><Redo size={18} /></button>
         <div className="toolbar-divider"></div>
         <button className="format-btn" onClick={() => handleFormatBlock('H1')} title="Heading 1"><Heading1 size={18} /></button>
         <button className="format-btn" onClick={() => handleFormatBlock('H2')} title="Heading 2"><Heading2 size={18} /></button>
         <button className="format-btn" onClick={() => handleFormatBlock('P')} title="Normal Text"><Type size={18} /></button>
         <div className="toolbar-divider"></div>
         <button className="format-btn" onClick={() => handleFormat('bold')} title="Bold"><Bold size={18} /></button>
         <button className="format-btn" onClick={() => handleFormat('italic')} title="Italic"><Italic size={18} /></button>
         <button className="format-btn" onClick={() => handleFormat('underline')} title="Underline"><Underline size={18} /></button>
         <button className="format-btn" onClick={() => handleFormat('strikeThrough')} title="Strikethrough"><Strikethrough size={18} /></button>
         <div className="toolbar-divider"></div>
         <button className="format-btn" onClick={() => handleFormat('justifyLeft')} title="Align Left"><AlignLeft size={18} /></button>
         <button className="format-btn" onClick={() => handleFormat('justifyCenter')} title="Align Center"><AlignCenter size={18} /></button>
         <button className="format-btn" onClick={() => handleFormat('justifyRight')} title="Align Right"><AlignRight size={18} /></button>
         <div className="toolbar-divider"></div>
         <button className="format-btn" onClick={() => handleFormat('insertUnorderedList')} title="Bullet List"><List size={18} /></button>
         <button className="format-btn" onClick={() => handleFormat('insertOrderedList')} title="Numbered List"><ListOrdered size={18} /></button>
         <button className="format-btn" onClick={() => handleFormat('outdent')} title="Decrease Indent"><Outdent size={18} /></button>
         <button className="format-btn" onClick={() => handleFormat('indent')} title="Increase Indent"><Indent size={18} /></button>
         <div className="toolbar-divider"></div>
         <button className="format-btn" onClick={() => fileInputRef.current.click()} title="Insert Image"><ImageIcon size={18} /></button>
      </div>

      <div className="editor-scroller" style={{ flex: 1, overflowY: 'auto', background: pageSize !== 'Fluid' ? 'var(--panel-bg)' : 'transparent' }}>
        <div className="textarea-wrapper" style={{ 
            position: 'relative',
            padding: pageSize === 'Fluid' ? '20px 40px' : (pageSize === 'Mobile' ? '24px' : '96px'),
            margin: pageSize === 'Fluid' ? '0 auto' : '40px auto',
            width: pageSize === 'A4' ? '794px' : (pageSize === 'A5' ? '559px' : (pageSize === 'Letter' ? '816px' : (pageSize === 'Mobile' ? '390px' : '100%'))),
            maxWidth: pageSize === 'Fluid' ? '800px' : 'none',
            minHeight: pageSize === 'A4' ? '1123px' : (pageSize === 'A5' ? '794px' : (pageSize === 'Letter' ? '1056px' : (pageSize === 'Mobile' ? '844px' : '100%'))),
            background: pageSize !== 'Fluid' ? 'var(--bg-color)' : 'transparent',
            boxShadow: pageSize !== 'Fluid' ? '0 10px 40px rgba(0,0,0,0.2)' : 'none',
            borderRadius: pageSize === 'Mobile' ? '24px' : '0',
            border: pageSize === 'Mobile' ? '8px solid var(--border-line)' : 'none',
            height: pageSize === 'Fluid' ? '100%' : 'max-content'
        }}>
          <div 
             ref={editorRef}
             className="punjabi-content-editable"
           contentEditable
           onInput={handleInput}
           onPaste={handlePaste}
           onKeyDown={handleKeyDown}
           onClick={updateCurrentWord}
           onKeyUp={(e) => {
              if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                updateCurrentWord();
              }
           }}
           data-placeholder="Enter your text..."
        />
        
        {suggestions.length > 0 && isOnline && (
          <div 
            className="suggestions-dropdown" 
            style={{ 
              top: `${dropdownPos.top}px`, 
              left: `${dropdownPos.left}px`
            }}
          >
            {suggestions.map((suggestion, index) => (
              <div 
                key={index}
                className={`suggestion-item ${index === selectedIndex ? 'active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applySuggestionDirect(
                    suggestion, 
                    currentWordIndex.start, 
                    currentWordIndex.end, 
                    currentWordIndex.node, 
                    true
                  );
                }}
              >
                {index === 0 && suggestions.length > 1 && !/^[a-zA-Z]/.test(suggestion) ? `${suggestion} (Space)` : `${index + 1}. ${suggestion}`}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default PunjabiEditor;
