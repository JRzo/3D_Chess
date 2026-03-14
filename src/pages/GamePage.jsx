import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
import { detectOpening } from '../lib/openings';
import api from '../lib/api';

const PIECE_SYM   = { p:'♟', r:'♜', n:'♞', b:'♝', q:'♛', k:'♚' };
const PIECE_SYM_W = { p:'♙', r:'♖', n:'♘', b:'♗', q:'♕', k:'♔' };

const TIME_OPTIONS = [
  { label: 'Bullet · 1 min',  seconds: 60,  tag: '⚡' },
  { label: 'Bullet · 2 min',  seconds: 120, tag: '⚡' },
  { label: 'Blitz · 3 min',   seconds: 180, tag: '🔥' },
  { label: 'Blitz · 5 min',   seconds: 300, tag: '🔥' },
  { label: 'Rapid · 10 min',  seconds: 600, tag: '⏱' },
  { label: 'Unlimited',       seconds: 0,   tag: '∞'  },
];

function getTimeLabel(seconds) {
  if (seconds === 0) return 'Unlimited';
  if (seconds <= 120) return `⚡ Bullet`;
  if (seconds <= 300) return `🔥 Blitz`;
  return `⏱ Rapid`;
}

function fmt(s) {
  if (s === 0 || s === null) return '∞';
  const m   = Math.floor(s / 60);
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

const RANK_COLORS = { Legend:'#a855f7', Platinum:'#38bdf8', Gold:'#f59e0b', Silver:'#c0c0c0', Bronze:'#cd7f32' };
const GAUNTLET_KEY = 'chess3d-gauntlet';

export function GamePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const difficulty  = parseInt(searchParams.get('difficulty') || '0', 10);
  const isGauntlet  = searchParams.get('gauntlet') === '1';
  const isBotGame   = difficulty > 0;
  const botInfo     = BOT_LEVELS.find(b => b.level === difficulty);

  const { user, updateUser } = useAuth();
  const [gameId, setGameId]               = useState(null);
  const [showTutorial, setShowTutorial]   = useState(user?.settings?.showTutorial ?? true);
  const [achievement, setAchievement]     = useState(null);
  const [capturedByWhite, setCapturedByWhite] = useState([]);
  const [capturedByBlack, setCapturedByBlack] = useState([]);
  const [showGameOver, setShowGameOver]   = useState(false);
  const [botThinking, setBotThinking]     = useState(false);
  const [saveError, setSaveError]         = useState(false);
  const [timeControl, setTimeControl]     = useState(300);
  const [timeWhite, setTimeWhite]         = useState(300);
  const [timeBlack, setTimeBlack]         = useState(300);
  const [timerRunning, setTimerRunning]   = useState(false);
  const [flagged, setFlagged]             = useState(null);
  const [showTimeSelect, setShowTimeSelect] = useState(false);

  // ── New feature state ────────────────────────────────────────────────
  const [hintMove, setHintMove]           = useState(null);
  const [hintLoading, setHintLoading]     = useState(false);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [copied, setCopied]               = useState(false);

  const prevHistLen  = useRef(0);
  const botTimeout   = useRef(null);
  const timerRef     = useRef(null);
  const hintTimer    = useRef(null);
  const moveHistRef  = useRef(null);
  // Tracks bot's turn synchronously — prevents stale-state double-move.
  const botTurnRef   = useRef(false);

  const {
    fen, selectedSquare, validMoves, lastMove, gameOver,
    history, selectSquare, makeMove, resetGame, getPieces, isCheck, turn, chess,
  } = useChess();

  // ── Material advantage ───────────────────────────────────────────────
  const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const materialAdv = useMemo(() => {
    let w = 0, b = 0;
    capturedByWhite.forEach(p => { w += PIECE_VALUES[p] || 0; });
    capturedByBlack.forEach(p => { b += PIECE_VALUES[p] || 0; });
    return w - b; // positive = white ahead
  }, [capturedByWhite, capturedByBlack]);

  // ── Detect opening name ──────────────────────────────────────────────
  const openingName = useMemo(() => {
    if (history.length === 0) return null;
    return detectOpening(history.map(m => m.san));
  }, [history]);

  // ── Move history auto-scroll ─────────────────────────────────────────
  useEffect(() => {
    if (moveHistRef.current) {
      moveHistRef.current.scrollTop = moveHistRef.current.scrollHeight;
    }
  }, [history.length]);

  // ── Timer tick ───────────────────────────────────────────────────────
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
      }).then(({ data }) => { if (data.user) updateUser(data.user); }).catch(() => {});
    }
  }, [flagged]);

  // ── Create game in DB ────────────────────────────────────────────────
  useEffect(() => {
    if (user) {
      api.post('/games', {}).then(r => setGameId(r.data._id)).catch(() => setSaveError(true));
    }
  }, []);

  // ── Auto bot move ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isBotGame || chess.isGameOver() || flagged) return;
    if (turn !== 'b') return;
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
      botTurnRef.current = false;
      setBotThinking(false);
    }, thinkTime);
    return () => clearTimeout(botTimeout.current);
  }, [fen, turn, isBotGame, difficulty, flagged]);

  // ── Save moves to DB ─────────────────────────────────────────────────
  useEffect(() => {
    if (!gameId || history.length === 0 || history.length === prevHistLen.current) return;
    prevHistLen.current = history.length;
    const m = history[history.length - 1];
    if (history.length === 1 && timeControl > 0) setTimerRunning(true);
    api.post(`/games/${gameId}/moves`, {
      from: m.from, to: m.to, piece: m.piece, san: m.san, fen,
    }).catch(() => setSaveError(true));
  }, [history.length, gameId, fen]);

  // ── Game over from chess rules ────────────────────────────────────────
  useEffect(() => {
    if (!gameOver || showGameOver) return;
    setShowGameOver(true);
    setTimerRunning(false);
    clearInterval(timerRef.current);
    soundManager.play(gameOver.reason === 'checkmate' ? 'checkmate' : 'move');

    // Gauntlet: if player (white) won, advance progress
    if (isGauntlet && gameOver.winner === 'white') {
      try {
        const current = parseInt(localStorage.getItem(GAUNTLET_KEY) || '0', 10);
        if (difficulty > current) {
          localStorage.setItem(GAUNTLET_KEY, String(difficulty));
        }
      } catch {}
    }

    if (gameId && user) {
      api.post(`/games/${gameId}/complete`, {
        result: gameOver.winner, resultReason: gameOver.reason, pgn: chess.pgn(),
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

  // ── Player square click ──────────────────────────────────────────────
  const handleSquareClick = useCallback((square) => {
    if (showGameOver || flagged) return;
    if (isBotGame && (botTurnRef.current || chess.turn() !== 'w')) return;
    if (botThinking) return;

    // Clear hint on any click
    setHintMove(null);
    clearTimeout(hintTimer.current);

    const move = selectSquare(square);
    if (move) {
      if (isBotGame) botTurnRef.current = true;
      soundManager.play(move.captured ? 'capture' : 'move');
      if (chess.inCheck()) soundManager.play('check');
      if (move.captured) {
        if (move.color === 'w') setCapturedByWhite(p => [...p, move.captured]);
        else setCapturedByBlack(p => [...p, move.captured]);
      }
    } else {
      soundManager.play('select');
    }
  }, [selectSquare, showGameOver, flagged, chess, isBotGame, botThinking]);

  // ── Hint ─────────────────────────────────────────────────────────────
  const handleHint = useCallback(() => {
    if (hintLoading || gameOver || flagged || botThinking) return;
    if (isBotGame && chess.turn() !== 'w') return;
    setHintLoading(true);
    clearTimeout(hintTimer.current);
    // Run async to not block UI
    setTimeout(() => {
      const move = getBotMove(chess, Math.min(difficulty + 1, 4) || 3);
      setHintMove(move || null);
      setHintLoading(false);
      soundManager.play('select');
      // Auto-clear hint after 4 s
      hintTimer.current = setTimeout(() => setHintMove(null), 4000);
    }, 80);
  }, [hintLoading, gameOver, flagged, botThinking, chess, difficulty, isBotGame]);

  // ── Resign ────────────────────────────────────────────────────────────
  const handleResign = useCallback(() => {
    if (gameOver || flagged) return;
    setShowResignConfirm(false);
    setShowGameOver(true);
    setTimerRunning(false);
    clearInterval(timerRef.current);
    soundManager.play('checkmate');
    if (gameId && user) {
      api.post(`/games/${gameId}/complete`, {
        result: 'black', resultReason: 'resignation', pgn: chess.pgn(),
      }).then(({ data }) => { if (data.user) updateUser(data.user); }).catch(() => {});
    }
  }, [gameOver, flagged, gameId, user, chess, updateUser]);

  // ── Copy PGN ─────────────────────────────────────────────────────────
  const handleCopyPGN = () => {
    const pgn = chess.pgn() || '(no moves yet)';
    navigator.clipboard.writeText(pgn).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  // ── Reset ─────────────────────────────────────────────────────────────
  const handleReset = (explicitTime) => {
    const t = explicitTime !== undefined ? explicitTime : timeControl;
    clearTimeout(botTimeout.current);
    clearTimeout(hintTimer.current);
    clearInterval(timerRef.current);
    resetGame();
    setCapturedByWhite([]); setCapturedByBlack([]);
    setShowGameOver(false);
    setBotThinking(false);
    setSaveError(false);
    setFlagged(null);
    setHintMove(null);
    setHintLoading(false);
    setShowResignConfirm(false);
    botTurnRef.current = false;
    setTimeWhite(t); setTimeBlack(t);
    setTimerRunning(false);
    prevHistLen.current = 0;
    if (user) api.post('/games', {}).then(r => setGameId(r.data._id)).catch(() => {});
  };

  const applyTimeControl = (tc) => {
    setTimeControl(tc);
    setShowTimeSelect(false);
    handleReset(tc);
  };

  const xpGain = (gameOver || flagged)
    ? (gameOver?.winner === 'white' || flagged === 'b') ? 200
      : gameOver?.reason === 'draw' ? 75 : 25
    : null;

  const resultWinner = gameOver?.winner
    || (flagged === 'w' ? 'black' : flagged === 'b' ? 'white' : null);

  // ── Gauntlet next opponent ─────────────────────────────────────────────
  const gauntletWon = isGauntlet && gameOver?.winner === 'white' && difficulty < 5;

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
          {isGauntlet && <span className="gauntlet-badge">⚔️ Gauntlet</span>}
          {botThinking && <span className="bot-thinking">thinking…</span>}
          <button className="btn-ghost btn-sm ml-auto" onClick={() => navigate('/bots')}>Change Opponent</button>
        </div>
      )}

      <div className="game-layout">
        {/* ─ Left sidebar ──────────────────────────────────────────── */}
        <div className="game-sidebar left-sidebar">

          {/* Time control */}
          <div className="sidebar-panel">
            <div className="time-control-header">
              <h4>{getTimeLabel(timeControl)}</h4>
              <button className="btn-ghost btn-xs" onClick={() => setShowTimeSelect(v => !v)}>
                {timeControl === 0 ? '∞' : `${Math.round(timeControl / 60)}m`} ▾
              </button>
            </div>
            {showTimeSelect && (
              <div className="time-options">
                {TIME_OPTIONS.map(o => (
                  <button
                    key={o.label}
                    className={`time-opt ${timeControl === o.seconds ? 'time-opt-active' : ''}`}
                    onClick={() => applyTimeControl(o.seconds)}
                  ><span className="time-opt-tag">{o.tag}</span> {o.label}</button>
                ))}
              </div>
            )}
            {timeControl > 0 && (
              <div className="clocks">
                <div className="clock-row">
                  <span className="clock-label"><span className="dot-w" />{isBotGame ? (user?.username || 'You') : 'White'}</span>
                  <Clock seconds={timeWhite} active={turn === 'w' && timerRunning} flagged={flagged === 'w'} />
                </div>
                <div className="clock-row">
                  <span className="clock-label"><span className="dot-b" />{isBotGame ? (botInfo?.name || 'Black') : 'Black'}</span>
                  <Clock seconds={timeBlack} active={turn === 'b' && timerRunning} flagged={flagged === 'b'} />
                </div>
              </div>
            )}
          </div>

          {/* Opening name */}
          {openingName && (
            <div className="sidebar-panel opening-panel">
              <h4>Opening</h4>
              <div className="opening-name">{openingName}</div>
            </div>
          )}

          {/* Move history */}
          <div className="sidebar-panel">
            <h4>Moves</h4>
            <div className="move-history" ref={moveHistRef}>
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

          {/* Captured pieces + material advantage */}
          <div className="sidebar-panel">
            <h4>Captured
              {materialAdv !== 0 && (
                <span className={`material-adv ${materialAdv > 0 ? 'adv-white' : 'adv-black'}`}>
                  {materialAdv > 0 ? `+${materialAdv} ⬜` : `${materialAdv} ⬛`}
                </span>
              )}
            </h4>
            <div className="captured-block">
              <div className="cap-row">
                <span className="cap-label">⬜</span>
                <span className="cap-pieces">
                  {capturedByWhite.length ? capturedByWhite.map((p,i) => <span key={i}>{PIECE_SYM[p]||p}</span>) : '—'}
                </span>
              </div>
              <div className="cap-row">
                <span className="cap-label">⬛</span>
                <span className="cap-pieces">
                  {capturedByBlack.length ? capturedByBlack.map((p,i) => <span key={i}>{PIECE_SYM_W[p]||p}</span>) : '—'}
                </span>
              </div>
            </div>
          </div>

          {saveError && <div className="sidebar-panel save-warn">⚠ Moves not saving</div>}
        </div>

        {/* ─ 3D Canvas ─────────────────────────────────────────────── */}
        <div className="canvas-wrap">
          {isCheck && !gameOver && !flagged && <div className="check-banner">CHECK!</div>}
          {botThinking && (
            <div className="thinking-banner">{botInfo?.icon} {botInfo?.name} is thinking…</div>
          )}
          {hintMove && (
            <div className="hint-banner">💡 Hint: move the highlighted piece</div>
          )}
          <Canvas shadows camera={{ position: [0, 14, 11], fov: 45 }} style={{ background: '#2a1f14' }}>
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
              hintMove={hintMove}
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
              {/* Hint button — only in bot or solo games, and only on your turn */}
              {!gameOver && !flagged && (
                <button
                  className={`btn-hint w-full ${hintLoading ? 'btn-hint-loading' : ''}`}
                  onClick={handleHint}
                  disabled={hintLoading || botThinking || (isBotGame && turn !== 'w')}
                >
                  {hintLoading ? '⟳ Thinking…' : hintMove ? '✓ Hint shown' : '💡 Get Hint'}
                </button>
              )}

              <button className="btn-secondary w-full" onClick={handleReset}>New Game</button>

              {/* Resign button */}
              {!gameOver && !flagged && history.length > 0 && (
                <button className="btn-danger-sm w-full" onClick={() => setShowResignConfirm(true)}>
                  🏳 Resign
                </button>
              )}

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

      {/* ─ Resign confirmation ───────────────────────────────────────── */}
      {showResignConfirm && (
        <div className="overlay-backdrop" onClick={() => setShowResignConfirm(false)}>
          <div className="confirm-card" onClick={e => e.stopPropagation()}>
            <h3>Resign?</h3>
            <p>Are you sure you want to resign? You will receive 25 XP.</p>
            <div className="confirm-actions">
              <button className="btn-danger" onClick={handleResign}>🏳 Resign</button>
              <button className="btn-secondary" onClick={() => setShowResignConfirm(false)}>Keep Playing</button>
            </div>
          </div>
        </div>
      )}

      {/* ─ Game Over modal ───────────────────────────────────────────── */}
      {showGameOver && (gameOver || flagged) && (
        <div className="overlay-backdrop">
          <div className="game-over-card">
            <div className="go-icon">
              {flagged ? '⏱' : gameOver?.reason === 'resignation' ? '🏳'
                : gameOver?.reason === 'checkmate'
                  ? (resultWinner === 'white' ? '♔' : '♚') : '½'}
            </div>
            <h2>
              {flagged
                ? `${resultWinner === 'white' ? 'White' : 'Black'} wins on time!`
                : gameOver?.reason === 'resignation'
                  ? 'Resignation'
                  : gameOver?.reason === 'checkmate'
                    ? `${resultWinner === 'white' ? 'White' : 'Black'} Wins!`
                    : gameOver?.reason === 'stalemate' ? 'Stalemate!'
                    : 'Draw!'}
            </h2>
            <p className="go-reason">
              {flagged ? 'Flag fallen' : gameOver?.reason}
            </p>
            {xpGain !== null && (
              <div className="go-xp">+{xpGain} XP {resultWinner === 'white' ? '🎉' : ''}</div>
            )}

            {/* PGN copy */}
            {history.length > 0 && (
              <button className="btn-ghost go-pgn-btn" onClick={handleCopyPGN}>
                {copied ? '✓ Copied!' : '📋 Copy PGN'}
              </button>
            )}

            <div className="go-actions">
              <button className="btn-primary" onClick={handleReset}>Play Again</button>
              {gauntletWon && (
                <button className="btn-play" style={{ boxShadow: '3px 3px 0 #ffd700' }}
                  onClick={() => navigate(`/game/bot?difficulty=${difficulty + 1}&gauntlet=1`)}>
                  Next Opponent ⚔️
                </button>
              )}
              {isGauntlet && (
                <button className="btn-secondary" onClick={() => navigate('/gauntlet')}>Gauntlet</button>
              )}
              {isBotGame && !isGauntlet && (
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
