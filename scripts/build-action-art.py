import json,urllib.parse,xml.etree.ElementTree as ET,re,struct,zlib
import subprocess
x=json.loads(subprocess.check_output(['node','--import','tsx','-e', 'const {ACTIONS,actionStrip}=require("./src/art/actionFrames.ts"); console.log(JSON.stringify(Object.fromEntries(ACTIONS.flatMap(k=>[[k,Array.from({length:5},(_,i)=>actionStrip(k,i+1))],[k+" effect",Array.from({length:5},(_,i)=>actionStrip(k,i+1,false))]]))));'],text=True)); entries=[]
for kind,levels in x.items():
 paths=[]
 for tier,uri in enumerate(levels,1):
  root=ET.fromstring(urllib.parse.unquote(uri.split(',',1)[1])); w,h=320,40; data=bytearray(w*h*4)
  for g in root:
   off=int(re.search(r'translate\((\d+)',g.attrib['transform'])[1])
   for r in g:
    a=r.attrib;c=bytes.fromhex(a['fill'][1:])+b'\xff'
    for y in range(int(a['y']),int(a['y'])+int(a['height'])):
     for xx in range(int(a['x'])+off,int(a['x'])+off+int(a['width'])):
      if 0<=xx<w and 0<=y<h:data[(y*w+xx)*4:(y*w+xx)*4+4]=c
  def chunk(tag,data):return struct.pack('>I',len(data))+tag+data+struct.pack('>I',zlib.crc32(tag+data))
  raw=b''.join(b'\x00'+data[y*w*4:(y+1)*w*4] for y in range(h))
  name=kind.lower().replace(' ','-')+'-'+str(tier)+'.png'
  open('assets/actions/'+name,'wb').write(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b''))
  paths.append("require('../../assets/actions/"+name+"')")
 entries.append(json.dumps(kind)+': ['+', '.join(paths)+']')
open('src/art/actionImages.ts','w').write('// Pre-baked PNG strips shared by web, iOS and Android.\nimport { ActionKind } from "./actionFrames";\nexport const ACTION_IMAGES: Record<ActionKind, number> = {} as never;\n'.replace('export const ACTION_IMAGES: Record<ActionKind, number> = {} as never;', 'export const ACTION_IMAGES: Record<ActionKind | `${ActionKind} effect`, number[]> = {\n'+',\n'.join(entries)+'\n};'))
