# FragPunk Logo — HyperFrames 程序化复刻

用 HyperFrames、Canvas 和 GLSL 程序化重建参考视频开头 4 秒的 Logo 动画。场景从一份静态 Logo 轮廓出发，由代码生成飘带、碎片、故障切片、赛博色边、辉光和溶解效果；没有用原片动画帧逐帧转描。

## 成片

视频文件保存在本地 `renders/`，该目录由 `.gitignore` 排除：

- `final-comparison.mp4`：原片与程序化复刻上下对比，带原片前 4 秒音轨。
- `final-procedural.mp4`：程序化版本，静音。
- `final-procedural-with-audio.mp4`：程序化版本与原片音轨。

## 交互预览

`preview.html` 可拖动时间轴、替换文字或透明图片，并调节效果参数。运行本地服务器后打开页面：

```sh
python3 -m http.server 8767
```

## 构建

需要 Python 3、HyperFrames 0.7.109、Chromium，以及 Pillow 和 ffmpeg（生成上下对比成片时需要）。

```sh
python3 scripts/build_procedural.py
npx hyperframes@0.7.109 render --quality high --workers 1 -o renders/final-procedural.mp4
python3 scripts/make_comparison.py
```

## 目录

- `index.html`、`renderer.js`、`config.js`：4 秒 HyperFrames 场景、Canvas 几何和参数。
- `shaders/`：Logo 材质、色边、故障与后处理 GLSL。
- `assets/`：运行依赖、静态 Logo 轮廓和原片音轨。
- `reference/`：参考片段、静态 Logo 帧和来源信息。
- `scripts/`：构建入口和生成上下对比视频。
- `renders/`：本地生成的最终视频（不纳入 Git）。

## 来源与权利

参考视频：太阳鸽鸽棒，《【AE教程】极致动感！界外狂潮动态logo动画来了，纯AE制作，100%学会》

https://www.bilibili.com/video/BV1CU57zCEtn/

程序效果是根据画面分析建立的近似实现。FragPunk Logo 和参考片段仍归其权利人所有。仓库许可证适用于本项目代码，不授予第三方素材的权利。
