// 팀 Scene.tsx 실행 중 컴파일러: TSX → CommonJS(sucrase) → 허용된 모듈만 주입하여 실행
import type React from 'react';
import { transform } from 'sucrase';
import * as ReactModule from 'react';
import * as JsxRuntime from 'react/jsx-runtime';
import * as THREE from 'three';
import * as Fiber from '@react-three/fiber';
import * as Drei from '@react-three/drei';
import * as StoreModule from '@/core/store/useIoTStore';
import * as Sdk from '@/core/sdk';
import * as LightObjectModule from '@/components/3d/LightObject';
import * as CdsSensorNodeModule from '@/components/3d/CdsSensorNode';
import * as DoorObjectModule from '@/components/3d/DoorObject';
import * as DhtSensorBadgeModule from '@/components/3d/DhtSensorBadge';

// sucrase 의 interop 헬퍼가 그대로 쓰도록 ES 모듈 형태로 감쌉니다.
function esm(mod: object): object {
  const m = mod as Record<string, unknown>;
  return { ...m, default: 'default' in m ? m.default : m, __esModule: true };
}

// Scene.tsx 에서 import 할 수 있는 모듈 목록 (그 외 모듈은 오류)
export const ALLOWED_MODULES: Record<string, object> = {
  react: esm(ReactModule),
  'react/jsx-runtime': esm(JsxRuntime),
  three: esm(THREE),
  '@react-three/fiber': esm(Fiber),
  '@react-three/drei': esm(Drei),
  '@/core/store/useIoTStore': esm(StoreModule),
  '@/core/sdk': esm(Sdk),
  '@/components/3d/LightObject': esm(LightObjectModule),
  '@/components/3d/CdsSensorNode': esm(CdsSensorNodeModule),
  '@/components/3d/DoorObject': esm(DoorObjectModule),
  '@/components/3d/DhtSensorBadge': esm(DhtSensorBadgeModule),
};

// 상대 경로 import 를 허용 목록으로 연결 (예: './LightObject' → '@/components/3d/LightObject')
function resolveModule(name: string): string {
  if (ALLOWED_MODULES[name]) return name;
  const base = name.split('/').pop() || name;
  const alias = `@/components/3d/${base}`;
  if ((name.startsWith('./') || name.startsWith('../')) && ALLOWED_MODULES[alias]) return alias;
  return name;
}

export interface SceneProps {
  isModalOpen?: boolean;
}

export type CompileResult =
  | { ok: true; Component: React.ComponentType<SceneProps>; exportName: string }
  | { ok: false; error: string };

export function compileScene(source: string): CompileResult {
  let code: string;
  try {
    code = transform(source, {
      transforms: ['typescript', 'jsx', 'imports'],
      jsxRuntime: 'automatic',
      production: true,
      filePath: 'Scene.tsx',
    }).code;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `문법 오류 (Scene.tsx): ${msg}` };
  }

  const missing: string[] = [];
  const requireFn = (name: string) => {
    const mod = ALLOWED_MODULES[resolveModule(name)];
    if (!mod) {
      missing.push(name);
      throw new Error(`"${name}" 모듈은 사용할 수 없습니다. 허용 모듈: ${Object.keys(ALLOWED_MODULES).join(', ')}`);
    }
    return mod;
  };

  const module: { exports: Record<string, unknown> } = { exports: {} };
  try {
    // eslint-disable-next-line no-new-func
    new Function('require', 'module', 'exports', code)(requireFn, module, module.exports);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: missing.length ? msg : `실행 오류 (Scene.tsx 최상위 코드): ${msg}` };
  }

  // export default 우선, 없으면 이름이 Room/Scene 으로 끝나는 export, 그다음 첫 번째 함수 export
  const exp = module.exports;
  const fnEntries = Object.entries(exp).filter(([, v]) => typeof v === 'function');
  const picked =
    (typeof exp.default === 'function' ? (['default', exp.default] as [string, unknown]) : undefined) ||
    fnEntries.find(([k]) => /(Room|Scene)$/.test(k)) ||
    fnEntries[0];

  if (!picked) {
    return { ok: false, error: 'Scene.tsx에 화면 컴포넌트가 없습니다. `export default function Scene() { ... }` 형태로 작성하세요.' };
  }
  return { ok: true, Component: picked[1] as React.ComponentType<SceneProps>, exportName: picked[0] };
}
