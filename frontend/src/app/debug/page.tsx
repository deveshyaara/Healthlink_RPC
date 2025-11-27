"use client";

import { useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/env-utils";

export default function DebugPage() {
  const [status, setStatus] = useState<{
    backendReachable: boolean;
    apiUrl: string;
    error?: string;
    response?: unknown;
  } | null>(null);

  useEffect(() => {
    const testBackend = async () => {
      try {
        const apiUrl = getApiBaseUrl();
        const response = await fetch(`${apiUrl}/api/health`);
        const data = await response.json();

        setStatus({
          backendReachable: true,
          apiUrl,
          response: data,
        });
      } catch (error) {
        setStatus({
          backendReachable: false,
          apiUrl: getApiBaseUrl(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    testBackend();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-6">Debug: Backend Connectivity</h1>

        {status ? (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="font-semibold">API URL:</p>
              <p className="font-mono text-sm">{status.apiUrl}</p>
            </div>

            {status.backendReachable ? (
              <>
                <div className="p-4 bg-green-50 border border-green-200 rounded">
                  <p className="font-semibold text-green-700">✓ Backend is reachable!</p>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded">
                  <p className="font-semibold">Health Check Response:</p>
                  <pre className="font-mono text-sm mt-2">
                    {JSON.stringify(status.response, null, 2)}
                  </pre>
                </div>
              </>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <p className="font-semibold text-red-700">✗ Backend is NOT reachable!</p>
                <p className="text-red-600 mt-2">Error: {status.error}</p>
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                  <p className="font-semibold text-yellow-800">Troubleshooting:</p>
                  <ul className="list-disc list-inside mt-2 text-yellow-700">
                    <li>Make sure backend is running: <code className="bg-yellow-100 px-2 py-1">./start.sh</code></li>
                    <li>Verify backend is on port 4000: <code className="bg-yellow-100 px-2 py-1">curl http://localhost:4000/api/health</code></li>
                    <li>Check CORS configuration on backend</li>
                    <li>Verify frontend is on port 9002</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Checking backend connectivity...</p>
        )}
      </div>
    </div>
  );
}
