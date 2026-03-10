import { notFound } from "next/navigation";
import { getGuest } from "@/lib/sheets";
import RsvpForm from "./RsvpForm";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitoPage({ params }: Props) {
  const { token } = await params;
  const guest = await getGuest(token);

  if (!guest) {
    notFound();
  }

  const hasResponded = guest.confermato !== "";

  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Decorative header */}
        <div className="text-center mb-10">
          <p className="text-sm tracking-[0.3em] uppercase text-stone-400 mb-3">
            Siete invitati al matrimonio di
          </p>
          <h1 className="font-serif text-4xl md:text-5xl text-stone-800 mb-2">
            Salvatore & Dia
          </h1>
          <div className="flex items-center justify-center gap-3 my-4">
            <div className="h-px w-16 bg-stone-300" />
            <span className="text-stone-400 text-lg">✦</span>
            <div className="h-px w-16 bg-stone-300" />
          </div>
          <p className="text-stone-500 text-sm tracking-wide">
            Sabato, 12 Luglio 2025
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8 md:p-10">
          {hasResponded ? (
            <AlreadyResponded guest={guest} />
          ) : (
            <>
              <div className="mb-8 text-center">
                <p className="text-stone-500 text-sm mb-1">Caro/a</p>
                <p className="font-serif text-2xl text-stone-800">
                  {guest.nome} {guest.cognome}
                </p>
              </div>
              <p className="text-stone-600 text-sm leading-relaxed text-center mb-8">
                Sarà un onore averti con noi in questo giorno speciale.
                <br />
                Ti chiediamo gentilmente di confermare la tua presenza.
              </p>
              <RsvpForm token={token} guestName={guest.nome} />
            </>
          )}
        </div>

        <p className="text-center text-stone-400 text-xs mt-8">
          Per informazioni scrivi a{" "}
          <a
            href="mailto:info@esempio.it"
            className="underline hover:text-stone-600 transition-colors"
          >
            info@esempio.it
          </a>
        </p>
      </div>
    </main>
  );
}

function AlreadyResponded({ guest }: { guest: Awaited<ReturnType<typeof getGuest>> }) {
  if (!guest) return null;
  const presente = guest.confermato === "si";

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
        Grazie, {guest.nome}!
      </h2>
      <p className="text-stone-500 text-sm mb-6">
        {presente
          ? "Non vediamo l'ora di festeggiare con te!"
          : "Ci mancherai tantissimo. Grazie per averci avvisato."}
      </p>
      <div className="bg-stone-50 rounded-xl p-4 text-left text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-stone-400">Presenza</span>
          <span
            className={`font-medium ${
              presente ? "text-green-600" : "text-stone-500"
            }`}
          >
            {presente ? "Confermata ✓" : "Non presente"}
          </span>
        </div>
        {guest.intolleranze && (
          <div className="flex justify-between">
            <span className="text-stone-400">Intolleranze</span>
            <span className="text-stone-700 text-right max-w-[60%]">
              {guest.intolleranze}
            </span>
          </div>
        )}
        {guest.dataRisposta && (
          <div className="flex justify-between">
            <span className="text-stone-400">Risposta inviata</span>
            <span className="text-stone-500">{guest.dataRisposta}</span>
          </div>
        )}
      </div>
    </div>
  );
}
