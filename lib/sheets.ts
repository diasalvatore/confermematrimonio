import { google } from "googleapis";
import { v4 as uuidv4 } from "uuid";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

const SHEET_NAME = "Ospiti";

// Column indices (0-based)
const COL = {
  TOKEN: 0,
  NOME: 1,
  COGNOME: 2,
  CONFERMATO: 3,
  INTOLLERANZE: 4,
  NOTE: 5,
  DATA_RISPOSTA: 6,
};

export interface Guest {
  token: string;
  nome: string;
  cognome: string;
  confermato: "si" | "no" | "";
  intolleranze: string;
  note: string;
  dataRisposta: string;
}

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
  spreadsheetId: string
) {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = spreadsheet.data.sheets?.some(
    (s) => s.properties?.title === SHEET_NAME
  );
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
      },
    });
  }
}

async function ensureHeaderRow(
  sheets: ReturnType<typeof getSheetsClient>,
  spreadsheetId: string
) {
  await ensureSheet(sheets, spreadsheetId);

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
            "nome",
            "cognome",
            "confermato",
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
    nome: row[COL.NOME] || "",
    cognome: row[COL.COGNOME] || "",
    confermato: (row[COL.CONFERMATO] || "") as Guest["confermato"],
    intolleranze: row[COL.INTOLLERANZE] || "",
    note: row[COL.NOTE] || "",
    dataRisposta: row[COL.DATA_RISPOSTA] || "",
  };
}

export async function saveRsvp(
  token: string,
  confermato: "si" | "no",
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
    range: `${SHEET_NAME}!D${sheetRow}:G${sheetRow}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          confermato,
          intolleranze,
          note,
          new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" }),
        ],
      ],
    },
  });

  return true;
}

export async function createGuest(
  nome: string,
  cognome: string
): Promise<Guest> {
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
      values: [[token, nome, cognome, "", "", "", ""]],
    },
  });

  return {
    token,
    nome,
    cognome,
    confermato: "",
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
      nome: r[COL.NOME] || "",
      cognome: r[COL.COGNOME] || "",
      confermato: (r[COL.CONFERMATO] || "") as Guest["confermato"],
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

  // Clear the row
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${SHEET_NAME}!A${sheetRow}:G${sheetRow}`,
  });

  return true;
}
