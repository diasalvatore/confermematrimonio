import { google } from "googleapis";
import { v4 as uuidv4 } from "uuid";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

const SHEET_NAME = "Ospiti";
const SETTINGS_SHEET_NAME = "Impostazioni";

// One row per person (confirmed guests), one row per invitation (pending/declined)
// Columns A-H
const COL = {
  TOKEN: 0,
  INVITATO: 1,
  CONFERMATO: 2,
  NOTE: 3,
  DATA_RISPOSTA: 4,
  NOME_PERSONA: 5,
  TIPO_PERSONA: 6,
  MENU_PERSONA: 7,
};

export interface PersonaRow {
  nome: string;
  tipo: string;
  menu: string;
}

export interface Guest {
  token: string;
  invitato: string;
  confermato: "si" | "no" | "";
  note: string;
  dataRisposta: string;
  persone: PersonaRow[];
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

async function getSheetId(
  sheets: ReturnType<typeof getSheetsClient>,
  spreadsheetId: string,
  sheetName: string
): Promise<number> {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === sheetName
  );
  if (sheet?.properties?.sheetId == null)
    throw new Error(`Sheet "${sheetName}" not found`);
  return sheet.properties.sheetId;
}

async function deleteRowsByIndices(
  sheets: ReturnType<typeof getSheetsClient>,
  spreadsheetId: string,
  sheetId: number,
  rowIndices: number[] // 1-indexed sheet rows
) {
  if (rowIndices.length === 0) return;
  // Sort descending so earlier row indices aren't shifted by later deletions
  const sorted = [...rowIndices].sort((a, b) => b - a);
  const requests = sorted.map((rowIndex) => ({
    deleteDimension: {
      range: {
        sheetId,
        dimension: "ROWS",
        startIndex: rowIndex - 1, // 0-indexed, inclusive
        endIndex: rowIndex, // 0-indexed, exclusive
      },
    },
  }));
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });
}

async function ensureHeaderRow(
  sheets: ReturnType<typeof getSheetsClient>,
  spreadsheetId: string
) {
  await ensureSheet(sheets, spreadsheetId, SHEET_NAME);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A1:H1`,
  });
  const rows = res.data.values;
  if (!rows || rows.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A1:H1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            "token",
            "invitato",
            "confermato",
            "note",
            "data_risposta",
            "nome_persona",
            "tipo_persona",
            "menu_persona",
          ],
        ],
      },
    });
  }
}

function rowsToGuest(token: string, matchingRows: string[][]): Guest {
  const first = matchingRows[0];
  const persone: PersonaRow[] = matchingRows
    .filter((r) => r[COL.NOME_PERSONA])
    .map((r) => ({
      nome: r[COL.NOME_PERSONA] || "",
      tipo: r[COL.TIPO_PERSONA] || "",
      menu: r[COL.MENU_PERSONA] || "",
    }));

  return {
    token,
    invitato: first[COL.INVITATO] || "",
    confermato: (first[COL.CONFERMATO] || "") as Guest["confermato"],
    note: first[COL.NOTE] || "",
    dataRisposta: first[COL.DATA_RISPOSTA] || "",
    persone,
  };
}

export async function getGuest(token: string): Promise<Guest | null> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A2:H`,
  });

  const rows = res.data.values || [];
  const matchingRows = rows.filter((r) => r[COL.TOKEN] === token);
  if (matchingRows.length === 0) return null;

  return rowsToGuest(token, matchingRows);
}

export async function saveRsvp(
  token: string,
  confermato: "si" | "no",
  persone: PersonaRow[],
  note: string
): Promise<boolean> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A2:H`,
  });

  const rows = res.data.values || [];
  const matchingIndices: number[] = [];
  let invitato = "";

  rows.forEach((row, i) => {
    if (row[COL.TOKEN] === token) {
      matchingIndices.push(i + 2); // 1-indexed sheet row
      if (!invitato) invitato = row[COL.INVITATO] || "";
    }
  });

  if (matchingIndices.length === 0) return false;

  // Delete all existing rows for this token
  const sheetId = await getSheetId(sheets, spreadsheetId, SHEET_NAME);
  await deleteRowsByIndices(sheets, spreadsheetId, sheetId, matchingIndices);

  const dataRisposta = new Date().toLocaleString("it-IT", {
    timeZone: "Europe/Rome",
  });

  let newRows: string[][];
  if (confermato === "si") {
    newRows = persone.map((p) => [
      token,
      invitato,
      confermato,
      note,
      dataRisposta,
      p.nome,
      p.tipo,
      p.menu,
    ]);
  } else {
    newRows = [[token, invitato, confermato, note, dataRisposta, "", "", ""]];
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAME}!A:H`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: newRows },
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
    range: `${SHEET_NAME}!A:H`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[token, invitato, "", "", "", "", "", ""]],
    },
  });

  return {
    token,
    invitato,
    confermato: "",
    note: "",
    dataRisposta: "",
    persone: [],
  };
}

export async function getAllGuests(): Promise<Guest[]> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  await ensureHeaderRow(sheets, spreadsheetId);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A2:H`,
  });

  const rows = res.data.values || [];

  // Group rows by token, preserving insertion order
  const order: string[] = [];
  const map = new Map<string, string[][]>();

  for (const row of rows) {
    const token = row[COL.TOKEN];
    if (!token) continue;
    if (!map.has(token)) {
      map.set(token, []);
      order.push(token);
    }
    map.get(token)!.push(row);
  }

  return order.map((token) => rowsToGuest(token, map.get(token)!));
}

export async function deleteGuest(token: string): Promise<boolean> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A2:H`,
  });

  const rows = res.data.values || [];
  const matchingIndices: number[] = rows
    .map((row, i) => (row[COL.TOKEN] === token ? i + 2 : null))
    .filter((i): i is number => i !== null);

  if (matchingIndices.length === 0) return false;

  const sheetId = await getSheetId(sheets, spreadsheetId, SHEET_NAME);
  await deleteRowsByIndices(sheets, spreadsheetId, sheetId, matchingIndices);

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
