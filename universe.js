import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const host = document.querySelector('#constellation');
const skyPage = document.querySelector('#skyPage');
const appCard = document.querySelector('.app-card');
const todoBackdrop = document.createElement('div');
todoBackdrop.className = 'todo-universe-backdrop';
todoBackdrop.setAttribute('aria-hidden', 'true');
appCard.prepend(todoBackdrop);
host.setAttribute('aria-label', '深空中的三维星光，拖动旋转，双指缩放');
document.head.insertAdjacentHTML('beforeend', `<style>
.sky-page{background:#010205;overflow:hidden}.sky-page:after{display:none}.sky-top{position:relative;z-index:2;pointer-events:none}.sky-top .eyebrow{color:#7a8194}.sky-top h2{color:#e2e6ef}.sky-top>p:last-child{color:#777f91}
.constellation{position:absolute;inset:0;width:100%;height:100%;max-width:none;margin:0;perspective:none;transform-style:flat;overflow:hidden;touch-action:none}.constellation>.nebula,.constellation>.orbit,.constellation>.sun,.constellation>.stars{display:none}.webgl-canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.constellation .drag-tip{bottom:28px;z-index:2;font-size:10px;color:#586175;pointer-events:none}.universe-readout{position:absolute;top:107px;left:0;right:0;z-index:2;text-align:center;color:#7f899e;font-size:10px;letter-spacing:2px;pointer-events:none}.universe-readout b{color:#c2cad8;font-weight:500}.universe-label{position:absolute;bottom:87px;left:25px;right:25px;z-index:3;color:#aeb9cc;font-size:11px;text-align:center;pointer-events:none;min-height:16px}.sky-footer{bottom:54px;color:#717b8f}.sky-footer .dot{width:3px;height:3px;background:#b7c6e0;box-shadow:0 0 6px #a5b9e066}
@media(max-height:720px){.universe-readout{top:94px}}
</style>`);
const canvas=document.createElement('canvas');canvas.className='webgl-canvas';host.prepend(canvas);
const readout=document.createElement('div');readout.className='universe-readout';host.append(readout);
const label=document.createElement('div');label.className='universe-label';host.append(label);
document.querySelector('#dragTip').textContent='拖动 · 缩放';

async function createUniverse(){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x010205);
  const camera=new THREE.PerspectiveCamera(45,1,.01,2000);camera.position.set(0,2.2,12);
  const controls=new OrbitControls(camera,canvas);controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.065;
  controls.minDistance=6;controls.maxDistance=30;controls.zoomSpeed=.85;controls.autoRotate=true;controls.autoRotateSpeed=.09;
  controls.saveState();
  function syncSurface(){
    const isActive=skyPage.classList.contains('active');
    (isActive?host:todoBackdrop).prepend(canvas);
    controls.enabled=isActive;
    resize();
  }
  let wasActive=skyPage.classList.contains('active');
  new MutationObserver(()=>{
    const isActive=skyPage.classList.contains('active');
    if(isActive!==wasActive){syncSurface();}
    wasActive=isActive;
  }).observe(skyPage,{attributes:true,attributeFilter:['class']});
  const loader=new GLTFLoader();
  const [universeModel,pointModel]=await Promise.all([loader.loadAsync('./assets/universe.glb'),loader.loadAsync('./assets/wish-world.glb')]);
  const glowTexture=makeGlow();
  function glow(color,size,opacity){const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));sprite.scale.set(size,size,1);return sprite;}
  // Imported model cores are intentionally tiny, as distant stars appear as points of light.
  const center=new THREE.Group();scene.add(center);
  const sun=universeModel.scene.getObjectByName('Sun');sun.removeFromParent();sun.scale.setScalar(.034);
  sun.material=new THREE.MeshBasicMaterial({color:0xfff5e1,toneMapped:false});center.add(sun);
  const centralHalo=glow(0xffe3b8,1.15,.52);center.add(centralHalo);
  center.add(glow(0xfff4dc,.33,.83));

  // Sparse distant stars occupy a real volume. Most remain barely visible in the dark.
  let seed=83;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const fieldPositions=[],fieldColors=[],fieldSizes=[];
  for(let i=0;i<200;i++){
    const theta=random()*Math.PI*2,z=random()*2-1,r=20+random()*20,s=Math.sqrt(1-z*z);
    fieldPositions.push(r*s*Math.cos(theta),r*z,r*s*Math.sin(theta));
    const light=.18+Math.pow(random(),1.7)*.65;fieldColors.push(light*.85,light*.9,light);
    fieldSizes.push(.6+Math.pow(random(),2)*1.35);
  }
  const fieldGeometry=new THREE.BufferGeometry();fieldGeometry.setAttribute('position',new THREE.Float32BufferAttribute(fieldPositions,3));fieldGeometry.setAttribute('color',new THREE.Float32BufferAttribute(fieldColors,3));
  fieldGeometry.setAttribute('starSize',new THREE.Float32BufferAttribute(fieldSizes,1));
  scene.add(new THREE.Points(fieldGeometry,new THREE.ShaderMaterial({
    uniforms:{pixelRatio:{value:renderer.getPixelRatio()}},vertexColors:true,transparent:true,depthWrite:false,
    vertexShader:`attribute float starSize;uniform float pixelRatio;varying vec3 starColor;void main(){starColor=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=starSize*pixelRatio;}`,
    fragmentShader:`varying vec3 starColor;void main(){float r=length(gl_PointCoord-.5)*2.;float alpha=(1.-smoothstep(.05,1.,r))*.75;gl_FragColor=vec4(starColor,alpha);\n#include <colorspace_fragment>\n}`,
  })));

  const wishes=new THREE.Group();scene.add(wishes);const pickable=[];
  function rebuild(){
    wishes.children.forEach(group=>group.traverse(object=>{if(object.isMesh||object.isSprite)object.material.dispose();}));wishes.clear();pickable.length=0;
    const tasks=[...document.querySelectorAll('#stars .star')];readout.innerHTML=`<b>${tasks.length}</b> 颗星`;label.textContent='';
    tasks.forEach((element,i)=>{
      const star=new THREE.Group(),angle=.8+i*2.399963,radius=2.1+(i%4)*.6;
      star.position.set(Math.cos(angle)*radius,Math.sin(angle)*radius*.76,(i%5-2)*.64);
      // Seed each wish by its persistent ID: even identical titles get their own appearance.
      let wishSeed=2166136261;for(const character of element.dataset.wishId||element.title){wishSeed=Math.imul(wishSeed^character.codePointAt(0),16777619)>>>0;}
      const wishRandom=()=>{wishSeed=(wishSeed*1664525+1013904223)>>>0;return wishSeed/4294967296;};
      const size=.015+wishRandom()*.021,brightness=.5+wishRandom()*.48;
      const warm=wishRandom()<.28,coreColor=new THREE.Color(warm?0xfff0d7:0xeaf1ff).multiplyScalar(brightness);
      star.userData={label:element.title,phase:wishRandom()*Math.PI*2,twinkleSpeed:.35+wishRandom()*.5,twinkleAmount:.025+wishRandom()*.035,baseOpacity:.38+wishRandom()*.38};
      const core=pointModel.scene.clone(true);core.scale.setScalar(size);
      core.traverse(object=>{if(object.isMesh){object.material=new THREE.MeshBasicMaterial({color:coreColor,toneMapped:false});}});
      star.add(core);
      const halo=glow(warm?0xffe6be:0xbdcfff,.22+wishRandom()*.28,star.userData.baseOpacity);star.add(halo);star.userData.halo=halo;
      // Invisible, generous hit area makes a tiny star easy to tap on a phone.
      const hit=new THREE.Mesh(new THREE.SphereGeometry(.2,8,6),new THREE.MeshBasicMaterial({visible:false}));hit.userData.wish=star;star.add(hit);pickable.push(hit);wishes.add(star);
    });
  }
  new MutationObserver(rebuild).observe(document.querySelector('#stars'),{childList:true});rebuild();
  const raycaster=new THREE.Raycaster();let start=null;
  canvas.addEventListener('pointerdown',event=>{start=[event.clientX,event.clientY];});
  canvas.addEventListener('pointerup',event=>{
    if(!start||Math.hypot(event.clientX-start[0],event.clientY-start[1])>7)return;
    const rect=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);
    const hit=raycaster.intersectObjects(pickable)[0];label.textContent=hit?.object.userData.wish.userData.label||'';
  });
  function resize(){const rect=canvas.parentElement.getBoundingClientRect();if(!rect.width||!rect.height)return;renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);resizeObserver.observe(todoBackdrop);syncSurface();const clock=new THREE.Clock();
  function animate(){requestAnimationFrame(animate);const delta=Math.min(clock.getDelta(),.05),time=clock.elapsedTime;if(document.hidden)return;controls.update(delta);centralHalo.material.opacity=.5+Math.sin(time*.5)*.025;wishes.children.forEach(star=>{const data=star.userData;data.halo.material.opacity=data.baseOpacity+Math.sin(time*data.twinkleSpeed+data.phase)*data.twinkleAmount;});renderer.render(scene,camera);}
  animate();canvas.dataset.models='universe.glb,wish-world.glb';
}
function makeGlow(){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.05,'rgba(255,255,255,.94)');g.addColorStop(.15,'rgba(255,255,255,.35)');g.addColorStop(.4,'rgba(255,255,255,.065)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
createUniverse().catch(error=>{console.error('深空场景加载失败',error);readout.textContent='星空暂时没有打开，请刷新重试';});
