import * as T from 'three';
// Analytic contact-occlusion approximation, not baked GI or screen-space AO.
export function contactShadow(w:number,d:number){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
 const ctx=canvas.getContext('2d')!,grad=ctx.createRadialGradient(32,32,4,32,32,32);
 grad.addColorStop(0,'rgba(25,22,17,.36)');grad.addColorStop(.6,'rgba(25,22,17,.17)');grad.addColorStop(1,'rgba(25,22,17,0)');
 ctx.fillStyle=grad;ctx.fillRect(0,0,64,64);
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
 const mesh=new T.Mesh(new T.PlaneGeometry(w,d),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,toneMapped:false}));
 mesh.rotation.x=-Math.PI/2;mesh.position.y=.009;mesh.userData.noPick=true;return mesh;
}
