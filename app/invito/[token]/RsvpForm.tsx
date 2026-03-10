"use client";

import { useState } from "react";

interface Props {
  token: string;
  guestName: string;
}

type Step = "choice" | "details" | "submitted";

export default function RsvpForm({ token, guestName }: Props) {
  const [step, setStep] = useState<Step>("choice");
  const [confermato, setConfermato] = useState<"si" | "no" | null>(null);
  const [intolleranze, setIntolleranze] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!confermato) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, confermato, intolleranze, note }),
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

  if (step === "submitted") {
    const presente = confermato === "si";
    return (
      <div className="text-center py-4 animate-in fade-in duration-500">
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
            ? "Non vediamo l'ora di festeggiare con te!"
            : "Ci mancherai tantissimo. Grazie per averci avvisato."}
        </p>
      </div>
    );
  }

  if (step === "choice") {
    return (
      <div className="space-y-4">
        <p className="text-center text-stone-600 text-sm font-medium mb-6">
          Parteciperai al matrimonio?
        </p>
        <button
          onClick={() => {
            setConfermato("si");
            setStep("details");
          }}
          className="w-full py-4 rounded-xl border-2 border-stone-200 hover:border-stone-800 hover:bg-stone-800 hover:text-white text-stone-700 font-medium transition-all duration-200 flex items-center justify-center gap-2"
        >
          <span>✓</span> Sì, ci sarò!
        </button>
        <button
          onClick={() => {
            setConfermato("no");
            setStep("details");
          }}
          className="w-full py-4 rounded-xl border-2 border-stone-200 hover:border-stone-400 text-stone-500 font-medium transition-all duration-200 flex items-center justify-center gap-2"
        >
          <span>✗</span> Purtroppo non posso
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {confermato === "si" && (
        <>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">
              Hai intolleranze o allergie alimentari?
            </label>
            <textarea
              value={intolleranze}
              onChange={(e) => setIntolleranze(e.target.value)}
              placeholder="Es: intolleranza al glutine, allergia alle noci..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-100 text-stone-700 text-sm placeholder-stone-300 resize-none transition-colors"
            />
            <p className="text-xs text-stone-400 mt-1">
              Lascia vuoto se non hai intolleranze
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">
              Vuoi aggiungere un messaggio?{" "}
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

      {error && (
        <p className="text-red-500 text-sm text-center bg-red-50 py-2 px-3 rounded-lg">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={() => setStep("choice")}
          className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-500 text-sm font-medium hover:bg-stone-50 transition-colors"
        >
          Indietro
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-[2] py-3 rounded-xl bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Invio in corso..." : "Conferma risposta"}
        </button>
      </div>
    </div>
  );
}
