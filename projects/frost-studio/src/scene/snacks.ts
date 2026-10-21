import * as T from 'three';
import {box,cylinder,geometry,materials} from './models';
import {pbr} from './surfaces';

// Brand names identify visual references; these drawn labels are not official artwork.
export const SNACKS=[
 {name:'可口可乐',kind:'can',color:'#cf2236',sub:'汽水',source:'https://www.coca-cola.com/cn/zh/brands/coca-cola'},
 {name:'果粒橙',kind:'bottle',color:'#f3a52d',sub:'美汁源 · 果汁饮料',source:'https://www.coca-cola.com/cn/zh/brands/minute-maid'},
 {name:'冰红茶',kind:'bottle',color:'#c84225',sub:'康师傅 · 茶饮料',source:'https://www.masterkong.com.cn/'},
 {name:'绿茶',kind:'bottle',color:'#48833b',sub:'康师傅 · 茶饮料',source:'https://www.masterkong.com.cn/'},
 {name:'饮用水',kind:'bottle',color:'#3e92bb',sub:'WATER · 纯净水',source:null},
 {name:'脆脆鲨',kind:'box',color:'#ce252c',sub:'雀巢 · 巧克力威化',source:'https://www.nestle.com.cn/brands/confectionery-a/confectionery_01'},
 {name:'薯片',kind:'bag',color:'#e4b734',sub:'薄切 · 原味',source:null},
 {name:'每日坚果',kind:'bag',color:'#477651',sub:"Member’s Mark · 包装示意",source:'https://www.samsclub.com/browse/Candy-%26-Snacks/1455'},
 {name:'黄油饼干',kind:'box',color:'#295976',sub:"Member’s Mark · 包装示意",source:'https://help.samsclub.com/app/answers/detail/a_id/2790'},
 {name:'混合坚果',kind:'jar',color:'#986936',sub:'腰果 · 杏仁 · 核桃',source:null},
 {name:'葡萄果汁',kind:'bottle',color:'#764878',sub:'果汁饮料 · 包装示意',source:null},
 {name:'苏打水',kind:'can',color:'#429e8c',sub:'清爽 · 气泡饮料',source:null},
] as const;
function label(index:number){
 const key='snack-label-'+index;if(materials.has(key))return materials.get(key)!;
 const item=SNACKS[index],canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
 const ctx=canvas.getContext('2d')!;ctx.fillStyle=item.color;ctx.fillRect(0,0,512,256);
 ctx.fillStyle='rgba(255,255,255,.16)';ctx.beginPath();ctx.ellipse(390,200,190,120,-.4,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#fff9ea';ctx.textAlign='center';ctx.font='bold 52px "Microsoft YaHei",sans-serif';ctx.fillText(item.name,256,112);
 ctx.font='20px "Microsoft YaHei",sans-serif';ctx.fillText(item.sub,256,151);
 ctx.font='14px sans-serif';ctx.fillText('视觉包装示意',256,224);
 // Drawn bar code is decorative, never a scannable retail identifier.
 ctx.fillStyle='#e8dfcf';ctx.fillRect(12,176,62,60);ctx.fillStyle='#24323b';
 for(let i=0;i<18;i++)ctx.fillRect(16+i*3,182,i%3===0?2:1,40);
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
 const material=new T.MeshStandardMaterial({map,roughness:.55});materials.set(key,material);return material;
}
export function snack(index:number){
 index=index%SNACKS.length;const item=SNACKS[index],g=new T.Group();g.name='食品_'+item.name;g.userData.snack=item.name;
 const ink=label(index),metal=pbr('brushed','#b8bdbe');
 if(item.kind==='can'){
  const profile=[[0,0],[.028,0],[.032,.006],[.033,.016],[.033,.106],[.03,.119],[.028,.122],[0,.122]].map(p=>new T.Vector2(...p as [number,number]));
  const can=new T.Mesh(geometry('snack-can',()=>new T.LatheGeometry(profile,48)),ink);can.rotation.y=Math.PI;can.castShadow=can.receiveShadow=true;g.add(can);
  for(const y of [.003,.12])cylinder(g,.028,.002,0,y,0,metal);
  const tab=new T.Mesh(geometry('can-tab',()=>new T.TorusGeometry(.009,.0015,6,20)),metal);tab.rotation.x=Math.PI/2;tab.scale.x=.65;tab.position.set(0,.122,.003);g.add(tab);
 }else if(item.kind==='bottle'||item.kind==='jar'){
  const jar=item.kind==='jar';
  const profile=(jar?[[0,0],[.043,0],[.048,.01],[.048,.12],[.041,.136],[.04,.145],[0,.145]]:[[0,0],[.028,0],[.033,.006],[.034,.035],[.031,.04],[.033,.05],[.032,.145],[.028,.167],[.015,.185],[.013,.204],[0,.204]]).map(p=>new T.Vector2(p[0],p[1]));
  const shell=new T.Mesh(geometry(jar?'snack-jar':'snack-bottle',()=>new T.LatheGeometry(profile,48)),new T.MeshPhysicalMaterial({color:'#e0edf0',transparent:true,opacity:.28,roughness:.15,depthWrite:false}));shell.castShadow=false;g.add(shell);
  const liquid=cylinder(g,jar?.044:.029,jar?.105:.147,0,jar?.06:.079,0,pbr('plastic',jar?'#bf925f':index===4?'#b1cbd1':item.color));
  liquid.material.name='饮料内容示意';
  const sleeve=new T.Mesh(geometry(jar?'jar-label':'bottle-label',()=>new T.CylinderGeometry(jar?.049:.0335,jar?.049:.0335,jar?.055:.068,48,1,true)),ink);sleeve.rotation.y=Math.PI;sleeve.position.y=jar?.075:.108;g.add(sleeve);
  cylinder(g,jar?.042:.0145,.014,0,jar?.15:.208,0,pbr('plastic',item.color));
  for(let i=0;i<3&&!jar;i++)cylinder(g,.0335,.0015,0,.018+i*.007,0,pbr('plastic','#ccd6d7'));
 }else{
  const bag=item.kind==='bag',w=bag?.135:.15,h=bag?.19:.14,d=bag?.05:.045;
  const geo=new T.BoxGeometry(w,h,d,12,16,2),p=geo.getAttribute('position');
  if(bag)for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),bulge=Math.sin((y/h+.5)*Math.PI)*Math.cos(x/w*Math.PI);
   p.setZ(i,z*(.42+.65*bulge)+Math.sign(z)*.0018*Math.sin(x*220+y*165)*bulge);
  }
  geo.computeVertexNormals();const mesh=new T.Mesh(geo,ink);mesh.position.y=h/2;mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);
  if(bag)for(const y of [.006,h-.006]){box(g,w,.012,.015,0,y,0,pbr('plastic',item.color),.001);for(let n=0;n<15;n++)box(g,.001,.008,.0005,-w*.46+n*w*.065,y,.008,pbr('plastic','#ddc69e'),0);}
 }
 return g;
}
export function stockedFridge(g:T.Group,color:string){
 const outer=pbr('metal',color),liner=pbr('plastic','#e5e9e6');
 box(g,.7,.06,.7,0,.045,0,outer,.012);box(g,.7,.06,.7,0,1.77,0,outer,.012);
 for(const x of [-.325,.325])box(g,.05,1.7,.7,x,.9,0,outer,.012);
 box(g,.6,1.65,.045,0,.9,-.32,liner,.005);
 for(const x of [-.296,.296])box(g,.012,1.62,.58,x,.9,-.006,liner,.003);
 for(const y of [.11,.46,.81,1.14,1.46]){
  box(g,.58,.012,.55,0,y,-.025,pbr('glass','#d1e6e5'),.003);
  box(g,.58,.018,.016,0,y,.25,pbr('plastic','#d4dedc'),.003);
 }
 let n=0;
 for(const y of [.12,.47,.82,1.15,1.47])for(const x of [-.2,-.07,.07,.2]){
  const item=snack([0,1,2,3,4,10,11,0,1,2,3,4,5,8,0,11,0,11,4,1][n++]);
  item.position.set(x,y,-.12);if(n===13||n===14)item.scale.setScalar(.65);g.add(item);
 }
 for(const x of [-.28,.28])box(g,.009,1.52,.013,x,.91,.22,pbr('diffuser','#ecf5ee'),.002);
 for(const [bottom,height] of [[.08,1.03],[1.13,.61]]){
  const door=new T.Group();door.name='fridge_door_'+bottom;door.userData.fridgeDoor=true;door.position.set(.31,bottom+height/2,.352);g.add(door);
  box(door,.64,height,.047,-.31,0,0,outer,.012);
  box(door,.6,height-.045,.006,-.31,0,-.027,pbr('rubber','#778483'),.003);
  box(door,.572,height-.077,.013,-.31,0,-.035,liner,.005);
  box(door,.021,.19,.04,-.56,height*.27,.034,pbr('brushed','#b6c3c8'),.006);
  for(const y of [-height*.3,height*.15]){
   box(door,.52,.014,.09,-.31,y,-.09,liner,.003);box(door,.52,.055,.008,-.31,y+.022,-.138,liner,.003);
   for(const x of [-.45,-.18]){const drink=snack(bottom<.1?4:11);drink.scale.setScalar(.58);drink.position.set(x,y+.009,-.083);door.add(drink);}
  }
 }
 for(const y of [.16,1.1,1.67])cylinder(g,.012,.04,.319,y,.344,pbr('brushed','#b9bfc2'));
}
