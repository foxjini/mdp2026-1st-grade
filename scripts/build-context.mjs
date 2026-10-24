#!/usr/bin/env node
/**
 * AI 마스터 컨텍스트 생성 (npm run context:build)
 *
 * context/CONTEXT_ROOM_PACKAGE_SPEC.md + context/examples/smart_farm/ 4개 파일을 합쳐
 *   - context/PLATFORM_FULL_CONTEXT.md
 *   - public/context_master.txt   (코드 업로드 창의 "AI 프롬프트 복사" · 매뉴얼 복사 버튼이 사용)
 * 를 만듭니다. 규격이나 예제를 고친 뒤 반드시 다시 실행하세요.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').trim();

const spec = read('context/CONTEXT_ROOM_PACKAGE_SPEC.md').replace(/^# .*\n/, '');
const ex = (name, lang) => `### 예제: \`${name}\`\n\`\`\`${lang}\n${read(`context/examples/smart_farm/${name}`)}\n\`\`\``;

const out = `# PLATFORM_FULL_CONTEXT: 3D IoT 전시 플랫폼 마스터 컨텍스트 (AI 바이브 코딩용)

> 이 파일은 \`npm run context:build\` 로 자동 생성됩니다. 직접 고치지 말고 \`context/CONTEXT_ROOM_PACKAGE_SPEC.md\` 와 \`context/examples/smart_farm/\` 을 고치세요.

## [플랫폼 컨텍스트]

당신은 고등학생 팀의 바이브 코딩을 돕는 **3D IoT 전시 플랫폼 전문 개발자**입니다.

- 플랫폼: Next.js 14 + React 18 + TypeScript + Three.js / React Three Fiber v8 + Drei v9 + Zustand + Tailwind
- 하드웨어: Raspberry Pi Pico 2 W (RP2350) + CircuitPython 9.x, 기본 장치 4종(DHT11 · Cds · SG90 · RGB LED) 중 팀이 골라 사용
- 전시 구조: **윈도우 PC 1대 + 모니터** 에 **공간(팀 주제)마다 Pico 2 W 1대**. Pico 마다 IP 가 다르고, 공간을 선택하면 그 Pico 로 자동 연결됩니다.
- 팀 작업 흐름: 왼쪽 사이드바 **'새 공간 추가'** (사용 기본 장치 · Pico IP 입력) → 이 컨텍스트로 AI에게 **4개 파일** 요청 → 공간 메뉴(⋮) **'코드 업로드'** → 빌드 없이 즉시 3D 화면에 적용
- 플랫폼 원본(\`src/\`, \`firmware/\`)은 **절대 수정하지 않습니다.** 답변은 \`room.json\`, \`Scene.tsx\`, \`mock.js\`, \`code.py\` 4개 파일의 **완성된 전체 코드**만 각각 코드 블록으로 제공합니다.
- 아래 규격에 없는 API · 모듈 · 함수를 지어내지 마세요(환각 금지). 모르면 규격 안에서 가장 단순한 방법을 사용하세요.

${spec}

---

## 9. 완성 예제: 스마트 팜 온실 (4개 파일 전체, 실제 동작 검증됨)

${ex('room.json', 'json')}

${ex('Scene.tsx', 'tsx')}

${ex('mock.js', 'js')}

${ex('code.py', 'python')}
`;

fs.writeFileSync(path.join(ROOT, 'context/PLATFORM_FULL_CONTEXT.md'), out, 'utf8');
fs.writeFileSync(path.join(ROOT, 'public/context_master.txt'), out, 'utf8');
console.log(`context/PLATFORM_FULL_CONTEXT.md, public/context_master.txt 생성 완료 (${out.length.toLocaleString()}자)`);
