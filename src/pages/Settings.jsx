import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/Navbar';
import { soundManager } from '../lib/sounds';
import api from '../lib/api';

const AVATARS = ['♟','♞','♜','♛','♚','♝','⚔','🏆','👑','⭐','🔥','💎'];

export function Settings() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: user?.username || '',
    bio: user?.bio || '',
    avatar: user?.avatar || '♟',
    settings: {
      soundEnabled:  user?.settings?.soundEnabled  ?? true,
      musicEnabled:  user?.settings?.musicEnabled  ?? false,
      theme:         user?.settings?.theme         || 'dark',
      boardStyle:    user?.settings?.boardStyle    || 'wood',
      showTutorial:  user?.settings?.showTutorial  ?? true,
    },
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const setS = (k, v) => setForm(f => ({ ...f, settings: { ...f.settings, [k]: v } }));

  const save = async () => {
    try {
      setError('');
      const { data } = await api.put('/users/me', form);
      updateUser(data);
      soundManager.enabled = form.settings.soundEnabled;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    }
  };

  return (
    <div className="page-root">
      <Navbar />
      <div className="settings-page">
        <h2>Settings</h2>

        <section className="settings-section">
          <h3>Profile</h3>
          <div className="form-group">
            <label>Username</label>
            <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Bio</label>
            <textarea rows={3} placeholder="Say something about yourself…" value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Avatar</label>
            <div className="avatar-picker">
              {AVATARS.map(a => (
                <button key={a} className={`av-btn ${form.avatar === a ? 'av-selected' : ''}`}
                  onClick={() => setForm(f => ({ ...f, avatar: a }))}>{a}</button>
              ))}
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h3>Audio</h3>
          {[['soundEnabled','Sound Effects'],['musicEnabled','Background Music']].map(([k, label]) => (
            <div key={k} className="toggle-row">
              <span>{label}</span>
              <label className="toggle">
                <input type="checkbox" checked={form.settings[k]} onChange={e => setS(k, e.target.checked)} />
                <span className="toggle-knob" />
              </label>
            </div>
          ))}
        </section>

        <section className="settings-section">
          <h3>Appearance</h3>
          <div className="form-group">
            <label>Board Style</label>
            <div className="option-row">
              {['wood','marble','neon'].map(b => (
                <button key={b} className={`opt-btn ${form.settings.boardStyle === b ? 'opt-active' : ''}`}
                  onClick={() => setS('boardStyle', b)}>{b}</button>
              ))}
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h3>Game</h3>
          <div className="toggle-row">
            <span>Show Tutorial on New Game</span>
            <label className="toggle">
              <input type="checkbox" checked={form.settings.showTutorial}
                onChange={e => setS('showTutorial', e.target.checked)} />
              <span className="toggle-knob" />
            </label>
          </div>
        </section>

        {error && <div className="form-error">{error}</div>}
        {saved && <div className="form-success">✓ Settings saved!</div>}

        <div className="settings-actions">
          <button className="btn-primary" onClick={save}>Save Changes</button>
          <button className="btn-danger" onClick={() => { logout(); navigate('/'); }}>Logout</button>
        </div>
      </div>
    </div>
  );
}
