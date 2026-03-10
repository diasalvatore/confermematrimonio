import { NextRequest, NextResponse } from "next/server";
import { createGuest, getAllGuests, deleteGuest } from "@/lib/sheets";

function isAuthorized(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;

  const authHeader = request.headers.get("x-admin-password");
  return authHeader === adminPassword;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const guests = await getAllGuests();
    return NextResponse.json({ guests });
  } catch (error) {
    console.error("GET guests error:", error);
    return NextResponse.json(
      { error: "Errore nel recupero degli ospiti" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { invitato } = body;

    if (!invitato) {
      return NextResponse.json(
        { error: "il campo invitato è obbligatorio" },
        { status: 400 }
      );
    }

    const guest = await createGuest(invitato.trim());
    return NextResponse.json({ guest }, { status: 201 });
  } catch (error) {
    console.error("POST guest error:", error);
    return NextResponse.json(
      { error: "Errore nella creazione dell'ospite" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "token obbligatorio" }, { status: 400 });
    }

    const success = await deleteGuest(token);
    if (!success) {
      return NextResponse.json({ error: "Ospite non trovato" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE guest error:", error);
    return NextResponse.json(
      { error: "Errore nell'eliminazione dell'ospite" },
      { status: 500 }
    );
  }
}
