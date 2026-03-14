import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/Navbar';
import api from '../lib/api';

const RANK_COLORS = { Legend:'#a855f7', Platinum:'#38bdf8', Gold:'#f59e0b', Silver:'#c0c0c0', Bronze:'#cd7f32' };
const RANK_ICONS  = { Legend:'👑', Platinum:'💎', Gold:'🥇', Silver:'🥈', Bronze:'🥉' };

function getPuzzlesSolved() {
  try { return JSON.parse(localStorage.getItem('chess3d-puzzles') || '[]').length; }
  catch { return 0; }
}
function getGauntletProgress() {
  try { return parseInt(localStorage.getItem('chess3d-gauntlet') || '0', 10); }
  catch { return 0; }
}

export function Home() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [lbLoading, setLbLoading]     = useState(true);
  const [puzzlesSolved]    = useState(getPuzzlesSolved);
  const [gauntletProgress] = useState(getGauntletProgress);

  useEffect(() => {
    api.get('/users').then(r => setLeaderboard(r.data)).catch(() => {}).finally(() => setLbLoading(false));
    if (user?._id) api.get(`/games/user/${user._id}`).then(r => setRecentGames(r.data)).catch(() => {});
  }, [user?._id]);

  const rank   = user?.stats?.rank || 'Bronze';
  const xpPct  = Math.min(100, Math.round(((user?.stats?.xp || 0) / ((user?.stats?.level || 1) * 100)) * 100));

  return (
    <div className="page-root">
      <Navbar />
      <div className="home-content">

        {/* ── Hero ──────────────────────────────────────────────────── */}
        <div className="home-hero">
          <div className="hero-left">
            <h2>Welcome back, <span className="accent">{user?.username}</span>!</h2>
            <div className="hero-rank" style={{ color: RANK_COLORS[rank] }}>
              {RANK_ICONS[rank]} {rank} · Level {user?.stats?.level}
            </div>
            <div className="hero-xp-bar"><div className="xp-fill" style={{ width: `${xpPct}%` }} /></div>
            <div className="hero-xp-text">{user?.stats?.xp} / {(user?.stats?.level || 1) * 100} XP</div>
            <div className="hero-pill-row">
              <span className="pill">⚔ {user?.stats?.wins    || 0} Wins</span>
              <span className="pill">🏳 {user?.stats?.losses  || 0} Losses</span>
              <span className="pill">🤝 {user?.stats?.draws   || 0} Draws</span>
              <span className="pill">🧩 {puzzlesSolved} Puzzles</span>
              {gauntletProgress > 0 && (
                <span className="pill" style={{ color: '#b58863' }}>⚔️ Gauntlet {gauntletProgress}/5</span>
              )}
            </div>
          </div>
          <div className="hero-right">
            <button className="btn-play" onClick={() => navigate('/bots')}>
              <span>🤖</span> Play vs Bot
            </button>
            <button className="btn-play btn-play-2p" onClick={() => {
              const randomDiff = Math.floor(Math.random() * 5) + 1;
              navigate(`/game/bot?difficulty=${randomDiff}`);
            }}>
              <span>♟</span> Quick Play
            </button>
            <button className="btn-secondary" onClick={() => navigate(`/profile/${user?._id}`)}>
              View Profile
            </button>
          </div>
        </div>

        {/* ── Feature cards ─────────────────────────────────────────── */}
        <div className="home-features">
          <button className="feature-card" onClick={() => navigate('/puzzles')}>
            <div className="feature-card-icon">🧩</div>
            <div className="feature-card-body">
              <div className="feature-card-title">Puzzle Training</div>
              <div className="feature-card-desc">Solve tactical puzzles to earn XP and sharpen your skills.</div>
              <div className="feature-card-progress">{puzzlesSolved} / 8 solved</div>
            </div>
            <span className="feature-card-arrow">→</span>
          </button>

          <button className="feature-card" onClick={() => navigate('/gauntlet')}>
            <div className="feature-card-icon">⚔️</div>
            <div className="feature-card-body">
              <div className="feature-card-title">Bot Gauntlet</div>
              <div className="feature-card-desc">Beat all 5 bots in sequence to become the Champion.</div>
              <div className="feature-card-progress">{gauntletProgress} / 5 defeated</div>
            </div>
            <span className="feature-card-arrow">→</span>
          </button>
        </div>

        {/* ── Panels ────────────────────────────────────────────────── */}
        <div className="home-panels">
          <div className="panel">
            <h3>🏆 Leaderboard</h3>
            <div className="lb-list">
              {lbLoading && <p className="empty">Loading…</p>}
              {!lbLoading && leaderboard.slice(0, 10).map((p, i) => (
                <div
                  key={p._id}
                  className={`lb-row ${p._id === user?._id ? 'lb-row-me' : ''}`}
                  onClick={() => navigate(`/profile/${p._id}`)}
                >
                  <span className="lb-pos">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  <span className="lb-av">{p.avatar || '♟'}</span>
                  <span className="lb-name">{p.username}{p._id === user?._id ? ' (you)' : ''}</span>
                  <span className="lb-tier" style={{ color: RANK_COLORS[p.stats?.rank] || '#cd7f32' }}>{p.stats?.rank || 'Bronze'}</span>
                  <span className="lb-xp">{p.stats?.xp || 0} XP</span>
                </div>
              ))}
              {!lbLoading && leaderboard.length === 0 && <p className="empty">No players yet — be the first!</p>}
            </div>
          </div>

          <div className="panel">
            <h3>🕐 Recent Games</h3>
            <div className="games-list">
              {recentGames.map(g => (
                <div key={g._id} className="game-row">
                  <span className="game-vs">{g.whiteUsername} vs {g.blackUsername || 'AI'}</span>
                  <span className={`game-result res-${g.result}`}>
                    {g.result === 'white' ? 'White wins' : g.result === 'black' ? 'Black wins' : g.result === 'draw' ? 'Draw' : g.result}
                  </span>
                  {g.resultReason && <span className="game-reason">{g.resultReason}</span>}
                </div>
              ))}
              {recentGames.length === 0 && <p className="empty">No games yet. Start playing!</p>}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
