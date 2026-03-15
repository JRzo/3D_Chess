import { useState, useCallback, useRef } from 'react';
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
import { PUZZLES_KEY } from '../lib/constants';

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

  const [solved, setSolved] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(PUZZLES_KEY) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch { return []; }
  });

  const [activePuzzle, setActivePuzzle] = useState(null);
  const [wasAlreadySolved, setWasAlreadySolved] = useState(false);

  const [chess]           = useState(() => new Chess());
  const [fen, setFen]     = useState('');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves]         = useState([]);
  const [lastMove, setLastMove]             = useState(null);
  const [status, setStatus]   = useState('idle');   // idle | playing | correct | wrong | giveup
  const [message, setMessage] = useState('');
  const [moveCount, setMoveCount] = useState(0);
  const [showHint, setShowHint]   = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const responseTimer = useRef(null);
  const autoNextTimer = useRef(null);

  const loadPuzzle = useCallback((puzzle) => {
    clearTimeout(responseTimer.current);
    clearTimeout(autoNextTimer.current);
    chess.load(puzzle.fen);
    setFen(chess.fen());
    setActivePuzzle(puzzle);
    setWasAlreadySolved(solved.includes(puzzle.id));
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setStatus('playing');
    setMessage('');
    setMoveCount(0);
    setShowHint(false);
    setShowSolution(false);
  }, [chess, solved]);

  const handleSquareClick = useCallback((square) => {
    if (status !== 'playing') return;

    const piece = chess.get(square);

    if (piece && piece.color === chess.turn()) {
      setSelectedSquare(square);
      const moves = chess.moves({ square, verbose: true }).map(m => m.to);
      setValidMoves(moves);
      soundManager.play('select');
      return;
    }

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

          if (!solved.includes(activePuzzle.id)) {
            const newSolved = [...solved, activePuzzle.id];
            setSolved(newSolved);
            localStorage.setItem(PUZZLES_KEY, JSON.stringify(newSolved));
            if (user) {
              api.post('/games', {})
                .then(r => api.post(`/games/${r.data._id}/complete`, {
                  result: 'white', resultReason: 'puzzle', pgn: '',
                }))
                .then(({ data }) => { if (data.user) updateUser(data.user); })
                .catch(() => {});
            }
          }

          // Auto-advance to next puzzle after 2.5s (only if not last)
          const nextPuzzle = PUZZLES.find(p => p.id === activePuzzle.id + 1);
          if (nextPuzzle) {
            autoNextTimer.current = setTimeout(() => {
              loadPuzzle(nextPuzzle);
            }, 2500);
          }
        } else {
          soundManager.play('invalid');
          setStatus('wrong');
          setMessage('✗ Not quite. Try again!');
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
  }, [status, chess, selectedSquare, activePuzzle, solved, user, updateUser, loadPuzzle]);

  const handleGiveUp = () => {
    clearTimeout(responseTimer.current);
    clearTimeout(autoNextTimer.current);
    setStatus('giveup');
    setShowSolution(true);
    setMessage('Solution revealed. Study the move and try the next puzzle!');
    soundManager.play('invalid');
  };

  const handleReset = () => {
    if (activePuzzle) loadPuzzle(activePuzzle);
  };

  const isCheck = chess.inCheck();
  const solutionMove = activePuzzle?.solution[0];

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
              <div className={`puzzle-status-banner ${status === 'correct' ? 'puzz-correct' : status === 'wrong' ? 'puzz-wrong' : status === 'giveup' ? 'puzz-giveup' : ''}`}>
                {status === 'playing' && !message && <span>{activePuzzle.description}</span>}
                {message && <span>{message}</span>}
                {status === 'correct' && PUZZLES.find(p => p.id === activePuzzle.id + 1) && (
                  <span className="puzz-autonext"> — next puzzle in 2.5s…</span>
                )}
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
                  hintMove={showSolution && solutionMove ? solutionMove : null}
                  boardStyle={user?.settings?.boardStyle || 'wood'}
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
                {!wasAlreadySolved ? (
                  <div className="puzzle-xp-badge">+{activePuzzle.xp} XP earned</div>
                ) : (
                  <div className="puzzle-xp-badge puzzle-xp-grey">Already earned</div>
                )}
              </div>
            )}

            {status === 'giveup' && (
              <div className="puzzle-giveup-block">
                <div className="puzzle-solution-label">Solution</div>
                <div className="puzzle-solution-move">
                  {solutionMove ? `${solutionMove.from} → ${solutionMove.to}` : '—'}
                </div>
                <p className="puzzle-giveup-note">The highlighted squares show the correct move.</p>
              </div>
            )}

            <div className="puzzle-actions">
              {!showHint && status === 'playing' && (
                <button className="btn-ghost w-full" onClick={() => setShowHint(true)}>
                  💡 Show Hint
                </button>
              )}
              {showHint && status === 'playing' && (
                <div className="puzzle-hint-box">{activePuzzle.hint}</div>
              )}
              {status === 'playing' && (
                <button className="btn-danger-sm w-full" onClick={handleGiveUp}>
                  🏳 Give Up / Show Solution
                </button>
              )}
              <button className="btn-secondary w-full" onClick={handleReset}>↺ Reset Puzzle</button>
              {(status === 'correct' || status === 'giveup') && (() => {
                const next = PUZZLES.find(p => p.id === activePuzzle.id + 1);
                return next ? (
                  <button className="btn-primary w-full" onClick={() => {
                    clearTimeout(autoNextTimer.current);
                    loadPuzzle(next);
                  }}>
                    Next Puzzle →
                  </button>
                ) : (
                  <div className="puzzle-all-done">🎉 All puzzles solved!</div>
                );
              })()}
              <button className="btn-ghost w-full" onClick={() => navigate('/home')}>← Home</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
