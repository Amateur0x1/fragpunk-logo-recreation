from pathlib import Path
import json
import subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
source = json.loads((ROOT / 'reference/source.json').read_text())
font_path = '/System/Library/Fonts/Supplemental/Arial Unicode.ttf'
width, height = 1080, 1440
plate = Image.new('RGB', (width, height), '#11161b')
draw = ImageDraw.Draw(plate)

def label(x, y, text, size, color):
    draw.text((x, y), text, font=ImageFont.truetype(font_path, size), fill=color)

label(28, 18, '原片 / ORIGINAL', 28, '#edf3e6')
author = 'UP主：' + source['author']
author_font = ImageFont.truetype(font_path, 23)
label(width - 28 - author_font.getlength(author), 22, author, 23, '#c3cccf')
draw.rectangle((0, 680, 1080, 735), fill='#172119')
label(28, 691, '程序化复刻 / PROCEDURAL', 26, '#c4f578')
label(770, 695, 'HyperFrames + GLSL', 21, '#b5c8a1')
title = '原视频：' + source['title']
title_font = ImageFont.truetype(font_path, 22)
while title_font.getlength(title) > 1024:
    title_font = ImageFont.truetype(font_path, title_font.size - 1)
draw.text((28, 1353), title, font=title_font, fill='#d0d8da')
label(28, 1383, '来源：Bilibili · ' + source['author'] + ' · BV1CU57zCEtn', 21, '#a3b3ba')
label(28, 1412, '音轨取自原片前 4 秒；上下画面同步播放；已裁去重复开头', 18, '#9bb278')
plate_path = ROOT / 'assets/comparison-labels.png'
plate.save(plate_path)
cmd = [
    'ffmpeg', '-y', '-v', 'warning',
    '-i', str(ROOT / 'reference/source-first-five.mp4'),
    '-i', str(ROOT / 'renders/final-procedural.mp4'),
    '-loop', '1', '-framerate', '30', '-i', str(plate_path),
    '-i', str(ROOT / 'assets/original-first-five.m4a'),
    '-filter_complex',
    '[0:v]scale=1080:608,setsar=1,setpts=PTS-STARTPTS[original];'
    '[1:v]scale=1080:608,setsar=1,setpts=PTS-STARTPTS[recreation];'
    '[2:v][original]overlay=0:72:shortest=1[top];'
    '[top][recreation]overlay=0:736:shortest=1,format=yuv420p[v]',
    '-map', '[v]', '-map', '3:a:0', '-t', '4', '-r', '30',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17',
    '-c:a', 'copy', '-movflags', '+faststart',
    str(ROOT / 'renders/final-comparison.mp4'),
]
subprocess.run(cmd, check=True)
subprocess.run([
    'ffmpeg', '-y', '-v', 'error', '-i', str(ROOT / 'renders/final-procedural.mp4'),
    '-i', str(ROOT / 'assets/original-first-five.m4a'), '-map', '0:v:0', '-map', '1:a:0',
    '-c', 'copy', '-t', '4', '-movflags', '+faststart',
    str(ROOT / 'renders/final-procedural-with-audio.mp4'),
], check=True)
print('Wrote final comparison and audio-backed procedural video.')
