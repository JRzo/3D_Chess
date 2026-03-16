/**
 * Classical chess pieces with smooth 3D movement dynamics:
 *  - Arced flight path when moving (knights soar higher)
 *  - Landing squish (rubber-bounce on arrival)
 *  - Selected: float + gentle sway rotation
 *  - Idle: per-piece desynchronised micro-bob
 *  - inCheck king: pulsing red ring + point light
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MAT = {
  w: { color: '#f2ede0', roughness: 0.35, metalness: 0.06 },
  b: { color: '#231f1a', roughness: 0.30, metalness: 0.12 },
};
const MAT_NEON = {
  w: { color: '#00ffcc', roughness: 0.1, metalness: 0.8, emissive: '#00ffcc', emissiveIntensity: 0.3 },
  b: { color: '#ff3366', roughness: 0.1, metalness: 0.8, emissive: '#ff3366', emissiveIntensity: 0.3 },
};
const SEL_COLOR   = '#b58863';
const CHECK_COLOR = '#c0392b';

// Build a lathe profile from [radius, y] pairs
function lathe(profile, segs = 24) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, segs);
}

// ── Easing ────────────────────────────────────────────────────────────
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

// ── Core movement hook ────────────────────────────────────────────────
// Handles arc flight, landing squish, floating, idle bob — all in one useFrame.
function usePieceDynamics(targetPos, pieceType, isActive) {
  const ref = useRef();

  // All mutable animation state lives here — never causes re-renders
  const s = useRef({
    fromX: targetPos[0], fromY: targetPos[1], fromZ: targetPos[2],
    toX:   targetPos[0], toY:   targetPos[1], toZ:   targetPos[2],
    t:        1.0,   // 0 = start of move, 1 = done
    duration: 0.4,
    squish:   0,     // counts down from squishDur on landing
    squishDur:0.28,
    phase: (targetPos[0] * 1.7 + targetPos[2] * 2.3) % (Math.PI * 2), // idle phase offset
  }).current;

  // ── Detect target position change (during render is safe — refs only) ──
  const dx = targetPos[0] - s.toX;
  const dz = targetPos[2] - s.toZ;
  if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
    // Capture the current interpolated position as the new start
    let cx, cy, cz;
    if (s.t >= 1.0) {
      cx = s.toX; cy = s.toY; cz = s.toZ;
    } else {
      const e = easeOutCubic(s.t);
      cx = s.fromX + (s.toX - s.fromX) * e;
      cz = s.fromZ + (s.toZ - s.fromZ) * e;
      const dist = Math.abs(s.toX - s.fromX) + Math.abs(s.toZ - s.fromZ);
      const arcH = pieceType === 'n' ? 2.0 : Math.max(0.4, dist * 0.28);
      cy = s.fromY + (s.toY - s.fromY) * e + arcH * Math.sin(s.t * Math.PI);
    }
    s.fromX = cx; s.fromY = cy; s.fromZ = cz;
    s.toX = targetPos[0]; s.toY = targetPos[1]; s.toZ = targetPos[2];
    s.t = 0.0;
    // Knights get a longer, more dramatic arc
    s.duration = pieceType === 'n' ? 0.58 : 0.34;
    // Phase stays stable (based on destination)
    s.phase = (targetPos[0] * 1.7 + targetPos[2] * 2.3) % (Math.PI * 2);
  }

  useFrame(({ clock }, delta) => {
    if (!ref.current) return;

    let x, y, z;

    if (s.t < 1.0) {
      // ── In-flight ──────────────────────────────────────────────────
      s.t = Math.min(1.0, s.t + delta / s.duration);
      const e = easeOutCubic(s.t);

      x = s.fromX + (s.toX - s.fromX) * e;
      z = s.fromZ + (s.toZ - s.fromZ) * e;

      const dist = Math.abs(s.toX - s.fromX) + Math.abs(s.toZ - s.fromZ);
      const arcH = pieceType === 'n' ? 2.0 : Math.max(0.4, dist * 0.28);
      // Parabola peaks at t = 0.5 of linear progress, not eased
      y = s.fromY + (s.toY - s.fromY) * e + arcH * Math.sin(s.t * Math.PI);

      // Tilt piece forward in direction of travel during flight
      // axis perpendicular to (dx,0,dz) in XZ plane = (-sin, 0, -cos)
      const dist2 = Math.hypot(s.toX - s.fromX, s.toZ - s.fromZ) || 1;
      const dx = (s.toX - s.fromX) / dist2;
      const dz = (s.toZ - s.fromZ) / dist2;
      const tilt = (pieceType === 'n' ? 0.30 : 0.18) * Math.sin(s.t * Math.PI);
      ref.current.rotation.set(-dz * tilt, 0, dx * tilt);

      // Trigger landing squish when animation completes
      if (s.t >= 1.0) {
        s.squish = s.squishDur;
      }
    } else {
      // ── Settled ────────────────────────────────────────────────────
      x = s.toX;
      z = s.toZ;
      const baseY = s.toY;
      const ct = clock.elapsedTime;

      if (isActive) {
        // Selected / in-check: float + gentle sway
        y = baseY + 0.18 + Math.sin(ct * 3.6) * 0.055;
        ref.current.rotation.set(0, Math.sin(ct * 1.5) * 0.20, 0);
      } else {
        // Idle: very subtle desynchronised bob (0.007 units max — barely visible)
        y = baseY + Math.sin(ct * 0.85 + s.phase) * 0.007;
        ref.current.rotation.set(0, 0, 0);
      }
    }

    ref.current.position.set(x, y, z);

    // ── Landing squish ─────────────────────────────────────────────
    if (s.squish > 0) {
      s.squish = Math.max(0, s.squish - delta);
      const sq = 1 - s.squish / s.squishDur; // 0 → 1 over squishDur
      // Sine curve: 0 at start/end, peak at middle
      const k = 0.20 * Math.sin(sq * Math.PI);
      // Squish down + spread sideways (volume-preserving)
      ref.current.scale.set(1 + k, 1 - k, 1 + k);
    } else {
      ref.current.scale.set(1, 1, 1);
    }
  });

  return ref;
}

// ── Pulsing ring ──────────────────────────────────────────────────────
function Ring({ r, color = SEL_COLOR, pulse = false }) {
  const meshRef = useRef();
  const geo = useMemo(() => new THREE.TorusGeometry(r, 0.03, 8, 32), [r]);
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    if (pulse) {
      const sc = 1 + 0.10 * Math.sin(clock.elapsedTime * 6);
      meshRef.current.scale.setScalar(sc);
    }
  });
  return (
    <mesh ref={meshRef} geometry={geo} position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={pulse ? 0.9 : 0.6} />
    </mesh>
  );
}

// ── Pawn ──────────────────────────────────────────────────────────────
function Pawn({ color, pos, selected, neon }) {
  const mat = neon ? MAT_NEON[color] : MAT[color];
  const ref = usePieceDynamics(pos, 'p', selected);
  const geo = useMemo(() => lathe([
    [0.30, 0.00],[0.30, 0.04],[0.26, 0.07],
    [0.16, 0.13],[0.12, 0.18],
    [0.18, 0.30],[0.20, 0.36],[0.18, 0.42],
    [0.12, 0.46],[0.04, 0.52],
  ]), []);
  return (
    <group ref={ref}>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial {...mat} />
      </mesh>
      {selected && <Ring r={0.34} />}
    </group>
  );
}

// ── Rook ──────────────────────────────────────────────────────────────
function Rook({ color, pos, selected, neon }) {
  const mat = neon ? MAT_NEON[color] : MAT[color];
  const ref = usePieceDynamics(pos, 'r', selected);
  const body = useMemo(() => lathe([
    [0.32, 0.00],[0.32, 0.04],[0.28, 0.07],
    [0.18, 0.12],[0.16, 0.20],[0.16, 0.44],
    [0.22, 0.48],[0.22, 0.58],
  ]), []);
  return (
    <group ref={ref}>
      <mesh geometry={body} castShadow>
        <meshStandardMaterial {...mat} />
      </mesh>
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
function Knight({ color, pos, selected, neon }) {
  const mat = neon ? MAT_NEON[color] : MAT[color];
  const ref = usePieceDynamics(pos, 'n', selected);
  const base = useMemo(() => lathe([
    [0.30, 0.00],[0.30, 0.04],[0.26, 0.07],
    [0.16, 0.13],[0.14, 0.22],
  ]), []);
  return (
    <group ref={ref}>
      <mesh geometry={base} castShadow>
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[0, 0.26, 0.04]} castShadow>
        <cylinderGeometry args={[0.1, 0.13, 0.12, 12]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[0, 0.38, 0.06]} castShadow>
        <boxGeometry args={[0.18, 0.28, 0.28]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[0, 0.30, 0.20]} castShadow>
        <boxGeometry args={[0.12, 0.12, 0.14]} />
        <meshStandardMaterial {...mat} />
      </mesh>
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
function Bishop({ color, pos, selected, neon }) {
  const mat = neon ? MAT_NEON[color] : MAT[color];
  const ref = usePieceDynamics(pos, 'b', selected);
  const geo = useMemo(() => lathe([
    [0.30, 0.00],[0.30, 0.04],[0.26, 0.07],
    [0.14, 0.14],[0.10, 0.22],[0.12, 0.36],
    [0.14, 0.44],[0.10, 0.50],[0.08, 0.58],
    [0.06, 0.64],[0.04, 0.72],
  ]), []);
  return (
    <group ref={ref}>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[0, 0.76, 0]} castShadow>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      {selected && <Ring r={0.34} />}
    </group>
  );
}

// ── Queen ─────────────────────────────────────────────────────────────
function Queen({ color, pos, selected, neon }) {
  const mat = neon ? MAT_NEON[color] : MAT[color];
  const ref = usePieceDynamics(pos, 'q', selected);
  const geo = useMemo(() => lathe([
    [0.34, 0.00],[0.34, 0.04],[0.28, 0.08],
    [0.16, 0.16],[0.12, 0.24],[0.16, 0.38],
    [0.20, 0.46],[0.16, 0.54],[0.14, 0.60],
    [0.20, 0.66],[0.20, 0.72],[0.10, 0.78],[0.05, 0.84],
  ]), []);
  return (
    <group ref={ref}>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial {...mat} />
      </mesh>
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
function King({ color, pos, selected, inCheck, neon = false }) {
  const mat = neon ? MAT_NEON[color] : MAT[color];
  const ref = usePieceDynamics(pos, 'k', selected || inCheck);
  const geo = useMemo(() => lathe([
    [0.36, 0.00],[0.36, 0.04],[0.30, 0.08],
    [0.18, 0.16],[0.14, 0.24],[0.18, 0.38],
    [0.22, 0.46],[0.18, 0.54],[0.20, 0.62],[0.18, 0.68],
    [0.08, 0.72],
  ]), []);

  // Pulsing check light
  const lightRef = useRef();
  useFrame(({ clock }) => {
    if (!lightRef.current || !inCheck) return;
    lightRef.current.intensity = 2.5 + 1.5 * Math.sin(clock.elapsedTime * 7);
  });

  return (
    <group ref={ref}>
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
          <Ring r={0.44} color={CHECK_COLOR} pulse />
          <Ring r={0.52} color={CHECK_COLOR} pulse />
          <pointLight ref={lightRef} color={CHECK_COLOR} intensity={3} distance={2.5} />
        </>
      )}
    </group>
  );
}

const MAP = { p: Pawn, r: Rook, n: Knight, b: Bishop, q: Queen, k: King };

export function ChessPiece3D({ piece, color, position, selected, inCheck, onClick, neon = false }) {
  const Comp = MAP[piece];
  if (!Comp) return null;
  return (
    <group onClick={onClick}>
      <Comp color={color} pos={position} selected={selected} inCheck={inCheck} neon={neon} />
    </group>
  );
}
