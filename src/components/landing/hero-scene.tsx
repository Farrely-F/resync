"use client";

import { Float, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

/**
 * The hero scene, loaded lazily and only when the capability gate allows it.
 *
 * It shows the product's own claim rather than an abstract object: three resume
 * pages, with one line on the front page drawn dark because it is the line the
 * match actually rests on. Everything is achromatic to stay inside the design
 * tokens, and the whole scene is a handful of boxes and thin bars.
 */

const SHEET_WIDTH = 1.5;
const SHEET_HEIGHT = 2.05;
const LINE_TOP = 0.6;
const LINE_GAP = 0.21;
const LINE_MAX = 1.14;
/** Fractions of the line width; the shape reads as a document, not as a paragraph. */
const LINES = [0.55, 1, 0.86, 0.42, 1, 0.93, 0.6] as const;

function Sheet({
  position,
  rotation,
  highlight,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  highlight: number;
}) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[SHEET_WIDTH, SHEET_HEIGHT, 0.05]} radius={0.05} smoothness={3}>
        <meshStandardMaterial color="#f4f4f5" metalness={0} roughness={0.9} />
      </RoundedBox>
      {LINES.map((fraction, index) => {
        const width = LINE_MAX * fraction;
        return (
          <mesh key={`${index}-${fraction}`} position={[-LINE_MAX / 2 + width / 2, LINE_TOP - index * LINE_GAP, 0.032]}>
            <boxGeometry args={[width, 0.045, 0.01]} />
            <meshStandardMaterial
              color={index === highlight ? "#18181b" : "#a1a1aa"}
              metalness={0}
              roughness={0.6}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function Rig({ children }: { children: React.ReactNode }) {
  const group = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!group.current) {
      return;
    }
    // Clamped so a restored background tab does not jump the rotation.
    group.current.rotation.y += Math.min(delta, 0.05) * 0.12;
  });

  return <group ref={group}>{children}</group>;
}

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6.6], fov: 30 }}
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
    >
      <ambientLight intensity={1.15} />
      <directionalLight intensity={2.2} position={[2.5, 4, 6]} />
      <directionalLight intensity={0.7} position={[-4, -2, -3]} />
      <Rig>
        {/* Back-left and back-right sheets peek out from behind the one that carries the highlighted line. */}
        <Float floatIntensity={0.3} rotationIntensity={0.06} speed={0.85}>
          <Sheet highlight={4} position={[-0.46, -0.02, -0.3]} rotation={[0, 0.34, -0.05]} />
        </Float>
        <Float floatIntensity={0.42} rotationIntensity={0.08} speed={1.15}>
          <Sheet highlight={1} position={[0, 0.04, 0]} rotation={[0, 0.04, 0]} />
        </Float>
        <Float floatIntensity={0.32} rotationIntensity={0.06} speed={0.95}>
          <Sheet highlight={-1} position={[0.48, -0.05, -0.55]} rotation={[0, -0.34, 0.06]} />
        </Float>
      </Rig>
    </Canvas>
  );
}
