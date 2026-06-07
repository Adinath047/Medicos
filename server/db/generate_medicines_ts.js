const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../../17804811532278163_1.csv');
const tsPath = path.join(__dirname, '../../client/src/utils/medicines.ts');

const content = fs.readFileSync(csvPath, 'utf8');

function parseCSV(text) {
  const result = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i+1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(cell.trim());
      if (row.some(c => c !== '')) {
        result.push(row);
      }
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell.trim());
    result.push(row);
  }
  return result;
}

const rows = parseCSV(content);

const medicines = [];
let currentCategory = 'Anaesthetics';

rows.forEach(row => {
  // If row has 1 column, it's either section title or footnote
  if (row.length === 1) {
    const text = row[0];
    if (text.match(/^\d+\.\d+\-/)) {
      // It's a category, e.g. "1.1- General Anaesthetics and Oxygen"
      currentCategory = text.replace(/^\d+\.\d+\-\s*/, '').trim();
    } else if (text.startsWith('Section')) {
      // It's a section, e.g. "Section 1\nMedicines used in Anaesthesia"
      currentCategory = text.replace(/^Section\s+\d+\s*\n*/i, '').trim();
    }
  } else if (row.length >= 4) {
    const num = row[0];
    if (num.match(/^\d+\.\d+\.\d+$/)) {
      // It's a medicine row!
      let name = row[1].replace(/\*$/, '').trim(); // Remove trailing asterisk
      const strengthsText = row[3];
      const strengths = strengthsText.split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      medicines.push({
        name,
        generics: [name],
        strengths,
        defaultDose: strengths[0] || 'As directed',
        category: currentCategory
      });
    }
  }
});

console.log(`Parsed ${medicines.length} medicines.`);

const tsContent = `// Medicine database — parsed from 17804811532278163_1.csv
export interface Medicine {
  name: string;
  generics: string[];
  strengths: string[];
  defaultDose: string;
  category: string;
}

export const MEDICINES: Medicine[] = ${JSON.stringify(medicines, null, 2)};

// All common brand names for quick search
export const ALL_BRAND_NAMES: string[] = Array.from(
  new Set(MEDICINES.flatMap(m => [m.name, ...m.generics]))
).sort();

export function searchMedicines(query: string): Medicine[] {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase();
  return MEDICINES.filter(m =>
    m.name.toLowerCase().includes(q) ||
    m.generics.some(g => g.toLowerCase().includes(q)) ||
    m.category.toLowerCase().includes(q)
  ).slice(0, 12);
}

export function findMedicineByName(name: string): Medicine | undefined {
  const n = name.toLowerCase();
  return MEDICINES.find(m =>
    m.name.toLowerCase() === n ||
    m.generics.some(g => g.toLowerCase() === n)
  );
}
`;

fs.writeFileSync(tsPath, tsContent, 'utf8');
console.log(`Wrote medicines to ${tsPath}`);
