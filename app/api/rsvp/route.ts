import { NextRequest, NextResponse } from "next/server";
import { getGuest, saveRsvp, type PersonaRow } from "@/lib/sheets";

type TipoPersona = "adulto" | "bambino" | "neonato";
type MenuPersona = "carne" | "pesce" | "celiachia" | "altro";

interface PersonaInput {
  nome: string;
  tipo: TipoPersona;
  menu: MenuPersona | null;
  menuAltro?: string;
}

function toPersonaRow(p: PersonaInput): PersonaRow {
  const tipoLabel =
    p.tipo === "neonato" ? "bimbo 0-2 anni" : p.tipo;

  if (p.tipo === "neonato") {
    return { nome: p.nome, tipo: tipoLabel, menu: "seggiolone" };
  }

  const menuLabel =
    p.menu === "carne"
      ? "menu carne"
      : p.menu === "pesce"
      ? "menu pesce"
      : p.menu === "celiachia"
      ? "celiachia"
      : p.menu === "altro"
      ? `altro: ${p.menuAltro || ""}`.trim()
      : "";

  return { nome: p.nome, tipo: tipoLabel, menu: menuLabel };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, confermato, persone, note } = body;

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

    let personeRows: PersonaRow[] = [];

    if (confermato === "si") {
      if (!Array.isArray(persone) || persone.length === 0) {
        return NextResponse.json(
          { error: "Inserisci almeno una persona" },
          { status: 400 }
        );
      }
      personeRows = (persone as PersonaInput[]).map(toPersonaRow);
    }

    const success = await saveRsvp(
      token,
      confermato,
      personeRows,
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
