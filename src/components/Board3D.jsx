import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { ChessPiece3D } from './ChessPiece3D';

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['1','2','3','4','5','6','7','8'];

export function Board3D({ selectedSquare, validMoves, pieces, lastMove, onSquareClick, isCheck, turn, hintMove }) {
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

        let color = isLight ? '#f0d9b5' : '#b58863';
        if (isSelected)             color = '#f6f669';
        else if (isValid)           color = isLight ? '#cdd16b' : '#aaa23a';
        else if (isLastFrom || isLastTo) color = isLight ? '#cdd16b' : '#aaa23a';
        else if (isHintFrom)        color = '#6ee7b7';   // mint green — hint source
        else if (isHintTo)          color = '#34d399';   // brighter green — hint target

        return { col, row, square, color, isValid, isHintFrom, isHintTo };
      })
    );
  }, [selectedSquare, validMoves, lastMove, hintMove]);

  return (
    <group>
      {/* Board base */}
      <mesh position={[0, -0.18, 0]} receiveShadow>
        <boxGeometry args={[8.6, 0.36, 8.6]} />
        <meshStandardMaterial color="#5a3518" metalness={0.1} roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.01, 0]} receiveShadow>
        <boxGeometry args={[8.4, 0.04, 8.4]} />
        <meshStandardMaterial color="#7a5230" metalness={0.05} roughness={0.95} />
      </mesh>

      {squares.map(({ col, row, square, color, isValid, isHintFrom, isHintTo }) => (
        <group key={square}>
          <mesh
            position={[col - 3.5, 0.02, row - 3.5]}
            receiveShadow
            onClick={e => { e.stopPropagation(); onSquareClick(square); }}
          >
            <boxGeometry args={[1, 0.04, 1]} />
            <meshStandardMaterial color={color} />
          </mesh>

          {/* Valid-move dot */}
          {isValid && (
            <mesh position={[col - 3.5, 0.06, row - 3.5]}>
              <cylinderGeometry args={[0.18, 0.18, 0.025, 20]} />
              <meshStandardMaterial color="#f6f669" emissive="#aaa23a" emissiveIntensity={0.4} transparent opacity={0.75} />
            </mesh>
          )}

          {/* Hint arrow ring — source square */}
          {isHintFrom && (
            <mesh position={[col - 3.5, 0.07, row - 3.5]}>
              <torusGeometry args={[0.38, 0.07, 8, 24]} />
              <meshStandardMaterial color="#6ee7b7" emissive="#6ee7b7" emissiveIntensity={0.7} transparent opacity={0.9} />
            </mesh>
          )}

          {/* Hint arrow ring — target square */}
          {isHintTo && (
            <mesh position={[col - 3.5, 0.07, row - 3.5]}>
              <cylinderGeometry args={[0.34, 0.34, 0.04, 24]} />
              <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={0.8} transparent opacity={0.85} />
            </mesh>
          )}
        </group>
      ))}

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
          />
        );
      })}

      {/* Labels */}
      {FILES.map((f, i) => (
        <Html key={`f${f}`} position={[i - 3.5, 0.06, -4.6]} center>
          <span style={{ color: '#9aa4b2', fontSize: '11px', fontWeight: '700', userSelect: 'none' }}>{f}</span>
        </Html>
      ))}
      {RANKS.map((r, i) => (
        <Html key={`r${r}`} position={[-4.6, 0.06, i - 3.5]} center>
          <span style={{ color: '#9aa4b2', fontSize: '11px', fontWeight: '700', userSelect: 'none' }}>{r}</span>
        </Html>
      ))}
    </group>
  );
}
