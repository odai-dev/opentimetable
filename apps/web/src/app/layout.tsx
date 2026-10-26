import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'OpenTimetable — Intelligent School & University Timetable Studio',
  description: 'Enterprise open-source timetable scheduling platform with near-instant WASM solver and pluggable university portal integration.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
