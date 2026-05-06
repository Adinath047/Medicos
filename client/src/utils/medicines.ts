// Medicine database — common drugs used in Indian clinical practice
export interface Medicine {
  name: string;
  generics: string[];
  strengths: string[];
  defaultDose: string;
  category: string;
}

export const MEDICINES: Medicine[] = [
  // Antibiotics
  { name:'Amoxicillin', generics:['Novamox','Mox'], strengths:['250mg','500mg','875mg'], defaultDose:'1 capsule', category:'Antibiotic' },
  { name:'Amoxicillin + Clavulanate', generics:['Augmentin','Clavam'], strengths:['375mg','625mg','1g'], defaultDose:'1 tablet', category:'Antibiotic' },
  { name:'Azithromycin', generics:['Azee','Zithromax','Azithral'], strengths:['250mg','500mg'], defaultDose:'1 tablet', category:'Antibiotic' },
  { name:'Ciprofloxacin', generics:['Ciplox','Cifran'], strengths:['250mg','500mg','750mg'], defaultDose:'1 tablet', category:'Antibiotic' },
  { name:'Doxycycline', generics:['Doxy-1','Vibramycin'], strengths:['100mg'], defaultDose:'1 capsule', category:'Antibiotic' },
  { name:'Metronidazole', generics:['Flagyl','Metrogyl'], strengths:['200mg','400mg','500mg'], defaultDose:'1 tablet', category:'Antibiotic' },
  { name:'Cephalexin', generics:['Sporidex','Cephadex'], strengths:['250mg','500mg'], defaultDose:'1 capsule', category:'Antibiotic' },
  { name:'Cefixime', generics:['Taxim-O','Zifi'], strengths:['100mg','200mg','400mg'], defaultDose:'1 tablet', category:'Antibiotic' },
  { name:'Cefuroxime', generics:['Ceftin','Zocef'], strengths:['250mg','500mg'], defaultDose:'1 tablet', category:'Antibiotic' },
  { name:'Levofloxacin', generics:['Levoquin','Lox'], strengths:['250mg','500mg','750mg'], defaultDose:'1 tablet', category:'Antibiotic' },
  { name:'Norfloxacin', generics:['Norflox'], strengths:['400mg'], defaultDose:'1 tablet', category:'Antibiotic' },
  { name:'Clarithromycin', generics:['Claribid','Klaricid'], strengths:['250mg','500mg'], defaultDose:'1 tablet', category:'Antibiotic' },
  { name:'Tinidazole', generics:['Tiniba','Fasigyn'], strengths:['500mg'], defaultDose:'2 tablets', category:'Antibiotic' },
  { name:'Cotrimoxazole', generics:['Bactrim','Septran'], strengths:['480mg','960mg'], defaultDose:'1 tablet', category:'Antibiotic' },

  // Analgesics & Anti-inflammatory
  { name:'Paracetamol', generics:['Crocin','Dolo','Calpol'], strengths:['325mg','500mg','650mg'], defaultDose:'1 tablet', category:'Analgesic' },
  { name:'Ibuprofen', generics:['Brufen','Combiflam'], strengths:['200mg','400mg','600mg'], defaultDose:'1 tablet', category:'NSAID' },
  { name:'Diclofenac', generics:['Voveran','Dynapar'], strengths:['50mg','75mg','100mg'], defaultDose:'1 tablet', category:'NSAID' },
  { name:'Nimesulide', generics:['Nimulid','Nise'], strengths:['100mg'], defaultDose:'1 tablet', category:'NSAID' },
  { name:'Aceclofenac', generics:['Aceclo','Dolokind'], strengths:['100mg'], defaultDose:'1 tablet', category:'NSAID' },
  { name:'Aceclofenac + Paracetamol', generics:['Zerodol-P','Hifenac-P'], strengths:['100mg+325mg'], defaultDose:'1 tablet', category:'NSAID' },
  { name:'Tramadol', generics:['Ultram','Tramazac'], strengths:['50mg','100mg'], defaultDose:'1 capsule', category:'Opioid Analgesic' },
  { name:'Aspirin', generics:['Ecosprin','Disprin'], strengths:['75mg','150mg','325mg'], defaultDose:'1 tablet', category:'Analgesic/Antiplatelet' },
  { name:'Mefenamic Acid', generics:['Meftal','Ponstan'], strengths:['250mg','500mg'], defaultDose:'1 capsule', category:'NSAID' },
  { name:'Etoricoxib', generics:['Arcoxia','Etody'], strengths:['60mg','90mg','120mg'], defaultDose:'1 tablet', category:'COX-2 Inhibitor' },

  // Antihypertensives
  { name:'Amlodipine', generics:['Amlovas','Stamlo'], strengths:['2.5mg','5mg','10mg'], defaultDose:'1 tablet', category:'Antihypertensive' },
  { name:'Telmisartan', generics:['Telma','Telsartan'], strengths:['20mg','40mg','80mg'], defaultDose:'1 tablet', category:'Antihypertensive' },
  { name:'Losartan', generics:['Repace','Losar'], strengths:['25mg','50mg','100mg'], defaultDose:'1 tablet', category:'Antihypertensive' },
  { name:'Enalapril', generics:['Enam','Envas'], strengths:['2.5mg','5mg','10mg'], defaultDose:'1 tablet', category:'Antihypertensive' },
  { name:'Atenolol', generics:['Tenormin','Aten'], strengths:['25mg','50mg','100mg'], defaultDose:'1 tablet', category:'Beta Blocker' },
  { name:'Metoprolol', generics:['Metolar','Betaloc'], strengths:['25mg','50mg','100mg'], defaultDose:'1 tablet', category:'Beta Blocker' },
  { name:'Ramipril', generics:['Cardace','Ramistar'], strengths:['1.25mg','2.5mg','5mg','10mg'], defaultDose:'1 tablet', category:'Antihypertensive' },
  { name:'Hydrochlorothiazide', generics:['Aquazide'], strengths:['12.5mg','25mg'], defaultDose:'1 tablet', category:'Diuretic' },
  { name:'Furosemide', generics:['Lasix','Frusenex'], strengths:['20mg','40mg'], defaultDose:'1 tablet', category:'Diuretic' },
  { name:'Spironolactone', generics:['Aldactone'], strengths:['25mg','50mg','100mg'], defaultDose:'1 tablet', category:'Diuretic' },

  // Antidiabetics
  { name:'Metformin', generics:['Glycomet','Glucophage'], strengths:['500mg','850mg','1000mg'], defaultDose:'1 tablet', category:'Antidiabetic' },
  { name:'Glimepiride', generics:['Amaryl','Glimpid'], strengths:['1mg','2mg','3mg','4mg'], defaultDose:'1 tablet', category:'Antidiabetic' },
  { name:'Glipizide', generics:['Glynase','Dibizide'], strengths:['2.5mg','5mg','10mg'], defaultDose:'1 tablet', category:'Antidiabetic' },
  { name:'Sitagliptin', generics:['Januvia','Istavel'], strengths:['25mg','50mg','100mg'], defaultDose:'1 tablet', category:'Antidiabetic' },
  { name:'Vildagliptin', generics:['Jalra','Galvus'], strengths:['50mg'], defaultDose:'1 tablet', category:'Antidiabetic' },
  { name:'Dapagliflozin', generics:['Forxiga','Dapaglyn'], strengths:['5mg','10mg'], defaultDose:'1 tablet', category:'Antidiabetic' },
  { name:'Empagliflozin', generics:['Jardiance','Empaglu'], strengths:['10mg','25mg'], defaultDose:'1 tablet', category:'Antidiabetic' },
  { name:'Insulin Glargine', generics:['Lantus','Basalog'], strengths:['100 IU/mL'], defaultDose:'As directed', category:'Insulin' },
  { name:'Insulin Regular', generics:['Actrapid','Wosulin-R'], strengths:['100 IU/mL'], defaultDose:'As directed', category:'Insulin' },
  { name:'Pioglitazone', generics:['Pioglit','Actos'], strengths:['15mg','30mg','45mg'], defaultDose:'1 tablet', category:'Antidiabetic' },

  // Gastrointestinal
  { name:'Pantoprazole', generics:['Pan','Pantop','Pantocid'], strengths:['20mg','40mg'], defaultDose:'1 tablet', category:'PPI' },
  { name:'Omeprazole', generics:['Omez','Prilosec'], strengths:['10mg','20mg','40mg'], defaultDose:'1 capsule', category:'PPI' },
  { name:'Rabeprazole', generics:['Rablet','Razo'], strengths:['10mg','20mg'], defaultDose:'1 tablet', category:'PPI' },
  { name:'Esomeprazole', generics:['Nexpro','Nexium'], strengths:['20mg','40mg'], defaultDose:'1 tablet', category:'PPI' },
  { name:'Domperidone', generics:['Domstal','Motilium'], strengths:['10mg'], defaultDose:'1 tablet', category:'Antiemetic' },
  { name:'Ondansetron', generics:['Emeset','Zofran'], strengths:['4mg','8mg'], defaultDose:'1 tablet', category:'Antiemetic' },
  { name:'Metoclopramide', generics:['Perinorm','Reglan'], strengths:['10mg'], defaultDose:'1 tablet', category:'Antiemetic' },
  { name:'Ranitidine', generics:['Rantac','Zinetac'], strengths:['150mg','300mg'], defaultDose:'1 tablet', category:'H2 Blocker' },
  { name:'Dicyclomine', generics:['Cyclopam','Meftal-Spas'], strengths:['10mg','20mg'], defaultDose:'1 tablet', category:'Antispasmodic' },
  { name:'Loperamide', generics:['Imodium','Lopamide'], strengths:['2mg'], defaultDose:'2 capsules', category:'Antidiarrheal' },
  { name:'ORS', generics:['Electral','Enerlyte'], strengths:['per sachet'], defaultDose:'1 sachet in 200mL water', category:'Rehydration' },
  { name:'Lactulose', generics:['Duphalac','Looz'], strengths:['3.35g/5mL'], defaultDose:'15-30 mL', category:'Laxative' },

  // Respiratory
  { name:'Salbutamol', generics:['Asthalin','Ventolin'], strengths:['2mg','4mg','Inhaler 100mcg'], defaultDose:'1 tablet', category:'Bronchodilator' },
  { name:'Levosalbutamol', generics:['Levolin','Salbair-L'], strengths:['1mg','2mg'], defaultDose:'1 tablet', category:'Bronchodilator' },
  { name:'Montelukast', generics:['Montair','Singulair'], strengths:['4mg','5mg','10mg'], defaultDose:'1 tablet', category:'Anti-asthmatic' },
  { name:'Cetirizine', generics:['Alerid','Zyrtec','Cetcip'], strengths:['5mg','10mg'], defaultDose:'1 tablet', category:'Antihistamine' },
  { name:'Levocetirizine', generics:['Xyzal','Levocet','L-Cin'], strengths:['2.5mg','5mg'], defaultDose:'1 tablet', category:'Antihistamine' },
  { name:'Fexofenadine', generics:['Allegra','Fexo'], strengths:['60mg','120mg','180mg'], defaultDose:'1 tablet', category:'Antihistamine' },
  { name:'Chlorpheniramine', generics:['Piriton','Phenergan'], strengths:['4mg'], defaultDose:'1 tablet', category:'Antihistamine' },
  { name:'Budesonide Inhaler', generics:['Budecort','Pulmicort'], strengths:['100mcg','200mcg','400mcg'], defaultDose:'2 puffs', category:'Inhaled Steroid' },
  { name:'Fluticasone Inhaler', generics:['Flohale','Flixotide'], strengths:['125mcg','250mcg'], defaultDose:'2 puffs', category:'Inhaled Steroid' },
  { name:'Dextromethorphan', generics:['Alex','Benadryl DX'], strengths:['10mg/5mL'], defaultDose:'10 mL', category:'Antitussive' },
  { name:'Bromhexine', generics:['Bromhexine','Brozedex'], strengths:['4mg','8mg'], defaultDose:'1 tablet', category:'Mucolytic' },
  { name:'Ambroxol', generics:['Mucosolvan','Ambrolite'], strengths:['30mg','75mg'], defaultDose:'1 tablet', category:'Mucolytic' },

  // Cardiac & Lipid
  { name:'Atorvastatin', generics:['Lipitor','Atorva','Storvas'], strengths:['5mg','10mg','20mg','40mg','80mg'], defaultDose:'1 tablet', category:'Statin' },
  { name:'Rosuvastatin', generics:['Crestor','Rosuvas'], strengths:['5mg','10mg','20mg','40mg'], defaultDose:'1 tablet', category:'Statin' },
  { name:'Clopidogrel', generics:['Plavix','Clopilet'], strengths:['75mg','150mg'], defaultDose:'1 tablet', category:'Antiplatelet' },
  { name:'Nitroglycerin', generics:['Nitrostat','Angispan'], strengths:['0.4mg SL','2.6mg SR'], defaultDose:'1 tablet sublingual', category:'Antianginal' },
  { name:'Isosorbide Mononitrate', generics:['Ismo','Imdur'], strengths:['20mg','30mg','60mg'], defaultDose:'1 tablet', category:'Antianginal' },
  { name:'Digoxin', generics:['Lanoxin','Digoxin'], strengths:['0.125mg','0.25mg'], defaultDose:'1 tablet', category:'Cardiac Glycoside' },
  { name:'Warfarin', generics:['Coumadin','Warf'], strengths:['1mg','2mg','5mg'], defaultDose:'As directed', category:'Anticoagulant' },

  // Neurology / Psychiatry
  { name:'Phenytoin', generics:['Dilantin','Eptoin'], strengths:['50mg','100mg'], defaultDose:'1 tablet', category:'Antiepileptic' },
  { name:'Carbamazepine', generics:['Tegretol','Mazetol'], strengths:['100mg','200mg','400mg'], defaultDose:'1 tablet', category:'Antiepileptic' },
  { name:'Valproate', generics:['Depakote','Encorate'], strengths:['200mg','500mg'], defaultDose:'1 tablet', category:'Antiepileptic' },
  { name:'Levetiracetam', generics:['Keppra','Levera'], strengths:['250mg','500mg','1000mg'], defaultDose:'1 tablet', category:'Antiepileptic' },
  { name:'Gabapentin', generics:['Neurontin','Gabapin'], strengths:['100mg','300mg','400mg'], defaultDose:'1 capsule', category:'Neuropathic Pain' },
  { name:'Pregabalin', generics:['Lyrica','Pregeb'], strengths:['25mg','75mg','150mg','300mg'], defaultDose:'1 capsule', category:'Neuropathic Pain' },
  { name:'Alprazolam', generics:['Xanax','Alprax'], strengths:['0.25mg','0.5mg','1mg'], defaultDose:'1 tablet', category:'Anxiolytic' },
  { name:'Clonazepam', generics:['Klonopin','Clonotril'], strengths:['0.25mg','0.5mg','1mg','2mg'], defaultDose:'1 tablet', category:'Anxiolytic' },
  { name:'Diazepam', generics:['Valium','Calmpose'], strengths:['2mg','5mg','10mg'], defaultDose:'1 tablet', category:'Anxiolytic' },
  { name:'Fluoxetine', generics:['Prozac','Fludac'], strengths:['10mg','20mg'], defaultDose:'1 capsule', category:'Antidepressant' },
  { name:'Sertraline', generics:['Zoloft','Serta'], strengths:['25mg','50mg','100mg'], defaultDose:'1 tablet', category:'Antidepressant' },
  { name:'Escitalopram', generics:['Lexapro','Nexito'], strengths:['5mg','10mg','20mg'], defaultDose:'1 tablet', category:'Antidepressant' },
  { name:'Amitriptyline', generics:['Elavil','Tryptomer'], strengths:['10mg','25mg','50mg'], defaultDose:'1 tablet', category:'Antidepressant' },
  { name:'Risperidone', generics:['Risperdal','Sizodon'], strengths:['0.5mg','1mg','2mg','4mg'], defaultDose:'1 tablet', category:'Antipsychotic' },
  { name:'Quetiapine', generics:['Seroquel','Qutan'], strengths:['25mg','50mg','100mg','200mg'], defaultDose:'1 tablet', category:'Antipsychotic' },

  // Hormones & Endocrine
  { name:'Levothyroxine', generics:['Thyronorm','Eltroxin'], strengths:['25mcg','50mcg','75mcg','100mcg'], defaultDose:'1 tablet', category:'Thyroid' },
  { name:'Methimazole', generics:['Methimazole','Thyrocab'], strengths:['5mg','10mg'], defaultDose:'1 tablet', category:'Antithyroid' },
  { name:'Prednisolone', generics:['Deltacortril','Wysolone'], strengths:['5mg','10mg','20mg','40mg'], defaultDose:'1 tablet', category:'Corticosteroid' },
  { name:'Dexamethasone', generics:['Decadron','Dexona'], strengths:['0.5mg','4mg','8mg'], defaultDose:'1 tablet', category:'Corticosteroid' },
  { name:'Hydrocortisone', generics:['Cortef','Hisone'], strengths:['10mg','20mg'], defaultDose:'1 tablet', category:'Corticosteroid' },
  { name:'Medroxyprogesterone', generics:['Provera','Meprate'], strengths:['2.5mg','5mg','10mg'], defaultDose:'1 tablet', category:'Progestogen' },

  // Vitamins & Supplements
  { name:'Vitamin D3', generics:['D-Rise','Calcirol','Arachitol'], strengths:['1000 IU','2000 IU','60000 IU'], defaultDose:'1 tablet', category:'Vitamin' },
  { name:'Calcium + Vitamin D3', generics:['Shelcal','Calcitas'], strengths:['500mg+250IU','1000mg+500IU'], defaultDose:'1 tablet', category:'Supplement' },
  { name:'Vitamin B12', generics:['Mecobalamin','Neurobion'], strengths:['500mcg','1500mcg'], defaultDose:'1 tablet', category:'Vitamin' },
  { name:'Folic Acid', generics:['Folvite','Folifer'], strengths:['400mcg','5mg'], defaultDose:'1 tablet', category:'Vitamin' },
  { name:'Ferrous Sulphate', generics:['Feosol','Fefol'], strengths:['200mg','325mg'], defaultDose:'1 tablet', category:'Iron Supplement' },
  { name:'Zinc Sulphate', generics:['Zincovit','Zinctoral'], strengths:['10mg','20mg'], defaultDose:'1 tablet', category:'Supplement' },
  { name:'Multivitamin', generics:['Revital','Supradyn','Zevit'], strengths:['per tablet'], defaultDose:'1 tablet', category:'Supplement' },
  { name:'Omega-3', generics:['Maxepa','Omacor'], strengths:['1000mg'], defaultDose:'1 capsule', category:'Supplement' },

  // Dermatology (oral)
  { name:'Fluconazole', generics:['Diflucan','Forcan'], strengths:['50mg','100mg','150mg','200mg'], defaultDose:'1 tablet', category:'Antifungal' },
  { name:'Itraconazole', generics:['Sporanox','Canditral'], strengths:['100mg','200mg'], defaultDose:'1 capsule', category:'Antifungal' },
  { name:'Terbinafine', generics:['Lamisil','Terbicip'], strengths:['250mg'], defaultDose:'1 tablet', category:'Antifungal' },
  { name:'Hydroxychloroquine', generics:['Plaquenil','HCQS'], strengths:['200mg','400mg'], defaultDose:'1 tablet', category:'Antimalarial/DMARD' },

  // Antimalarials
  { name:'Chloroquine', generics:['Lariago','Resochin'], strengths:['150mg','250mg'], defaultDose:'2 tablets', category:'Antimalarial' },
  { name:'Artemether + Lumefantrine', generics:['Coartem','Lumether'], strengths:['20mg+120mg'], defaultDose:'4 tablets', category:'Antimalarial' },
  { name:'Primaquine', generics:['Malirid'], strengths:['2.5mg','7.5mg','15mg'], defaultDose:'1 tablet', category:'Antimalarial' },

  // Antivirals
  { name:'Acyclovir', generics:['Zovirax','Cyclovir'], strengths:['200mg','400mg','800mg'], defaultDose:'1 tablet', category:'Antiviral' },
  { name:'Oseltamivir', generics:['Tamiflu','Antiflu'], strengths:['30mg','45mg','75mg'], defaultDose:'1 capsule', category:'Antiviral' },

  // Urology
  { name:'Tamsulosin', generics:['Urimax','Flomax'], strengths:['0.2mg','0.4mg'], defaultDose:'1 capsule', category:'Alpha Blocker' },
  { name:'Finasteride', generics:['Proscar','Finpecia'], strengths:['1mg','5mg'], defaultDose:'1 tablet', category:'5-Alpha Reductase Inhibitor' },
  { name:'Sildenafil', generics:['Viagra','Penegra'], strengths:['25mg','50mg','100mg'], defaultDose:'1 tablet', category:'PDE5 Inhibitor' },
  { name:'Oxybutynin', generics:['Ditropan','Oxytrol'], strengths:['5mg','10mg'], defaultDose:'1 tablet', category:'Anticholinergic' },

  // Ophthalmology (drops)
  { name:'Ciprofloxacin Eye Drops', generics:['Ciplox Eye','Cifran Eye'], strengths:['0.3%'], defaultDose:'2 drops', category:'Eye Drop' },
  { name:'Moxifloxacin Eye Drops', generics:['Vigamox','Moxicip'], strengths:['0.5%'], defaultDose:'1 drop', category:'Eye Drop' },
  { name:'Timolol Eye Drops', generics:['Timolet','Ocupres'], strengths:['0.25%','0.5%'], defaultDose:'1 drop', category:'Eye Drop' },
  { name:'Latanoprost Eye Drops', generics:['Xalatan','Latoprost'], strengths:['0.005%'], defaultDose:'1 drop', category:'Eye Drop' },
  { name:'Dexamethasone Eye Drops', generics:['Dexcin','Decdan'], strengths:['0.1%'], defaultDose:'1-2 drops', category:'Eye Drop' },
  { name:'Lubricant Eye Drops', generics:['Refresh Tears','Optive'], strengths:['0.5%'], defaultDose:'1-2 drops', category:'Eye Drop' },
];

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
