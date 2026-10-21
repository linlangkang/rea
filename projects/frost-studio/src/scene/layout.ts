// Meters, Y up. Entrance is +Z, glazing is -X / -Z, TV wall +X.
// Dimensions and the unseen entrance wall are inferred, not surveyed from the reference.
export const ROOM_LAYOUT = {
  size: [10,9,3.2] as [number,number,number],
  desk: [-4.23,0,-.65] as [number,number,number],
  bed: [-3,0,3.32] as [number,number,number],
  sofa: [-.05,0,-.45] as [number,number,number],
  tv: [4.88,1.48,.35] as [number,number,number],
  fridge: [4.43,0,-3.45] as [number,number,number],
  coffee: [1.58,0,-.4] as [number,number,number],
  door: [.95,1.12,4.46] as [number,number,number],
};
const desktop:Record<string,[number,number,number]>={
  desk:[0,0,0],chair:[-.15,0,.80],case:[1.10,.78,0],monitor:[-.32,.785,-.18],
  'monitor-2':[.32,.785,-.18],laptop:[-1.08,.785,.05],keyboard:[0,.785,.20],
  mouse:[.4,.785,.3],headset:[.77,.78,-.06],dock:[-.98,.785,-.28],cable:[0,.785,-.05],
};
export function layoutPosition(id:string):[number,number,number] {
  if(['bed','sofa','tv','fridge'].includes(id)) return [...ROOM_LAYOUT[id as 'bed'|'sofa'|'tv'|'fridge']];
  const p=desktop[id]??desktop.case, a=ROOM_LAYOUT.desk;
  return [a[0]+p[2],p[1],a[2]-p[0]];
}
export function layoutRotation(id:string) {return id==='bed'?Math.PI:['sofa','tv','fridge'].includes(id)?-Math.PI/2:Math.PI/2;}
export const cameraPoses:Record<string,{position:number[],look:number[]}>= {
  default:{position:[1.25,1.65,4.18],look:[-.7,1.2,-1.5]},
  room:{position:[8.5,10.5,12],look:[0,.5,0]},
  window:{position:[-2.6,1.65,-3.3],look:[.2,1.1,.7]},
  bed:{position:[.45,1.72,.6],look:[-2.2,.7,2.6]},
  lounge:{position:[1.25,1.55,2.1],look:[.2,.7,-.55]},
  desk:{position:[-1,1.65,1.1],look:[-3.23,1.07,-.65]},
  pc:{position:[-2.3,1.5,-1.1],look:[-3.23,1.03,-1.75]},
};
