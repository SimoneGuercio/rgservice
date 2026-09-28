import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Environment, Html, Lightformer, OrbitControls } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import { STATUS_HEX, STATUS_LABEL, ZONES, type Equipment, type LiveStatus } from "@/lib/warehouse";

export type SceneItem = { e: Equipment; category: string; status: LiveStatus };

type Part = {
  geom: THREE.BufferGeometry;
  offset: [number, number, number];
  color: "status" | "dark" | "metal" | "rubber" | "lens" | "light";
  rotation?: [number, number, number];
  scale?: [number, number, number];
  spin?: boolean;
};

const G = {
  speaker: new THREE.BoxGeometry(0.7, 1.2, 0.6),
  speakerGrille: new THREE.BoxGeometry(0.61, 1.02, 0.025),
  woofer: new THREE.CylinderGeometry(0.24, 0.24, 0.045, 24).rotateX(Math.PI / 2),
  tweeter: new THREE.CylinderGeometry(0.09, 0.09, 0.045, 20).rotateX(Math.PI / 2),
  handle: new THREE.BoxGeometry(0.25, 0.07, 0.05),
  sub: new THREE.BoxGeometry(1.1, 1.1, 1.1),
  subGrille: new THREE.BoxGeometry(0.96, 0.96, 0.025),
  subCone: new THREE.CylinderGeometry(0.38, 0.38, 0.05, 28).rotateX(Math.PI / 2),
  mixer: new THREE.BoxGeometry(1.1, 0.22, 0.7),
  mixerPanel: new THREE.BoxGeometry(1.02, 0.035, 0.62),
  fader: new THREE.BoxGeometry(0.025, 0.035, 0.22),
  knob: new THREE.CylinderGeometry(0.035, 0.035, 0.05, 12),
  dj: new THREE.BoxGeometry(1.7, 0.18, 0.8),
  platter: new THREE.CylinderGeometry(0.22, 0.22, 0.05, 20),
  display: new THREE.BoxGeometry(0.32, 0.025, 0.18),
  mhBase: new THREE.BoxGeometry(0.55, 0.28, 0.45),
  yoke: new THREE.BoxGeometry(0.08, 0.54, 0.08),
  mhHead: new THREE.CylinderGeometry(0.23, 0.19, 0.38, 16),
  lens: new THREE.CylinderGeometry(0.13, 0.13, 0.025, 24),
  par: new THREE.CylinderGeometry(0.26, 0.2, 0.38, 18),
  parRing: new THREE.TorusGeometry(0.19, 0.025, 8, 24),
  cable: new THREE.TorusGeometry(0.25, 0.055, 8, 24),
  small: new THREE.BoxGeometry(0.55, 0.3, 0.42),
  case: new THREE.BoxGeometry(0.9, 0.45, 0.55),
  caseEdge: new THREE.BoxGeometry(0.94, 0.045, 0.59),
};

function partsFor(cat: string): Part[] {
  switch (cat) {
    case "Casse":
      return [
        { geom: G.speaker, offset: [0, 0.6, 0], color: "dark" },
        { geom: G.speakerGrille, offset: [0, 0.6, 0.313], color: "metal" },
        { geom: G.woofer, offset: [0, 0.44, 0.335], color: "status" },
        { geom: G.tweeter, offset: [0, 0.83, 0.335], color: "light" },
        { geom: G.handle, offset: [0, 1.17, 0.05], color: "rubber" },
      ];
    case "Subwoofer":
      return [
        { geom: G.sub, offset: [0, 0.55, 0], color: "dark" },
        { geom: G.subGrille, offset: [0, 0.55, 0.563], color: "metal" },
        { geom: G.subCone, offset: [0, 0.55, 0.59], color: "status" },
        { geom: G.handle, offset: [0, 1.06, 0.15], color: "rubber", scale: [1.5, 1, 1] },
      ];
    case "Mixer":
      return [
        { geom: G.mixer, offset: [0, 0.11, 0], color: "dark" },
        { geom: G.mixerPanel, offset: [0, 0.238, 0], color: "metal" },
        ...[-0.36, -0.12, 0.12, 0.36].map((x): Part => ({ geom: G.fader, offset: [x, 0.275, 0.12], color: "status" })),
        ...[-0.36, -0.12, 0.12, 0.36].map((x): Part => ({ geom: G.knob, offset: [x, 0.285, -0.18], color: "light" })),
      ];
    case "Console DJ":
      return [
        { geom: G.dj, offset: [0, 0.09, 0], color: "dark" },
        { geom: G.platter, offset: [-0.5, 0.2, 0], color: "metal" },
        { geom: G.platter, offset: [0.5, 0.2, 0], color: "metal" },
        { geom: G.display, offset: [0, 0.202, -0.18], color: "status" },
        ...[-0.14, 0, 0.14].map((x): Part => ({ geom: G.knob, offset: [x, 0.225, 0.16], color: "light" })),
      ];
    case "Luci Moving Head":
      return [
        { geom: G.mhBase, offset: [0, 0.14, 0], color: "dark" },
        { geom: G.yoke, offset: [-0.23, 0.5, 0], color: "metal" },
        { geom: G.yoke, offset: [0.23, 0.5, 0], color: "metal" },
        { geom: G.mhHead, offset: [0, 0.55, 0], color: "dark", rotation: [Math.PI / 2, 0, 0], spin: true },
        { geom: G.lens, offset: [0, 0.55, 0.215], color: "status", rotation: [Math.PI / 2, 0, 0], spin: true },
      ];
    case "Par LED":
      return [
        { geom: G.par, offset: [0, 0.28, 0], color: "dark", rotation: [Math.PI / 2, 0, 0] },
        { geom: G.parRing, offset: [0, 0.28, 0.205], color: "metal" },
        { geom: G.lens, offset: [0, 0.28, 0.225], color: "status", rotation: [Math.PI / 2, 0, 0], scale: [1.25, 1, 1.25] },
      ];
    case "Cavi e accessori":
      return [
        { geom: G.case, offset: [0, 0.22, 0], color: "dark" },
        { geom: G.caseEdge, offset: [0, 0.43, 0], color: "metal" },
        { geom: G.cable, offset: [0, 0.48, 0], color: "status", rotation: [Math.PI / 2, 0, 0] },
      ];
    default:
      return [{ geom: G.small, offset: [0, 0.15, 0], color: "status" }];
  }
}

const DARK = new THREE.Color("#15161c");
const METAL = new THREE.Color("#626977");
const RUBBER = new THREE.Color("#08090c");
const LENS = new THREE.Color("#72c9ff");
const LIGHT = new THREE.Color("#dce4f2");
const WHITE = new THREE.Color("#ffffff");
const SHELF_H = 0.08;

function PartMesh({
  items, part, hoveredId, selectedId, onHover, onSelect,
}: {
  items: SceneItem[]; part: Part; hoveredId?: string | undefined; selectedId?: string | undefined;
  onHover: (i: SceneItem | null, p?: THREE.Vector3) => void; onSelect: (i: SceneItem) => void;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const place = (t = 0) => {
    const m = ref.current;
    if (!m) return;
    items.forEach((it, i) => {
      dummy.position.set(it.e.pos_x + part.offset[0], it.e.pos_y + SHELF_H + part.offset[1], it.e.pos_z + part.offset[2]);
      const rotation = part.rotation ?? [0, 0, 0];
      dummy.rotation.set(rotation[0], rotation[1] + (part.spin && it.status !== "fuori_servizio" ? t * 0.8 + i : 0), rotation[2]);
      const scale = part.scale ?? [1, 1, 1];
      dummy.scale.set(scale[0], scale[1], scale[2]);
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
      else if (part.color === "metal") c.copy(METAL);
      else if (part.color === "rubber") c.copy(RUBBER);
      else if (part.color === "lens") c.copy(LENS);
      else if (part.color === "light") c.copy(LIGHT);
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
        roughness={part.color === "metal" ? 0.28 : 0.5}
        metalness={part.color === "metal" ? 0.75 : 0.16}
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
    const planksMesh = plankRef.current;
    const postsMesh = postRef.current;
    if (!planksMesh || !postsMesh) return;
    planks.forEach((p, i) => { d.position.set(p[0], p[1] + SHELF_H / 2, p[2]); d.updateMatrix(); planksMesh.setMatrixAt(i, d.matrix); });
    posts.forEach((p, i) => { d.position.set(p[0], 2.1, p[1]); d.updateMatrix(); postsMesh.setMatrixAt(i, d.matrix); });
    planksMesh.instanceMatrix.needsUpdate = true;
    postsMesh.instanceMatrix.needsUpdate = true;
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
  items: SceneItem[]; selectedId?: string | undefined; onSelect: (i: SceneItem) => void;
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
    <Canvas shadows camera={{ position: [0, 16, 22], fov: 45 }} dpr={[1, 1.5]} gl={{ antialias: true }}>
      <color attach="background" args={["#08090f"]} />
      <fog attach="fog" args={["#08090f", 30, 70]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#8fa4ff", "#1a0f2e", 0.6]} />
      <directionalLight position={[10, 18, 12]} intensity={1.1} />
      <pointLight position={[0, 6, 4]} intensity={40} color="#8b5cf6" distance={30} />
      <Environment resolution={64}>
        <Lightformer intensity={2.2} position={[0, 8, 4]} scale={[24, 3, 1]} />
        <Lightformer intensity={1.1} color="#748dff" position={[-18, 4, -3]} rotation-y={Math.PI / 2} scale={[18, 2, 1]} />
      </Environment>
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
