import React, { useState, useEffect } from 'react';
import { LogIn, X } from 'lucide-react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithCredential } from 'firebase/auth';

const LoginScreen = ({ onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [waitingForBrowser, setWaitingForBrowser] = useState(false);

  // Listen for Google auth token coming back from the default browser
  useEffect(() => {
    let ipcRenderer;
    try {
      ipcRenderer = window.require('electron').ipcRenderer;
    } catch (e) { return; }

    const handleToken = (event, data) => {
      if (data.id_token) {
        const credential = GoogleAuthProvider.credential(data.id_token);
        signInWithCredential(auth, credential)
          .then(() => { 
            setWaitingForBrowser(false); 
            onClose(); 
          })
          .catch(err => { 
            setError(err.message); 
            setWaitingForBrowser(false); 
          });
      }
    };

    ipcRenderer.on('google-auth-token', handleToken);
    return () => ipcRenderer.removeListener('google-auth-token', handleToken);
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    
    if (auth.app.options.apiKey === "YOUR_API_KEY") {
      setError("Firebase is not configured yet!");
      return;
    }

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');

    // In Electron: open in default browser
    try {
      const { ipcRenderer } = window.require('electron');
      setWaitingForBrowser(true);
      ipcRenderer.invoke('google-sign-in');
      return;
    } catch (e) { /* Not Electron — use web popup */ }

    // In browser: use Firebase popup
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
      <div className="modal-content" style={{ background: 'var(--panel-bg)', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.3)', width: '90%', maxWidth: '400px', textAlign: 'center', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={20} />
        </button>
        <img src="./logo.png" alt="Kalam Logo" style={{ width: '80px', height: '80px', borderRadius: '16px', marginBottom: '20px' }} />
        <h1 style={{ margin: '0 0 10px 0', color: 'var(--text-color)' }}>Kalam Sync</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>Sign in to sync your notes across devices.</p>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && <div style={{ color: '#ef4444', fontSize: '14px', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '6px' }}>{error}</div>}
          
          <input 
            type="email" 
            placeholder="Email Address" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-line)', background: 'var(--bg-color)', color: 'var(--text-color)', outline: 'none' }}
            required
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-line)', background: 'var(--bg-color)', color: 'var(--text-color)', outline: 'none' }}
            required
          />
          
          <button type="submit" style={{ padding: '12px', borderRadius: '8px', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '16px', fontWeight: 'bold' }}>
            <LogIn size={20} /> {isRegistering ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div style={{ margin: '20px 0', color: 'var(--text-secondary)' }}>
          {isRegistering ? "Already have an account?" : "Don't have an account?"}
          <button onClick={() => setIsRegistering(!isRegistering)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', marginLeft: '5px' }}>
            {isRegistering ? 'Sign In' : 'Sign Up'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-line)' }}></div>
          <div style={{ padding: '0 10px', color: 'var(--text-secondary)', fontSize: '14px' }}>OR</div>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-line)' }}></div>
        </div>

        <button onClick={handleGoogleAuth} disabled={waitingForBrowser} style={{ padding: '12px', width: '100%', borderRadius: '8px', background: waitingForBrowser ? '#1a1d24' : 'white', color: waitingForBrowser ? '#eab308' : '#333', border: '1px solid #ccc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '16px', fontWeight: 'bold', marginBottom: '20px' }}>
          {waitingForBrowser ? (
            'Complete sign-in in your browser...'
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
              Continue with Google
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default LoginScreen;
