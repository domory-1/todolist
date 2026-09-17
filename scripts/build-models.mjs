import fs from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// The exported files are ordinary GLB meshes, with normals, UVs and PBR materials.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(data => { this.result = data; this.onloadend?.(); }); }
};
let seed = 41;
function random() { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }
const model = new THREE.Group(); model.name = 'LittleUniverse';
const sun = new THREE.Mesh(new THREE.SphereGeometry(1.36, 80, 64), new THREE.MeshStandardMaterial({ color: 0xffc66e, roughness: .82, emissive: 0xf78b22, emissiveIntensity: .22 }));
sun.name = 'Sun'; model.add(sun);
const asteroidMaterial = new THREE.MeshStandardMaterial({ color: 0x837d96, roughness: .94, metalness: .08 });
const belt = new THREE.Group(); belt.name = 'AsteroidBelt';
const rockGeometry = new THREE.IcosahedronGeometry(1, 1);
const positions = rockGeometry.attributes.position;
for (let i = 0; i < positions.count; i++) { const k = .83 + random() * .27; positions.setXYZ(i, positions.getX(i)*k, positions.getY(i)*k, positions.getZ(i)*k); }
rockGeometry.computeVertexNormals();
for (let i = 0; i < 210; i++) {
  const a = random()*Math.PI*2, r = 3.1 + random()*.55;
  const rock = new THREE.Mesh(rockGeometry, asteroidMaterial);
  rock.name = `Asteroid_${i}`;
  rock.position.set(Math.cos(a)*r, (random()-.5)*.2, Math.sin(a)*r);
  const s = .018 + random()*.045; rock.scale.set(s,s*(.7+random()*.5),s*(.7+random()*.7));
  rock.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI); belt.add(rock);
}
model.add(belt);
for (let i=0;i<2;i++) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(i?4.15:2.35, .009, 6, 240),new THREE.MeshStandardMaterial({ color:i?0x7886b1:0xd5a965,roughness:.4,metalness:.6 }));
  ring.name = `Orbit_${i}`; ring.rotation.x=Math.PI/2; model.add(ring);
}
const shape = new THREE.Shape();
for (let i=0;i<10;i++) { const a=Math.PI/2+i*Math.PI/5, r=i%2?.23:.52; const x=Math.cos(a)*r,y=Math.sin(a)*r; if(i)shape.lineTo(x,y);else shape.moveTo(x,y); }
shape.closePath();
const starGeometry = new THREE.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:true,bevelThickness:.09,bevelSize:.065,bevelSegments:5,steps:1,curveSegments:12});
starGeometry.center();starGeometry.computeVertexNormals();
const star=new THREE.Mesh(starGeometry,new THREE.MeshStandardMaterial({color:0xffda89,metalness:.65,roughness:.23,emissive:0xb6610e,emissiveIntensity:.12}));star.name='WishStar';
const exporter = new GLTFExporter();
await fs.mkdir(new URL('../assets/', import.meta.url),{recursive:true});
const world = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.MeshStandardMaterial({ roughness: .92, metalness: 0 }));
world.name = 'WishWorld';
for (const [name,object] of [['universe',model],['wish-star',star],['wish-world',world]]) {
  const data=await exporter.parseAsync(object,{binary:true});
  await fs.writeFile(new URL(`../assets/${name}.glb`,import.meta.url),Buffer.from(data));
  console.log(`${name}.glb: ${data.byteLength} bytes`);
}
