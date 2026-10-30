/* Procedural FragPunk study.
 * Input: ONE static alpha silhouette (or replacement text/image).
 * Geometry: tapered ribbons, radial burst, triangulated logo pieces, shockwave.
 * GLSL: animated pigment, chromatic edges, diagonal slab faults, erosion, bloom.
 * Every frame is a pure function of time + config; no frame sequence is loaded.
 */
(() => {
  'use strict';
  const W=1920,H=1080,CX=960,CY=540;
  const cfg=window.FRAGPUNK_CONFIG;
  const canvas=document.getElementById('effect');
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true,premultipliedAlpha:false});
  if(!gl) throw new Error('WebGL is required for the procedural shader composition.');
  const makeCanvas=(w=W,h=H)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  const scene=makeCanvas(),ctx=scene.getContext('2d');
  const mask=makeCanvas(),mx=mask.getContext('2d',{willReadFrequently:true});
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const smooth=(a,b,t)=>{const u=clamp((t-a)/(b-a));return u*u*(3-2*u);};
  const envelope=(t,a,b,c,d)=>smooth(a,b,t)*(1-smooth(c,d,t));
  const fract=v=>v-Math.floor(v);
  const hash=(a,b=0)=>fract(Math.sin(a*127.1+b*311.7+cfg.seed*.017)*43758.5453);
  const easeOut=t=>1-Math.pow(1-clamp(t),3);
  const colors=['#b9ff36','#8fff0b','#e9ff94','#dc18e9','#548fff','#b442ed'];
  let shards=[],lastTime=0;

  const vertex=`attribute vec2 a_pos;varying vec2 v_uv;void main(){v_uv=a_pos*.5+.5;gl_Position=vec4(a_pos,0.,1.);}`;
  function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
  function program(fragment){const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;}
  const material=program(window.FRAGPUNK_SHADERS.material);
  const post=program(window.FRAGPUNK_SHADERS.post);
  const quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  function texture(){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
  const sceneTex=texture(),maskTex=texture(),frameTex=texture();
  gl.bindTexture(gl.TEXTURE_2D,frameTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,W,H,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  const fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,frameTex,0);
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Incomplete effect framebuffer');
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  function upload(tex,image){gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);}
  function bind(p){gl.useProgram(p);gl.bindBuffer(gl.ARRAY_BUFFER,quad);const a=gl.getAttribLocation(p,'a_pos');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);}
  function number(p,name,v){gl.uniform1f(gl.getUniformLocation(p,name),v);}
  function sampler(p,name,tex,unit){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(gl.getUniformLocation(p,name),unit);}

  function polygon(c,pts,fill){c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);c.closePath();if(fill){c.fillStyle=fill;c.fill();}}
  const dotTile=makeCanvas(20,20),dt=dotTile.getContext('2d');
  dt.fillStyle='rgba(12,15,25,.52)';dt.beginPath();dt.arc(5,5,1.8,0,Math.PI*2);dt.arc(15,15,1.8,0,Math.PI*2);dt.fill();
  const halftone=ctx.createPattern(dotTile,'repeat');

  function rebuildLogo(image){
    mx.clearRect(0,0,W,H);mx.fillStyle='#fff';
    if(image){const s=Math.min(1250/image.width,500/image.height);mx.drawImage(image,CX-image.width*s/2,CY-image.height*s/2,image.width*s,image.height*s);mx.globalCompositeOperation='source-in';mx.fillRect(0,0,W,H);mx.globalCompositeOperation='source-over';}
    else if(cfg.logoText){mx.font='italic 900 250px Arial, sans-serif';mx.textAlign='center';mx.textBaseline='middle';mx.fillText(cfg.logoText,CX,CY,1230);}
    else mx.fill(new Path2D(window.FRAGPUNK_LOGO_PATH),'evenodd');
    upload(maskTex,mask);
    const pixels=mx.getImageData(0,0,W,H).data;
    const points=[];
    const cols=17,rows=8,x0=320,y0=270,dx=1280/cols,dy=570/rows;
    for(let y=0;y<=rows;y++){points[y]=[];for(let x=0;x<=cols;x++)points[y][x]=[x0+x*dx+(x&&x<cols?(hash(x,y)-.5)*dx*.6:0),y0+y*dy+(y&&y<rows?(hash(y+100,x)-.5)*dy*.6:0)];}
    shards=[];
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      const tris=[[points[y][x],points[y][x+1],points[y+1][x]],[points[y][x+1],points[y+1][x+1],points[y+1][x]]];
      for(const triangle of tris){
        const id=shards.length+3*y+x;
        const left=Math.floor(Math.min(...triangle.map(p=>p[0])))-2,top=Math.floor(Math.min(...triangle.map(p=>p[1])))-2;
        const sw=Math.ceil(Math.max(...triangle.map(p=>p[0]))-left)+2,sh=Math.ceil(Math.max(...triangle.map(p=>p[1]))-top)+2;
        let occupied=0;for(let yy=top;yy<top+sh;yy+=8)for(let xx=left;xx<left+sw;xx+=8)if(pixels[(yy*W+xx)*4+3]>100)occupied++;
        if(!occupied)continue;
        const tile=makeCanvas(sw,sh),c=tile.getContext('2d');
        c.save();polygon(c,triangle.map(p=>[p[0]-left,p[1]-top]));c.clip();c.drawImage(mask,-left,-top);c.restore();
        c.globalCompositeOperation='source-in';c.fillStyle=colors[Math.floor(hash(id,3)*colors.length)];c.fillRect(0,0,sw,sh);
        if(hash(id,7)>.47){c.globalCompositeOperation='source-atop';c.fillStyle=c.createPattern(dotTile,'repeat');c.fillRect(0,0,sw,sh);}
        c.globalCompositeOperation='source-over';
        shards.push({tile,cx:left+sw/2,cy:top+sh/2,w:sw,h:sh,spin:(hash(id,4)-.5)*2.8,dx:(hash(id,8)-.5)*290,dy:(hash(id,9)-.5)*250,delay:hash(id,10)*.055,id});
      }
    }
  }

  function background(t){
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.fillStyle='#11161b';ctx.fillRect(0,0,W,H);
    const d=Math.sin(t*.9)*9;
    polygon(ctx,[[-300,450+d],[1100,-220],[2130,380],[540,1260]],'#0d0f13');
    polygon(ctx,[[-100,1080],[1920,10],[1920,520],[920,1080]],'#0b0d11');
    polygon(ctx,[[1280,1080],[1920,730],[1920,970],[1660,1080]],'#12191d');
    ctx.strokeStyle='rgba(105,113,126,.05)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-100,1080);ctx.lineTo(1950,0);ctx.stroke();
    ctx.fillStyle='#06080b';ctx.save();ctx.translate(150,890);ctx.rotate(-.32);ctx.fillRect(-20,-155,42,310);ctx.restore();
  }

  // Ribbon cross sections are perpendicular to a jagged centerline. Tapered
  // widths and alternating side faces make each bolt a torn, folded strip.
  function ribbon(points,width,phase,id){
    const left=[],right=[];
    points.forEach((p,i)=>{
      const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];let nx=-(b[1]-a[1]),ny=b[0]-a[0],len=Math.hypot(nx,ny)||1;nx/=len;ny/=len;
      const taper=Math.pow(Math.sin(Math.PI*i/(points.length-1)),.45);
      const w=width*taper*(.50+hash(i,id)*.7);
      left.push([p[0]+nx*w,p[1]+ny*w]);right.push([p[0]-nx*w*.55,p[1]-ny*w*.55]);
    });
    const outline=left.concat([...right].reverse());
    ctx.save();ctx.translate(3,2);polygon(ctx,outline,'#f43fb7');ctx.restore();
    polygon(ctx,outline,phase<.48?'#d5fc76':'#91ff0a');
    for(let i=0;i<points.length-1;i++){
      polygon(ctx,[points[i],left[i],left[i+1],points[i+1]],i%3===0?'#edffad':(phase<.48?'#b6e75c':'#aaff20'));
      if(i%3===1)polygon(ctx,[points[i],right[i],right[i+1]],'#44e6af');
    }
    ctx.save();polygon(ctx,outline);ctx.clip();ctx.globalAlpha=.28;ctx.fillStyle=halftone;ctx.fillRect(0,0,W,H);ctx.restore();
  }

  function bolts(t,big=false){
    const start=big?.627:.25,end=big?1.02:.56;
    const alpha=envelope(t,start,start+.045,end-.07,end);if(alpha<=0)return;
    const phase=clamp((t-start)/(end-start)),tick=Math.floor(t*18);
    const count=big?4:3,angles=big?[-2.79,-.55,.48,2.77]:[-1.34,.52,2.5];
    ctx.save();ctx.globalAlpha=alpha;
    for(let j=0;j<count;j++){
      const angle=angles[j]+(hash(tick,j)-.5)*.075;
      const pts=[],inner=big?mix(155,480,phase):mix(120,70,phase),outer=big?1430:mix(350,680,phase);
      for(let k=0;k<10;k++){
        const r=mix(inner,outer,Math.pow(k/9,1.2));const tang=(hash(k+23,j)>.42?1:-1)*(14+hash(k,j+tick)*110)*(big?.75:.65);
        pts.push([CX+Math.cos(angle)*r-Math.sin(angle)*tang,CY+Math.sin(angle)*r+Math.cos(angle)*tang]);
      }
      ribbon(pts,(big?68:20)*cfg.ribbonWidth*(.5+Math.sin(phase*Math.PI)),t,j);
    }
    ctx.restore();
  }

  function starburst(t){
    const a=envelope(t,.495,.54,.60,.635);if(a<=0)return;
    const u=clamp((t-.495)/.14),scale=mix(.22,1.55,easeOut(u));
    ctx.save();ctx.translate(CX,CY);ctx.rotate(-.15+u*.13);ctx.scale(scale,scale);ctx.globalAlpha=a;
    const pts=[];
    for(let i=0;i<30;i++){const angle=i/30*Math.PI*2;let r=i%2?78+hash(i,3)*70:210+hash(i,5)*225;if(i===8||i===22)r*=1.3;pts.push([Math.cos(angle)*r,Math.sin(angle)*r*.83]);}
    const g=ctx.createLinearGradient(-400,-100,400,180);g.addColorStop(0,'#a5ff30');g.addColorStop(.4,'#dbffaf');g.addColorStop(.7,'#ef79a4');g.addColorStop(1,'#f31c93');
    polygon(ctx,pts,'rgba(164,241,112,.07)');ctx.strokeStyle=g;ctx.lineWidth=5;ctx.stroke();
    ctx.globalAlpha=a*.4;ctx.lineWidth=15;ctx.stroke();
    const cross=ctx.createRadialGradient(0,0,1,0,0,85);cross.addColorStop(0,'#fff');cross.addColorStop(.2,'#f3ffeaaa');cross.addColorStop(1,'#f3ffe000');ctx.fillStyle=cross;ctx.fillRect(-85,-85,170,170);
    ctx.strokeStyle='#f7ffd9';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-70,0);ctx.lineTo(70,0);ctx.moveTo(0,-85);ctx.lineTo(0,85);ctx.stroke();ctx.restore();
  }

  function shockwave(t){
    // A brief flash precedes a two-front radial pulse. Exponential expansion
    // keeps both circular fronts inside the frame during the key impact beat.
    const flash=envelope(t,.625,.632,.638,.653)*cfg.burstIntensity;
    if(flash>0){ctx.save();ctx.globalAlpha=flash*.48;ctx.fillStyle='#e2e0e1';ctx.fillRect(0,0,W,H);ctx.restore();}
    const a=envelope(t,.647,.665,.753,.803)*cfg.burstIntensity;if(a<=0)return;
    const r=260*Math.exp(12*(t-2/3));
    ctx.save();ctx.globalAlpha=clamp(a);
    // Angular rays rotate independently of the four folded ribbons.
    for(let i=0;i<4;i++){
      const angle=[-1.02,1.27,2.82,3.73][i]+(t-.7167)*7;
      const ex=CX+Math.cos(angle)*1550,ey=CY+Math.sin(angle)*1550;
      const half=[35,28,20,48][i];
      polygon(ctx,[[CX,CY],[ex-Math.sin(angle)*half,ey+Math.cos(angle)*half],[ex+Math.sin(angle)*half,ey-Math.cos(angle)*half]],i%2?'#d94bb9':'#4eff0a');
    }
    const glow=ctx.createRadialGradient(CX,CY,r*.86,CX,CY,r*1.11);
    glow.addColorStop(0,'#75ffd000');glow.addColorStop(.56,'#57ffd575');glow.addColorStop(1,'#57ffd500');
    ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
    const g=ctx.createRadialGradient(CX,CY,0,CX,CY,r*1.015);
    g.addColorStop(0,'#dcffd900');g.addColorStop(.20,'#dcffd909');
    g.addColorStop(.47,'#eaffd858');g.addColorStop(.598,'#edffe8c9');
    g.addColorStop(.612,'#66ffe5ed');g.addColorStop(.625,'#d8f3cba1');
    g.addColorStop(.83,'#e7ffd1c6');g.addColorStop(.966,'#e6ffd1db');
    g.addColorStop(.987,'#56ffe2ef');g.addColorStop(1,'#56ffe200');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    const beam=envelope(t,.676,.696,.752,.783);
    ctx.globalAlpha=clamp(a*beam);
    const outer=240+170*smooth(.67,.765,t);
    polygon(ctx,[[CX-12,CY-3],[-80,CY-outer],[-80,CY+outer]],'#fcfffd');
    polygon(ctx,[[CX+12,CY+3],[W+80,CY-outer],[W+80,CY+outer]],'#fcfffd');
    ctx.restore();
  }

  function fragmentCloud(t){
    if(t<.65||t>1.15)return;
    const arrive=smooth(.65,.685,t),mass=smooth(.725,.825,t),resolve=smooth(.88,1.10,t);
    ctx.save();ctx.globalAlpha=arrive*(1-smooth(1.035,1.15,t));
    // The first impact contains two separated torn clumps. Only afterwards do
    // they grow into the dense colored mass that resolves into the logo.
    ctx.save();
    if(mass<.92){
      ctx.beginPath();
      for(let y=260;y<830;y+=11){const row=Math.floor(y/11);ctx.rect(0,y,W,4+hash(row,41)*4+mass*3);}
      ctx.clip();
    }
    for(const s of shards){
      if(hash(s.id,61)>.42+.58*mass)continue;
      const u=easeOut(clamp((t-.88-s.delay)/(.23-s.delay)));
      const spread=(1-u)*cfg.fragmentSpread;
      const side=s.cx<CX?-1:1;
      const earlyX=CX+side*220+(s.cx-CX)*.08+s.dx*.20;
      const earlyY=CY+side*55+s.dy*.22;
      const cloudX=CX+(s.cx-CX)*.48+s.dx*.45,cloudY=CY+(s.cy-CY)*.68+s.dy*.45;
      const x=s.cx+(mix(earlyX,cloudX,mass)-s.cx)*spread,y=s.cy+(mix(earlyY,cloudY,mass)-s.cy)*spread;
      const sx=mix(1.05,1.55,mass)*(1-u)+u,sy=mix(.60,1.55,mass)*(1-u)+u;
      ctx.save();ctx.translate(x,y);ctx.rotate(s.spin*spread*(.25+.75*mass));ctx.scale(sx,sy);ctx.drawImage(s.tile,-s.w/2,-s.h/2);ctx.restore();
    }
    ctx.restore();
    // Torn colored islands fill the early central mass; their vertices are
    // generated once from seed and resolve away as the masked pieces settle.
    const alpha=(1-resolve)*arrive*mass;
    ctx.globalAlpha=alpha;
    for(let i=0;i<26;i++){
      const x=CX+(hash(i,11)-.5)*780,y=CY+(hash(i,12)-.5)*350;
      const r=35+hash(i,13)*85,pts=[];
      for(let j=0;j<7;j++){const a=j/7*Math.PI*2,rr=r*(j%2?.5:1);pts.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr]);}
      polygon(ctx,pts,colors[i%colors.length]);
      if(i%3===0){ctx.save();polygon(ctx,pts);ctx.clip();ctx.fillStyle=halftone;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();}
    }
    ctx.restore();
  }

  function debris(t){
    const env=envelope(t,.46,.6,1.0,1.35)+envelope(t,3.46,3.56,3.76,3.9);if(env<=0)return;
    ctx.save();ctx.globalAlpha=clamp(env)*.85;
    for(let i=0;i<45;i++){
      const a=hash(i,30)*Math.PI*2,phase=t<2?clamp((t-.45)/.9):clamp((t-3.46)/.44);
      const r=170+phase*(300+hash(i,31)*530),x=CX+Math.cos(a)*r,y=CY+Math.sin(a)*r*.58;
      const s=(3+hash(i,32)*12)*(1-phase*.7);polygon(ctx,[[x,y-s],[x+s*.8,y+s],[x-s,y+s*.4]],colors[i%colors.length]);
    }
    ctx.restore();
  }

  function renderAt(time){
    const t=clamp(Number(time)||0,0,5);lastTime=t;
    const local=t;
    background(t);
    if(cfg.debugLayer!=='logo'){
      bolts(local);starburst(local);bolts(local,true);shockwave(local);fragmentCloud(local);debris(t);
    }
    upload(sceneTex,scene);
    gl.viewport(0,0,W,H);gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);bind(material);
    sampler(material,'u_scene',sceneTex,0);sampler(material,'u_mask',maskTex,1);
    gl.uniform2f(gl.getUniformLocation(material,'u_resolution'),W,H);
    number(material,'u_time',t);number(material,'u_glitch',cfg.glitchStrength);number(material,'u_burst',cfg.burstIntensity);
    number(material,'u_logoOnly',cfg.debugLayer==='logo'?1:0);number(material,'u_geometryOnly',cfg.debugLayer==='geometry'?1:0);
    gl.drawArrays(gl.TRIANGLES,0,6);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);bind(post);sampler(post,'u_frame',frameTex,0);
    gl.uniform2f(gl.getUniformLocation(post,'u_resolution'),W,H);
    number(post,'u_time',t);number(post,'u_phase',local);number(post,'u_bloom',cfg.bloom);number(post,'u_grain',cfg.grain);number(post,'u_burst',cfg.burstIntensity);
    gl.drawArrays(gl.TRIANGLES,0,6);gl.flush();
  }

  rebuildLogo();
  const state={time:0};
  const tl=gsap.timeline({paused:true});
  tl.to(state,{time:4,duration:4,ease:'none',onUpdate:()=>renderAt(state.time)},0);
  window.__timelines=window.__timelines||{};window.__timelines.main=tl;
  window.addEventListener('hf-seek',event=>renderAt(event.detail.time));
  window.fragpunk={renderAt,config:cfg,setLogoText(text){cfg.logoText=text;rebuildLogo();renderAt(lastTime);},setLogoImage(image){rebuildLogo(image);renderAt(lastTime);},getShardCount:()=>shards.length};
  tl.seek(0);renderAt(0);
})();
