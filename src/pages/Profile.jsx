import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/Navbar';
import api from '../lib/api';
import { RANK_COLORS, RANK_ICONS } from '../lib/constants';

export function Profile() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const isOwn = me?._id === id;

  useEffect(() => {
    Promise.all([api.get(`/users/${id}`), api.get(`/games/user/${id}`)])
      .then(([p, g]) => { setProfile(p.data); setGames(g.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="page-root">
      <Navbar />
      <div className="profile-skeleton">
        <div className="skel-av" />
        <div className="skel-line skel-lg" />
        <div className="skel-line skel-md" />
        <div className="skel-line skel-sm" />
      </div>
    </div>
  );
  if (!profile) return <div className="page-root"><Navbar /><div className="loading-msg">Profile not found</div></div>;

  const { stats = {}, achievements = [] } = profile;
  const xpPct = Math.min(100, Math.round(((stats.xp || 0) / ((stats.level || 1) * 100)) * 100));
  const winRate = stats.totalGames > 0 ? Math.round(((stats.wins || 0) / stats.totalGames) * 100) : 0;
  const rank = stats.rank || 'Bronze';

  return (
    <div className="page-root">
      <Navbar />
      <div className="profile-page">

        <div className="profile-header">
          <div className="profile-av-wrap">
            <div className="profile-av">{profile.avatar || '♟'}</div>
            <div className="profile-av-rank" style={{ color: RANK_COLORS[rank] }}>
              {RANK_ICONS[rank]}
            </div>
          </div>
          <div className="profile-info">
            <h2>{profile.username}</h2>
            <div className="profile-rank" style={{ color: RANK_COLORS[rank] }}>
              {RANK_ICONS[rank]} {rank} · Level {stats.level || 1}
            </div>
            {profile.bio && <p className="profile-bio">{profile.bio}</p>}
            <p className="profile-joined">Joined {new Date(profile.createdAt).toLocaleDateString()}</p>
          </div>
          {isOwn && <button className="btn-secondary" onClick={() => navigate('/settings')}>✏ Edit Profile</button>}
        </div>

        <div className="profile-xp-section">
          <div className="profile-xp-labels">
            <span>Level {stats.level || 1}</span>
            <span>{stats.xp || 0} / {(stats.level || 1) * 100} XP</span>
          </div>
          <div className="xp-bar"><div className="xp-fill" style={{ width: `${xpPct}%` }} /></div>
          <div className="profile-xp-pct">{xpPct}%</div>
        </div>

        <div className="stat-cards">
          {[
            ['⚔', 'Wins',     stats.wins    || 0],
            ['🏳', 'Losses',  stats.losses  || 0],
            ['🤝', 'Draws',   stats.draws   || 0],
            ['📊', 'Win Rate',`${winRate}%`     ],
            ['🎮', 'Total',   stats.totalGames || 0],
          ].map(([icon, l, v]) => (
            <div key={l} className="stat-card">
              <div className="stat-icon">{icon}</div>
              <div className="stat-val">{v}</div>
              <div className="stat-lbl">{l}</div>
            </div>
          ))}
        </div>

        <div className="profile-sections">
          <div className="profile-section">
            <h3>🏆 Achievements</h3>
            <div className="ach-grid">
              {achievements.map((a, i) => (
                <div key={i} className="ach-badge">🏆 {a.name}</div>
              ))}
              {achievements.length === 0 && <p className="empty">No achievements yet. Keep playing!</p>}
            </div>
          </div>

          <div className="profile-section">
            <h3>🕐 Game History</h3>
            {games.length > 0 ? games.slice(0, 10).map(g => {
              const iw = g.white?.toString() === id;
              const won = (g.result === 'white' && iw) || (g.result === 'black' && !iw);
              const drew = g.result === 'draw';
              return (
                <div key={g._id} className="game-row">
                  <span className="game-vs">{g.whiteUsername} vs {g.blackUsername || 'AI'}</span>
                  <span className={`game-result ${won ? 'res-win' : drew ? 'res-draw' : 'res-loss'}`}>
                    {won ? '✓ Win' : drew ? '½ Draw' : '✗ Loss'}
                  </span>
                  {g.resultReason && <span className="game-reason">{g.resultReason}</span>}
                </div>
              );
            }) : <p className="empty">No games yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
