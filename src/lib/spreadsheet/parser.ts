import * as XLSX from 'xlsx';
import { Traveler } from '../types';

const NAME_HEADERS = ['name', 'full name', 'traveler', 'person', 'participant'];
const EMAIL_HEADERS = ['email', 'e-mail', 'email address', 'mail'];
const AIRPORT_HEADERS = ['airport', 'home airport', 'home_airport', 'iata', 'airport code', 'code'];

function matchHeader(header: string, candidates: string[]): boolean {
  const h = header.toLowerCase().trim();
  return candidates.some(c => h === c || h.includes(c));
}

export interface ParseResult {
  travelers: Traveler[];
  warnings: string[];
}

export function parseSpreadsheet(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

        if (rows.length === 0) {
          reject(new Error('Spreadsheet is empty'));
          return;
        }

        const headers = Object.keys(rows[0]);
        const nameCol = headers.find(h => matchHeader(h, NAME_HEADERS));
        const emailCol = headers.find(h => matchHeader(h, EMAIL_HEADERS));
        const airportCol = headers.find(h => matchHeader(h, AIRPORT_HEADERS));

        if (!nameCol) {
          reject(new Error('Could not find a "Name" column. Expected headers like: name, full name, traveler'));
          return;
        }
        if (!airportCol) {
          reject(new Error('Could not find an "Airport" column. Expected headers like: airport, home airport, IATA'));
          return;
        }

        const warnings: string[] = [];
        const travelers: Traveler[] = [];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const name = String(row[nameCol] || '').trim();
          const email = emailCol ? String(row[emailCol] || '').trim() : '';
          const airport = String(row[airportCol] || '').trim().toUpperCase();

          if (!name) {
            warnings.push(`Row ${i + 2}: Skipped — empty name`);
            continue;
          }

          if (airport && !/^[A-Z]{3}$/.test(airport)) {
            warnings.push(`Row ${i + 2}: "${airport}" doesn't look like a valid IATA code for ${name}`);
          }

          travelers.push({ name, email, home_airport: airport });
        }

        resolve({ travelers, warnings });
      } catch (err) {
        reject(new Error(`Failed to parse file: ${(err as Error).message}`));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}
