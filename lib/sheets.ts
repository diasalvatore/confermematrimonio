import { google } from "googleapis";
import { v4 as uuidv4 } from "uuid";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

const SHEET_NAME = "Ospiti";
const SETTINGS_SHEET_NAME = "Impostazioni";

// Column indices (0-based)
const COL = {
  TOKEN: 0,
  INVITATO: 1,
  CONFERMATO: 2,
  PARTECIPANTI: 3,
  INTOLLERANZE: 4,
  NOTE: 5,
  DATA_RISPOSTA: 6,
};

export interface Guest {
  token: string;
  invitato: string;
  confermato: "si" | "no" | "";
  partecipanti: number;
  intolleranze: string;
  note: string;
  dataRisposta: string;
}

export interface EventSettings {
  nomeEvento: string;
  dataEvento: string;
  emailContatto: string;
}

const DEFAULT_SETTINGS: EventSettings = {
  nomeEvento: "Salvatore & Dia",
  dataEvento: "Sabato, 12 Luglio 2025",
  emailContatto: "info@esempio.it",
};

function getAuth() {
  const credentials = JSON.parse(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "{}"
  );
  return new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });
}

function getSheetsClient() {
  const auth = getAuth();
  return google.sheets({ version: "v4", auth });
}

function getSpreadsheetId() {
  const id = process.env.GOOGLE_SPREADSHEET_ID;
  if (!id) throw new Error("GOOGLE_SPREADSHEET_ID non configurato");
  return id;
}

async function ensureSheet(
  sheets: ReturnType<typeof getSheetsClient>,
  spreadsheetId: string,
  sheetName: string
) {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = spreadsheet.data.sheets?.some(
    (s) => s.properties?.title === sheetName
  );
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    });
  }
}

async function ensureHeaderRow(
  sheets: ReturnType<typeof getSheetsClient>,
  spreadsheetId: string
) {
  await ensureSheet(sheets, spreadsheetId, SHEET_NAME);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A1:G1`,
  });
  const rows = res.data.values;
  if (!rows || rows.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A1:G1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            "token",
            "invitato",
            "confermato",
            "partecipanti",
            "intolleranze",
            "note",
            "data_risposta",
          ],
        ],
      },
    });
  }
}

export async function getGuest(token: string): Promise<Guest | null> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A2:G`,
  });

  const rows = res.data.values || [];
  const row = rows.find((r) => r[COL.TOKEN] === token);
  if (!row) return null;

  return {
    token: row[COL.TOKEN] || "",
    invitato: row[COL.INVITATO] || "",
    confermato: (row[COL.CONFERMATO] || "") as Guest["confermato"],
    partecipanti: parseInt(row[COL.PARTECIPANTI] || "1") || 1,
    intolleranze: row[COL.INTOLLERANZE] || "",
    note: row[COL.NOTE] || "",
    dataRisposta: row[COL.DATA_RISPOSTA] || "",
  };
}

export async function saveRsvp(
  token: string,
  confermato: "si" | "no",
  partecipanti: number,
  intolleranze: string,
  note: string
): Promise<boolean> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A2:G`,
  });

  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((r) => r[COL.TOKEN] === token);
  if (rowIndex === -1) return false;

  // Row in sheet is 1-indexed, +2 because header is row 1, data starts at row 2
  const sheetRow = rowIndex + 2;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAME}!C${sheetRow}:G${sheetRow}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          confermato,
          confermato === "si" ? partecipanti : "",
          intolleranze,
          note,
          new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" }),
        ],
      ],
    },
  });

  return true;
}

export async function createGuest(invitato: string): Promise<Guest> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  await ensureHeaderRow(sheets, spreadsheetId);

  const token = uuidv4();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAME}!A:G`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[token, invitato, "", "", "", "", ""]],
    },
  });

  return {
    token,
    invitato,
    confermato: "",
    partecipanti: 0,
    intolleranze: "",
    note: "",
    dataRisposta: "",
  };
}

export async function getAllGuests(): Promise<Guest[]> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  await ensureHeaderRow(sheets, spreadsheetId);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A2:G`,
  });

  const rows = res.data.values || [];
  return rows
    .filter((r) => r[COL.TOKEN])
    .map((r) => ({
      token: r[COL.TOKEN] || "",
      invitato: r[COL.INVITATO] || "",
      confermato: (r[COL.CONFERMATO] || "") as Guest["confermato"],
      partecipanti: parseInt(r[COL.PARTECIPANTI] || "0") || 0,
      intolleranze: r[COL.INTOLLERANZE] || "",
      note: r[COL.NOTE] || "",
      dataRisposta: r[COL.DATA_RISPOSTA] || "",
    }));
}

export async function deleteGuest(token: string): Promise<boolean> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A2:G`,
  });

  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((r) => r[COL.TOKEN] === token);
  if (rowIndex === -1) return false;

  const sheetRow = rowIndex + 2;

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${SHEET_NAME}!A${sheetRow}:G${sheetRow}`,
  });

  return true;
}

export async function getSettings(): Promise<EventSettings> {
  try {
    const sheets = getSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const exists = spreadsheet.data.sheets?.some(
      (s) => s.properties?.title === SETTINGS_SHEET_NAME
    );
    if (!exists) return { ...DEFAULT_SETTINGS };

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SETTINGS_SHEET_NAME}!A1:B3`,
    });

    const rows = res.data.values || [];
    const map: Record<string, string> = {};
    rows.forEach((row) => {
      if (row[0]) map[row[0]] = row[1] || "";
    });

    return {
      nomeEvento: map["nome_evento"] || DEFAULT_SETTINGS.nomeEvento,
      dataEvento: map["data_evento"] || DEFAULT_SETTINGS.dataEvento,
      emailContatto: map["email_contatto"] || DEFAULT_SETTINGS.emailContatto,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: EventSettings): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  await ensureSheet(sheets, spreadsheetId, SETTINGS_SHEET_NAME);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SETTINGS_SHEET_NAME}!A1:B3`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        ["nome_evento", settings.nomeEvento],
        ["data_evento", settings.dataEvento],
        ["email_contatto", settings.emailContatto],
      ],
    },
  });
}
