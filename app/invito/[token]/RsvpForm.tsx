"use client";

import { useState } from "react";

type TipoPersona = "adulto" | "bambino" | "neonato";
type MenuPersona = "pesce" | "carne" | "speciale" | "nessuno";
type EsigenzeAlimentari = "celiachia" | "altro" | "";

interface Persona {
  nome: string;
  tipo: TipoPersona | "";
  menu: MenuPersona | "";
  esigenze: EsigenzeAlimentari;
  esigenzeAltro: string;
}

interface Props {
  token: string;
  guestName: string;
}

type Step = "choice" | "details" | "recap" | "submitted";

function newPersona(): Persona {
  return { nome: "", tipo: "", menu: "pesce", esigenze: "", esigenzeAltro: "" };
}

const TIPO_LABELS: Record<TipoPersona, string> = {
  adulto: "Adulto",
  bambino: "Bambino",
  neonato: "Bimbo 0-2 anni",
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
        if (fields.tipo === "neonato") {
          updated.menu = "";
          updated.esigenze = "";
          updated.esigenzeAltro = "";
        } else if (
          fields.tipo === "adulto" ||
          fields.tipo === "bambino"
        ) {
          // coming from neonato: restore pesce default
          if (p.tipo === "neonato") updated.menu = "pesce";
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
      if (!p.menu) errors.push(`Persona ${n}: seleziona un'opzione menu`);
      if (p.esigenze === "altro" && !p.esigenzeAltro.trim())
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
                menu: p.menu || null,
                esigenze: p.esigenze || null,
                esigenzeAltro:
                  p.esigenze === "altro" ? p.esigenzeAltro.trim() : undefined,
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

  function recapMenuLabel(p: Persona): string {
    if (p.tipo === "neonato") {
      return p.menu === "speciale" ? "Menù speciale bambino" : "Nessun menu";
    }
    const menuLabel =
      p.menu === "pesce"
        ? "Menu pesce"
        : p.menu === "carne"
        ? "Menu carne"
        : "";
    const esigenzeLabel =
      p.esigenze === "celiachia"
        ? "Celiachia"
        : p.esigenze === "altro"
        ? `Altro: ${p.esigenzeAltro}`
        : "";
    return [menuLabel, esigenzeLabel].filter(Boolean).join(" · ");
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
                const tipoLabel = p.tipo
                  ? TIPO_LABELS[p.tipo as TipoPersona]
                  : "";
                const menuLabel = recapMenuLabel(p);

                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 bg-stone-50 rounded-xl px-4 py-3"
                  >
                    <span className="text-green-500 mt-0.5 flex-shrink-0">
                      ✓
                    </span>
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
                <p className="mt-1 italic text-stone-400">
                  &ldquo;{note}&rdquo;
                </p>
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
            className="w-full py-3 rounded-xl border-2 border-stone-800 text-stone-800 text-sm font-semibold hover:bg-stone-800 hover:text-white transition-all duration-200 flex items-center justify-center gap-2"
          >
            <span className="text-base leading-none">+</span> Aggiungi persona
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

// ── PersonaCard ─────────────────────────────────────────────

function PillButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        selected
          ? "bg-stone-800 text-white"
          : "bg-white border border-stone-200 text-stone-600 hover:border-stone-400"
      }`}
    >
      {children}
    </button>
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

  return (
    <div className="bg-stone-50 rounded-2xl p-5 space-y-4">
      {/* Header */}
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

      {/* Nome */}
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

      {/* Fascia d'età */}
      <div>
        <label className="block text-xs font-medium text-stone-500 mb-2">
          Fascia d&apos;età
        </label>
        <div className="flex flex-wrap gap-2">
          {tipoOptions.map((opt) => (
            <PillButton
              key={opt.value}
              selected={persona.tipo === opt.value}
              onClick={() => onChange({ tipo: opt.value })}
            >
              {opt.label}
            </PillButton>
          ))}
        </div>
      </div>

      {/* Adulto / Bambino */}
      {persona.tipo && persona.tipo !== "neonato" && (
        <>
          {/* Tipo menu */}
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-2">
              Tipo menu
            </label>
            <div className="flex flex-wrap gap-2">
              <PillButton
                selected={persona.menu === "pesce"}
                onClick={() => onChange({ menu: "pesce" })}
              >
                Menu pesce
              </PillButton>
              <PillButton
                selected={persona.menu === "carne"}
                onClick={() => onChange({ menu: "carne" })}
              >
                Menu carne
              </PillButton>
            </div>
          </div>

          {/* Esigenze alimentari */}
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-2">
              Esigenze alimentari{" "}
              <span className="text-stone-400 font-normal">(facoltativo)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <PillButton
                selected={persona.esigenze === "celiachia"}
                onClick={() =>
                  onChange({
                    esigenze:
                      persona.esigenze === "celiachia" ? "" : "celiachia",
                  })
                }
              >
                Celiachia
              </PillButton>
              <PillButton
                selected={persona.esigenze === "altro"}
                onClick={() =>
                  onChange({
                    esigenze: persona.esigenze === "altro" ? "" : "altro",
                    esigenzeAltro:
                      persona.esigenze === "altro" ? "" : persona.esigenzeAltro,
                  })
                }
              >
                Altro
              </PillButton>
            </div>
            {persona.esigenze === "altro" && (
              <input
                type="text"
                value={persona.esigenzeAltro}
                onChange={(e) => onChange({ esigenzeAltro: e.target.value })}
                placeholder="Specifica l'esigenza alimentare..."
                className="mt-2 w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-100 text-sm text-stone-700 transition-colors"
              />
            )}
          </div>
        </>
      )}

      {/* Neonato */}
      {persona.tipo === "neonato" && (
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-2">
            Menu
          </label>
          <div className="flex flex-wrap gap-2">
            <PillButton
              selected={persona.menu === "speciale"}
              onClick={() => onChange({ menu: "speciale" })}
            >
              Menù speciale bambino
            </PillButton>
            <PillButton
              selected={persona.menu === "nessuno"}
              onClick={() => onChange({ menu: "nessuno" })}
            >
              Nessun menu
            </PillButton>
          </div>
          <p className="text-xs text-stone-400 mt-2">
            Verrà predisposto il seggiolone.
          </p>
        </div>
      )}
    </div>
  );
}
