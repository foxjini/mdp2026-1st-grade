# CONTEXT_3D_SCENE_GUIDE: 팀 Scene.tsx 3D 공간 만들기 가이드

> 규칙의 기준은 `CONTEXT_ROOM_PACKAGE_SPEC.md` 3장입니다. 이 문서는 보기 좋은 3D 장면을 만드는 요령입니다.

## 1. 플랫폼이 이미 만들어 둔 것 (Scene.tsx 에서 만들지 않음)
```tsx
<Canvas shadows camera={{ position: [6.8, 5.2, 7.2], fov: 38 }}>
  <hemisphereLight />               {/* RGB LED 색에 따라 은은하게 물듦 */}
  <ambientLight />                  {/* Cds 조도 값에 따라 밝기 변화 */}
  <directionalLight castShadow />   {/* 그림자 범위: -6 ~ 6 */}
  <Environment> + <Lightformer />   {/* 절차적 스튜디오 환경광 (PBR 반사, 네트워크 없음) */}
  <EffectComposer>                  {/* '고급 그래픽'에서만: SSAO(N8AO) · 블룸(강한 발광만) · SMAA · ACES 톤매핑 */}
  <Scene isModalOpen={...} />       {/* ← 팀 Scene.tsx 가 여기에 들어감 */}
  <CameraRig />                     {/* OrbitControls + 조감도 전환 */}
</Canvas>
```

> 화면 왼쪽 아래 **[고급 그래픽 / 절전]** 버튼으로 품질을 바꿀 수 있고, 화면이 느려지면 자동으로 절전이 됩니다. 두 모드 모두에서 보기 좋게 만드세요.

## 2. 장면 구성 요령
- **크기:** 바닥은 원점 중심 7 × 7 이내, 높이 0 ~ 3. 카메라가 이 범위를 비추도록 맞춰져 있습니다.
- **기본 도형 조합:** `boxGeometry`, `cylinderGeometry`, `sphereGeometry`, `planeGeometry` 를 `<group>` 으로 묶어 가구/설비를 만듭니다.
- **그림자:** 물체에는 `castShadow`, 바닥에는 `receiveShadow`.
- **재질:** 디자인 킷 `MAT` 프리셋을 펼쳐 씁니다. `<meshStandardMaterial {...MAT.oak} />`, 유리는 `<meshPhysicalMaterial {...MAT.glass} />`, 표시등은 `{...MAT.glow(color, on)}`.
- **색:** `PALETTE` 의 차분한 색을 넓은 면에, 상태색(`ok` `warn` `alert`)은 데이터에만.
- **둥근 모서리:** `<RoundedBox args={[w, h, d]} radius={0.04} smoothness={4}>` (drei) 로 가구가 장난감처럼 보이지 않게.
- **반복 물체:** 마루 · 책 · 잎처럼 10개 이상이면 drei `<Instances>` + `<Instance position={...} />` (드로우 콜 1번).
- **외부 모델/텍스처 금지:** `useGLTF`, `useTexture` 는 전시 PC 에 파일이 없어 오류가 납니다.

## 3. 하드웨어 연동 패턴

### 3.1 SG90 각도 → 회전/이동 애니메이션
```tsx
const { angle } = useServo();
const ref = useRef<THREE.Group>(null);
useFrame((_, delta) => {
  if (ref.current) {
    ref.current.rotation.y = THREE.MathUtils.damp(ref.current.rotation.y, (angle / 180) * Math.PI, 6, delta);
  }
});
```

### 3.2 RGB LED → 발광 재질 + 조명
```tsx
const { color, on } = useRgb();
<meshStandardMaterial color={on ? color : '#94A3B8'} emissive={on ? color : '#000'} emissiveIntensity={on ? 1.5 : 0} />
{on && <pointLight color={color} intensity={1.2} distance={6} />}
```
천장 조명이 필요하면 플랫폼 부품 `<LightObject isModalOpen={isModalOpen} />` 를 그대로 써도 됩니다.

### 3.3 센서 값 → 크기 · 색 · 높이
```tsx
const level = useCustomValue('water_level', 50);       // 0~100
<mesh position={[0, level / 100, 0]} scale={[1, level / 50, 1]} />
const warmColor = new THREE.Color('#38BDF8').lerp(new THREE.Color('#EF4444'), (temp - 15) / 20);
```

### 3.4 클릭 → 확장 명령
```tsx
<mesh onClick={(e) => { e.stopPropagation(); sendCommand('feed', true); }}>
```

### 3.5 Html 배지 (모달 가림 방지 필수)
```tsx
{!isModalOpen && (
  <Html position={[0, 2, 0]} center distanceFactor={8} zIndexRange={[10, 0]}>
    <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 text-white text-xs whitespace-nowrap pointer-events-none">
      토양 수분 {soil.toFixed(1)}%
    </div>
  </Html>
)}
```

### 3.6 디자인 킷 예시
```tsx
import { MAT, PALETTE, DataPin, HoverLift, useSmoothValue, useCustomSensor } from '@/core/sdk';
import { DocentBot } from '@/components/3d/DocentBot';

const soil = useCustomSensor('soil_moisture');
const smooth = useSmoothValue(soil?.value);          // 끊기면 마지막 값 유지, 튀는 값은 부드럽게
useFrame(() => { water.current.scale.y = 0.2 + smooth.current / 100; });

<HoverLift position={[1, 0, 0]} onClick={() => sendCommand('water', true)}>
  <mesh castShadow><cylinderGeometry args={[0.3, 0.34, 0.5, 32]} /><meshStandardMaterial {...MAT.ceramic} /></mesh>
</HoverLift>
<DataPin position={[1, 0.6, 0]} label="토양 수분" sensor={soil} isModalOpen={isModalOpen} />
<DocentBot position={[-2, 0, 1.5]} rotationY={0.6} name="안내 로봇" isModalOpen={isModalOpen} />
```

### 3.7 마스코트 캐릭터 (걸어 다니는 생동감)
`import { CatButler, CowFarmer, FactoryBot, StudentChibi } from '@/components/3d/characters';`
- 치비 비례(큰 머리 · 큰 눈) 캐릭터 4종. 플랫폼 기본 공간에서 쓰는 것과 같은 부품입니다.
- `waypoints` 에 바닥 좌표 `[x, z]` 를 3~6개 주면 순서대로 천천히 걷고(0.35 m/s), 도착하면 2~5초 쉬며 카메라 쪽을 봅니다.
- 캐릭터는 가구를 피하지 않으므로, **점과 점 사이의 직선이 가구에서 0.4 m 이상 떨어지게** 경로를 잡으세요. 좁은 곳은 갔다가 같은 길로 돌아오게 점을 되풀이해 적습니다.
- 클릭하면 멈춰서 손 인사를 합니다. 음성 안내가 나오면 입모양 · 자막이 맞춰집니다.

```tsx
<StudentChibi
  waypoints={[[-1.5, 1.7], [1.5, 1.7], [1.6, -1.65], [-1.5, -1.7]]}
  name="독서실 학생"
  isModalOpen={isModalOpen}
/>
```

## 4. 성능 주의
- `useFrame` 안에서 `new THREE.Color()` · `new THREE.Vector3()` 를 매 프레임 만들지 마세요. (`useMemo` 또는 컴포넌트 밖 상수)
- 반복 오브젝트는 50개 이하로. 많이 필요하면 `[...Array(n)].map()` 으로 간단한 도형만 사용.
- `useFrame` 에서 `setState` 를 호출하지 마세요. (ref 로 직접 위치/회전 변경)
