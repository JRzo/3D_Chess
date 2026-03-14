import { useState, useCallback, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useChess } from '../hooks/useChess';
import { useAuth } from '../hooks/useAuth';
import { Board3D } from '../components/Board3D';
import { Tutorial } from '../components/Tutorial';
import { AchievementPopup } from '../components/AchievementPopup';
import { Navbar } from '../components/Navbar';
import { soundManager } from '../lib/sounds';
import { getBotMove, BOT_LEVELS } from '../lib/bot';
import api from '../lib/api';

const PIECE_SYM   = { p:'♟', r:'♜', n:'♞', b:'♝', q:'♛', k:'♚' };  // black pieces
const PIECE_SYM_W = { p:'♙', r:'♖', n:'♘', b:'♗', q:'♕', k:'♔' };  // white pieces

const TIME_OPTIONS = [
  { label: '1 min',  seconds: 60 },
  { label: '3 min',  seconds: 180 },
  { label: '5 min',  seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '∞',      seconds: 0 },
];

function fmt(s) {
  if (s === 0 || s === null) return '∞';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function Clock({ seconds, active, flagged }) {
  return (
    <div className={`chess-clock ${active ? 'clock-active' : ''} ${flagged ? 'clock-flagged' : ''}`}>
      {flagged ? '⏱ Time!' : fmt(seconds)}
    </div>
  );
}

const RANK_COLORS = { Legend:'#ffd700', Platinum:'#c8dde8', Gold:'#ffd700', Silver:'#c0c0c0', Bronze:'#cd7f32' };

export function GamePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const difficulty  = parseInt(searchParams.get('difficulty') || '0', 10);
  const isBotGame   = difficulty > 0;
  const botInfo     = BOT_LEVELS.find(b => b.level === difficulty);

  const { user, updateUser } = useAuth();
  const [gameId, setGameId]               = useState(null);
  const [showTutorial, setShowTutorial]   = useState(user?.settings?.showTutorial ?? true);
  const [achievement, setAchievement]     = useState(null);
  const [capturedByWhite, setCapturedByWhite] = useState([]); // black pieces captured by white
  const [capturedByBlack, setCapturedByBlack] = useState([]); // white pieces captured by black
  const [showGameOver, setShowGameOver]   = useState(false);
  const [botThinking, setBotThinking]     = useState(false);
  const [saveError, setSaveError]         = useState(false);
  const [timeControl, setTimeControl]     = useState(300);        // seconds per side, 0 = infinite
  const [timeWhite, setTimeWhite]         = useState(300);
  const [timeBlack, setTimeBlack]         = useState(300);
  const [timerRunning, setTimerRunning]   = useState(false);
  const [flagged, setFlagged]             = useState(null);       // 'w' or 'b'
  const [showTimeSelect, setShowTimeSelect] = useState(false);
  const prevHistLen = useRef(0);
  const botTimeout  = useRef(null);
  const timerRef    = useRef(null);

  const {
    fen, selectedSquare, validMoves, lastMove, gameOver,
    history, selectSquare, makeMove, resetGame, getPieces, isCheck, turn, chess,
  } = useChess();

  // ── Timer tick ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!timerRunning || timeControl === 0 || gameOver || flagged) return;
    timerRef.current = setInterval(() => {
      if (turn === 'w') {
        setTimeWhite(t => {
          if (t <= 1) { clearInterval(timerRef.current); setFlagged('w'); return 0; }
          return t - 1;
        });
      } else {
        setTimeBlack(t => {
          if (t <= 1) { clearInterval(timerRef.current); setFlagged('b'); return 0; }
          return t - 1;
        });
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerRunning, turn, timeControl, gameOver, flagged]);

  // Flag = lose on time
  useEffect(() => {
    if (!flagged || showGameOver) return;
    setShowGameOver(true);
    soundManager.play('checkmate');
    if (gameId && user) {
      const winner = flagged === 'w' ? 'black' : 'white';
      api.post(`/games/${gameId}/complete`, {
        result: winner, resultReason: 'timeout', pgn: chess.pgn(),
      }).then(({ data }) => {
        if (data.user) { updateUser(data.user); }
      }).catch(() => {});
    }
  }, [flagged]);

  // ── Create game in DB ────────────────────────────────────────────────────
  useEffect(() => {
    if (user) {
      api.post('/games', {})
        .then(r => setGameId(r.data._id))
        .catch(() => setSaveError(true));
    }
  }, []);

  // ── Auto bot move ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isBotGame || chess.isGameOver() || flagged) return;
    if (turn !== 'b') return; // bot plays black

    setBotThinking(true);
    const thinkTime = 400 + difficulty * 200 + Math.random() * 200;
    botTimeout.current = setTimeout(() => {
      if (chess.isGameOver()) { setBotThinking(false); return; }
      const move = getBotMove(chess, difficulty);
      if (move) {
        const result = makeMove(move.from, move.to, 'q');
        if (result) {
          soundManager.play(result.captured ? 'capture' : 'move');
          if (chess.inCheck()) soundManager.play('check');
          if (result.captured) setCapturedByBlack(p => [...p, result.captured]);
        }
      }
      setBotThinking(false);
    }, thinkTime);

    return () => clearTimeout(botTimeout.current);
  }, [fen, turn, isBotGame, difficulty, flagged]);

  // ── Save moves to DB ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameId || history.length === 0 || history.length === prevHistLen.current) return;
    prevHistLen.current = history.length;
    const m = history[history.length - 1];
    // Start timer on first move
    if (history.length === 1 && timeControl > 0) setTimerRunning(true);
    api.post(`/games/${gameId}/moves`, {
      from: m.from, to: m.to, piece: m.piece, san: m.san, fen,
    }).catch(() => setSaveError(true));
  }, [history.length, gameId, fen]);

  // ── Game over from chess rules ───────────────────────────────────────────
  useEffect(() => {
    if (!gameOver || showGameOver) return;
    setShowGameOver(true);
    setTimerRunning(false);
    clearInterval(timerRef.current);
    soundManager.play(gameOver.reason === 'checkmate' ? 'checkmate' : 'move');

    if (gameId && user) {
      api.post(`/games/${gameId}/complete`, {
        result: gameOver.winner,
        resultReason: gameOver.reason,
        pgn: chess.pgn(),
      }).then(({ data }) => {
        if (data.user) {
          updateUser(data.user);
          if (data.user.stats?.level > (user.stats?.level || 1)) {
            setAchievement(`Reached Level ${data.user.stats.level}!`);
            soundManager.play('levelup');
          }
        }
      }).catch(() => {});
    }
  }, [gameOver]);

  // ── Player square click ──────────────────────────────────────────────────
  const handleSquareClick = useCallback((square) => {
    if (showGameOver || flagged) return;
    if (isBotGame && turn === 'b') return;
    if (botThinking) return;

    const move = selectSquare(square);
    if (move) {
      soundManager.play(move.captured ? 'capture' : 'move');
      if (chess.inCheck()) soundManager.play('check');
      if (move.captured) {
        if (move.color === 'w') setCapturedByWhite(p => [...p, move.captured]);
        else setCapturedByBlack(p => [...p, move.captured]);
      }
    } else {
      soundManager.play('select');
    }
  }, [selectSquare, showGameOver, flagged, chess, isBotGame, turn, botThinking]);

  // ── Reset ────────────────────────────────────────────────────────────────
  const handleReset = () => {
    clearTimeout(botTimeout.current);
    clearInterval(timerRef.current);
    resetGame();
    setCapturedByWhite([]); setCapturedByBlack([]);
    setShowGameOver(false);
    setBotThinking(false);
    setSaveError(false);
    setFlagged(null);
    setTimeWhite(timeControl);
    setTimeBlack(timeControl);
    setTimerRunning(false);
    prevHistLen.current = 0;
    if (user) api.post('/games', {}).then(r => setGameId(r.data._id)).catch(() => {});
  };

  const applyTimeControl = (tc) => {
    setTimeControl(tc);
    setTimeWhite(tc);
    setTimeBlack(tc);
    setTimerRunning(false);
    setShowTimeSelect(false);
    handleReset();
  };

  const xpGain = (gameOver || flagged)
    ? (gameOver?.winner === 'white' || flagged === 'b') ? 200
      : gameOver?.reason === 'draw' ? 75 : 25
    : null;

  const resultWinner = gameOver?.winner || (flagged === 'w' ? 'black' : flagged === 'b' ? 'white' : null);

  return (
    <div className="page-root">
      <Navbar />
      {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}
      {achievement && <AchievementPopup achievement={achievement} onClose={() => setAchievement(null)} />}

      {/* Bot info banner */}
      {isBotGame && botInfo && (
        <div className="bot-banner">
          <span className="bot-banner-icon">{botInfo.icon}</span>
          <span>Playing vs <strong style={{ color: botInfo.color }}>{botInfo.name}</strong></span>
          <span className="bot-elo-badge">{botInfo.elo}</span>
          {botThinking && <span className="bot-thinking">thinking…</span>}
          <button className="btn-ghost btn-sm ml-auto" onClick={() => navigate('/bots')}>Change Opponent</button>
        </div>
      )}

      <div className="game-layout">
        {/* ─ Left sidebar ─────────────────────────────────────────── */}
        <div className="game-sidebar left-sidebar">

          {/* Time control selector */}
          <div className="sidebar-panel">
            <div className="time-control-header">
              <h4>Time Control</h4>
              <button className="btn-ghost btn-xs" onClick={() => setShowTimeSelect(v => !v)}>
                {timeControl === 0 ? '∞' : `${timeControl / 60}min`} ▾
              </button>
            </div>
            {showTimeSelect && (
              <div className="time-options">
                {TIME_OPTIONS.map(o => (
                  <button
                    key={o.label}
                    className={`time-opt ${timeControl === o.seconds ? 'time-opt-active' : ''}`}
                    onClick={() => applyTimeControl(o.seconds)}
                  >{o.label}</button>
                ))}
              </div>
            )}

            {/* Clocks */}
            {timeControl > 0 && (
              <div className="clocks">
                <div className="clock-row">
                  <span className="clock-label">
                    <span className="dot-w" />
                    {isBotGame ? (user?.username || 'You') : 'White'}
                  </span>
                  <Clock seconds={timeWhite} active={turn === 'w' && timerRunning} flagged={flagged === 'w'} />
                </div>
                <div className="clock-row">
                  <span className="clock-label">
                    <span className="dot-b" />
                    {isBotGame ? (botInfo?.name || 'Black') : 'Black'}
                  </span>
                  <Clock seconds={timeBlack} active={turn === 'b' && timerRunning} flagged={flagged === 'b'} />
                </div>
              </div>
            )}
          </div>

          {/* Move history */}
          <div className="sidebar-panel">
            <h4>Moves</h4>
            <div className="move-history">
              {history.map((_, i) => i % 2 === 0 && (
                <div key={i} className="move-row">
                  <span className="mn">{Math.floor(i / 2) + 1}.</span>
                  <span className="mw">{history[i]?.san}</span>
                  <span className="mb">{history[i + 1]?.san || ''}</span>
                </div>
              ))}
              {history.length === 0 && <p className="empty">No moves yet</p>}
            </div>
          </div>

          {/* Captured pieces */}
          <div className="sidebar-panel">
            <h4>Captured</h4>
            <div className="captured-block">
              <div className="cap-row">
                <span className="cap-label">White</span>
                <span className="cap-pieces">
                  {capturedByWhite.length ? capturedByWhite.map((p,i) => <span key={i}>{PIECE_SYM[p]||p}</span>) : '—'}
                </span>
              </div>
              <div className="cap-row">
                <span className="cap-label">Black</span>
                <span className="cap-pieces">
                  {capturedByBlack.length ? capturedByBlack.map((p,i) => <span key={i}>{PIECE_SYM_W[p]||p}</span>) : '—'}
                </span>
              </div>
            </div>
          </div>

          {saveError && (
            <div className="sidebar-panel save-warn">⚠ Moves not saving</div>
          )}
        </div>

        {/* ─ 3D Canvas ─────────────────────────────────────────────── */}
        <div className="canvas-wrap">
          {isCheck && !gameOver && !flagged && <div className="check-banner">CHECK!</div>}
          {botThinking && (
            <div className="thinking-banner">{botInfo?.icon} {botInfo?.name} is thinking…</div>
          )}
          <Canvas shadows camera={{ position: [0, 14, 11], fov: 45 }} style={{ background: '#0f1720' }}>
            <ambientLight intensity={0.45} />
            <directionalLight position={[8, 18, 8]} intensity={1.1} castShadow shadow-mapSize={[2048, 2048]} />
            <pointLight position={[-8, 8, -8]} intensity={0.4} color="#6ee7b7" />
            <Stars radius={120} depth={60} count={2500} factor={3} fade />
            <Board3D
              selectedSquare={selectedSquare}
              validMoves={validMoves}
              pieces={getPieces()}
              lastMove={lastMove}
              onSquareClick={handleSquareClick}
              isCheck={isCheck}
              turn={turn}
            />
            <OrbitControls enablePan={false} minDistance={7} maxDistance={26} maxPolarAngle={Math.PI / 2.1} />
          </Canvas>
        </div>

        {/* ─ Right HUD ─────────────────────────────────────────────── */}
        <div className="game-sidebar right-sidebar">
          <div className="hud-panel">
            {/* Player identity */}
            <div className="hud-identity">
              <div className="hud-avatar">{user?.avatar || '♟'}</div>
              <div className="hud-username">{user?.username || 'Guest'}</div>
              <div className="hud-rank" style={{ color: RANK_COLORS[user?.stats?.rank] }}>
                {user?.stats?.rank || 'Bronze'}
              </div>
            </div>

            {/* XP bar */}
            <div className="hud-xp-block">
              <div className="hud-level-label">Level {user?.stats?.level || 1}</div>
              <div className="xp-bar">
                <div className="xp-fill" style={{ width: `${Math.min(100, Math.round(((user?.stats?.xp || 0) / ((user?.stats?.level || 1) * 100)) * 100))}%` }} />
              </div>
              <div className="hud-xp-text">{user?.stats?.xp || 0} / {(user?.stats?.level || 1) * 100} XP</div>
            </div>

            {/* Turn indicator */}
            <div className="turn-indicator">
              <div className={`turn-dot ${turn === 'w' ? 'dot-white' : 'dot-black'}`} />
              <span>{turn === 'w' ? "White's Turn" : "Black's Turn"}</span>
              {botThinking && <span className="spin">⟳</span>}
            </div>

            {/* Stats */}
            <div className="hud-stats-row">
              {[['Wins', user?.stats?.wins], ['Losses', user?.stats?.losses], ['Games', user?.stats?.totalGames]].map(([l, v]) => (
                <div key={l} className="hud-stat">
                  <span className="hud-stat-val">{v || 0}</span>
                  <span className="hud-stat-lbl">{l}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="hud-actions">
              <button className="btn-secondary w-full" onClick={handleReset}>New Game</button>
              {isBotGame && (
                <button className="btn-secondary w-full" onClick={() => navigate('/bots')}>Choose Bot</button>
              )}
              <button className="btn-ghost w-full" onClick={() => navigate('/home')}>← Home</button>
            </div>

            {/* Achievements */}
            {user?.achievements?.length > 0 && (
              <div className="hud-achievements">
                <div className="hud-achievements-title">Achievements</div>
                {user.achievements.slice(-3).map((a, i) => (
                  <div key={i} className="hud-achievement-item">🏆 {a.name}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─ Game Over modal ──────────────────────────────────────────── */}
      {showGameOver && (gameOver || flagged) && (
        <div className="overlay-backdrop">
          <div className="game-over-card">
            <div className="go-icon">
              {flagged ? '⏱' : gameOver?.reason === 'checkmate'
                ? (resultWinner === 'white' ? '♔' : '♚') : '½'}
            </div>
            <h2>
              {flagged
                ? `${resultWinner === 'white' ? 'White' : 'Black'} wins on time!`
                : gameOver?.reason === 'checkmate'
                  ? `${resultWinner === 'white' ? 'White' : 'Black'} Wins!`
                  : gameOver?.reason === 'stalemate' ? 'Stalemate!'
                  : 'Draw!'}
            </h2>
            <p className="go-reason">{flagged ? 'Flag fallen' : gameOver?.reason}</p>
            {xpGain !== null && (
              <div className="go-xp">+{xpGain} XP {resultWinner === 'white' ? '🎉' : ''}</div>
            )}
            <div className="go-actions">
              <button className="btn-primary" onClick={handleReset}>Play Again</button>
              {isBotGame && (
                <button className="btn-secondary" onClick={() => navigate('/bots')}>Change Bot</button>
              )}
              <button className="btn-secondary" onClick={() => navigate('/home')}>Home</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
