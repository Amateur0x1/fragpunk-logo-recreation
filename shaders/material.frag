precision highp float;
varying vec2 v_uv;
uniform sampler2D u_scene;
uniform sampler2D u_mask;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_glitch;
uniform float u_burst;
uniform float u_logoOnly;
uniform float u_geometryOnly;

float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
}
float fbm(vec2 p) {
  float v=0.; v+=.52*noise(p);p=mat2(1.6,1.2,-1.2,1.6)*p;
  v+=.27*noise(p);p=mat2(1.6,1.2,-1.2,1.6)*p;
  return v+.14*noise(p);
}
float windowAt(float t,float a,float b,float c,float d) {
  return smoothstep(a,b,t)*(1.-smoothstep(c,d,t));
}
float maskAt(vec2 p) {
  vec2 uv=vec2(p.x/u_resolution.x,1.-p.y/u_resolution.y);
  if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.) return 0.;
  return texture2D(u_mask,uv).a;
}
vec3 sceneAt(vec2 p) { return texture2D(u_scene,vec2(p.x/u_resolution.x,1.-p.y/u_resolution.y)).rgb; }

void main() {
  float t=u_time;
  vec2 p=vec2(v_uv.x,1.-v_uv.y)*u_resolution;
  float reveal=windowAt(t,.88,1.05,3.68,3.83);
  if(u_geometryOnly>.5) reveal=0.;
  float ghost=windowAt(t,1.94,1.965,2.48,2.52)*u_glitch;
  float tear=smoothstep(3.19,3.55,t)*(1.-smoothstep(3.73,3.82,t))*u_glitch;
  float tick=floor(t*30.+.001);
  float camera=(windowAt(t,.70,.72,.88,.98)*3.+tear*2.);
  vec2 jitter=(vec2(hash(vec2(tick,3.)),hash(vec2(tick,7.)))-.5)*camera;
  p+=jitter;
  vec3 color=sceneAt(p);
  if(u_logoOnly>.5) color=vec3(.038,.044,.052);
  float ca=windowAt(t,.28,.4,.98,1.10)*1.8;
  if(u_logoOnly<.5){
    color.r=sceneAt(p+vec2(ca,0.)).r;
    color.b=sceneAt(p-vec2(ca,0.)).b;
  }

  vec2 center=vec2(960.,545.);
  float scale=1.+.025*sin(t*2.2)+.045*(1.-smoothstep(.88,1.12,t));
  float angle=.008*sin(t*3.1)+ghost*.018;
  vec2 q=(p-center)/scale;
  q=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*q+center;

  // Piecewise affine fault planes: independently move large logo regions.
  float beat=floor((t-1.95)*15.);
  float variant=hash(vec2(beat,19.));
  float leftPlane=1.-step(830.,p.x+.48*(p.y-540.));
  float headPlane=(1.-step(1040.,p.x+.25*(p.y-440.)))*step(760.,p.x+.35*(p.y-440.))*(1.-step(550.,p.y+.2*(p.x-900.)));
  float lowPlane=step(590.,p.y)*(1.-leftPlane);
  q+=ghost*(leftPlane*vec2(65.,-15.)+headPlane*vec2(-18.,100.)+lowPlane*vec2(12.,-12.));
  // Broad diagonal slabs establish the fault; fine scan tears decorate it.
  float slab=floor((q.y+.42*q.x)/175.);
  float slabRnd=hash(vec2(slab,tick));
  float diagonalStep=step(960.,q.x+.55*(q.y-540.));
  q.x+=(slabRnd-.5)*tear*210.+(diagonalStep-.5)*ghost*12.;
  q.y+=(hash(vec2(slab+8.,tick))-.5)*tear*22.;
  float row=floor(q.y/5.);
  float rip=step(.77,hash(vec2(row,tick)));
  q.x+=rip*(hash(vec2(row+9.,tick))-.5)*tear*45.;
  q.x+=sin(q.y*.035+tick)*tear*5.;

  float a=maskAt(q);
  float erosion=smoothstep(3.48,3.79,t);
  float patches=.65*fbm(q*.025)+.35*hash(floor(q/vec2(31.,9.)));
  a*=1.-smoothstep(patches-.05,patches+.06,erosion);
  float build=smoothstep(.89,1.055,t);
  a*=smoothstep(1.-build-.08,1.-build+.03,fbm(q*.012));
  if(t>1.06) a=maskAt(q)*(1.-smoothstep(patches-.05,patches+.06,erosion));

  // A displaced silhouette produces the purple double exposure.
  vec2 gq=p+vec2(195.+28.*sin(t*34.),-38.);
  float ga=maskAt(gq)*ghost*(1.-u_geometryOnly)*(1.-smoothstep(990.,1300.,p.x));
  color=mix(color,vec3(.32,.065,.76),ga*0.);

  float edgeA=maskAt(q+vec2(2.,-1.));
  float edgeB=maskAt(q+vec2(-2.,2.));
  float shadow=maskAt(q+vec2(-9.,-10.))*reveal;
  color=mix(color,vec3(.018,.022,.026),shadow*.7);
  float survive=1.-smoothstep(patches-.05,patches+.06,erosion);
  float pink=edgeA*(1.-maskAt(q))*reveal*survive;
  float cyan=edgeB*(1.-maskAt(q))*reveal*survive;
  color=mix(color,vec3(.94,.25,.65),pink*.9);
  color=mix(color,vec3(.23,.83,.96),cyan*.9);

  // The logo is shaded from one alpha mask: cloud pigment, edge lighting, grain.
  float cloud=fbm(q*.012+vec2(t*.18,-t*.12));
  float warm=smoothstep(.24,.73,cloud+.11*sin(q.x*.011-q.y*.02));
  vec3 ink=mix(vec3(.59,.96,.20),vec3(.91,.99,.39),warm);
  float bevel=clamp(a-maskAt(q+vec2(2.0,2.0)),0.,1.);
  float bottom=clamp(a-maskAt(q-vec2(2.,2.)),0.,1.);
  ink+=bevel*vec3(.13,.08,.14)-bottom*vec3(.10,.075,.02);
  // Directional bevel strips carry cyan, magenta and peach facets inside
  // the silhouette, while the outer hairline remains sharp and dark.
  float facetWidth=2.+3.*noise(q*.016);
  float innerR=a*(1.-maskAt(q+vec2(facetWidth,-facetWidth*.45)));
  float innerL=a*(1.-maskAt(q+vec2(-facetWidth*.7,facetWidth*.6)));
  vec3 prism=mix(vec3(.16,.92,.98),vec3(.98,.23,.68),smoothstep(.3,.7,noise(q*.025)));
  ink=mix(ink,prism,innerR*.95);
  ink=mix(ink,vec3(1.,.66,.40),innerL*.75);
  ink+=(hash(floor(q*.8)+tick)-.5)*.04;
  // Hard palette swaps belong to the moving slabs, not a faint whole-logo ghost.
  vec3 faultInk=ink;
  vec3 leftInk=variant>.52?vec3(.39,.16,.91):vec3(.23,1.,.51);
  if(variant<.18) leftInk=vec3(.61,.80,1.);
  faultInk=mix(faultInk,leftInk,leftPlane);
  faultInk=mix(faultInk,mix(vec3(.42,.88,1.),ink,step(.43,noise(q*.04))),headPlane);
  faultInk=mix(faultInk,vec3(1.,.56,.39),lowPlane);
  if(variant<.35) faultInk=mix(faultInk,vec3(.39,.17,.88),step(1020.,p.x)*(1.-step(475.,p.y)));
  ink=mix(ink,faultInk,ghost);
  if(u_geometryOnly>.5) reveal=0.;
  color=mix(color,ink,clamp(a*reveal,0.,1.));
  gl_FragColor=vec4(color,1.);
}
