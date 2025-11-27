"use client";

import { GovernmentNavbar } from '@/components/government-navbar';
import { GovernmentFooter } from '@/components/government-footer';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <GovernmentNavbar />
      <div className="flex-1">{children}</div>
      <GovernmentFooter />
    </div>
  );
}
