import urllib.request
import urllib.parse
import json
import time
import os
import re

# Standardized strengths, default doses, and fallback categories for the top ~100 generic drugs
DRUG_METADATA = {
    "Acetaminophen": {
        "strengths": ["325 mg", "500 mg", "650 mg", "160 mg/5 mL (liquid)"],
        "defaultDose": "1 tablet",
        "category": "Analgesics/Antipyretics"
    },
    "Ibuprofen": {
        "strengths": ["200 mg", "400 mg", "600 mg", "800 mg", "100 mg/5 mL (suspension)"],
        "defaultDose": "1 tablet",
        "category": "Analgesics/NSAIDs"
    },
    "Naproxen": {
        "strengths": ["250 mg", "375 mg", "500 mg"],
        "defaultDose": "1 tablet",
        "category": "Analgesics/NSAIDs"
    },
    "Celecoxib": {
        "strengths": ["50 mg", "100 mg", "200 mg", "400 mg"],
        "defaultDose": "1 capsule",
        "category": "Analgesics/NSAIDs (COX-2 Inhibitor)"
    },
    "Meloxicam": {
        "strengths": ["7.5 mg", "15 mg"],
        "defaultDose": "1 tablet",
        "category": "Analgesics/NSAIDs"
    },
    "Tramadol": {
        "strengths": ["50 mg", "100 mg", "100 mg Modified Release"],
        "defaultDose": "1 tablet",
        "category": "Opioid Analgesics"
    },
    "Aspirin": {
        "strengths": ["75 mg", "81 mg", "150 mg", "325 mg", "500 mg"],
        "defaultDose": "1 tablet",
        "category": "Analgesics / Antiplatelet"
    },
    "Diclofenac": {
        "strengths": ["25 mg", "50 mg", "75 mg", "100 mg Modified Release", "1% Gel"],
        "defaultDose": "1 tablet",
        "category": "Analgesics/NSAIDs"
    },
    "Ketorolac": {
        "strengths": ["10 mg", "15 mg/mL Injection", "30 mg/mL Injection"],
        "defaultDose": "1 tablet",
        "category": "Analgesics/NSAIDs"
    },
    "Amlodipine": {
        "strengths": ["2.5 mg", "5 mg", "10 mg"],
        "defaultDose": "1 tablet",
        "category": "Antihypertensive / Calcium Channel Blockers"
    },
    "Lisinopril": {
        "strengths": ["2.5 mg", "5 mg", "10 mg", "20 mg", "40 mg"],
        "defaultDose": "1 tablet",
        "category": "Antihypertensive / ACE Inhibitors"
    },
    "Metoprolol": {
        "strengths": ["25 mg", "50 mg", "100 mg", "200 mg Extended Release"],
        "defaultDose": "1 tablet",
        "category": "Cardiovascular / Beta Blockers"
    },
    "Atorvastatin": {
        "strengths": ["10 mg", "20 mg", "40 mg", "80 mg"],
        "defaultDose": "1 tablet",
        "category": "Lipid Lowering / Statins"
    },
    "Simvastatin": {
        "strengths": ["5 mg", "10 mg", "20 mg", "40 mg", "80 mg"],
        "defaultDose": "1 tablet",
        "category": "Lipid Lowering / Statins"
    },
    "Rosuvastatin": {
        "strengths": ["5 mg", "10 mg", "20 mg", "40 mg"],
        "defaultDose": "1 tablet",
        "category": "Lipid Lowering / Statins"
    },
    "Losartan": {
        "strengths": ["25 mg", "50 mg", "100 mg"],
        "defaultDose": "1 tablet",
        "category": "Antihypertensive / ARBs"
    },
    "Carvedilol": {
        "strengths": ["3.125 mg", "6.25 mg", "12.5 mg", "25 mg"],
        "defaultDose": "1 tablet",
        "category": "Cardiovascular / Beta Blockers"
    },
    "Furosemide": {
        "strengths": ["20 mg", "40 mg", "80 mg", "10 mg/mL Injection"],
        "defaultDose": "1 tablet",
        "category": "Diuretics"
    },
    "Hydrochlorothiazide": {
        "strengths": ["12.5 mg", "25 mg", "50 mg"],
        "defaultDose": "1 tablet",
        "category": "Diuretics"
    },
    "Spironolactone": {
        "strengths": ["25 mg", "50 mg", "100 mg"],
        "defaultDose": "1 tablet",
        "category": "Diuretics / Aldosterone Antagonists"
    },
    "Clopidogrel": {
        "strengths": ["75 mg", "300 mg"],
        "defaultDose": "1 tablet",
        "category": "Cardiovascular / Antiplatelet"
    },
    "Warfarin": {
        "strengths": ["1 mg", "2 mg", "2.5 mg", "3 mg", "4 mg", "5 mg", "6 mg", "7.5 mg", "10 mg"],
        "defaultDose": "1 tablet",
        "category": "Cardiovascular / Anticoagulants"
    },
    "Apixaban": {
        "strengths": ["2.5 mg", "5 mg"],
        "defaultDose": "1 tablet",
        "category": "Cardiovascular / Anticoagulants"
    },
    "Rivaroxaban": {
        "strengths": ["2.5 mg", "10 mg", "15 mg", "20 mg"],
        "defaultDose": "1 tablet",
        "category": "Cardiovascular / Anticoagulants"
    },
    "Enalapril": {
        "strengths": ["2.5 mg", "5 mg", "10 mg", "20 mg"],
        "defaultDose": "1 tablet",
        "category": "Antihypertensive / ACE Inhibitors"
    },
    "Valsartan": {
        "strengths": ["40 mg", "80 mg", "160 mg", "320 mg"],
        "defaultDose": "1 tablet",
        "category": "Antihypertensive / ARBs"
    },
    "Ramipril": {
        "strengths": ["1.25 mg", "2.5 mg", "5 mg", "10 mg"],
        "defaultDose": "1 capsule",
        "category": "Antihypertensive / ACE Inhibitors"
    },
    "Diltiazem": {
        "strengths": ["30 mg", "60 mg", "90 mg", "120 mg", "180 mg Extended Release"],
        "defaultDose": "1 tablet",
        "category": "Cardiovascular / Calcium Channel Blockers"
    },
    "Verapamil": {
        "strengths": ["40 mg", "80 mg", "120 mg", "180 mg Extended Release", "240 mg Extended Release"],
        "defaultDose": "1 tablet",
        "category": "Cardiovascular / Calcium Channel Blockers"
    },
    "Clonidine": {
        "strengths": ["0.1 mg", "0.2 mg", "0.3 mg", "0.1 mg/24h Patch"],
        "defaultDose": "1 tablet",
        "category": "Antihypertensive / Alpha Agonists"
    },
    "Omeprazole": {
        "strengths": ["10 mg", "20 mg", "40 mg"],
        "defaultDose": "1 capsule",
        "category": "Gastrointestinal / PPIs"
    },
    "Pantoprazole": {
        "strengths": ["20 mg", "40 mg", "40 mg Injection"],
        "defaultDose": "1 tablet",
        "category": "Gastrointestinal / PPIs"
    },
    "Esomeprazole": {
        "strengths": ["20 mg", "40 mg", "10 mg/sachet"],
        "defaultDose": "1 capsule",
        "category": "Gastrointestinal / PPIs"
    },
    "Ranitidine": {
        "strengths": ["75 mg", "150 mg", "300 mg", "25 mg/mL Injection"],
        "defaultDose": "1 tablet",
        "category": "Gastrointestinal / H2 Blockers"
    },
    "Famotidine": {
        "strengths": ["10 mg", "20 mg", "40 mg", "10 mg/mL Injection"],
        "defaultDose": "1 tablet",
        "category": "Gastrointestinal / H2 Blockers"
    },
    "Ondansetron": {
        "strengths": ["4 mg", "8 mg", "4 mg Orally Disintegrating", "2 mg/mL Injection"],
        "defaultDose": "1 tablet",
        "category": "Gastrointestinal / Antiemetics"
    },
    "Metoclopramide": {
        "strengths": ["5 mg", "10 mg", "5 mg/5 mL (syrup)", "5 mg/mL Injection"],
        "defaultDose": "1 tablet",
        "category": "Gastrointestinal / Antiemetics / Prokinetics"
    },
    "Dicyclomine": {
        "strengths": ["10 mg", "20 mg", "10 mg/5 mL (liquid)"],
        "defaultDose": "1 tablet",
        "category": "Gastrointestinal / Antispasmodics"
    },
    "Loperamide": {
        "strengths": ["2 mg", "1 mg/7.5 mL (liquid)"],
        "defaultDose": "1 capsule",
        "category": "Gastrointestinal / Antidiarrheals"
    },
    "Senna": {
        "strengths": ["8.6 mg", "17.2 mg"],
        "defaultDose": "1 tablet",
        "category": "Gastrointestinal / Laxatives"
    },
    "Polyethylene Glycol": {
        "strengths": ["17 g/dose Powder"],
        "defaultDose": "1 unit",
        "category": "Gastrointestinal / Laxatives"
    },
    "Amoxicillin": {
        "strengths": ["250 mg", "500 mg", "875 mg", "125 mg/5 mL (liquid)", "250 mg/5 mL (liquid)"],
        "defaultDose": "1 capsule",
        "category": "Anti-Infectives / Antibiotics"
    },
    "Azithromycin": {
        "strengths": ["250 mg", "500 mg", "600 mg", "200 mg/5 mL (suspension)", "500 mg Injection"],
        "defaultDose": "1 tablet",
        "category": "Anti-Infectives / Antibiotics"
    },
    "Ciprofloxacin": {
        "strengths": ["250 mg", "500 mg", "750 mg", "0.3% Eye Drops"],
        "defaultDose": "1 tablet",
        "category": "Anti-Infectives / Antibiotics"
    },
    "Doxycycline": {
        "strengths": ["50 mg", "100 mg"],
        "defaultDose": "1 capsule",
        "category": "Anti-Infectives / Antibiotics"
    },
    "Cephalexin": {
        "strengths": ["250 mg", "500 mg", "750 mg", "125 mg/5 mL (liquid)", "250 mg/5 mL (liquid)"],
        "defaultDose": "1 capsule",
        "category": "Anti-Infectives / Antibiotics"
    },
    "Sulfamethoxazole": {
        "strengths": ["400 mg (with 80 mg Trimethoprim)", "800 mg (with 160 mg Trimethoprim)"],
        "defaultDose": "1 tablet",
        "category": "Anti-Infectives / Antibiotics"
    },
    "Levofloxacin": {
        "strengths": ["250 mg", "500 mg", "750 mg", "25 mg/mL Injection"],
        "defaultDose": "1 tablet",
        "category": "Anti-Infectives / Antibiotics"
    },
    "Metronidazole": {
        "strengths": ["250 mg", "500 mg", "500 mg Injection", "0.75% Gel"],
        "defaultDose": "1 tablet",
        "category": "Anti-Infectives / Antibiotics"
    },
    "Clindamycin": {
        "strengths": ["75 mg", "150 mg", "300 mg", "150 mg/mL Injection"],
        "defaultDose": "1 capsule",
        "category": "Anti-Infectives / Antibiotics"
    },
    "Nitrofurantoin": {
        "strengths": ["50 mg", "100 mg"],
        "defaultDose": "1 capsule",
        "category": "Anti-Infectives / Antibiotics"
    },
    "Fluconazole": {
        "strengths": ["50 mg", "100 mg", "150 mg", "200 mg", "2 mg/mL Injection"],
        "defaultDose": "1 tablet",
        "category": "Anti-Infectives / Antifungals"
    },
    "Acyclovir": {
        "strengths": ["200 mg", "400 mg", "800 mg", "250 mg Injection", "5% Cream"],
        "defaultDose": "1 tablet",
        "category": "Anti-Infectives / Antivirals"
    },
    "Valacyclovir": {
        "strengths": ["500 mg", "1000 mg"],
        "defaultDose": "1 tablet",
        "category": "Anti-Infectives / Antivirals"
    },
    "Oseltamivir": {
        "strengths": ["30 mg", "45 mg", "75 mg", "6 mg/mL (suspension)"],
        "defaultDose": "1 capsule",
        "category": "Anti-Infectives / Antivirals"
    },
    "Albuterol": {
        "strengths": ["90 mcg (inhaler)", "2 mg", "4 mg", "2 mg/5 mL (syrup)"],
        "defaultDose": "1 puff",
        "category": "Respiratory / Bronchodilators"
    },
    "Fluticasone": {
        "strengths": ["50 mcg (nasal spray)", "44 mcg (inhaler)", "110 mcg (inhaler)", "220 mcg (inhaler)"],
        "defaultDose": "1 spray",
        "category": "Respiratory / Corticosteroids"
    },
    "Montelukast": {
        "strengths": ["4 mg Chewable", "5 mg Chewable", "10 mg"],
        "defaultDose": "1 tablet",
        "category": "Respiratory / Antiasthmatics"
    },
    "Cetirizine": {
        "strengths": ["5 mg", "10 mg", "5 mg/5 mL (syrup)"],
        "defaultDose": "1 tablet",
        "category": "Allergy / Antihistamines"
    },
    "Loratadine": {
        "strengths": ["10 mg", "5 mg/5 mL (syrup)"],
        "defaultDose": "1 tablet",
        "category": "Allergy / Antihistamines"
    },
    "Fexofenadine": {
        "strengths": ["30 mg", "60 mg", "180 mg", "30 mg/5 mL (suspension)"],
        "defaultDose": "1 tablet",
        "category": "Allergy / Antihistamines"
    },
    "Diphenhydramine": {
        "strengths": ["25 mg", "50 mg", "12.5 mg/5 mL (liquid)", "50 mg/mL Injection"],
        "defaultDose": "1 capsule",
        "category": "Allergy / Antihistamines"
    },
    "Levocetirizine": {
        "strengths": ["5 mg", "2.5 mg/5 mL (oral solution)"],
        "defaultDose": "1 tablet",
        "category": "Allergy / Antihistamines"
    },
    "Budesonide": {
        "strengths": ["32 mcg (nasal spray)", "90 mcg (inhaler)", "180 mcg (inhaler)", "0.25 mg/2 mL (suspension)"],
        "defaultDose": "1 puff",
        "category": "Respiratory / Corticosteroids"
    },
    "Ipratropium": {
        "strengths": ["17 mcg (inhaler)", "0.02% (inhalation solution)", "0.03% (nasal spray)"],
        "defaultDose": "1 puff",
        "category": "Respiratory / Anticholinergics"
    },
    "Prednisone": {
        "strengths": ["1 mg", "2.5 mg", "5 mg", "10 mg", "20 mg", "50 mg"],
        "defaultDose": "1 tablet",
        "category": "Systemic Hormones / Corticosteroids"
    },
    "Methylprednisolone": {
        "strengths": ["4 mg", "8 mg", "16 mg", "32 mg", "40 mg Injection", "125 mg Injection"],
        "defaultDose": "1 tablet",
        "category": "Systemic Hormones / Corticosteroids"
    },
    "Triamcinolone": {
        "strengths": ["40 mg/mL Injection", "0.1% Cream", "0.1% Dental Paste", "55 mcg (nasal spray)"],
        "defaultDose": "1 application",
        "category": "Systemic Hormones / Corticosteroids"
    },
    "Metformin": {
        "strengths": ["500 mg", "850 mg", "1000 mg", "500 mg Extended Release", "1000 mg Extended Release"],
        "defaultDose": "1 tablet",
        "category": "Endocrinology / Antidiabetic Agents"
    },
    "Glipizide": {
        "strengths": ["2.5 mg", "5 mg", "10 mg", "5 mg Extended Release", "10 mg Extended Release"],
        "defaultDose": "1 tablet",
        "category": "Endocrinology / Antidiabetic Agents"
    },
    "Levothyroxine": {
        "strengths": ["25 mcg", "50 mcg", "75 mcg", "88 mcg", "100 mcg", "112 mcg", "125 mcg", "137 mcg", "150 mcg"],
        "defaultDose": "1 tablet",
        "category": "Endocrinology / Thyroid Hormones"
    },
    "Insulin Glargine": {
        "strengths": ["100 units/mL Injection"],
        "defaultDose": "1 injection",
        "category": "Endocrinology / Insulins"
    },
    "Glimepiride": {
        "strengths": ["1 mg", "2 mg", "4 mg"],
        "defaultDose": "1 tablet",
        "category": "Endocrinology / Antidiabetic Agents"
    },
    "Pioglitazone": {
        "strengths": ["15 mg", "30 mg", "45 mg"],
        "defaultDose": "1 tablet",
        "category": "Endocrinology / Antidiabetic Agents"
    },
    "Sitagliptin": {
        "strengths": ["25 mg", "50 mg", "100 mg"],
        "defaultDose": "1 tablet",
        "category": "Endocrinology / Antidiabetic Agents"
    },
    "Empagliflozin": {
        "strengths": ["10 mg", "25 mg"],
        "defaultDose": "1 tablet",
        "category": "Endocrinology / Antidiabetic Agents"
    },
    "Liraglutide": {
        "strengths": ["6 mg/mL Injection"],
        "defaultDose": "1 injection",
        "category": "Endocrinology / Antidiabetic Agents"
    },
    "Gabapentin": {
        "strengths": ["100 mg", "300 mg", "400 mg", "600 mg", "800 mg", "250 mg/5 mL (solution)"],
        "defaultDose": "1 capsule",
        "category": "Neurology / Anticonvulsants / Neuropathic Pain"
    },
    "Pregabalin": {
        "strengths": ["25 mg", "50 mg", "75 mg", "100 mg", "150 mg", "200 mg", "225 mg", "300 mg"],
        "defaultDose": "1 capsule",
        "category": "Neurology / Anticonvulsants / Neuropathic Pain"
    },
    "Duloxetine": {
        "strengths": ["20 mg", "30 mg", "40 mg", "60 mg"],
        "defaultDose": "1 capsule",
        "category": "Psychiatry / Antidepressants (SNRI)"
    },
    "Escitalopram": {
        "strengths": ["5 mg", "10 mg", "20 mg"],
        "defaultDose": "1 tablet",
        "category": "Psychiatry / Antidepressants (SSRI)"
    },
    "Fluoxetine": {
        "strengths": ["10 mg", "20 mg", "40 mg", "20 mg/5 mL (solution)"],
        "defaultDose": "1 capsule",
        "category": "Psychiatry / Antidepressants (SSRI)"
    },
    "Sertraline": {
        "strengths": ["25 mg", "50 mg", "100 mg", "20 mg/mL (oral concentrate)"],
        "defaultDose": "1 tablet",
        "category": "Psychiatry / Antidepressants (SSRI)"
    },
    "Venlafaxine": {
        "strengths": ["25 mg", "37.5 mg", "50 mg", "75 mg", "150 mg Extended Release"],
        "defaultDose": "1 capsule",
        "category": "Psychiatry / Antidepressants (SNRI)"
    },
    "Bupropion": {
        "strengths": ["75 mg", "100 mg", "150 mg Sustained Release", "300 mg Extended Release"],
        "defaultDose": "1 tablet",
        "category": "Psychiatry / Antidepressants (NDRI)"
    },
    "Alprazolam": {
        "strengths": ["0.25 mg", "0.5 mg", "1 mg", "2 mg"],
        "defaultDose": "1 tablet",
        "category": "Psychiatry / Anxiolytics (Benzodiazepine)"
    },
    "Clonazepam": {
        "strengths": ["0.125 mg", "0.25 mg", "0.5 mg", "1 mg", "2 mg"],
        "defaultDose": "1 tablet",
        "category": "Psychiatry / Anxiolytics (Benzodiazepine)"
    },
    "Diazepam": {
        "strengths": ["2 mg", "5 mg", "10 mg", "5 mg/mL Injection", "2 mg/5 mL (solution)"],
        "defaultDose": "1 tablet",
        "category": "Psychiatry / Anxiolytics (Benzodiazepine)"
    },
    "Lorazepam": {
        "strengths": ["0.5 mg", "1 mg", "2 mg", "2 mg/mL Injection"],
        "defaultDose": "1 tablet",
        "category": "Psychiatry / Anxiolytics (Benzodiazepine)"
    },
    "Trazodone": {
        "strengths": ["50 mg", "100 mg", "150 mg", "300 mg"],
        "defaultDose": "1 tablet",
        "category": "Psychiatry / Antidepressants"
    },
    "Risperidone": {
        "strengths": ["0.25 mg", "0.5 mg", "1 mg", "2 mg", "3 mg", "4 mg", "1 mg/mL (solution)"],
        "defaultDose": "1 tablet",
        "category": "Psychiatry / Antipsychotics"
    },
    "Quetiapine": {
        "strengths": ["25 mg", "50 mg", "100 mg", "200 mg", "300 mg", "400 mg"],
        "defaultDose": "1 tablet",
        "category": "Psychiatry / Antipsychotics"
    },
    "Aripiprazole": {
        "strengths": ["2 mg", "5 mg", "10 mg", "15 mg", "20 mg", "30 mg", "1 mg/mL (solution)"],
        "defaultDose": "1 tablet",
        "category": "Psychiatry / Antipsychotics"
    },
    "Olanzapine": {
        "strengths": ["2.5 mg", "5 mg", "7.5 mg", "10 mg", "15 mg", "20 mg"],
        "defaultDose": "1 tablet",
        "category": "Psychiatry / Antipsychotics"
    },
    "Haloperidol": {
        "strengths": ["0.5 mg", "1 mg", "2 mg", "5 mg", "10 mg", "20 mg", "5 mg/mL Injection"],
        "defaultDose": "1 tablet",
        "category": "Psychiatry / Antipsychotics"
    },
    "Lithium Carbonate": {
        "strengths": ["150 mg", "300 mg", "450 mg", "600 mg"],
        "defaultDose": "1 tablet",
        "category": "Psychiatry / Mood Stabilizers"
    },
    "Carbamazepine": {
        "strengths": ["100 mg Chewable", "200 mg", "100 mg/5 mL (suspension)"],
        "defaultDose": "1 tablet",
        "category": "Neurology / Anticonvulsants"
    },
    "Phenytoin": {
        "strengths": ["50 mg Chewable", "100 mg Prompt", "100 mg Extended", "125 mg/5 mL (suspension)"],
        "defaultDose": "1 capsule",
        "category": "Neurology / Anticonvulsants"
    },
    "Valproate": {
        "strengths": ["125 mg", "250 mg", "500 mg", "250 mg/5 mL (syrup)"],
        "defaultDose": "1 tablet",
        "category": "Neurology / Anticonvulsants"
    },
    "Levetiracetam": {
        "strengths": ["250 mg", "500 mg", "750 mg", "1000 mg", "100 mg/mL (solution)"],
        "defaultDose": "1 tablet",
        "category": "Neurology / Anticonvulsants"
    },
    "Donepezil": {
        "strengths": ["5 mg", "10 mg", "23 mg"],
        "defaultDose": "1 tablet",
        "category": "Neurology / Anti-Alzheimer's"
    },
    "Memantine": {
        "strengths": ["5 mg", "10 mg", "7 mg Extended Release", "14 mg Extended Release", "21 mg Extended Release", "28 mg Extended Release"],
        "defaultDose": "1 tablet",
        "category": "Neurology / Anti-Alzheimer's"
    },
    "Folic Acid": {
        "strengths": ["400 mcg", "800 mcg", "1 mg", "5 mg"],
        "defaultDose": "1 tablet",
        "category": "Supplements / Vitamins"
    },
    "Cholecalciferol": {
        "strengths": ["400 IU", "1000 IU", "2000 IU", "5000 IU", "50000 IU"],
        "defaultDose": "1 tablet",
        "category": "Supplements / Vitamins"
    },
    "Cyanocobalamin": {
        "strengths": ["100 mcg", "500 mcg", "1000 mcg", "1000 mcg/mL Injection"],
        "defaultDose": "1 tablet",
        "category": "Supplements / Vitamins"
    },
    "Calcium Carbonate": {
        "strengths": ["500 mg", "650 mg", "1250 mg"],
        "defaultDose": "1 tablet",
        "category": "Supplements / Minerals"
    },
    "Ferrous Sulfate": {
        "strengths": ["325 mg (65 mg elemental iron)", "75 mg/mL (drops)"],
        "defaultDose": "1 tablet",
        "category": "Supplements / Minerals"
    },
    "Zinc Sulfate": {
        "strengths": ["10 mg", "20 mg", "50 mg", "220 mg"],
        "defaultDose": "1 tablet",
        "category": "Supplements / Minerals"
    }
}

# Fetch brand names from openFDA API for each drug to make it a rich, complete online dataset
final_medicines = []
total_drugs = len(DRUG_METADATA)

print(f"Starting online openFDA brand lookup for {total_drugs} drugs...")
count = 0

for generic_name, meta in DRUG_METADATA.items():
    count += 1
    # Search label API
    query_str = urllib.parse.quote(f'openfda.generic_name:"{generic_name}"')
    url = f"https://api.fda.gov/drug/label.json?search={query_str}&limit=4"
    
    brand_names = []
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=8) as response:
            data = json.loads(response.read().decode('utf-8'))
            if "results" in data:
                for res in data["results"]:
                    openfda = res.get("openfda", {})
                    if "brand_name" in openfda:
                        for b in openfda["brand_name"]:
                            # Clean and format brand name
                            b_clean = re.split(r'[,()\/]', b)[0].strip().title()
                            if b_clean and b_clean not in brand_names and b_clean.lower() != generic_name.lower():
                                brand_names.append(b_clean)
    except Exception as e:
        # Silently log errors and fallback
        print(f"[{count}/{total_drugs}] API lookup skipped for {generic_name}: {str(e)}")
    
    # Sort and take top 5 brand names, append generic name
    brand_names = sorted(list(set(brand_names)))[:5]
    generics_list = [generic_name] + brand_names
    
    final_medicines.append({
        "name": generic_name,
        "generics": generics_list,
        "strengths": meta["strengths"],
        "defaultDose": meta["defaultDose"],
        "category": meta["category"]
    })
    
    print(f"[{count}/{total_drugs}] Resolved: {generic_name} | Brands: {brand_names}")
    # Rate limit safety sleep
    time.sleep(0.12)

# Format and write to client/src/utils/medicines.ts
ts_path = '../client/src/utils/medicines.ts'
if not os.path.exists(os.path.dirname(ts_path)):
    ts_path = 'client/src/utils/medicines.ts'  # fallback relative to root

ts_content = f"""// Medicine database — generated using online openFDA Search API
export interface Medicine {{
  name: string;
  generics: string[];
  strengths: string[];
  defaultDose: string;
  category: string;
}}

export const MEDICINES: Medicine[] = {json.dumps(final_medicines, indent=2)};

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

print(f"\nSuccessfully generated {len(final_medicines)} online-resolved medicines.")
print(f"Saved database file to {ts_path}")
