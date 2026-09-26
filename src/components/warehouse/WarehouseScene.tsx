import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import { STATUS_HEX, STATUS_LABEL, ZONES, type Equipment, type LiveStatus } from "@/lib/warehouse";

export type SceneItem = { e: Equipment; category: string; status: LiveStatus };

type Part = {
  geom: THREE.BufferGeometry;
  offset: [number, number, number];
  color: "status" | "dark";
  spin?: boolean;
};

const G = {
  speaker: new THREE.BoxGeometry(0.7, 1.2, 0.6),
  woofer: new THREE.CylinderGeometry(0.24, 0.24, 0.04, 20).rotateX(Math.PI / 2),
  sub: new THREE.BoxGeometry(1.1, 1.1, 1.1),
  subCone: new THREE.CylinderGeometry(0.38, 0.38, 0.04, 20).rotateX(Math.PI / 2),
  mixer: new THREE.BoxGeometry(1.1, 0.22, 0.7),
  dj: new THREE.BoxGeometry(1.7, 0.18, 0.8),
  platter: new THREE.CylinderGeometry(0.22, 0.22, 0.05, 20),
  mhBase: new THREE.BoxGeometry(0.55, 0.28, 0.45),
  mhHead: new THREE.BoxGeometry(0.34, 0.42, 0.34),
  par: new THREE.CylinderGeometry(0.24, 0.24, 0.36, 14),
  small: new THREE.BoxGeometry(0.55, 0.3, 0.42),
  case: new THREE.BoxGeometry(0.9, 0.45, 0.55),
};

function partsFor(cat: string): Part[] {
  switch (cat) {
    case "Casse":
      return [
        { geom: G.speaker, offset: [0, 0.6, 0], color: "dark" },
        { geom: G.woofer, offset: [0, 0.45, 0.31], color: "status" },
      ];
    case "Subwoofer":
      return [
        { geom: G.sub, offset: [0, 0.55, 0], color: "dark" },
        { geom: G.subCone, offset: [0, 0.55, 0.56], color: "status" },
      ];
    case "Mixer":
      return [{ geom: G.mixer, offset: [0, 0.11, 0], color: "status" }];
    case "Console DJ":
      return [
        { geom: G.dj, offset: [0, 0.09, 0], color: "dark" },
        { geom: G.platter, offset: [-0.5, 0.2, 0], color: "status" },
        { geom: G.platter, offset: [0.5, 0.2, 0], color: "status" },
      ];
    case "Luci Moving Head":
      return [
        { geom: G.mhBase, offset: [0, 0.14, 0], color: "dark" },
        { geom: G.mhHead, offset: [0, 0.5, 0], color: "status", spin: true },
      ];
    case "Par LED":
      return [{ geom: G.par, offset: [0, 0.18, 0], color: "status" }];
    case "Cavi e accessori":
      return [{ geom: G.case, offset: [0, 0.22, 0], color: "status" }];
    default:
      return [{ geom: G.small, offset: [0, 0.15, 0], color: "status" }];
  }
}

const DARK = new THREE.Color("#15161c");
const WHITE = new THREE.Color("#ffffff");
const SHELF_H = 0.08;

function PartMesh({
  items, part, hoveredId, selectedId, onHover, onSelect,
}: {
  items: SceneItem[]; part: Part; hoveredId?: string; selectedId?: string;
  onHover: (i: SceneItem | null, p?: THREE.Vector3) => void; onSelect: (i: SceneItem) => void;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const place = (t = 0) => {
    const m = ref.current;
    if (!m) return;
    items.forEach((it, i) => {
      dummy.position.set(it.e.pos_x + part.offset[0], it.e.pos_y + SHELF_H + part.offset[1], it.e.pos_z + part.offset[2]);
      dummy.rotation.set(0, part.spin && it.status !== "fuori_servizio" ? t * 0.8 + i : 0, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    place(0);
    const c = new THREE.Color();
    items.forEach((it, i) => {
      if (part.color === "dark") c.copy(DARK);
      else c.set(STATUS_HEX[it.status]);
      if (it.e.id === selectedId || it.e.id === hoveredId) c.lerp(WHITE, 0.45);
      m.setColorAt(i, c);
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [items, hoveredId, selectedId]);

  useFrame(({ clock }) => {
    if (part.spin) place(clock.elapsedTime);
  });

  const pick = (e: ThreeEvent<PointerEvent | MouseEvent>) =>
    e.instanceId !== undefined ? items[e.instanceId] : undefined;

  return (
    <instancedMesh
      key={items.length}
      ref={ref}
      args={[part.geom, undefined, items.length]}
      onPointerMove={(e) => {
        e.stopPropagation();
        const it = pick(e);
        if (it) onHover(it, e.point);
      }}
      onPointerOut={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        const it = pick(e);
        if (it) onSelect(it);
      }}
    >
      <meshStandardMaterial
        roughness={0.45}
        metalness={0.2}
        emissive={part.color === "status" ? "#ffffff" : "#000000"}
        emissiveIntensity={part.color === "status" ? 0.08 : 0}
      />
    </instancedMesh>
  );
}

function Shelves() {
  const planks = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (const z of ZONES) for (const row of [-6, -3, 0]) for (const lvl of [0, 1.6, 3.2]) arr.push([z.x, lvl, row]);
    return arr;
  }, []);
  const posts = useMemo(() => {
    const arr: [number, number][] = [];
    for (const z of ZONES) for (const row of [-6, -3, 0]) for (const dx of [-3.1, 3.1]) for (const dz of [-0.6, 0.6]) arr.push([z.x + dx, row + dz]);
    return arr;
  }, []);
  const plankRef = useRef<THREE.InstancedMesh>(null);
  const postRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const d = new THREE.Object3D();
    planks.forEach((p, i) => { d.position.set(p[0], p[1] + SHELF_H / 2, p[2]); d.updateMatrix(); plankRef.current!.setMatrixAt(i, d.matrix); });
    posts.forEach((p, i) => { d.position.set(p[0], 2.1, p[1]); d.updateMatrix(); postRef.current!.setMatrixAt(i, d.matrix); });
    plankRef.current!.instanceMatrix.needsUpdate = true;
    postRef.current!.instanceMatrix.needsUpdate = true;
  }, [planks, posts]);
  return (
    <>
      <instancedMesh ref={plankRef} args={[undefined, undefined, planks.length]} raycast={() => null}>
        <boxGeometry args={[6.4, SHELF_H, 1.4]} />
        <meshStandardMaterial color="#2a2d3a" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={postRef} args={[undefined, undefined, posts.length]} raycast={() => null}>
        <boxGeometry args={[0.08, 4.2, 0.08]} />
        <meshStandardMaterial color="#4b5ae0" roughness={0.5} emissive="#3b46c8" emissiveIntensity={0.25} />
      </instancedMesh>
    </>
  );
}

function Hall() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -3]} receiveShadow raycast={() => null}>
        <planeGeometry args={[46, 22]} />
        <meshStandardMaterial color="#0e0f16" roughness={0.9} />
      </mesh>
      <gridHelper args={[46, 46, "#3a2d6b", "#1b1c2a"]} position={[0, 0.01, -3]} />
      <mesh position={[0, 3.5, -14]} raycast={() => null}>
        <boxGeometry args={[46, 7, 0.2]} />
        <meshStandardMaterial color="#12131c" />
      </mesh>
      <mesh position={[-23, 3.5, -3]} raycast={() => null}>
        <boxGeometry args={[0.2, 7, 22]} />
        <meshStandardMaterial color="#12131c" />
      </mesh>
      <mesh position={[23, 3.5, -3]} raycast={() => null}>
        <boxGeometry args={[0.2, 7, 22]} />
        <meshStandardMaterial color="#12131c" />
      </mesh>
      {/* neon strip */}
      <mesh position={[0, 6.8, -13.85]} raycast={() => null}>
        <boxGeometry args={[46, 0.06, 0.06]} />
        <meshBasicMaterial color="#8b5cf6" />
      </mesh>
      {ZONES.map((z) => (
        <Html key={z.nome} position={[z.x, 5.2, -3]} center distanceFactor={18} zIndexRange={[10, 0]}>
          <div className="whitespace-nowrap rounded-md border border-primary/50 bg-background/80 px-3 py-1 font-display text-sm font-semibold uppercase tracking-widest text-primary backdrop-blur">
            {z.nome}
          </div>
        </Html>
      ))}
    </group>
  );
}

function CameraRig({ focus, controls }: { focus: THREE.Vector3 | null; controls: React.RefObject<OrbitImpl | null> }) {
  useFrame(({ camera }) => {
    const c = controls.current;
    if (!focus || !c) return;
    const goalPos = new THREE.Vector3(focus.x, 7, focus.z + 11);
    c.target.lerp(focus, 0.08);
    camera.position.lerp(goalPos, 0.08);
    c.update();
  });
  return null;
}

export default function WarehouseScene({
  items, selectedId, onSelect, focus, onUserMove,
}: {
  items: SceneItem[]; selectedId?: string; onSelect: (i: SceneItem) => void;
  focus: THREE.Vector3 | null; onUserMove: () => void;
}) {
  const [hover, setHover] = useState<{ it: SceneItem; p: THREE.Vector3 } | null>(null);
  const controls = useRef<OrbitImpl>(null);

  const groups = useMemo(() => {
    const byCat = new Map<string, SceneItem[]>();
    for (const it of items) {
      const arr = byCat.get(it.category) ?? [];
      arr.push(it);
      byCat.set(it.category, arr);
    }
    return [...byCat.entries()];
  }, [items]);

  const onHover = (it: SceneItem | null, p?: THREE.Vector3) => {
    if (!it || !p) { setHover(null); document.body.style.cursor = ""; return; }
    document.body.style.cursor = "pointer";
    setHover((h) => (h?.it.e.id === it.e.id ? h : { it, p: p.clone() }));
  };

  return (
    <Canvas camera={{ position: [0, 16, 22], fov: 45 }} dpr={[1, 1.75]} gl={{ antialias: true }}>
      <color attach="background" args={["#08090f"]} />
      <fog attach="fog" args={["#08090f", 30, 70]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#8fa4ff", "#1a0f2e", 0.6]} />
      <directionalLight position={[10, 18, 12]} intensity={1.1} />
      <pointLight position={[0, 6, 4]} intensity={40} color="#8b5cf6" distance={30} />
      <Hall />
      <Shelves />
      {groups.map(([cat, list]) =>
        partsFor(cat).map((part, pi) => (
          <PartMesh
            key={cat + pi}
            items={list}
            part={part}
            hoveredId={hover?.it.e.id}
            selectedId={selectedId}
            onHover={onHover}
            onSelect={onSelect}
          />
        )),
      )}
      {hover && (
        <Html position={[hover.p.x, hover.p.y + 0.6, hover.p.z]} center style={{ pointerEvents: "none" }} zIndexRange={[20, 10]}>
          <div className="whitespace-nowrap rounded-md border bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
            <p className="font-semibold text-foreground">{hover.it.e.nome}</p>
            <p style={{ color: STATUS_HEX[hover.it.status] }}>{STATUS_LABEL[hover.it.status]}</p>
          </div>
        </Html>
      )}
      <OrbitControls
        ref={controls}
        makeDefault
        target={[0, 1, -3]}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={4}
        maxDistance={45}
        onStart={onUserMove}
      />
      <CameraRig focus={focus} controls={controls} />
    </Canvas>
  );
}
