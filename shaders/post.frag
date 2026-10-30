precision highp float;
varying vec2 v_uv;
uniform sampler2D u_frame;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_phase;
uniform float u_bloom;
uniform float u_grain;
uniform float u_burst;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
vec3 highlight(vec3 c){return c*smoothstep(.67,1.0,max(c.r,max(c.g,c.b)));}
void main(){
  vec2 px=1./u_resolution;
  vec3 c=texture2D(u_frame,v_uv).rgb;
  vec3 glow=vec3(0.);
  for(int i=0;i<8;i++){
    float a=float(i)*.785398;
    vec2 d=vec2(cos(a),sin(a))*px;
    glow+=highlight(texture2D(u_frame,v_uv+d*3.).rgb)*.075;
    glow+=highlight(texture2D(u_frame,v_uv+d*8.).rgb)*.05;
  }
  c+=glow*u_bloom;
  float tt=u_phase;
  float impulse=exp(-pow((tt-.715)/.045,2.))*u_burst;
  vec3 zoom=vec3(0.);
  for(int i=1;i<=5;i++) zoom+=texture2D(u_frame,.5+(v_uv-.5)*(1.-float(i)*.012*impulse)).rgb*.2;
  c=mix(c,zoom,impulse*.25);
  float vignette=1.-.12*pow(length((v_uv-.5)*vec2(1.1,1.)),1.3);
  c*=vignette;
  c+=(hash(gl_FragCoord.xy+floor(u_time*30.))-.5)*u_grain;
  gl_FragColor=vec4(clamp(c,0.,1.),1.);
}
