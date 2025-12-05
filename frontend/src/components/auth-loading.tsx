'use client';

import { Shield } from 'lucide-react';

export function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-government-blue/10 via-white to-government-saffron/10">
      <div className="text-center space-y-4">
        <div className="h-16 w-16 bg-government-blue rounded-full flex items-center justify-center mx-auto animate-pulse">
          <Shield className="h-8 w-8 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-government-navy dark:text-white">
            HealthLink Pro
          </h2>
          <p className="text-government-navy/70 dark:text-neutral-300">
            Loading your secure health portal...
          </p>
        </div>
      </div>
    </div>
  );
}
