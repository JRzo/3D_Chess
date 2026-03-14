import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'signup' && form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await signup(form.username, form.email, form.password);
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">♟</div>
        <h1 className="auth-title">3D Chess</h1>
        <p className="auth-sub">Ranks · Levels · Achievements</p>

        <div className="auth-tabs">
          <button className={mode === 'login' ? 'tab-active' : 'tab'} onClick={() => { setMode('login'); setError(''); }}>Login</button>
          <button className={mode === 'signup' ? 'tab-active' : 'tab'} onClick={() => { setMode('signup'); setError(''); }}>Sign Up</button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <div className="form-group">
              <label>Username</label>
              <input type="text" placeholder="Choose a username" value={form.username}
                onChange={e => set('username', e.target.value)} required minLength={3} />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="your@email.com" value={form.email}
              onChange={e => set('email', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <div className="pw-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                required
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
            {mode === 'signup' && <div className="form-hint">At least 6 characters</div>}
          </div>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <span className="btn-spinner">⟳</span> : null}
            {loading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <span className="auth-footer-icon">♔</span>
          <span className="auth-footer-icon">♛</span>
          <span className="auth-footer-icon">♜</span>
          <span className="auth-footer-icon">♞</span>
        </div>
      </div>
    </div>
  );
}
