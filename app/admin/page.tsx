"use client";

import { useState, useEffect, useCallback } from "react";

interface Guest {
  token: string;
  nome: string;
  cognome: string;
  confermato: "si" | "no" | "";
  intolleranze: string;
  note: string;
  dataRisposta: string;
}

type View = "login" | "dashboard";

export default function AdminPage() {
  const [view, setView] = useState<View>("login");
  const [password, setPassword] = useState("");
  const [savedPassword, setSavedPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    const res = await fetch("/api/admin/guests", {
      headers: { "x-admin-password": password },
    });

    if (res.ok) {
      setSavedPassword(password);
      setView("dashboard");
    } else {
      setLoginError("Password non corretta");
    }
    setLoginLoading(false);
  }

  if (view === "login") {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <p className="text-xs tracking-[0.3em] uppercase text-stone-400 mb-2">
              Area riservata
            </p>
            <h1 className="font-serif text-3xl text-stone-800">
              Pannello Admin
            </h1>
          </div>
          <form
            onSubmit={handleLogin}
            className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Inserisci la password admin"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-100 text-stone-700 text-sm transition-colors"
                required
              />
            </div>
            {loginError && (
              <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg text-center">
                {loginError}
              </p>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 rounded-xl bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loginLoading ? "Accesso..." : "Accedi"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return <Dashboard password={savedPassword} onLogout={() => setView("login")} />;
}

function Dashboard({
  password,
  onLogout,
}: {
  password: string;
  onLogout: () => void;
}) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newNome, setNewNome] = useState("");
  const [newCognome, setNewCognome] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [deleteToken, setDeleteToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "confirmed" | "pending" | "declined">("all");
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const loadGuests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/guests", {
        headers: { "x-admin-password": password },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Errore nel caricamento");
        return;
      }
      setGuests(data.guests);
    } catch {
      setError("Errore di connessione");
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => {
    loadGuests();
  }, [loadGuests]);

  async function handleAddGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!newNome.trim() || !newCognome.trim()) return;
    setAddLoading(true);
    setAddError("");

    try {
      const res = await fetch("/api/admin/guests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ nome: newNome.trim(), cognome: newCognome.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Errore nella creazione");
        return;
      }
      setGuests((prev) => [...prev, data.guest]);
      setNewNome("");
      setNewCognome("");
    } catch {
      setAddError("Errore di connessione");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleDelete(token: string) {
    setDeleteToken(token);
    try {
      const res = await fetch(`/api/admin/guests?token=${encodeURIComponent(token)}`, {
        method: "DELETE",
        headers: { "x-admin-password": password },
      });
      if (res.ok) {
        setGuests((prev) => prev.filter((g) => g.token !== token));
      }
    } finally {
      setDeleteToken(null);
    }
  }

  async function copyLink(token: string) {
    const link = `${baseUrl}/invito/${token}`;
    await navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  const stats = {
    total: guests.length,
    confirmed: guests.filter((g) => g.confermato === "si").length,
    declined: guests.filter((g) => g.confermato === "no").length,
    pending: guests.filter((g) => g.confermato === "").length,
    withIntolerances: guests.filter(
      (g) => g.confermato === "si" && g.intolleranze.trim()
    ).length,
  };

  const filteredGuests = guests.filter((g) => {
    if (activeTab === "confirmed") return g.confermato === "si";
    if (activeTab === "declined") return g.confermato === "no";
    if (activeTab === "pending") return g.confermato === "";
    return true;
  });

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-xl text-stone-800">
              Conferme Matrimonio
            </h1>
            <p className="text-xs text-stone-400">Pannello Admin</p>
          </div>
          <button
            onClick={onLogout}
            className="text-sm text-stone-400 hover:text-stone-700 transition-colors"
          >
            Esci
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Invitati totali" value={stats.total} color="stone" />
          <StatCard
            label="Confermati"
            value={stats.confirmed}
            color="green"
          />
          <StatCard
            label="In attesa"
            value={stats.pending}
            color="amber"
          />
          <StatCard
            label="Non presenti"
            value={stats.declined}
            color="rose"
          />
        </div>

        {stats.withIntolerances > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-3 flex items-center gap-3">
            <span className="text-amber-500 text-lg">⚠</span>
            <p className="text-sm text-amber-700">
              <strong>{stats.withIntolerances}</strong> ospite
              {stats.withIntolerances > 1 ? "i" : ""} ha segnalato intolleranze
              o allergie alimentari.
            </p>
          </div>
        )}

        {/* Add guest */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-stone-700 mb-4">
            Aggiungi ospite
          </h2>
          <form
            onSubmit={handleAddGuest}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              type="text"
              value={newNome}
              onChange={(e) => setNewNome(e.target.value)}
              placeholder="Nome"
              className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-100 text-sm text-stone-700 transition-colors"
              required
            />
            <input
              type="text"
              value={newCognome}
              onChange={(e) => setNewCognome(e.target.value)}
              placeholder="Cognome"
              className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-100 text-sm text-stone-700 transition-colors"
              required
            />
            <button
              type="submit"
              disabled={addLoading}
              className="px-5 py-2.5 rounded-xl bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {addLoading ? "..." : "+ Aggiungi"}
            </button>
          </form>
          {addError && (
            <p className="text-red-500 text-xs mt-2">{addError}</p>
          )}
        </div>

        {/* Guest list */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-700">
              Lista ospiti
            </h2>
            <button
              onClick={loadGuests}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              Aggiorna
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-stone-100 px-6 gap-1">
            {(
              [
                { id: "all", label: `Tutti (${stats.total})` },
                { id: "confirmed", label: `Confermati (${stats.confirmed})` },
                { id: "pending", label: `In attesa (${stats.pending})` },
                { id: "declined", label: `No (${stats.declined})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-stone-800 text-stone-800"
                    : "border-transparent text-stone-400 hover:text-stone-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-16 text-center text-stone-400 text-sm">
              Caricamento...
            </div>
          ) : error ? (
            <div className="py-16 text-center text-red-400 text-sm">
              {error}
            </div>
          ) : filteredGuests.length === 0 ? (
            <div className="py-16 text-center text-stone-300 text-sm">
              Nessun ospite in questa categoria
            </div>
          ) : (
            <div className="divide-y divide-stone-50">
              {filteredGuests.map((guest) => (
                <GuestRow
                  key={guest.token}
                  guest={guest}
                  baseUrl={baseUrl}
                  copiedToken={copiedToken}
                  deleteToken={deleteToken}
                  onCopy={copyLink}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "stone" | "green" | "amber" | "rose";
}) {
  const colors = {
    stone: "bg-stone-50 text-stone-800",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <div
      className={`rounded-2xl p-5 ${colors[color]} border border-white shadow-sm`}
    >
      <p className="text-3xl font-serif font-light">{value}</p>
      <p className="text-xs mt-1 opacity-70">{label}</p>
    </div>
  );
}

function GuestRow({
  guest,
  baseUrl,
  copiedToken,
  deleteToken,
  onCopy,
  onDelete,
}: {
  guest: Guest;
  baseUrl: string;
  copiedToken: string | null;
  deleteToken: string | null;
  onCopy: (token: string) => void;
  onDelete: (token: string) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const link = `${baseUrl}/invito/${guest.token}`;

  const statusBadge = {
    si: (
      <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
        ✓ Confermato
      </span>
    ),
    no: (
      <span className="inline-flex items-center gap-1 text-xs bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-medium">
        ✗ Non presente
      </span>
    ),
    "": (
      <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium">
        ⏳ In attesa
      </span>
    ),
  }[guest.confermato];

  return (
    <div className="px-6 py-4 hover:bg-stone-50 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-left"
          >
            <p className="text-sm font-medium text-stone-800">
              {guest.nome} {guest.cognome}
            </p>
          </button>
          {statusBadge}
          {guest.confermato === "si" && guest.intolleranze && (
            <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
              ⚠ intolleranze
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onCopy(guest.token)}
            className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 transition-colors whitespace-nowrap"
          >
            {copiedToken === guest.token ? "✓ Copiato!" : "Copia link"}
          </button>
          <button
            onClick={() => onDelete(guest.token)}
            disabled={deleteToken === guest.token}
            className="text-xs px-3 py-1.5 rounded-lg border border-rose-100 text-rose-400 hover:bg-rose-50 transition-colors disabled:opacity-40"
          >
            {deleteToken === guest.token ? "..." : "Elimina"}
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 ml-0 text-xs text-stone-500 space-y-1 bg-stone-50 rounded-lg p-3">
          <p>
            <span className="text-stone-400">Link:</span>{" "}
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-600 underline break-all"
            >
              {link}
            </a>
          </p>
          {guest.intolleranze && (
            <p>
              <span className="text-stone-400">Intolleranze:</span>{" "}
              <span className="text-amber-700">{guest.intolleranze}</span>
            </p>
          )}
          {guest.note && (
            <p>
              <span className="text-stone-400">Note:</span> {guest.note}
            </p>
          )}
          {guest.dataRisposta && (
            <p>
              <span className="text-stone-400">Risposta:</span>{" "}
              {guest.dataRisposta}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
