import pypdf
import re
import json

reader = pypdf.PdfReader('../nlem2022.pdf')

# Matches any number with 2 to 4 parts: e.g. 1.1, 1.1.1, 6.2.1.14
number_pattern = re.compile(r'\b\d+(?:\.\d+){1,3}\b')

# Healthcare levels: e.g. P,S,T or S,T or P,S or P or S or T (must be whole words)
level_pattern = re.compile(r'\b(P\s*,\s*S\s*,\s*T|S\s*,\s*T|P\s*,\s*T|P\s*,\s*S|P|S|T)\b')

parsed_medicines = []
current_category = "General"

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
            # If name is empty or too short, it's invalid
            if len(name) < 2:
                continue
                
            # If there is a category title inside the name (like "- Local Anaesthetics Medicine"), clean it
            name_clean = re.sub(r'^[-–\s\w]+Medicines?\b', '', name, flags=re.IGNORECASE).strip()
            if not name_clean:
                name_clean = name
                
            strengths_text = block[level_end:].strip()
            
            # Split strengths
            strength_split_pattern = r'\b(Tablet|Injection|Oral\s+liquid|Oral\s+Liquid|Capsule|Suppository|Powder\s+for\s+injection|Powder\s+for\s+Injection|Powder|Pessary|Topical|Liquid\s+for\s+inhalation|Liquid|Cream|Ointment|Dry\s+Syrup|Sachet|Nasal\s+Spray|Nasal|Spray|Suspension|Eye/Ear|Eye|Ear|Inhalation|Gel|Lotion|Drops|Solution|Effervescent/|Dispersible/|Enteric\s+coated)\b'
            
            parts = re.split(strength_split_pattern, strengths_text, flags=re.IGNORECASE)
            strengths = []
            
            if len(parts) > 1:
                # First part is text before first keyword (if any, usually empty or noise)
                for j in range(1, len(parts), 2):
                    keyword = parts[j]
                    value = parts[j+1].strip() if j+1 < len(parts) else ""
                    # Clean value from cross-references
                    value = re.sub(r'\*+$', '', value).strip()
                    value = re.split(r'\s*(?:\*\*|\*|A\.\s+|B\.\s+|C\.\s+|[a-z]\)\s+)', value)[0].strip()
                    
                    strength_entry = f"{keyword} {value}".strip()
                    if strength_entry:
                        strengths.append(strength_entry)
            else:
                val = re.split(r'\s*(?:\*\*|\*|A\.\s+|B\.\s+|C\.\s+|[a-z]\)\s+)', strengths_text)[0].strip()
                if val:
                    strengths.append(val)
            
            strengths = [s for s in strengths if s]
            if not strengths:
                strengths = ["As directed"]
                
            parsed_medicines.append({
                "number": num,
                "name": name_clean,
                "generics": [name_clean],
                "strengths": strengths,
                "defaultDose": strengths[0],
                "category": current_category
            })
        else:
            # If no level, this could be a category block
            # Let's extract the category name from it
            # e.g., "1.1- General Anaesthetics"
            cat_match = re.search(r'(?:Section\s+)?\d+\.\d+\s*[-–]\s*([a-zA-Z].*)', block)
            if cat_match:
                current_category = cat_match.group(1).strip()
                # Clean up category trailing noise
                current_category = re.split(r'\s*(?:Medicine|Level|Dosage)', current_category)[0].strip()

print(f"Total parsed medicines: {len(parsed_medicines)}")

with open('test_parsed.json', 'w', encoding='utf-8') as f:
    json.dump(parsed_medicines[:30], f, indent=2)

print("Saved first 30 to test_parsed.json")
