import re, urllib.request, base64, os
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
url = "https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;800&display=swap"
req = urllib.request.Request(url, headers={"User-Agent": UA})
css = urllib.request.urlopen(req, timeout=30).read().decode()

blocks = re.findall(r"/\*\s*([\w-]+)\s*\*/\s*@font-face\s*\{(.*?)\}", css, re.S)
out = []
WANT = {"cyrillic", "latin"}
cache = {}
for subset, body in blocks:
    if subset not in WANT: continue
    fam = re.search(r"font-family:\s*'([^']+)'", body).group(1)
    wt  = re.search(r"font-weight:\s*(\d+)", body).group(1)
    u   = re.search(r"url\((https://[^)]+)\)", body).group(1)
    if u not in cache:
        d = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=30).read()
        cache[u] = d
        print(fam, wt, subset, len(d))
    b64 = base64.b64encode(cache[u]).decode()
    out.append(f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{wt};font-display:swap;"
               f"src:url(data:font/woff2;base64,{b64}) format('woff2');}}")
open("/home/user/build/fonts.css","w").write("\n".join(out))
print("total css kb:", os.path.getsize("/home/user/build/fonts.css")//1024)
