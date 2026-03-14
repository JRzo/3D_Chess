import { useNavigate } from 'react-router-dom';

const RANK_COLORS = { Legend:'#ffd700', Platinum:'#c8dde8', Gold:'#ffd700', Silver:'#c0c0c0', Bronze:'#cd7f32' };

export function HUD({ user, turn, onReset }) {
  const navigate = useNavigate();
  const xpMax = (user?.stats?.level || 1) * 100;
  const xpPct = Math.min(100, Math.round(((user?.stats?.xp || 0) / xpMax) * 100));

  return (
    <div className="hud-panel">
      <div className="hud-identity">
        <div className="hud-avatar">{user?.avatar || '♟'}</div>
        <div className="hud-username">{user?.username || 'Guest'}</div>
        <div className="hud-rank" style={{ color: RANK_COLORS[user?.stats?.rank] }}>
          {user?.stats?.rank || 'Bronze'}
        </div>
      </div>

      <div className="hud-xp-block">
        <div className="hud-level-label">Level {user?.stats?.level || 1}</div>
        <div className="xp-bar"><div className="xp-fill" style={{ width: `${xpPct}%` }} /></div>
        <div className="hud-xp-text">{user?.stats?.xp || 0} / {xpMax} XP</div>
      </div>

      <div className="turn-indicator">
        <div className={`turn-dot ${turn === 'w' ? 'dot-white' : 'dot-black'}`} />
        <span>{turn === 'w' ? "White's Turn" : "Black's Turn"}</span>
      </div>

      <div className="hud-stats-row">
        {[['Wins', user?.stats?.wins], ['Losses', user?.stats?.losses], ['Games', user?.stats?.totalGames]].map(([l, v]) => (
          <div key={l} className="hud-stat">
            <span className="hud-stat-val">{v || 0}</span>
            <span className="hud-stat-lbl">{l}</span>
          </div>
        ))}
      </div>

      <div className="hud-actions">
        <button className="btn-secondary w-full" onClick={onReset}>New Game</button>
        <button className="btn-ghost w-full" onClick={() => navigate('/home')}>← Home</button>
      </div>

      {user?.achievements?.length > 0 && (
        <div className="hud-achievements">
          <div className="hud-achievements-title">Achievements</div>
          {user.achievements.slice(-3).map((a, i) => (
            <div key={i} className="hud-achievement-item">🏆 {a.name}</div>
          ))}
        </div>
      )}
    </div>
  );
}
