import * as T from 'three';
import {box,cylinder,tube,material} from './models';
import {pbr} from './surfaces';

// Repeated solid details are instanced, in meters. No branded industrial CAD is implied.
export function repeated(g:T.Object3D,size:[number,number,number],positions:number[][],mat:T.Material){
  const mesh=new T.InstancedMesh(new T.BoxGeometry(...size),mat,positions.length),m=new T.Matrix4();
  positions.forEach((p,i)=>mesh.setMatrixAt(i,m.makeTranslation(p[0],p[1],p[2])));
  mesh.receiveShadow=true;g.add(mesh);return mesh;
}
export function fastener(g:T.Object3D,x:number,y:number,z:number,axis:'x'|'z'='x',r=.003){
  const group=new T.Group();group.position.set(x,y,z);if(axis==='x')group.rotation.y=Math.PI/2;g.add(group);
  const head=cylinder(group,r,.002,0,0,0,pbr('brushed','#9cabb4'));head.rotation.x=Math.PI/2;
  box(group,r*1.2,.0007,.0003,0,0,.0012,pbr('plastic','#283039'),0);
  box(group,.0007,r*1.2,.0003,0,0,.0013,pbr('plastic','#283039'),0);
}
export function hardwareFan(g:T.Object3D,x:number,y:number,z:number,size=.12,rgb=true){
  const f=new T.Group();f.position.set(x,y,z);g.add(f);
  const frame=pbr('plastic','#dce3e8'),rubber=pbr('rubber','#303e4a');
  for(const a of [-1,1]){box(f,size,.009,.025,0,a*(size/2-.0045),0,frame,.002);box(f,.009,size-.018,.025,a*(size/2-.0045),0,0,frame,.002);}
  const ring=new T.Mesh(new T.TorusGeometry(size*.407,size*.025,12,96),frame);f.add(ring);
  if(rgb){const led=new T.Mesh(new T.TorusGeometry(size*.445,.0024,12,96),pbr('diffuser','#9edfff'));led.position.z=.013;f.add(led);}
  const blade=new T.Shape();blade.moveTo(.009,0);blade.bezierCurveTo(.026,-.013,.047,-.009,.047,.006);blade.bezierCurveTo(.035,.012,.021,.018,.01,.012);blade.closePath();
  const geometry=new T.ExtrudeGeometry(blade,{depth:.0015,bevelEnabled:true,bevelThickness:.0004,bevelSize:.0004,bevelSegments:3,steps:1,curveSegments:16});
  const blades=new T.InstancedMesh(geometry,pbr('plastic','#aab8c7'),9),dummy=new T.Object3D();
  for(let i=0;i<9;i++){dummy.rotation.z=i*Math.PI*2/9;dummy.scale.setScalar(size/.12);dummy.position.z=.003;dummy.updateMatrix();blades.setMatrixAt(i,dummy.matrix);}f.add(blades);blades.userData.fanRotor=true;
  for(const a of [-1,1])for(const b of [-1,1]){box(f,.015,.015,.027,a*size*.405,b*size*.405,0,rubber,.003);fastener(f,a*size*.405,b*size*.405,.015,'z',.0025);}
  const hub=cylinder(f,size*.125,.016,0,0,.01,frame);hub.rotation.x=Math.PI/2;
  const cap=cylinder(f,size*.087,.001,0,0,.019,rubber);cap.rotation.x=Math.PI/2;
  // Fixed rear motor supports: these must not rotate with the blade instances.
  for(let i=0;i<4;i++){
    const support=box(f,size*.35,.004,.004,size*.23,0,-.013,frame,.001);
    support.position.set(Math.cos(i*Math.PI/2)*size*.23,Math.sin(i*Math.PI/2)*size*.23,-.013);
    support.rotation.z=i*Math.PI/2;
  }
  tube(f,[[0,0,-.016],[size*.28,0,-.016],[size*.43,size*.4,-.015]],.0008,rubber);
  return f;
}
export function cableBundle(g:T.Object3D,path:number[][],count=6){
  for(let i=0;i<count;i++){const offset=(i-(count-1)/2)*.0032;tube(g,path.map(p=>[p[0],p[1]+offset,p[2]]),.0014,pbr('plastic',i%3===0?'#819aaf':'#d9e0e4'));}
  for(const p of [path[1],path[path.length-2]])box(g,.006,count*.0032+.004,.005,p[0],p[1],p[2],pbr('plastic','#344651'),.001);
}
export function pcbDetails(g:T.Object3D){
  const chips:number[][]=[],smd:number[][]=[];
  for(let row=0;row<7;row++)for(let col=0;col<4;col++){
    const y=.14+row*.012,z=-.137+col*.016;
    chips.push([-.097,y,z]);smd.push([-.094,y+.004,z+.006]);
  }
  repeated(g,[.003,.007,.011],chips,pbr('plastic','#202932'));
  repeated(g,[.004,.0015,.0025],smd,pbr('brushed','#a9a798'));
  for(const y of [.145,.21,.27]){
    box(g,.012,.009,.095,-.094,y,-.075,pbr('plastic','#d6dce1'),.001);
    repeated(g,[.001,.0008,.002],Array.from({length:28},(_,i)=>[-.087,y,-.116+i*.003]),pbr('brushed','#ac955d'));
  }
  for(const z of [-.132,.092])for(const y of [.136,.272,.416])fastener(g,-.096,y,z);
  box(g,.014,.047,.013,-.093,.347,.098,pbr('plastic','#303e49'),.002);
  for(let i=0;i<9;i++){const c=cylinder(g,.0035,.009,-.086,.305+i*.011,-.121,pbr('brushed','#adbac5'));c.rotation.z=Math.PI/2;}
  // RAM sockets and retaining latches, independent of the removable DIMMs.
  for(const z of [.062,.085]){box(g,.009,.148,.01,-.088,.33,z,pbr('plastic','#303e49'),.001);for(const y of [.252,.408])box(g,.015,.009,.014,-.08,y,z,pbr('plastic','#d6dde3'),.002);}
}
export function hardwareLabel(g:T.Object3D,text:string,x:number,y:number,z:number,w:number,h:number){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#dfe6ea';ctx.fillRect(0,0,256,64);ctx.fillStyle='#263642';ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,128,32);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
  const label=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map,roughness:.8}));label.rotation.y=Math.PI/2;label.position.set(x,y,z);g.add(label);
}
