# CONTEXT_3D_SCENE_GUIDE: 팀 Scene.tsx 3D 공간 만들기 가이드

> 규칙의 기준은 `CONTEXT_ROOM_PACKAGE_SPEC.md` 3장입니다. 이 문서는 보기 좋은 3D 장면을 만드는 요령입니다.

## 1. 플랫폼이 이미 만들어 둔 것 (Scene.tsx 에서 만들지 않음)
```tsx
<Canvas shadows camera={{ position: [6.8, 5.2, 7.2], fov: 38 }}>
  <hemisphereLight />               {/* RGB LED 색에 따라 은은하게 물듦 */}
  <ambientLight />                  {/* Cds 조도 값에 따라 밝기 변화 */}
  <directionalLight castShadow />   {/* 그림자 범위: -6 ~ 6 */}
  <Scene isModalOpen={...} />       {/* ← 팀 Scene.tsx 가 여기에 들어감 */}
  <CameraRig />                     {/* OrbitControls + 조감도 전환 */}
</Canvas>
```

## 2. 장면 구성 요령
- **크기:** 바닥은 원점 중심 7 × 7 이내, 높이 0 ~ 3. 카메라가 이 범위를 비추도록 맞춰져 있습니다.
- **기본 도형 조합:** `boxGeometry`, `cylinderGeometry`, `sphereGeometry`, `planeGeometry` 를 `<group>` 으로 묶어 가구/설비를 만듭니다.
- **그림자:** 물체에는 `castShadow`, 바닥에는 `receiveShadow`.
- **재질:** `meshStandardMaterial` 의 `color`, `roughness`, `metalness`, `transparent + opacity`(유리), `emissive`(발광).
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

## 4. 성능 주의
- `useFrame` 안에서 `new THREE.Color()` · `new THREE.Vector3()` 를 매 프레임 만들지 마세요. (`useMemo` 또는 컴포넌트 밖 상수)
- 반복 오브젝트는 50개 이하로. 많이 필요하면 `[...Array(n)].map()` 으로 간단한 도형만 사용.
- `useFrame` 에서 `setState` 를 호출하지 마세요. (ref 로 직접 위치/회전 변경)
