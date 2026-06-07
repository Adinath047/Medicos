import pypdf

reader = pypdf.PdfReader('../nlem2022.pdf')
print(f"Total pages: {len(reader.pages)}")

# Print text of first 15 pages to understand where the medicines list starts
with open('pdf_inspection.txt', 'w', encoding='utf-8') as f:
    for i in range(min(50, len(reader.pages))):
        f.write(f"--- PAGE {i+1} ---\n")
        f.write(reader.pages[i].extract_text() or "")
        f.write("\n\n")

print("Wrote first 50 pages text to pdf_inspection.txt")
