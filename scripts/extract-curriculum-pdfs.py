import concurrent.futures, hashlib, json, pathlib, requests, pdfplumber
OUT=pathlib.Path('.curriculum-research'); OUT.mkdir(exist_ok=True)
urls={
'quimica-plan':'https://frba.utn.edu.ar/wp-content/uploads/2026/02/PLAN-2023-WEB-UTN-FRBA-2026-1.pdf',
'civil':'https://www.frba.utn.edu.ar/wp-content/uploads/2025/02/Asignaturas-y-Correlativas-Plan-2023-CL-2025.pdf',
'sistemas':'https://www.frba.utn.edu.ar/wp-content/uploads/2023/11/Correlativas-plan-2023.pdf',
'electronica':'https://www.frba.utn.edu.ar/wp-content/uploads/2022/08/Plan-2023-Ord1850-correlatividades.pdf',
'industrial':'https://frba.utn.edu.ar/wp-content/uploads/2025/04/PLAN-I23-y-correlativas-oficio-_-actualizacion.pdf',
'quimica':'https://frba.utn.edu.ar/wp-content/uploads/2023/03/CORRELATIVAS-PLAN-2023-MOD.-2025-WEB-COMPLETO-ord.2138-deroga-2082-solo-correlativas.pdf'}
def extract(item):
 key,url=item; r=requests.get(url,timeout=120); r.raise_for_status(); path=OUT/f'{key}.pdf'; path.write_bytes(r.content)
 with pdfplumber.open(path) as pdf:
  tables=[{'page':i+1,'tables':page.extract_tables(),'text':page.extract_text()} for i,page in enumerate(pdf.pages)]
 (OUT/f'{key}-pdf.json').write_text(json.dumps(tables,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({'key':key,'url':url,'sha256':hashlib.sha256(r.content).hexdigest(),'pages':[{'page':p['page'],'tables':[len(t) for t in p['tables']]} for p in tables]}),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(extract,urls.items()))
