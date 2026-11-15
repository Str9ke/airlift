"""Publie une nouvelle version d'AirLift.

  python scripts/release.py 1.1.0 "Notes de version"            -> version web (auto-installée au lancement)
  python scripts/release.py 1.1.0 "Notes" --apk                 -> + nouvel APK (proposé dans l'app)
"""
import re, sys, json, subprocess, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
v, notes = sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else ''
apk = '--apk' in sys.argv
docs = root / 'docs'
def sub(path, pat, rep):
    p = docs / path; s = p.read_text(encoding='utf-8'); s2 = re.sub(pat, rep, s); p.write_text(s2, encoding='utf-8')
sub('index.html', r'\?v=[\w.]+', '?v=' + v)
sub('js/app.js', r"APP_VERSION = '[^']*'", f"APP_VERSION = '{v}'")
sub('sw.js', r"VERSION = '[^']*'", f"VERSION = '{v}'")
(docs / 'version.json').write_text(json.dumps({'version': v, 'notes': notes}, ensure_ascii=False, indent=1), encoding='utf-8')
run = lambda *a, **k: subprocess.run(a, check=True, cwd=root, **k)
if apk:
    g = root / 'android' / 'app' / 'build.gradle'
    s = g.read_text(encoding='utf-8')
    code = int(re.search(r'versionCode (\d+)', s).group(1)) + 1
    s = re.sub(r'versionCode \d+', f'versionCode {code}', s); s = re.sub(r"versionName '[^']*'", f"versionName '{v}'", s)
    g.write_text(s, encoding='utf-8')
    gw = str(root / 'android' / ('gradlew.bat' if sys.platform == 'win32' else 'gradlew'))
    subprocess.run([gw, 'assembleRelease', '-Pperso=false', '-q'], check=True, cwd=root / 'android')
    out = root / 'dist'; out.mkdir(exist_ok=True)
    (out / 'airlift.apk').write_bytes((root / 'android/app/build/outputs/apk/release/app-release.apk').read_bytes())
    (docs / 'android.json').write_text(json.dumps({'versionCode': code, 'versionName': v, 'notes': notes,
        'apk': 'https://github.com/Str9ke/airlift/releases/latest/download/airlift.apk'}, ensure_ascii=False, indent=1), encoding='utf-8')
run('git', 'add', '-A'); run('git', 'commit', '-m', f'AirLift {v}' + (f' — {notes}' if notes else ''))
run('git', 'push')
if apk:
    run('gh', 'release', 'create', 'v' + v, str(root / 'dist' / 'airlift.apk'), '--title', f'AirLift {v}', '--notes', notes or v)
print('Publié', v)
