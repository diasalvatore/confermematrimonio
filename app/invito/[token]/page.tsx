import { notFound } from "next/navigation";
import { getGuest, getSettings } from "@/lib/sheets";
import RsvpForm from "./RsvpForm";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitoPage({ params }: Props) {
  const { token } = await params;
  const [guest, settings] = await Promise.all([getGuest(token), getSettings()]);

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
            {settings.nomeEvento}
          </h1>
          <div className="flex items-center justify-center gap-3 my-4">
            <div className="h-px w-16 bg-stone-300" />
            <span className="text-stone-400 text-lg">✦</span>
            <div className="h-px w-16 bg-stone-300" />
          </div>
          <p className="text-stone-500 text-sm tracking-wide">
            {settings.dataEvento}
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
                  {guest.invitato}
                </p>
              </div>
              <p className="text-stone-600 text-sm leading-relaxed text-center mb-8">
                Sarà un onore averti con noi in questo giorno speciale.
                <br />
                Ti chiediamo gentilmente di confermare la tua presenza.
              </p>
              <RsvpForm token={token} guestName={guest.invitato} />
            </>
          )}
        </div>

        <p className="text-center text-stone-400 text-xs mt-8">
          Per informazioni scrivi a{" "}
          <a
            href={`mailto:${settings.emailContatto}`}
            className="underline hover:text-stone-600 transition-colors"
          >
            {settings.emailContatto}
          </a>
        </p>
      </div>
    </main>
  );
}

function AlreadyResponded({
  guest,
}: {
  guest: Awaited<ReturnType<typeof getGuest>>;
}) {
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
        Grazie, {guest.invitato}!
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
        {presente && guest.persone.length > 0 && (
          <div className="pt-1">
            <p className="text-stone-400 mb-1.5">
              {guest.persone.length === 1 ? "1 partecipante" : `${guest.persone.length} partecipanti`}
            </p>
            <div className="space-y-1.5">
              {guest.persone.map((p, i) => (
                <div key={i} className="bg-white rounded-lg px-3 py-2 border border-stone-100 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-stone-700">{p.nome}</span>
                  <span className="text-xs text-stone-400 shrink-0">
                    {p.tipo}{p.menu ? ` · ${p.menu}` : ""}
                  </span>
                </div>
              ))}
            </div>
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
