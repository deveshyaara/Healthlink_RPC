// This file tests if the frontend can reach the backend
// Import this in your auth-context to debug

export async function testBackendConnectivity() {
  console.log("[TEST] Starting backend connectivity test...");
  
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    console.log(`[TEST] Using API URL: ${API_URL}`);
    
    // Test 1: Simple health check (no CORS issues expected)
    console.log("[TEST] Making health check request...");
    const healthResponse = await fetch(`${API_URL}/api/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    console.log(`[TEST] Health check response status: ${healthResponse.status}`);
    const healthData = await healthResponse.json();
    console.log(`[TEST] Health check response data:`, healthData);
    
    if (healthResponse.ok) {
      console.log("[SUCCESS] Backend is reachable!");
      return { success: true, message: "Backend is reachable" };
    } else {
      console.error("[ERROR] Backend returned non-200 status:", healthResponse.status);
      return { 
        success: false, 
        message: `Backend returned HTTP ${healthResponse.status}` 
      };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[ERROR] Backend connectivity test failed:", errorMsg);
    console.error("[ERROR] Full error:", error);
    
    return { 
      success: false, 
      message: `Failed to connect to backend: ${errorMsg}`,
      error 
    };
  }
}
