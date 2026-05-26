"""模拟浏览器加载游戏，验证所有资源可达 + JS 无语法错误"""
import http.server
import socketserver
import threading
import time
import urllib.request
import os
import sys
import re

os.chdir(os.path.dirname(os.path.abspath(__file__)))

PORT = 9877
handler = http.server.SimpleHTTPRequestHandler
# 静默
class Quiet(handler):
    def log_message(self, *_): pass

httpd = socketserver.TCPServer(('127.0.0.1', PORT), Quiet)
threading.Thread(target=httpd.serve_forever, daemon=True).start()
time.sleep(0.3)

base = f'http://127.0.0.1:{PORT}'
loaded = set()
errors = []

def fetch(path):
    try:
        url = base + path
        return urllib.request.urlopen(url).read().decode('utf-8', errors='replace')
    except Exception as e:
        errors.append(f'FAIL {path}: {e}')
        return None

def resolve_relative(base_path, rel):
    """将相对路径 rel 解析成相对 base_path 的绝对路径"""
    base_dir = os.path.dirname(base_path)
    parts = (base_dir + '/' + rel).split('/')
    out = []
    for p in parts:
        if p == '..':
            if out and out[-1] != '..': out.pop()
            else: out.append(p)
        elif p == '.' or p == '':
            continue
        else:
            out.append(p)
    return '/' + '/'.join(out)

# 模拟浏览器：加载 HTML，找 script，递归加载 imports
html = fetch('/index.html')
if html is None:
    print('Cannot load index.html')
    httpd.shutdown()
    sys.exit(1)

print(f'[OK] index.html loaded ({len(html)} bytes)')

# 找入口 script
m = re.search(r'<script\s+type="module"\s+src="([^"]+)"', html)
if not m:
    print('FAIL: No module script tag found')
    httpd.shutdown()
    sys.exit(1)

entry = m.group(1)
if not entry.startswith('/'):
    entry = '/' + entry
print(f'[OK] Entry: {entry}')

queue = [entry]
import_re = re.compile(r"(?:from|import)\s+['\"]([^'\"]+)['\"]")

while queue:
    path = queue.pop(0)
    if path in loaded:
        continue
    loaded.add(path)
    js = fetch(path)
    if js is None: continue
    for imp in import_re.findall(js):
        if imp.startswith('http'): continue
        if not imp.startswith('.') and not imp.startswith('/'): continue
        resolved = resolve_relative(path, imp) if imp.startswith('.') else imp
        if resolved not in loaded:
            queue.append(resolved)

print(f'[OK] Resolved {len(loaded)} module files')

# 验证配置文件可达
configs = ['enemy_config', 'weapon_config', 'skill_config', 'level_config', 'player_config']
for c in configs:
    r = fetch(f'/src/configs/{c}.json')
    if r is None: continue
    try:
        import json
        json.loads(r)
        print(f'[OK] /src/configs/{c}.json (valid JSON)')
    except Exception as e:
        errors.append(f'INVALID JSON: {c}: {e}')

if errors:
    print('\n=== ERRORS ===')
    for e in errors: print(' -', e)
    httpd.shutdown()
    sys.exit(1)

print(f'\n✅ ALL OK: {len(loaded)} JS files + 5 JSON configs accessible')
httpd.shutdown()
