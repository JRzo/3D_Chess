import { useState, useCallback, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Chess } from 'chess.js';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/Navbar';
import { Board3D } from '../components/Board3D';
import { soundManager } from '../lib/sounds';
import { PUZZLES } from '../lib/puzzles';
import api from '../lib/api';

function getPieces(chess) {
  const FILES = ['a','b','c','d','e','f','g','h'];
  const RANKS = ['1','2','3','4','5','6','7','8'];
  const pieces = [];
  FILES.forEach((file, col) => {
    RANKS.forEach((rank, row) => {
      const sq = file + rank;
      const p = chess.get(sq);
      if (p) pieces.push({ square: sq, piece: p.type, color: p.color, col, row });
    });
  });
  return pieces;
}

const DIFF_COLOR = { easy: '#27ae60', medium: '#f59e0b', hard: '#ef4444' };
const DIFF_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export function Puzzles() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  // Track which puzzles are solved (localStorage key: 'chess3d-puzzles')
  const [solved, setSolved] = useState(() => {
    try { return JSON.parse(localStorage.getItem('chess3d-puzzles') || '[]'); }
    catch { return []; }
  });

  const [activePuzzle, setActivePuzzle] = useState(null);

  // ── Per-puzzle state ───────────────────────────────────────────────
  const [chess]           = useState(() => new Chess());
  const [fen, setFen]     = useState('');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves]         = useState([]);
  const [lastMove, setLastMove]             = useState(null);
  const [status, setStatus]   = useState('idle');   // idle | playing | correct | wrong | solved
  const [message, setMessage] = useState('');
  const [moveCount, setMoveCount] = useState(0);
  const [showHint, setShowHint]   = useState(false);
  const responseTimer = useRef(null);

  const loadPuzzle = useCallback((puzzle) => {
    clearTimeout(responseTimer.current);
    chess.load(puzzle.fen);
    setFen(chess.fen());
    setActivePuzzle(puzzle);
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setStatus('playing');
    setMessage('');
    setMoveCount(0);
    setShowHint(false);
  }, [chess]);

  // ── Square click ───────────────────────────────────────────────────
  const handleSquareClick = useCallback((square) => {
    if (status !== 'playing') return;

    const piece = chess.get(square);

    // If we click our own piece, select it
    if (piece && piece.color === chess.turn()) {
      setSelectedSquare(square);
      const moves = chess.moves({ square, verbose: true }).map(m => m.to);
      setValidMoves(moves);
      soundManager.play('select');
      return;
    }

    // Attempt a move
    if (selectedSquare) {
      try {
        const move = chess.move({ from: selectedSquare, to: square, promotion: 'q' });
        if (!move) { setSelectedSquare(null); setValidMoves([]); return; }

        setFen(chess.fen());
        setLastMove({ from: selectedSquare, to: square });
        setSelectedSquare(null);
        setValidMoves([]);
        setMoveCount(c => c + 1);
        soundManager.play(move.captured ? 'capture' : 'move');

        const solution = activePuzzle.solution[0];
        const isCorrect = move.from === solution.from && move.to === solution.to;

        if (isCorrect) {
          soundManager.play('levelup');
          setStatus('correct');
          setMessage('✓ Correct! Well played!');

          // Award XP if not already solved
          if (!solved.includes(activePuzzle.id)) {
            const newSolved = [...solved, activePuzzle.id];
            setSolved(newSolved);
            localStorage.setItem('chess3d-puzzles', JSON.stringify(newSolved));
            if (user) {
              api.post('/games', {})
                .then(r => api.post(`/games/${r.data._id}/complete`, {
                  result: 'white', resultReason: 'puzzle', pgn: '',
                }))
                .then(({ data }) => { if (data.user) updateUser(data.user); })
                .catch(() => {});
            }
          }
        } else {
          soundManager.play('invalid');
          setStatus('wrong');
          setMessage('✗ Not quite. Try again!');
          // Undo the wrong move after a brief pause
          responseTimer.current = setTimeout(() => {
            chess.undo();
            setFen(chess.fen());
            setLastMove(null);
            setStatus('playing');
            setMessage('');
          }, 1200);
        }
      } catch {
        setSelectedSquare(null);
        setValidMoves([]);
      }
    }
  }, [status, chess, selectedSquare, activePuzzle, solved, user, updateUser]);

  const handleReset = () => {
    if (activePuzzle) loadPuzzle(activePuzzle);
  };

  const isCheck = chess.inCheck();

  const totalSolved = solved.length;
  const totalPuzzles = PUZZLES.length;

  return (
    <div className="page-root">
      <Navbar />
      <div className="puzzles-layout">

        {/* ── Left: puzzle list ─────────────────────────────────────── */}
        <div className="puzzle-list-panel">
          <div className="puzzle-list-header">
            <h2>Puzzles</h2>
            <div className="puzzle-progress-bar-wrap">
              <div className="puzzle-progress-bar-fill" style={{ width: `${(totalSolved / totalPuzzles) * 100}%` }} />
            </div>
            <div className="puzzle-progress-text">{totalSolved} / {totalPuzzles} solved</div>
          </div>

          <div className="puzzle-cards">
            {PUZZLES.map(p => {
              const isSolved = solved.includes(p.id);
              const isActive = activePuzzle?.id === p.id;
              return (
                <button
                  key={p.id}
                  className={`puzzle-card ${isActive ? 'puzzle-card-active' : ''} ${isSolved ? 'puzzle-card-solved' : ''}`}
                  onClick={() => loadPuzzle(p)}
                >
                  <div className="puzzle-card-top">
                    <span className="puzzle-card-num">#{p.id}</span>
                    <span className="puzzle-card-diff" style={{ color: DIFF_COLOR[p.difficulty] }}>
                      {DIFF_LABEL[p.difficulty]}
                    </span>
                    {isSolved && <span className="puzzle-solved-badge">✓</span>}
                  </div>
                  <div className="puzzle-card-title">{p.title}</div>
                  <div className="puzzle-card-xp">+{p.xp} XP</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Center: board ─────────────────────────────────────────── */}
        <div className="puzzle-board-area">
          {!activePuzzle ? (
            <div className="puzzle-welcome">
              <div className="puzzle-welcome-icon">♟</div>
              <h2>Tactical Training</h2>
              <p>Select a puzzle from the left to begin. Solve each position to earn XP and sharpen your chess skills.</p>
              <div className="puzzle-stats-row">
                <div className="puzzle-stat">
                  <span className="puzzle-stat-val">{totalPuzzles}</span>
                  <span className="puzzle-stat-lbl">Puzzles</span>
                </div>
                <div className="puzzle-stat">
                  <span className="puzzle-stat-val">{totalSolved}</span>
                  <span className="puzzle-stat-lbl">Solved</span>
                </div>
                <div className="puzzle-stat">
                  <span className="puzzle-stat-val">{PUZZLES.reduce((s, p) => s + (solved.includes(p.id) ? p.xp : 0), 0)}</span>
                  <span className="puzzle-stat-lbl">XP Earned</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Status banner */}
              <div className={`puzzle-status-banner ${status === 'correct' ? 'puzz-correct' : status === 'wrong' ? 'puzz-wrong' : ''}`}>
                {status === 'playing' && !message && (
                  <span>{activePuzzle.description}</span>
                )}
                {message && <span>{message}</span>}
              </div>

              <Canvas shadows camera={{ position: [0, 14, 11], fov: 45 }} style={{ background: '#2a1f14', flex: 1 }}>
                <ambientLight intensity={0.45} />
                <directionalLight position={[8, 18, 8]} intensity={1.1} castShadow />
                <pointLight position={[-8, 8, -8]} intensity={0.4} color="#6ee7b7" />
                <Board3D
                  selectedSquare={selectedSquare}
                  validMoves={validMoves}
                  pieces={getPieces(chess)}
                  lastMove={lastMove}
                  onSquareClick={handleSquareClick}
                  isCheck={isCheck}
                  turn={chess.turn()}
                />
                <OrbitControls enablePan={false} minDistance={7} maxDistance={26} maxPolarAngle={Math.PI / 2.1} />
              </Canvas>
            </>
          )}
        </div>

        {/* ── Right: puzzle info ────────────────────────────────────── */}
        {activePuzzle && (
          <div className="puzzle-info-panel">
            <div className="puzzle-info-header">
              <h3>{activePuzzle.title}</h3>
              <span className="puzzle-info-diff" style={{ color: DIFF_COLOR[activePuzzle.difficulty] }}>
                {DIFF_LABEL[activePuzzle.difficulty]}
              </span>
            </div>

            <p className="puzzle-info-desc">{activePuzzle.description}</p>

            <div className="puzzle-info-meta">
              <div className="puzzle-meta-item">
                <span className="puzzle-meta-lbl">Turn</span>
                <span className="puzzle-meta-val">
                  {activePuzzle.fen.split(' ')[1] === 'w' ? '⬜ White' : '⬛ Black'}
                </span>
              </div>
              <div className="puzzle-meta-item">
                <span className="puzzle-meta-lbl">Reward</span>
                <span className="puzzle-meta-val" style={{ color: '#b58863' }}>+{activePuzzle.xp} XP</span>
              </div>
              <div className="puzzle-meta-item">
                <span className="puzzle-meta-lbl">Moves made</span>
                <span className="puzzle-meta-val">{moveCount}</span>
              </div>
            </div>

            {status === 'correct' && (
              <div className="puzzle-success-block">
                <div className="puzzle-success-icon">🎉</div>
                <div>Puzzle solved!</div>
                {!solved.includes(activePuzzle.id - 1) || activePuzzle.id === 1 ? (
                  <div className="puzzle-xp-badge">+{activePuzzle.xp} XP earned</div>
                ) : (
                  <div className="puzzle-xp-badge puzzle-xp-grey">Already earned</div>
                )}
              </div>
            )}

            <div className="puzzle-actions">
              {!showHint && status === 'playing' && (
                <button className="btn-ghost w-full" onClick={() => setShowHint(true)}>
                  💡 Show Hint
                </button>
              )}
              {showHint && (
                <div className="puzzle-hint-box">{activePuzzle.hint}</div>
              )}
              <button className="btn-secondary w-full" onClick={handleReset}>↺ Reset Puzzle</button>
              {status === 'correct' && activePuzzle.id < PUZZLES.length && (
                <button className="btn-primary w-full" onClick={() => loadPuzzle(PUZZLES[activePuzzle.id])}>
                  Next Puzzle →
                </button>
              )}
              <button className="btn-ghost w-full" onClick={() => navigate('/home')}>← Home</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
