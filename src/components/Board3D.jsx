import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { ChessPiece3D } from './ChessPiece3D';

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['1','2','3','4','5','6','7','8'];

// Board colour themes: light square, dark square, board frame
const THEMES = {
  wood: {
    light: '#f0d9b5', dark: '#b58863',
    frame1: '#5a3518', frame2: '#7a5230',
    selected: '#f6f669', valid: ['#cdd16b', '#aaa23a'],
    lastMove: ['#cdd16b', '#aaa23a'],
    hintFrom: '#6ee7b7', hintTo: '#34d399',
    label: '#9aa4b2',
  },
  marble: {
    light: '#e8e0d8', dark: '#8a7a6a',
    frame1: '#5c4f42', frame2: '#7a6a5a',
    selected: '#d4e8ff', valid: ['#a0c4e8', '#6894b8'],
    lastMove: ['#b0d0f0', '#7aa0c0'],
    hintFrom: '#a0f0d0', hintTo: '#50d0a0',
    label: '#b0a898',
  },
  neon: {
    light: '#1a1a2e', dark: '#0d0d1a',
    frame1: '#0a0a14', frame2: '#12122a',
    selected: '#00ff88', valid: ['#00cc66', '#009944'],
    lastMove: ['#0088ff', '#0055cc'],
    hintFrom: '#ff00ff', hintTo: '#cc00cc',
    label: '#888888',
  },
};

export function Board3D({
  selectedSquare, validMoves, pieces, lastMove,
  onSquareClick, isCheck, turn, hintMove, boardStyle = 'wood',
}) {
  const theme = THEMES[boardStyle] || THEMES.wood;

  const squares = useMemo(() => {
    return FILES.flatMap((file, col) =>
      RANKS.map((rank, row) => {
        const square = file + rank;
        const isLight     = (col + row) % 2 === 0;
        const isSelected  = square === selectedSquare;
        const isValid     = validMoves.includes(square);
        const isLastFrom  = lastMove?.from === square;
        const isLastTo    = lastMove?.to   === square;
        const isHintFrom  = hintMove?.from === square;
        const isHintTo    = hintMove?.to   === square;

        let color = isLight ? theme.light : theme.dark;
        if (isSelected)                   color = theme.selected;
        else if (isValid)                 color = isLight ? theme.valid[0] : theme.valid[1];
        else if (isLastFrom || isLastTo)  color = isLight ? theme.lastMove[0] : theme.lastMove[1];
        else if (isHintFrom)              color = theme.hintFrom;
        else if (isHintTo)                color = theme.hintTo;

        return { col, row, square, color, isLight, isValid, isHintFrom, isHintTo };
      })
    );
  }, [selectedSquare, validMoves, lastMove, hintMove, theme]);

  // Emissive tint for neon board squares
  const isNeon = boardStyle === 'neon';

  return (
    <group>
      {/* Board base */}
      <mesh position={[0, -0.18, 0]} receiveShadow>
        <boxGeometry args={[8.6, 0.36, 8.6]} />
        <meshStandardMaterial color={theme.frame1} metalness={isNeon ? 0.6 : 0.1} roughness={isNeon ? 0.3 : 0.9} />
      </mesh>
      <mesh position={[0, -0.01, 0]} receiveShadow>
        <boxGeometry args={[8.4, 0.04, 8.4]} />
        <meshStandardMaterial color={theme.frame2} metalness={isNeon ? 0.5 : 0.05} roughness={isNeon ? 0.4 : 0.95} />
      </mesh>

      {squares.map(({ col, row, square, color, isValid, isHintFrom, isHintTo }) => (
        <group key={square}>
          <mesh
            position={[col - 3.5, 0.02, row - 3.5]}
            receiveShadow
            onClick={e => { e.stopPropagation(); onSquareClick(square); }}
          >
            <boxGeometry args={[1, 0.04, 1]} />
            <meshStandardMaterial
              color={color}
              emissive={isNeon ? color : '#000000'}
              emissiveIntensity={isNeon ? 0.15 : 0}
            />
          </mesh>

          {/* Valid-move dot */}
          {isValid && (
            <mesh position={[col - 3.5, 0.06, row - 3.5]}>
              <cylinderGeometry args={[0.18, 0.18, 0.025, 20]} />
              <meshStandardMaterial
                color={isNeon ? theme.valid[0] : '#f6f669'}
                emissive={isNeon ? theme.valid[0] : '#aaa23a'}
                emissiveIntensity={isNeon ? 0.9 : 0.4}
                transparent opacity={0.75}
              />
            </mesh>
          )}

          {/* Hint ring — source square */}
          {isHintFrom && (
            <mesh position={[col - 3.5, 0.07, row - 3.5]}>
              <torusGeometry args={[0.38, 0.07, 8, 24]} />
              <meshStandardMaterial
                color={theme.hintFrom}
                emissive={theme.hintFrom}
                emissiveIntensity={isNeon ? 1.2 : 0.7}
                transparent opacity={0.9}
              />
            </mesh>
          )}

          {/* Hint disc — target square */}
          {isHintTo && (
            <mesh position={[col - 3.5, 0.07, row - 3.5]}>
              <cylinderGeometry args={[0.34, 0.34, 0.04, 24]} />
              <meshStandardMaterial
                color={theme.hintTo}
                emissive={theme.hintTo}
                emissiveIntensity={isNeon ? 1.2 : 0.8}
                transparent opacity={0.85}
              />
            </mesh>
          )}
        </group>
      ))}

      {/* Pieces */}
      {pieces.map(({ square, piece, color, col, row }) => {
        const isKingInCheck = piece === 'k' && isCheck && color === turn;
        return (
          <ChessPiece3D
            key={square}
            piece={piece}
            color={color}
            position={[col - 3.5, 0.08, row - 3.5]}
            selected={selectedSquare === square}
            inCheck={isKingInCheck}
            onClick={e => { e.stopPropagation(); onSquareClick(square); }}
            neon={isNeon}
          />
        );
      })}

      {/* Rank / file labels */}
      {FILES.map((f, i) => (
        <Html key={`f${f}`} position={[i - 3.5, 0.06, -4.6]} center>
          <span style={{ color: theme.label, fontSize: '11px', fontWeight: '700', userSelect: 'none' }}>{f}</span>
        </Html>
      ))}
      {RANKS.map((r, i) => (
        <Html key={`r${r}`} position={[-4.6, 0.06, i - 3.5]} center>
          <span style={{ color: theme.label, fontSize: '11px', fontWeight: '700', userSelect: 'none' }}>{r}</span>
        </Html>
      ))}
    </group>
  );
}
