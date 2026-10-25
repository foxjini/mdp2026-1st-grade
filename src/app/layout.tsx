import type { Metadata } from 'next';
import './globals.css';
import { IoTProvider } from '@/components/IoTProvider';

export const metadata: Metadata = {
  title: '인천전자마이스터고 3D IoT 전시 플랫폼',
  description: '고등학교 팀 프로젝트용 CircuitPython 기반 3D IoT 플랫폼 & 바이브 코딩 가이드',
  icons: { icon: '/school-logo.png' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-blue-600 selection:text-white">
        <IoTProvider>{children}</IoTProvider>
      </body>
    </html>
  );
}
