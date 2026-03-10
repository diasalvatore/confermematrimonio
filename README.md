# Conferma Matrimonio

Applicazione web per raccogliere le conferme di partecipazione al matrimonio. Ogni ospite riceve un link personalizzato per confermare la presenza e segnalare eventuali intolleranze alimentari.

## Funzionalità

- Pagina di invito personalizzata per ogni ospite (`/invito/[token]`)
- Form per confermare presenza e segnalare intolleranze/allergie
- Pannello admin (`/admin`) con:
  - Riepilogo statistiche (confermati, in attesa, non presenti)
  - Aggiunta ospiti e generazione link personalizzati
  - Copia link con un click
  - Visualizzazione intolleranze segnalate
- Tutti i dati salvati su Google Sheets

---

## Setup

### 1. Copia il file delle variabili d'ambiente

```bash
cp .env.example .env.local
```

### 2. Configura Google Sheets API

#### a) Crea un progetto Google Cloud

1. Vai su [console.cloud.google.com](https://console.cloud.google.com)
2. Crea un nuovo progetto (es. "matrimonio-rsvp")
3. Vai su **API e servizi** → **Libreria**
4. Cerca **Google Sheets API** e abilitala

#### b) Crea un Service Account

1. Vai su **API e servizi** → **Credenziali**
2. Clicca **Crea credenziali** → **Account di servizio**
3. Dai un nome (es. "matrimonio-sheets")
4. Vai nella scheda **Chiavi** del service account creato
5. Clicca **Aggiungi chiave** → **Crea nuova chiave** → **JSON**
6. Scarica il file JSON

#### c) Converti le credenziali in una riga

Nel file JSON scaricato, copia tutto il contenuto e incollalo come valore di `GOOGLE_SERVICE_ACCOUNT_JSON` nel file `.env.local`. Assicurati che sia su una riga sola (senza a capo).

> **Attenzione**: la `private_key` nel JSON contiene `\n` che devono rimanere come caratteri letterali `\n`, non come a capo reali.

#### d) Crea il Google Sheet

1. Vai su [sheets.google.com](https://sheets.google.com) e crea un nuovo foglio
2. Rinomina il primo foglio (tab in basso) esattamente: **Ospiti**
3. Copia l'ID del foglio dall'URL:
   `https://docs.google.com/spreadsheets/d/**[QUESTO_ID]**/edit`
4. Incollalo come valore di `GOOGLE_SPREADSHEET_ID` in `.env.local`

#### e) Condividi il foglio con il Service Account

1. Apri il file JSON delle credenziali
2. Copia il valore di `client_email` (simile a `nome@progetto.iam.gserviceaccount.com`)
3. Nel Google Sheet, clicca **Condividi**
4. Incolla l'email del service account e dai permesso di **Editor**

### 3. Imposta la password admin

In `.env.local`, scegli una password sicura per `ADMIN_PASSWORD`.

### 4. Personalizza i nomi degli sposi e la data

Modifica il file `app/invito/[token]/page.tsx` e aggiorna:
- I nomi nella riga `<h1>Salvatore & Dia</h1>`
- La data del matrimonio
- L'email di contatto

---

## Avvio in locale

```bash
npm run dev
```

Apri [http://localhost:3000/admin](http://localhost:3000/admin) per accedere al pannello admin.

## Deploy su Vercel

1. Crea un account su [vercel.com](https://vercel.com) (gratuito)
2. Collega la repository GitHub
3. In **Settings** → **Environment Variables**, aggiungi le tre variabili:
   - `ADMIN_PASSWORD`
   - `GOOGLE_SPREADSHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_JSON`
4. Fai il deploy

Una volta in produzione, i link da inviare agli ospiti saranno del tipo:
`https://tuo-dominio.vercel.app/invito/[token]`

---

## Struttura del progetto

```
app/
├── page.tsx                    # Homepage (redirect generico)
├── layout.tsx                  # Layout globale
├── globals.css                 # Stili globali
├── admin/
│   └── page.tsx                # Pannello admin
├── invito/[token]/
│   ├── page.tsx                # Pagina ospite personalizzata
│   ├── RsvpForm.tsx            # Form di conferma (client component)
│   └── not-found.tsx           # Pagina 404 per token non validi
└── api/
    ├── rsvp/
    │   └── route.ts            # POST /api/rsvp
    └── admin/guests/
        └── route.ts            # GET/POST/DELETE /api/admin/guests

lib/
└── sheets.ts                   # Wrapper Google Sheets API
```
