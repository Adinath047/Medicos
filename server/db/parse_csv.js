const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../../17804811532278163_1.csv');
const content = fs.readFileSync(csvPath, 'utf8');

console.log('--- RAW LINES ---');
const lines = content.split('\n');
lines.forEach((l, idx) => console.log(`${idx}: ${l}`));

console.log('\n--- PARSED DATA ---');
const parsed = [];
let currentCategory = 'General';

// Simple CSV parser that handles quotes and newlines
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
console.log('Total parsed rows:', rows.length);

rows.forEach((row, idx) => {
  console.log(`Row ${idx}:`, JSON.stringify(row));
});
