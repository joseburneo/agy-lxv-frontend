import { NextResponse } from "next/server";

export async function POST() {
  // Ahora nos saltaremos el localhost por defecto y apuntaremos directamente a tu servidor en Render
  // para que tú no tengas que mantener la terminal de Python abierta nunca más.
  const backendUrl = "https://agency-os-api.onrender.com";
  const targetUrl = `${backendUrl}/api/sync-intelligence`;

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!res.ok) {
      throw new Error(`Backend returned ${res.status}`);
    }
    
    return NextResponse.json({ success: true, message: "Sync triggered perfectly" });
  } catch (error) {
    console.error("Error triggering sync:", error);
    return NextResponse.json({ success: false, error: "Failed to connect to backend" }, { status: 500 });
  }
}
