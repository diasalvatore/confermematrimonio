"use client";

import { useState, useEffect, useCallback } from "react";

interface Guest {
  token: string;
  invitato: string;
  confermato: "si" | "no" | "";
  partecipanti: number;
  intolleranze: string;
  note: string;
  dataRisposta: string;
}

interface EventSettings {
  nomeEvento: string;
  dataEvento: string;
  emailContatto: string;
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
    } else if (res.status === 401) {
      setLoginError("Password non corretta");
    } else {
      const data = await res.json().catch(() => ({}));
      setLoginError(data.error || "Errore del server. Controlla la configurazione.");
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
  const [newInvitato, setNewInvitato] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [deleteToken, setDeleteToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "confirmed" | "pending" | "declined">("all");
  const [baseUrl, setBaseUrl] = useState("");

  // Settings state
  const [settings, setSettings] = useState<EventSettings>({
    nomeEvento: "",
    dataEvento: "",
    emailContatto: "",
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [showSettings, setShowSettings] = useState(false);

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

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        headers: { "x-admin-password": password },
      });
      const data = await res.json();
      if (res.ok) setSettings(data.settings);
    } finally {
      setSettingsLoading(false);
    }
  }, [password]);

  useEffect(() => {
    loadGuests();
    loadSettings();
  }, [loadGuests, loadSettings]);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSettingsMessage("Salvato!");
        setTimeout(() => setSettingsMessage(""), 3000);
      } else {
        const data = await res.json();
        setSettingsMessage(data.error || "Errore nel salvataggio");
      }
    } finally {
      setSettingsSaving(false);
    }
  }

  async function handleAddGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!newInvitato.trim()) return;
    setAddLoading(true);
    setAddError("");

    try {
      const res = await fetch("/api/admin/guests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ invitato: newInvitato.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Errore nella creazione");
        return;
      }
      setGuests((prev) => [...prev, data.guest]);
      setNewInvitato("");
    } catch {
      setAddError("Errore di connessione");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleDelete(token: string) {
    setDeleteToken(token);
    try {
      const res = await fetch(
        `/api/admin/guests?token=${encodeURIComponent(token)}`,
        { method: "DELETE", headers: { "x-admin-password": password } }
      );
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
    totalParticipants: guests
      .filter((g) => g.confermato === "si")
      .reduce((sum, g) => sum + (g.partecipanti || 0), 0),
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
              {settings.nomeEvento || "Conferme Matrimonio"}
            </h1>
            <p className="text-xs text-stone-400">Pannello Admin</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-sm text-stone-400 hover:text-stone-700 transition-colors"
            >
              Impostazioni
            </button>
            <span className="text-stone-200">|</span>
            <button
              onClick={onLogout}
              className="text-sm text-stone-400 hover:text-stone-700 transition-colors"
            >
              Esci
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Settings panel */}
        {showSettings && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-stone-700 mb-5">
              Impostazioni evento
            </h2>
            {settingsLoading ? (
              <p className="text-sm text-stone-400">Caricamento...</p>
            ) : (
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1.5">
                      Nome evento (es. Mario & Giulia)
                    </label>
                    <input
                      type="text"
                      value={settings.nomeEvento}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, nomeEvento: e.target.value }))
                      }
                      placeholder="Salvatore & Dia"
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-100 text-sm text-stone-700 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1.5">
                      Data evento
                    </label>
                    <input
                      type="text"
                      value={settings.dataEvento}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, dataEvento: e.target.value }))
                      }
                      placeholder="Sabato, 12 Luglio 2025"
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-100 text-sm text-stone-700 transition-colors"
                      required
                    />
                  </div>
                </div>
                <div className="sm:w-1/2">
                  <label className="block text-xs font-medium text-stone-500 mb-1.5">
                    Email di contatto
                  </label>
                  <input
                    type="email"
                    value={settings.emailContatto}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, emailContatto: e.target.value }))
                    }
                    placeholder="info@esempio.it"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-100 text-sm text-stone-700 transition-colors"
                    required
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={settingsSaving}
                    className="px-5 py-2.5 rounded-xl bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-50"
                  >
                    {settingsSaving ? "Salvataggio..." : "Salva impostazioni"}
                  </button>
                  {settingsMessage && (
                    <p
                      className={`text-sm ${
                        settingsMessage === "Salvato!"
                          ? "text-green-600"
                          : "text-red-500"
                      }`}
                    >
                      {settingsMessage}
                    </p>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Inviti inviati" value={stats.total} color="stone" />
          <StatCard label="Confermati" value={stats.confirmed} color="green" />
          <StatCard label="In attesa" value={stats.pending} color="amber" />
          <StatCard label="Non presenti" value={stats.declined} color="rose" />
        </div>

        {stats.confirmed > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-2xl p-5 border border-white shadow-sm">
              <p className="text-3xl font-serif font-light text-green-700">
                {stats.totalParticipants}
              </p>
              <p className="text-xs mt-1 text-green-600 opacity-70">
                Partecipanti totali confermati
              </p>
            </div>
            {stats.withIntolerances > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 flex items-center gap-3">
                <span className="text-amber-500 text-lg flex-shrink-0">⚠</span>
                <p className="text-sm text-amber-700">
                  <strong>{stats.withIntolerances}</strong>{" "}
                  {stats.withIntolerances === 1 ? "gruppo ha" : "gruppi hanno"} segnalato
                  intolleranze alimentari.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Add guest */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-stone-700 mb-4">
            Aggiungi invitato
          </h2>
          <form
            onSubmit={handleAddGuest}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              type="text"
              value={newInvitato}
              onChange={(e) => setNewInvitato(e.target.value)}
              placeholder="Es: Famiglia Rossi, Marco e Laura, Zio Giovanni..."
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
              Lista inviti
            </h2>
            <button
              onClick={loadGuests}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              Aggiorna
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-stone-100 px-6 gap-1 overflow-x-auto">
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
              Nessun invitato in questa categoria
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
    <div className={`rounded-2xl p-5 ${colors[color]} border border-white shadow-sm`}>
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
  const shortLink = `/invito/${guest.token.slice(0, 8)}…`;

  const statusBadge = {
    si: (
      <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
        ✓ Confermato
      </span>
    ),
    no: (
      <span className="inline-flex items-center gap-1 text-xs bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
        ✗ Non presente
      </span>
    ),
    "": (
      <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
        ⏳ In attesa
      </span>
    ),
  }[guest.confermato];

  return (
    <div className="px-6 py-4 hover:bg-stone-50 transition-colors">
      {/* Main row */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm font-medium text-stone-800 text-left hover:text-stone-600 transition-colors"
            >
              {guest.invitato}
            </button>
            {statusBadge}
            {guest.confermato === "si" && guest.partecipanti > 0 && (
              <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full whitespace-nowrap">
                {guest.partecipanti} {guest.partecipanti === 1 ? "persona" : "persone"}
              </span>
            )}
            {guest.confermato === "si" && guest.intolleranze && (
              <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                ⚠ intolleranze
              </span>
            )}
          </div>
          {/* Link always visible */}
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors font-mono"
            title={link}
          >
            {shortLink}
          </a>
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

      {/* Expandable details */}
      {showDetails && (
        <div className="mt-3 text-xs text-stone-500 space-y-1.5 bg-stone-50 rounded-lg p-3">
          <p>
            <span className="text-stone-400">Link completo:</span>{" "}
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
              <span className="text-stone-400">Messaggio:</span> {guest.note}
            </p>
          )}
          {guest.dataRisposta && (
            <p>
              <span className="text-stone-400">Risposta inviata:</span>{" "}
              {guest.dataRisposta}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
