(() => {
  const card=document.querySelector('.app-card');
  const layer=document.createElement('div');layer.className='wish-effects';layer.setAttribute('aria-hidden','true');card.append(layer);
  const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function origin(row,center=false){
    const bounds=card.getBoundingClientRect(),rect=(center?row:row.querySelector('.check')).getBoundingClientRect();
    const root=document.createElement('div');root.className='wish-effect';
    root.style.left=`${rect.left-bounds.left+rect.width/2}px`;root.style.top=`${rect.top-bounds.top+rect.height/2}px`;layer.append(root);
    return {root,x:rect.left-bounds.left+rect.width/2,y:rect.top-bounds.top+rect.height/2};
  }
  function part(root,className,frames,duration,delay=0){
    const element=document.createElement('i');element.className=className;root.append(element);
    element.animate(frames,{duration,delay,easing:'cubic-bezier(.16,.6,.32,1)',fill:'both'});
    return element;
  }
  function flash(root){part(root,'nova-core',[{opacity:0,transform:'scale(.35)'},{opacity:.6,offset:.3},{opacity:0,transform:'scale(.8)'}],300);setTimeout(()=>root.remove(),350);}
  function supernova(row){
    const {root}=origin(row,true);if(reduced()){flash(root);return;}
    part(root,'nova-halo',[{opacity:0,transform:'scale(.1)'},{opacity:.9,offset:.16},{opacity:0,transform:'scale(1.7)'}],1450);
    part(root,'nova-core',[{opacity:0,transform:'scale(.15)'},{opacity:1,transform:'scale(1.1)',offset:.16},{opacity:0,transform:'scale(.4)'}],1150);
    for(let i=0;i<2;i++)part(root,'nova-ring',[{opacity:0,transform:'scale(.12)'},{opacity:.7,offset:.13},{opacity:0,transform:`scale(${i?3.7:2.7})`}],1350,i*110);
    for(let i=0;i<4;i++){const angle=i*45;part(root,'nova-ray',[{opacity:0,transform:`rotate(${angle}deg) scaleX(.08)`},{opacity:.75,offset:.16},{opacity:0,transform:`rotate(${angle}deg) scaleX(1.25)`}],850);}
    for(let i=0;i<36;i++){
      const angle=i*Math.PI*2/36+(Math.random()-.5)*.12,distance=40+Math.random()*105;
      const x=Math.cos(angle)*distance,y=Math.sin(angle)*distance*.75;
      part(root,`wish-spark${i%3?'':' cool'}`,[{opacity:0,transform:'translate(0,0) scale(.1)'},{opacity:.9,offset:.12},{opacity:0,transform:`translate(${x}px,${y}px) scale(.2)`}],950+Math.random()*450,50+Math.random()*100);
    }
    setTimeout(()=>root.remove(),1800);
  }
  function meteor(row){
    const {root,x,y}=origin(row);if(reduced()){flash(root);return;}
    const header=card.querySelector('.header').offsetHeight;
    const dx=Math.max(90,card.clientWidth-x-28),dy=-Math.max(60,Math.min(y-header+12,180));
    const angle=Math.atan2(dy,dx)*180/Math.PI;
    const flight=part(root,'meteor-flight',[
      {opacity:0,transform:`translate(0,0) rotate(${angle}deg) scale(.15)`},
      {opacity:1,transform:`translate(${dx*.12}px,${dy*.12}px) rotate(${angle}deg) scale(1)`,offset:.18},
      {opacity:.85,offset:.65},
      {opacity:0,transform:`translate(${dx}px,${dy}px) rotate(${angle}deg) scale(.45)`}
    ],1100);
    const tail=document.createElement('i');tail.className='meteor-tail';flight.append(tail);
    const core=document.createElement('i');core.className='meteor-core';flight.append(core);
    for(let i=0;i<18;i++){
      const t=i/18*.85,px=dx*t,py=dy*t;
      part(root,`wish-spark${i%2?' cool':''}`,[{opacity:0,transform:`translate(${px}px,${py}px) scale(.6)`},{opacity:.65,offset:.1},{opacity:0,transform:`translate(${px-12}px,${py+15+Math.random()*18}px) scale(.1)`}],650,i*30);
    }
    setTimeout(()=>root.remove(),1350);
  }
  window.wishEffects={supernova,meteor};
})();
