"use client";

import { useState } from "react";

type TipoPersona = "adulto" | "bambino" | "neonato";
type MenuPersona = "carne" | "pesce" | "celiachia" | "altro";

interface Persona {
  nome: string;
  tipo: TipoPersona | "";
  menu: MenuPersona | "";
  menuAltro: string;
}

interface Props {
  token: string;
  guestName: string;
}

type Step = "choice" | "details" | "recap" | "submitted";

function newPersona(): Persona {
  return { nome: "", tipo: "", menu: "", menuAltro: "" };
}

const TIPO_LABELS: Record<TipoPersona, string> = {
  adulto: "Adulto",
  bambino: "Bambino",
  neonato: "Bimbo 0-2 anni",
};

const MENU_LABELS: Record<MenuPersona, string> = {
  carne: "Menu carne",
  pesce: "Menu pesce",
  celiachia: "Celiachia",
  altro: "Altro",
};

export default function RsvpForm({ token, guestName }: Props) {
  const [step, setStep] = useState<Step>("choice");
  const [confermato, setConfermato] = useState<"si" | "no" | null>(null);
  const [persone, setPersone] = useState<Persona[]>([newPersona()]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  function updatePersona(index: number, fields: Partial<Persona>) {
    setPersone((prev) =>
      prev.map((p, i) => {
        if (i !== index) return p;
        const updated = { ...p, ...fields };
        // reset menu when switching to/from neonato
        if (fields.tipo === "neonato") {
          updated.menu = "";
          updated.menuAltro = "";
        }
        return updated;
      })
    );
  }

  function addPersona() {
    setPersone((prev) => [...prev, newPersona()]);
  }

  function removePersona(index: number) {
    if (persone.length <= 1) return;
    setPersone((prev) => prev.filter((_, i) => i !== index));
  }

  function validate(): boolean {
    const errors: string[] = [];
    persone.forEach((p, i) => {
      const n = i + 1;
      if (!p.nome.trim()) errors.push(`Persona ${n}: inserisci il nome`);
      if (!p.tipo) errors.push(`Persona ${n}: seleziona la fascia d'età`);
      if (p.tipo !== "neonato" && !p.menu)
        errors.push(`Persona ${n}: seleziona un'opzione menu`);
      if (p.menu === "altro" && !p.menuAltro.trim())
        errors.push(`Persona ${n}: specifica l'esigenza alimentare`);
    });
    setValidationErrors(errors);
    return errors.length === 0;
  }

  function handleGoToRecap() {
    if (confermato === "si" && !validate()) return;
    setStep("recap");
  }

  async function handleSubmit() {
    if (!confermato) return;
    setLoading(true);
    setError("");

    try {
      const payload =
        confermato === "si"
          ? {
              token,
              confermato,
              persone: persone.map((p) => ({
                nome: p.nome.trim(),
                tipo: p.tipo,
                menu: p.tipo === "neonato" ? null : p.menu || null,
                menuAltro:
                  p.menu === "altro" ? p.menuAltro.trim() : undefined,
              })),
              note,
            }
          : { token, confermato, persone: [], note };

      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Errore durante l'invio");
        setLoading(false);
        return;
      }

      setStep("submitted");
    } catch {
      setError("Errore di connessione. Riprova.");
      setLoading(false);
    }
  }

  // ── Submitted ──────────────────────────────────────────────
  if (step === "submitted") {
    const presente = confermato === "si";
    return (
      <div className="text-center py-4">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${
            presente ? "bg-green-50" : "bg-stone-100"
          }`}
        >
          <span className="text-3xl">{presente ? "🎉" : "💌"}</span>
        </div>
        <h2 className="font-serif text-2xl text-stone-800 mb-2">
          Grazie, {guestName}!
        </h2>
        <p className="text-stone-500 text-sm">
          {presente
            ? "Non vediamo l'ora di festeggiare con voi!"
            : "Ci mancherete tantissimo. Grazie per averci avvisato."}
        </p>
      </div>
    );
  }

  // ── Recap ───────────────────────────────────────────────────
  if (step === "recap") {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">
            Riepilogo
          </p>

          {confermato === "si" && (
            <div className="space-y-2 mb-4">
              {persone.map((p, i) => {
                const tipoLabel = p.tipo ? TIPO_LABELS[p.tipo as TipoPersona] : "";
                const menuLabel =
                  p.tipo === "neonato"
                    ? "Seggiolone"
                    : p.menu
                    ? p.menu === "altro"
                      ? `Altro: ${p.menuAltro}`
                      : MENU_LABELS[p.menu as MenuPersona]
                    : "";

                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 bg-stone-50 rounded-xl px-4 py-3"
                  >
                    <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-800">
                        {p.nome}
                      </p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {tipoLabel}
                        {menuLabel ? ` · ${menuLabel}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {note && (
            <div className="bg-stone-50 rounded-xl px-4 py-3 text-sm text-stone-600 italic">
              &ldquo;{note}&rdquo;
            </div>
          )}

          {confermato === "no" && (
            <div className="bg-stone-50 rounded-xl px-4 py-3 text-sm text-stone-500">
              Hai indicato che non parteciperete.
              {note && (
                <p className="mt-1 italic text-stone-400">&ldquo;{note}&rdquo;</p>
              )}
            </div>
          )}
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center bg-red-50 py-2 px-3 rounded-lg">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={() => setStep("details")}
            className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-500 text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            Modifica
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-[2] py-3 rounded-xl bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Invio in corso..." : "Conferma e invia"}
          </button>
        </div>
      </div>
    );
  }

  // ── Choice ──────────────────────────────────────────────────
  if (step === "choice") {
    return (
      <div className="space-y-4">
        <p className="text-center text-stone-600 text-sm font-medium mb-6">
          Parteciperete al matrimonio?
        </p>
        <button
          onClick={() => {
            setConfermato("si");
            setStep("details");
          }}
          className="w-full py-4 rounded-xl border-2 border-stone-200 hover:border-stone-800 hover:bg-stone-800 hover:text-white text-stone-700 font-medium transition-all duration-200 flex items-center justify-center gap-2"
        >
          <span>✓</span> Sì, ci saremo!
        </button>
        <button
          onClick={() => {
            setConfermato("no");
            setStep("details");
          }}
          className="w-full py-4 rounded-xl border-2 border-stone-200 hover:border-stone-400 text-stone-500 font-medium transition-all duration-200 flex items-center justify-center gap-2"
        >
          <span>✗</span> Purtroppo non possiamo
        </button>
      </div>
    );
  }

  // ── Details ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {confermato === "si" && (
        <>
          <div className="space-y-4">
            {persone.map((persona, index) => (
              <PersonaCard
                key={index}
                index={index}
                persona={persona}
                canRemove={persone.length > 1}
                onChange={(fields) => updatePersona(index, fields)}
                onRemove={() => removePersona(index)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={addPersona}
            className="w-full py-2.5 rounded-xl border-2 border-dashed border-stone-200 text-stone-400 text-sm hover:border-stone-400 hover:text-stone-600 transition-colors"
          >
            + Aggiungi persona
          </button>

          {validationErrors.length > 0 && (
            <div className="bg-red-50 rounded-xl p-3 space-y-1">
              {validationErrors.map((e, i) => (
                <p key={i} className="text-red-500 text-xs">
                  {e}
                </p>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">
              Un messaggio per gli sposi{" "}
              <span className="text-stone-400 font-normal">(facoltativo)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Un pensiero per gli sposi..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-100 text-stone-700 text-sm placeholder-stone-300 resize-none transition-colors"
            />
          </div>
        </>
      )}

      {confermato === "no" && (
        <div>
          <label className="block text-sm font-medium text-stone-600 mb-2">
            Vuoi lasciare un messaggio?{" "}
            <span className="text-stone-400 font-normal">(facoltativo)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Un pensiero per gli sposi..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-100 text-stone-700 text-sm placeholder-stone-300 resize-none transition-colors"
          />
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={() => setStep("choice")}
          className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-500 text-sm font-medium hover:bg-stone-50 transition-colors"
        >
          Indietro
        </button>
        <button
          onClick={handleGoToRecap}
          className="flex-[2] py-3 rounded-xl bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors"
        >
          Continua
        </button>
      </div>
    </div>
  );
}

function PersonaCard({
  index,
  persona,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  persona: Persona;
  canRemove: boolean;
  onChange: (fields: Partial<Persona>) => void;
  onRemove: () => void;
}) {
  const tipoOptions: { value: TipoPersona; label: string }[] = [
    { value: "adulto", label: "Adulto" },
    { value: "bambino", label: "Bambino" },
    { value: "neonato", label: "Bimbo 0-2 anni" },
  ];

  const menuOptions: { value: MenuPersona; label: string }[] = [
    { value: "carne", label: "Menu carne" },
    { value: "pesce", label: "Menu pesce" },
    { value: "celiachia", label: "Celiachia" },
    { value: "altro", label: "Altro" },
  ];

  return (
    <div className="bg-stone-50 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
          Persona {index + 1}
        </p>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-stone-300 hover:text-rose-400 transition-colors text-lg leading-none"
            aria-label="Rimuovi"
          >
            ×
          </button>
        )}
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-stone-500 mb-1.5">
          Nome e cognome
        </label>
        <input
          type="text"
          value={persona.nome}
          onChange={(e) => onChange({ nome: e.target.value })}
          placeholder="Es: Mario Rossi"
          className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-100 text-sm text-stone-700 transition-colors"
        />
      </div>

      {/* Type */}
      <div>
        <label className="block text-xs font-medium text-stone-500 mb-2">
          Fascia d&apos;età
        </label>
        <div className="flex flex-wrap gap-2">
          {tipoOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ tipo: opt.value })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                persona.tipo === opt.value
                  ? "bg-stone-800 text-white"
                  : "bg-white border border-stone-200 text-stone-600 hover:border-stone-400"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Menu (hidden for neonato) */}
      {persona.tipo && persona.tipo !== "neonato" && (
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-2">
            Opzione menu
          </label>
          <div className="flex flex-wrap gap-2">
            {menuOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ menu: opt.value })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  persona.menu === opt.value
                    ? "bg-stone-800 text-white"
                    : "bg-white border border-stone-200 text-stone-600 hover:border-stone-400"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {persona.menu === "altro" && (
            <input
              type="text"
              value={persona.menuAltro}
              onChange={(e) => onChange({ menuAltro: e.target.value })}
              placeholder="Specifica l'esigenza alimentare..."
              className="mt-2 w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-100 text-sm text-stone-700 transition-colors"
            />
          )}
        </div>
      )}

      {/* Neonato info */}
      {persona.tipo === "neonato" && (
        <p className="text-xs text-stone-400 bg-white rounded-lg px-3 py-2 border border-stone-100">
          Verrà predisposto solo il seggiolone, nessun menu necessario.
        </p>
      )}
    </div>
  );
}
