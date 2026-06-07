import pypdf
import re
import json
import os

reader = pypdf.PdfReader('../nlem2022.pdf')

# Matches any number with 2 to 4 parts: e.g. 1.1, 1.1.1, 6.2.1.14
number_pattern = re.compile(r'\b\d+(?:\.\d+){1,3}\b')

# Healthcare levels: e.g. P,S,T or S,T or P,S or P or S or T (must be whole words)
level_pattern = re.compile(r'\b(P\s*,\s*S\s*,\s*T|S\s*,\s*T|P\s*,\s*T|P\s*,\s*S|P|S|T)\b')

parsed_medicines = []
current_category = "General Anaesthetics and Oxygen"

for page_idx in range(3, 83):
    text = reader.pages[page_idx].extract_text() or ""
    
    # Find all potential medicine numbers and their positions
    matches = list(number_pattern.finditer(text))
    if not matches:
        continue
        
    for i in range(len(matches)):
        start_pos = matches[i].end()
        end_pos = matches[i+1].start() if i+1 < len(matches) else len(text)
        
        num = matches[i].group(0)
        block = text[start_pos:end_pos].strip()
        
        # Check if this block contains a healthcare level
        level_match = level_pattern.search(block)
        if level_match:
            # It's a medicine row!
            level_start = level_match.start()
            level_end = level_match.end()
            
            name = block[:level_start].strip()
            # Clean name: remove footnotes, leading/trailing punctuation or numbers
            name = re.sub(r'\*+$', '', name).strip()
            
            # Remove any leading Section headers or table labels from medicine names
            name_clean = re.sub(r'^(?:Section\s+[\d.]+\s*[-–]?\s*|[-–\s]+)', '', name, flags=re.IGNORECASE).strip()
            # If the name contains "Medicine Level of Healthcare", strip it
            name_clean = re.split(r'\s*(?:Medicine|Level|Dosage)', name_clean, flags=re.IGNORECASE)[0].strip()
            
            if len(name_clean) < 2:
                continue
                
            strengths_text = block[level_end:].strip()
            
            # Split strengths
            strength_split_pattern = r'\b(Tablet|Injection|Oral\s+liquid|Oral\s+Liquid|Capsule|Suppository|Powder\s+for\s+injection|Powder\s+for\s+Injection|Powder|Pessary|Topical|Liquid\s+for\s+inhalation|Liquid|Cream|Ointment|Dry\s+Syrup|Sachet|Nasal\s+Spray|Nasal|Spray|Suspension|Eye/Ear|Eye|Ear|Inhalation|Gel|Lotion|Drops|Solution|Effervescent/|Dispersible/|Enteric\s+coated)\b'
            
            parts = re.split(strength_split_pattern, strengths_text, flags=re.IGNORECASE)
            strengths = []
            
            if len(parts) > 1:
                for j in range(1, len(parts), 2):
                    keyword = parts[j]
                    value = parts[j+1].strip() if j+1 < len(parts) else ""
                    # Clean value from cross-references
                    value = re.sub(r'\*+$', '', value).strip()
                    value = re.split(r'\s*(?:\*\*|\*|A\.\s+|B\.\s+|C\.\s+|[a-z]\)\s+)', value)[0].strip()
                    
                    # Remove trailing numbers like "Section" or category codes
                    value = re.split(r'\s*(?:Section|Medicine|Level|Dosage)', value, flags=re.IGNORECASE)[0].strip()
                    
                    strength_entry = f"{keyword} {value}".strip()
                    if strength_entry:
                        # Clean any dangling punctuation at the end of strength
                        strength_entry = re.sub(r'[,.\s–-]+$', '', strength_entry).strip()
                        strengths.append(strength_entry)
            else:
                val = re.split(r'\s*(?:\*\*|\*|A\.\s+|B\.\s+|C\.\s+|[a-z]\)\s+)', strengths_text)[0].strip()
                val = re.split(r'\s*(?:Section|Medicine|Level|Dosage)', val, flags=re.IGNORECASE)[0].strip()
                if val:
                    val = re.sub(r'[,.\s–-]+$', '', val).strip()
                    strengths.append(val)
            
            strengths = [s for s in strengths if s]
            if not strengths:
                strengths = ["As directed"]
                
            parsed_medicines.append({
                "name": name_clean,
                "strengths": strengths,
                "category": current_category
            })
        else:
            # If no level, this could be a category block
            # Let's extract the category name from it
            # e.g., "1.1- General Anaesthetics"
            cat_match = re.search(r'^(?:[-–\s\n]*)(.*?)(?=\s*(?:Medicine|Level|Dosage|Route|$))', block, flags=re.IGNORECASE)
            if cat_match:
                cat_name = cat_match.group(1).strip()
                # Clean up category names
                cat_name = re.sub(r'^(?:Section\s+\d+[-–\s\.]*)', '', cat_name, flags=re.IGNORECASE).strip()
                cat_name = re.sub(r'^[-–\s\.]+', '', cat_name).strip()
                if cat_name and len(cat_name) > 3 and not cat_name.startswith("of Healthcare"):
                    current_category = cat_name

# Merge duplicates
merged_medicines = {}
for m in parsed_medicines:
    key = m["name"].lower().strip()
    if key in merged_medicines:
        # Merge strengths
        existing_strengths = merged_medicines[key]["strengths"]
        for s in m["strengths"]:
            if s not in existing_strengths:
                existing_strengths.append(s)
    else:
        merged_medicines[key] = {
            "name": m["name"],
            "generics": [m["name"]],
            "strengths": m["strengths"],
            "defaultDose": m["strengths"][0],
            "category": m["category"]
        }

medicines_list = list(merged_medicines.values())
medicines_list.sort(key=lambda x: x["name"])

print(f"Parsed {len(parsed_medicines)} raw records.")
print(f"Merged into {len(medicines_list)} unique medicines.")

ts_path = '../client/src/utils/medicines.ts'

ts_content = f"""// Medicine database — parsed from NLEM 2022 PDF
export interface Medicine {{
  name: string;
  generics: string[];
  strengths: string[];
  defaultDose: string;
  category: string;
}}

export const MEDICINES: Medicine[] = {json.dumps(medicines_list, indent=2)};

// All common brand names for quick search
export const ALL_BRAND_NAMES: string[] = Array.from(
  new Set(MEDICINES.flatMap(m => [m.name, ...m.generics]))
).sort();

export function searchMedicines(query: string): Medicine[] {{
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase();
  return MEDICINES.filter(m =>
    m.name.toLowerCase().includes(q) ||
    m.generics.some(g => g.toLowerCase().includes(q)) ||
    m.category.toLowerCase().includes(q)
  ).slice(0, 12);
}}

export function findMedicineByName(name: string): Medicine | undefined {{
  const n = name.toLowerCase();
  return MEDICINES.find(m =>
    m.name.toLowerCase() === n ||
    m.generics.some(g => g.toLowerCase() === n)
  );
}}
"""

with open(ts_path, 'w', encoding='utf-8') as f:
    f.write(ts_content)

print(f"Wrote medicines to {ts_path}")
