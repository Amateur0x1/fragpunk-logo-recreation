"""Assemble local GLSL source into the HyperFrames entry point, without fetch()."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
head='''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=1920,height=1080">
<title>FragPunk · procedural shader reconstruction</title>
<script src="assets/gsap.min.js"></script><script src="assets/logo-path.js"></script><script src="config.js"></script>
<style>*{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#0b0e12}#stage{position:relative;width:1920px;height:1080px;overflow:hidden}#effect{position:absolute;inset:0;width:1920px;height:1080px;display:block}</style></head>
<body><div id="stage" data-composition-id="main" data-start="0" data-duration="4" data-width="1920" data-height="1080" data-fps="30"><canvas id="effect" class="clip" data-start="0" data-duration="4" data-track-index="1" width="1920" height="1080"></canvas></div>
'''
shaders={name:(root/f'shaders/{name}.frag').read_text() for name in ['material','post']}
head+='<script>window.FRAGPUNK_SHADERS='+json.dumps(shaders)+';</script>\n'
head+='<script>'+ (root/'renderer.js').read_text()+'</script></body></html>'
(root/'index.html').write_text(head)
print('Built procedural composition: one static mask, generated geometry, two GLSL passes.')
