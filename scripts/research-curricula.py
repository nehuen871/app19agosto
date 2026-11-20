"""Temporary extraction helper for the public UTN.BA curriculum tables."""
import concurrent.futures
import hashlib
import json
import pathlib
import re
import requests
from bs4 import BeautifulSoup

OUT = pathlib.Path('.curriculum-research')
OUT.mkdir(exist_ok=True)
URLS = {
 'naval': 'https://frba.utn.edu.ar/naval/correlatividades/',
 'textil': 'https://frba.utn.edu.ar/textil/coorrelativas/',
 'mecanica': 'https://frba.utn.edu.ar/mecanica/plan-de-estudios-2023/',
 'electrica': 'https://frba.utn.edu.ar/electrica/correlatividades/',
 'quimica': 'https://frba.utn.edu.ar/quimica/correlativas-plan-de-estudios-2023/',
 'civil': 'https://frba.utn.edu.ar/civil/plan-de-estudios/',
 'electronica': 'https://frba.utn.edu.ar/electronica/plan-de-estudios/',
 'sistemas': 'https://frba.utn.edu.ar/sistemas/plan-de-estudios-2023/',
 'industrial': 'https://frba.utn.edu.ar/industrial/plan-07/',
}
def fetch(item):
 key, url = item
 response = requests.get(url, timeout=90)
 response.raise_for_status()
 response.encoding = 'utf-8'
 (OUT / f'{key}.html').write_text(response.text, encoding='utf-8')
 soup = BeautifulSoup(response.text, 'html.parser')
 tables = [[[cell.get_text(' ', strip=True) for cell in row.find_all(['td','th'])] for row in table.find_all('tr')] for table in soup.find_all('table')]
 (OUT / f'{key}-tables.json').write_text(json.dumps(tables, ensure_ascii=False, indent=2), encoding='utf-8')
 links = [{'text': a.get_text(' ', strip=True), 'url': a['href']} for a in soup.select('a[href]') if re.search(r'correl|\.pdf|plan.*2023', a.get_text(' ', strip=True) + a['href'], re.I)]
 return {'specialty': key, 'tables': [len(table) for table in tables], 'links': links, 'sha256':hashlib.sha256(response.content).hexdigest()}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
 for result in executor.map(fetch, URLS.items()): print(json.dumps(result, ensure_ascii=False), flush=True)
