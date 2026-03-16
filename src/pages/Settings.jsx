import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/Navbar';
import { soundManager } from '../lib/sounds';
import api from '../lib/api';

const AVATARS = ['♟','♞','♜','♛','♚','♝','⚔','🏆','👑','⭐','🔥','💎'];

const BOARD_STYLES = [
  { key: 'wood',   label: 'Wood',   preview: '🟫', desc: 'Classic warm wood' },
  { key: 'marble', label: 'Marble', preview: '⬜', desc: 'Elegant marble' },
  { key: 'neon',   label: 'Neon',   preview: '🟦', desc: 'Vibrant neon glow' },
];

const PIECE_COLORS = [
  { key: 'classic',  label: 'Classic',  w: '#f2ede0', b: '#231f1a', desc: 'Ivory & ebony' },
  { key: 'walnut',   label: 'Walnut',   w: '#d4a04c', b: '#5c2e0e', desc: 'Gold & mahogany' },
  { key: 'crystal',  label: 'Crystal',  w: '#c8e8ff', b: '#1840b0', desc: 'Ice & deep blue' },
  { key: 'royal',    label: 'Royal',    w: '#f0deff', b: '#4a0f8a', desc: 'Lavender & violet' },
  { key: 'obsidian', label: 'Obsidian', w: '#a8b4c8', b: '#1a1f28', desc: 'Silver & jet black' },
  { key: 'gold',     label: 'Gold',     w: '#ffd700', b: '#8b1a00', desc: 'Gold & crimson' },
];

export function Settings() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: user?.username || '',
    bio: user?.bio || '',
    avatar: user?.avatar || '♟',
    settings: {
      soundEnabled:      user?.settings?.soundEnabled      ?? true,
      musicEnabled:      user?.settings?.musicEnabled      ?? false,
      theme:             user?.settings?.theme             || 'dark',
      boardStyle:        user?.settings?.boardStyle        || 'wood',
      pieceColorScheme:  user?.settings?.pieceColorScheme  || 'classic',
      showTutorial:      user?.settings?.showTutorial      ?? true,
    },
  });
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const setS = (k, v) => setForm(f => ({ ...f, settings: { ...f.settings, [k]: v } }));

  const save = async () => {
    if (!form.username.trim()) { setError('Username cannot be empty'); return; }
    if (form.username.length < 3) { setError('Username must be at least 3 characters'); return; }
    setSaving(true);
    try {
      setError('');
      const { data } = await api.put('/users/me', form);
      updateUser(data);
      soundManager.enabled = form.settings.soundEnabled;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-root">
      <Navbar />
      <div className="settings-page">
        <h2>⚙ Settings</h2>

        {/* ── Profile ────────────────────────────────────────── */}
        <section className="settings-section">
          <h3>Profile</h3>
          <div className="form-group">
            <label>Username <span className="form-char-count">{form.username.length}/20</span></label>
            <input
              value={form.username} maxLength={20}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="Your display name"
            />
          </div>
          <div className="form-group">
            <label>Bio <span className="form-char-count">{form.bio.length}/160</span></label>
            <textarea
              rows={3} placeholder="Say something about yourself…"
              value={form.bio} maxLength={160}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Avatar</label>
            <div className="avatar-picker">
              {AVATARS.map(a => (
                <button
                  key={a}
                  className={`av-btn ${form.avatar === a ? 'av-selected' : ''}`}
                  onClick={() => setForm(f => ({ ...f, avatar: a }))}
                >{a}</button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Audio ─────────────────────────────────────────── */}
        <section className="settings-section">
          <h3>Audio</h3>
          {[['soundEnabled','🔊 Sound Effects'],['musicEnabled','🎵 Background Music']].map(([k, label]) => (
            <div key={k} className="toggle-row">
              <span>{label}</span>
              <label className="toggle">
                <input type="checkbox" checked={form.settings[k]} onChange={e => setS(k, e.target.checked)} />
                <span className="toggle-knob" />
              </label>
            </div>
          ))}
        </section>

        {/* ── Appearance ────────────────────────────────────── */}
        <section className="settings-section">
          <h3>Appearance</h3>

          <div className="form-group">
            <label>Board Style</label>
            <div className="board-style-picker">
              {BOARD_STYLES.map(b => (
                <button
                  key={b.key}
                  className={`board-style-opt ${form.settings.boardStyle === b.key ? 'board-style-active' : ''}`}
                  onClick={() => setS('boardStyle', b.key)}
                >
                  <span className="board-style-preview">{b.preview}</span>
                  <span className="board-style-label">{b.label}</span>
                  <span className="board-style-desc">{b.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '14px' }}>
            <label>Piece Colors</label>
            <div className="piece-color-picker">
              {PIECE_COLORS.map(c => (
                <button
                  key={c.key}
                  className={`piece-color-opt ${form.settings.pieceColorScheme === c.key ? 'piece-color-active' : ''}`}
                  onClick={() => setS('pieceColorScheme', c.key)}
                >
                  <div className="piece-color-swatch">
                    <span className="piece-color-w" style={{ color: c.w }}>♟</span>
                    <span className="piece-color-b" style={{ color: c.b }}>♟</span>
                  </div>
                  <span className="piece-color-label">{c.label}</span>
                  <span className="piece-color-desc">{c.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Game ──────────────────────────────────────────── */}
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
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? '⟳ Saving…' : '💾 Save Changes'}
          </button>
          <button className="btn-danger" onClick={() => setShowLogoutConfirm(true)}>Logout</button>
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="overlay-backdrop" onClick={() => setShowLogoutConfirm(false)}>
          <div className="confirm-card" onClick={e => e.stopPropagation()}>
            <h3>Log out?</h3>
            <p>You will be returned to the login screen.</p>
            <div className="confirm-actions">
              <button className="btn-danger" onClick={() => { logout(); navigate('/'); }}>Logout</button>
              <button className="btn-secondary" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
