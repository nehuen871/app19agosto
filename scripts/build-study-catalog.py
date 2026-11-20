"""One-off, reviewable normalization of downloaded official UTN.BA tables.
Run after research-curricula.py / extract-curriculum-pdfs.py. No database access.
"""
import copy, hashlib, json, pathlib, re, unicodedata
ROOT=pathlib.Path('.curriculum-research')
def load(k): return json.loads((ROOT/(k+'.json')).read_text(encoding='utf-8'))
def clean(s): return re.sub(r'\s+',' ',s or '').strip()
def norm(s): return re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',clean(s).lower()).encode('ascii','ignore').decode())
def rule(): return {'regular':[],'approved':[],'notes':[]}
def course(code,name,year,regular='',approved='',exam=None,kind='SUBJECT'):
 return {'code':str(code),'name':clean(name),'year':year,'kind':kind,'notes':'','raw':[clean(regular),clean(approved),None if exam is None else clean(exam)]}
rom={'I':1,'II':2,'III':3,'IV':4,'V':5,'VI':6}
plans=[]
def plan(k,v,url,courses,notes=''):
 file=ROOT/(k+'.pdf' if (ROOT/(k+'.pdf')).exists() else k+'.html')
 p={'id':'frba-'+k+'-'+v.lower().replace(' ','-'),'specialty':k.upper(),'version':v,'name':'UTN Buenos Aires · '+v,'sourceUrl':url,'verifiedAt':'2026-11-19T00:00:00.000Z','sourceSha256':hashlib.sha256(file.read_bytes()).hexdigest(),'notes':notes,'courses':courses};plans.append(p);return p
for k,v in [('naval','U13'),('electrica','95A'),('mecanica','2023')]:
 rows=load(k+'-tables')[-1]; courses=[];year=1
 for r in rows[2:]:
  expected=7 if k=='naval' else 6 if k=='electrica' else 5
  if len(r)==expected:
   if r[0]: year=rom.get(r[0],int(r[0]) if r[0].isdigit() else year)
   r=r[1:]
  if len(r)!=expected-1 or not re.fullmatch(r'\d+\.?',r[0]):continue
  code=r[0].strip('.');name=r[1];extra=1 if k=='naval' else 0
  c=course(code,name,year,r[2+extra],r[3+extra],None if k=='mecanica' else r[4+extra]);courses.append(c)
  if 'electiva' in name.lower() or (k=='electrica' and int(code)>40):c['kind']='ELECTIVE';c['year']=0
  if 'supervisada' in name.lower():c['kind']='PRACTICE'
 if k=='mecanica':courses.append(course('PPS','Práctica Profesional Supervisada',5,kind='PRACTICE'))
 p=plan(k,v,{'naval':'https://frba.utn.edu.ar/naval/correlatividades/','electrica':'https://frba.utn.edu.ar/electrica/correlatividades/','mecanica':'https://frba.utn.edu.ar/mecanica/plan-de-estudios-2023/'}[k],courses,'Versión publicada por el departamento. El avance es personal; las condiciones administrativas, electivas y prácticas se verifican con la facultad.')
rows=load('textil-tables')[-1];courses=[];year=1
for r in rows:
 if len(r)==1:
  year={'PRIMER NIVEL':1,'SEGUNDO NIVEL':2,'TERCER NIVEL':3,'CUARTO NIVEL':4,'QUINTO NIVEL':5}.get(r[0],year);continue
 m=re.match(r'^(\d+)[-–](.*)',r[0]) if r else None
 if m and len(r)==4:courses.append(course(m[1],m[2],year,*r[1:]))
courses.append(course('PPS','Práctica Profesional Supervisada',5,kind='PRACTICE'))
plan('textil','2016','https://frba.utn.edu.ar/textil/coorrelativas/',courses,'Plan 2016 publicado por el departamento. Electivas y PPS de 200 horas: verificar acreditación y oferta con la facultad.')
for k in ['sistemas','electronica']:
 pages=load(k+'-pdf');tables=[p['tables'][-1] for p in (pages if k=='sistemas' else pages[2:4])];courses=[];year=1
 for t in tables:
  for r in t:
   if len(r)!=5 or not re.fullmatch(r'\d+',r[1] or ''):continue
   year=rom.get(r[0],year);courses.append(course(r[1],r[2],year,r[3],r[4]))
 courses.append(course('PPS','Práctica Profesional Supervisada',5,kind='PRACTICE'))
 plan(k,'2023',{'sistemas':'https://www.frba.utn.edu.ar/wp-content/uploads/2023/11/Correlativas-plan-2023.pdf','electronica':'https://www.frba.utn.edu.ar/wp-content/uploads/2022/08/Plan-2023-Ord1850-correlatividades.pdf'}[k],courses,'Correlativas para cursar y rendir según ordenanza. Proyecto Final y PPS tienen condiciones adicionales de acreditación. Verificar las horas electivas con la facultad.')
data=load('industrial-pdf');courses=[]
years={norm(r[1].split('(')[0]):i+1 for i,t in enumerate(data[0]['tables']) for r in t if len(r)>1 and r[1]}
for r in data[1]['tables'][0]:
 if len(r)!=5:continue
 code=clean(r[0]);name=clean(r[1]);kind='SUBJECT'
 if not code.isdigit():
  if not name.startswith('Gestión Industrial'):continue
  code='INTERMEDIO';kind='OPTIONAL'
 if code.isdigit() and int(code)>=43:kind='ELECTIVE'
 if 'supervisada' in name.lower():kind='PRACTICE'
 n=norm(name.split('(')[0]); n=n.replace('distribuciondeplantas','distribucionenplanta'); n=n.replace('ingambiental','ingenieriaambiental'); n=n.replace('resistenciadelosmateriales','resistenciademateriales'); n=n.replace('cienciademateriales','cienciadelosmateriales').replace('ingenieriadecalidad','ingenieriaencalidad')
 year=years.get(n,0 if kind=='ELECTIVE' else 5 if kind=='PRACTICE' else 3 if kind=='OPTIONAL' else None)
 if year is None:raise ValueError(('industrial year',code,name))
 courses.append(course(code,name,year,*r[2:],kind=kind))
plan('industrial','I23','https://frba.utn.edu.ar/wp-content/uploads/2025/04/PLAN-I23-y-correlativas-oficio-_-actualizacion.pdf',courses,'Plan I23, actualización publicada en abril de 2025. Las electivas son alternativas; no se exige aprobar todo el catálogo. Gestión Industrial corresponde al título intermedio.')
# Civil / Química use named prerequisites and continuation rows across pages.
for k in ['civil','quimica']:
 courses=[];last=None;year=1
 for pi,p in enumerate(load(k+'-pdf')):
  for t in p['tables']:
   for r in t:
    if k=='civil':
     if len(r)!=7:continue
     yr,num,official,name,hours,reg,appr=r
     year=rom.get(yr,year)
     if name and (num and num.isdigit() or official and re.fullmatch(r'95-\d+',official) or not num and not official and hours and re.search(r'\d',hours)):
      code=num if num else 'E'+(official or norm(name));kind='SUBJECT' if num else 'ELECTIVE'
     elif not name and not num and not official and last:
      last['raw'][0]+=' '+clean(reg);last['raw'][1]+=' '+clean(appr);continue
     else:continue
    else:
     if len(r)!=4:continue
     code,name,reg,appr=r
     if not code and not name and last and (reg or appr):
      if 'Para Cursar' not in clean(reg):last['raw'][0]+=' '+clean(reg);last['raw'][1]+=' '+clean(appr)
      continue
     if not code or not code.isdigit():continue
     kind='ELECTIVE' if pi==3 else 'PRACTICE' if code=='231699' else 'SUBJECT'
     year=0
    existing=next((c for c in courses if c['code']==code),None)
    if existing:
     if k=='civil' and yr in rom:existing['year']=rom[yr]
     last=existing;continue
    last=course(code,name,year,reg,appr,kind=kind);courses.append(last)
 if k=='quimica':
  # Exact levels in the department's 2026 publication of Plan 2023.
  groups=[['231110','951601','951602','951604','950701','950702','950703','231407','951199'],['231120','231121','951122','951603','950605','950704','950606','951198'],['231130','950309','231133','951125','231131','951130','231132','951128','950310','951129'],['231140','231141','231142','951197','951194','951135','231150'],['231155','231152','951138','231154','231143','231151','231153','231699']]
  for c in courses:
   if c['kind']!='ELECTIVE':c['year']=next(i+1 for i,g in enumerate(groups) if c['code'] in g)
 else:courses.append(course('PPS','Práctica Profesional Supervisada',6,kind='PRACTICE'))
 plan(k,'2023','https://www.frba.utn.edu.ar/wp-content/uploads/2025/02/Asignaturas-y-Correlativas-Plan-2023-CL-2025.pdf' if k=='civil' else 'https://frba.utn.edu.ar/wp-content/uploads/2023/03/CORRELATIVAS-PLAN-2023-MOD.-2025-WEB-COMPLETO-ord.2138-deroga-2082-solo-correlativas.pdf',courses,'Civil: correlativas CL 2025.' if k=='civil' else 'Química: correlativas Ord. 2138; niveles según publicación 2026 del Plan 2023: https://frba.utn.edu.ar/wp-content/uploads/2026/02/PLAN-2023-WEB-UTN-FRBA-2026-1.pdf . Electivas: 12 horas anuales; PPS: 150 horas reloj.')
def names(raw,courses):
 def words(s):return ' '.join(re.findall('[a-z0-9]+',unicodedata.normalize('NFKD',clean(s).lower()).encode('ascii','ignore').decode()))
 text=words(raw);aliases={}
 for c in courses:
  name=c['name'].split('(')[0];aliases[words(name)]=c['code']
  aliases[words(name).replace('algebra y geometria analitica','algebra y geom analitica')]=c['code']
 # Official spelling variants in the prerequisite columns.
 for old,new in [('analisis de matematico ii','analisis matematico ii'),('ingles i','ingles tecnico i'),('ingles ii','ingles tecnico ii')]:
  if new in aliases:aliases[old]=aliases[new]
 keys=sorted(aliases,key=len,reverse=True);found=[];unknown=[]
 while text:
  key=next((a for a in keys if text==a or text.startswith(a+' ')),None)
  if key:found.append(aliases[key]);text=text[len(key):].strip()
  else:
   token,_,text=text.partition(' ');unknown.append(token)
 return list(dict.fromkeys(found)),''.join(unknown)
unknown=[]
for p in plans:
 cs=p['courses'];codes={c['code'] for c in cs};core=[c['code'] for c in cs if c['kind']=='SUBJECT'];k=p['specialty'].lower()
 def parse(raw):
  r=rule();s=clean(raw)
  s=re.sub(r'TENER CURSADAS|TENER APROBADAS|(?<!\w)Cursada(?!\w)|(?<!\w)Aprobada(?!\w)','',s)
  s=s.split('Para presentarse a rendir')[0].strip()
  if not norm(s):return [],[]
  if re.fullmatch(r'[\d\s.,/–—−_-]+',s):
   nums=[str(int(n)) for n in re.findall(r'\d+',s)];missing=[n for n in nums if n not in codes]
   return [n for n in nums if n in codes],['Revisar requisito publicado: '+s] if missing else []
  if k in ['civil','quimica']:
   nums,rest=names(s,cs)
   if rest:unknown.append((k,s,rest));return nums,['Revisar requisito publicado: '+s]
   return nums,[]
  return [],['Revisar requisito publicado: '+s]
 for c in cs:
  raw=c.pop('raw');en=rule();ex=rule()
  # Electronics embeds final-exam text in the approved column.
  if k=='electronica' and c['code']=='37':raw=['29-30-32','22-23-25-27',None]
  if k=='quimica' and c['code']=='231155':raw[0]=raw[0].replace('Para Cursar','')
  en['regular'],notes=parse(raw[0]);en['notes']+=notes
  en['approved'],notes=parse(raw[1]);en['notes']+=notes
  if raw[2] is None:ex=copy.deepcopy(en)
  elif 'TODAS' in raw[2].upper():ex['approved']=[code for code in core if code!=c['code']];ex['notes']=['Verificar además la carga de electivas y las condiciones de acreditación del plan.']
  elif k=='industrial' and c['code']=='61':ex['regular']=['25','26','27','28','30','31'];ex['approved']=['18','19','20','21','22','23','24','33']
  else:ex['approved'],ex['notes']=parse(raw[2])
  c['requirements']={'enroll':en,'exam':ex}
 final={'sistemas':'36','electronica':'37','mecanica':'40','civil':'41','quimica':'231155'}.get(k)
 if final:
  f=next(c for c in cs if c['code']==final);f['requirements']['exam']={'regular':[],'approved':[x for x in core if x!=final],'notes':['Verificar la carga de electivas y las condiciones de acreditación del plan.']}
 if k=='naval':
  f=next(c for c in cs if c['code']=='40');f['requirements']['enroll']={'regular':[c['code'] for c in cs if c['kind']=='SUBJECT' and c['year']<6],'approved':[],'notes':['Cursado simultáneo con las materias de sexto nivel, según la nota (*) de la fuente.']}
 if k=='textil':
  p['notes']+=' Inglés I aprobado es necesario para la integradora de cuarto nivel; Inglés II para la de quinto nivel. Verificar la identificación de las integradoras con el departamento.'
  for c in cs:
   if c['year']==4 and 'integr' in c['name'].lower():c['requirements']['enroll']['notes'].append('Inglés I aprobado, según nota general de la fuente.')
   if c['year']==5 and 'proyecto' in c['name'].lower():c['requirements']['enroll']['notes'].append('Inglés II aprobado, según nota general de la fuente.')
 for c in cs:
  if c['kind']=='ELECTIVE':c['notes']='Electiva: alternativa del catálogo. Verificar oferta y carga horaria exigida; no es obligatorio aprobar todas las alternativas.'
  if c['kind']=='PRACTICE':
   if k in ['sistemas','mecanica']:c['requirements']=copy.deepcopy(next(x for x in cs if x['code']==final)['requirements']);c['requirements']['exam']=copy.deepcopy(c['requirements']['enroll'])
   if k=='electronica':c['requirements']=copy.deepcopy(next(x for x in cs if x['code']=='30')['requirements'])
   for r in c['requirements'].values():r['notes'].append('Validar horas, trámite y acreditación de la práctica con el departamento.')
  for r in c['requirements'].values():
   for field in ['regular','approved']:
    r[field]=[x for x in dict.fromkeys(r[field]) if x!=c['code']];assert set(r[field])<=codes
out=pathlib.Path('apps/api/prisma/study-plans');out.mkdir(exist_ok=True)
(out/'catalog.json').write_text(json.dumps(plans,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('COUNTS',[(p['specialty'],len(p['courses'])) for p in plans]);print('UNRESOLVED',json.dumps(unknown,ensure_ascii=False))






