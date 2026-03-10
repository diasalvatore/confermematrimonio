export default function NotFound() {
  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-stone-300 text-6xl mb-6">✦</p>
        <h1 className="font-serif text-2xl text-stone-700 mb-3">
          Invito non trovato
        </h1>
        <p className="text-stone-400 text-sm max-w-xs mx-auto">
          Il link che hai aperto non è valido. Controlla il link ricevuto o
          contatta gli sposi.
        </p>
      </div>
    </main>
  );
}
