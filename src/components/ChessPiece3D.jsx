/**
 * Classical chess pieces built with THREE.LatheGeometry — turned wood silhouettes.
 * White pieces: ivory (#f2ede0) with warm highlights
 * Black pieces: ebony (#1a1510) with subtle sheen
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MAT = {
  w: { color: '#f2ede0', roughness: 0.35, metalness: 0.06 },
  b: { color: '#231f1a', roughness: 0.30, metalness: 0.12 },
};
const SEL_COLOR = '#b58863';
const CHECK_COLOR = '#c0392b';

// Build a lathe profile from [radius, y] pairs and return BufferGeometry
function lathe(profile, segs = 24) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, segs);
}

// Selected ring under piece
function Ring({ r, color = SEL_COLOR }) {
  const geo = useMemo(() => new THREE.TorusGeometry(r, 0.03, 8, 32), [r]);
  return (
    <mesh geometry={geo} position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
    </mesh>
  );
}

function useFloat(active, baseY) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = active
      ? baseY + 0.12 + Math.sin(clock.elapsedTime * 3.2) * 0.04
      : baseY;
  });
  return ref;
}

// ── Pawn ──────────────────────────────────────────────────────────────
function Pawn({ color, pos, selected }) {
  const mat = MAT[color];
  const ref = useFloat(selected, pos[1]);
  const geo = useMemo(() => lathe([
    [0.30, 0.00],[0.30, 0.04],[0.26, 0.07],
    [0.16, 0.13],[0.12, 0.18],
    [0.18, 0.30],[0.20, 0.36],[0.18, 0.42],
    [0.12, 0.46],[0.04, 0.52],
  ]), []);
  return (
    <group ref={ref} position={pos}>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial {...mat} />
      </mesh>
      {selected && <Ring r={0.34} />}
    </group>
  );
}

// ── Rook ──────────────────────────────────────────────────────────────
function Rook({ color, pos, selected }) {
  const mat = MAT[color];
  const ref = useFloat(selected, pos[1]);
  const body = useMemo(() => lathe([
    [0.32, 0.00],[0.32, 0.04],[0.28, 0.07],
    [0.18, 0.12],[0.16, 0.20],[0.16, 0.44],
    [0.22, 0.48],[0.22, 0.58],
  ]), []);
  return (
    <group ref={ref} position={pos}>
      <mesh geometry={body} castShadow>
        <meshStandardMaterial {...mat} />
      </mesh>
      {/* battlements: 4 small blocks on top */}
      {[0, 90, 180, 270].map((deg, i) => (
        <mesh key={i}
          position={[Math.cos(deg * Math.PI / 180) * 0.14, 0.62, Math.sin(deg * Math.PI / 180) * 0.14]}
          castShadow
        >
          <boxGeometry args={[0.1, 0.12, 0.1]} />
          <meshStandardMaterial {...mat} />
        </mesh>
      ))}
      {selected && <Ring r={0.36} />}
    </group>
  );
}

// ── Knight ────────────────────────────────────────────────────────────
function Knight({ color, pos, selected }) {
  const mat = MAT[color];
  const ref = useFloat(selected, pos[1]);
  const base = useMemo(() => lathe([
    [0.30, 0.00],[0.30, 0.04],[0.26, 0.07],
    [0.16, 0.13],[0.14, 0.22],
  ]), []);
  return (
    <group ref={ref} position={pos}>
      {/* base */}
      <mesh geometry={base} castShadow>
        <meshStandardMaterial {...mat} />
      </mesh>
      {/* neck post */}
      <mesh position={[0, 0.26, 0.04]} castShadow>
        <cylinderGeometry args={[0.1, 0.13, 0.12, 12]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      {/* horse head body */}
      <mesh position={[0, 0.38, 0.06]} castShadow>
        <boxGeometry args={[0.18, 0.28, 0.28]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      {/* snout */}
      <mesh position={[0, 0.30, 0.20]} castShadow>
        <boxGeometry args={[0.12, 0.12, 0.14]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      {/* ears */}
      {[-0.06, 0.06].map((x, i) => (
        <mesh key={i} position={[x, 0.56, 0.02]} castShadow>
          <coneGeometry args={[0.04, 0.10, 6]} />
          <meshStandardMaterial {...mat} />
        </mesh>
      ))}
      {selected && <Ring r={0.34} />}
    </group>
  );
}

// ── Bishop ────────────────────────────────────────────────────────────
function Bishop({ color, pos, selected }) {
  const mat = MAT[color];
  const ref = useFloat(selected, pos[1]);
  const geo = useMemo(() => lathe([
    [0.30, 0.00],[0.30, 0.04],[0.26, 0.07],
    [0.14, 0.14],[0.10, 0.22],[0.12, 0.36],
    [0.14, 0.44],[0.10, 0.50],[0.08, 0.58],
    [0.06, 0.64],[0.04, 0.72],
  ]), []);
  return (
    <group ref={ref} position={pos}>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial {...mat} />
      </mesh>
      {/* mitre tip */}
      <mesh position={[0, 0.76, 0]} castShadow>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      {selected && <Ring r={0.34} />}
    </group>
  );
}

// ── Queen ─────────────────────────────────────────────────────────────
function Queen({ color, pos, selected }) {
  const mat = MAT[color];
  const ref = useFloat(selected, pos[1]);
  const geo = useMemo(() => lathe([
    [0.34, 0.00],[0.34, 0.04],[0.28, 0.08],
    [0.16, 0.16],[0.12, 0.24],[0.16, 0.38],
    [0.20, 0.46],[0.16, 0.54],[0.14, 0.60],
    [0.20, 0.66],[0.20, 0.72],[0.10, 0.78],[0.05, 0.84],
  ]), []);
  return (
    <group ref={ref} position={pos}>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial {...mat} />
      </mesh>
      {/* crown points */}
      {[0, 1, 2, 3, 4, 5, 6].map(i => {
        const a = (i / 7) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.16, 0.74, Math.sin(a) * 0.16]} castShadow>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial {...mat} />
          </mesh>
        );
      })}
      {selected && <Ring r={0.38} />}
    </group>
  );
}

// ── King ──────────────────────────────────────────────────────────────
function King({ color, pos, selected, inCheck }) {
  const mat = MAT[color];
  const ref = useFloat(selected || inCheck, pos[1]);
  const geo = useMemo(() => lathe([
    [0.36, 0.00],[0.36, 0.04],[0.30, 0.08],
    [0.18, 0.16],[0.14, 0.24],[0.18, 0.38],
    [0.22, 0.46],[0.18, 0.54],[0.20, 0.62],[0.18, 0.68],
    [0.08, 0.72],
  ]), []);
  return (
    <group ref={ref} position={pos}>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial {...mat} />
      </mesh>
      {/* cross vertical */}
      <mesh position={[0, 0.80, 0]} castShadow>
        <boxGeometry args={[0.08, 0.28, 0.08]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      {/* cross horizontal */}
      <mesh position={[0, 0.90, 0]} castShadow>
        <boxGeometry args={[0.22, 0.08, 0.08]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      {selected && <Ring r={0.40} />}
      {inCheck && (
        <>
          <Ring r={0.44} color={CHECK_COLOR} />
          <pointLight color={CHECK_COLOR} intensity={3} distance={2.5} />
        </>
      )}
    </group>
  );
}

const MAP = { p: Pawn, r: Rook, n: Knight, b: Bishop, q: Queen, k: King };

export function ChessPiece3D({ piece, color, position, selected, inCheck, onClick }) {
  const Comp = MAP[piece];
  if (!Comp) return null;
  return (
    <group onClick={onClick}>
      <Comp color={color} pos={position} selected={selected} inCheck={inCheck} />
    </group>
  );
}
