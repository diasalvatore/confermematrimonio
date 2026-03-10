import { NextRequest, NextResponse } from "next/server";
import { getGuest, saveRsvp } from "@/lib/sheets";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, confermato, partecipanti, intolleranze, note } = body;

    if (!token || !confermato) {
      return NextResponse.json(
        { error: "token e confermato sono obbligatori" },
        { status: 400 }
      );
    }

    if (confermato !== "si" && confermato !== "no") {
      return NextResponse.json(
        { error: "confermato deve essere 'si' o 'no'" },
        { status: 400 }
      );
    }

    const guest = await getGuest(token);
    if (!guest) {
      return NextResponse.json(
        { error: "Invito non trovato" },
        { status: 404 }
      );
    }

    const numPartecipanti =
      confermato === "si" ? Math.max(1, parseInt(partecipanti) || 1) : 0;

    const success = await saveRsvp(
      token,
      confermato,
      numPartecipanti,
      intolleranze || "",
      note || ""
    );

    if (!success) {
      return NextResponse.json(
        { error: "Errore nel salvataggio" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("RSVP error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
