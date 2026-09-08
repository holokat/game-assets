import * as T from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createLimbTargetSolver } from '../../../animation/createLimbTargetSolver';
import { disposeTree } from '../../spells/spellVfxUtils';
import { enableSpellBloom } from '../../spells/spellBloom';
import type { SummonKind } from '../../../abilities/summonDefinitions';

type Part = T.Group;
const DOWN = new T.Vector3(0, -1, 0);

/** Code-authored, articulated summon visuals. Independent of the caster and equipment. */
export function createSummonFigure(kind: SummonKind) {
  const root = new T.Group(); root.name = `Summoned_${kind}`;
  const pelvis = new T.Group(), chest = new T.Group(), head = new T.Group();
  pelvis.name = 'Pelvis'; chest.name = 'Chest'; head.name = 'Head';
  root.add(pelvis); pelvis.add(chest); chest.position.y = .34; chest.add(head); head.position.y = .37;
  const imp = kind === 'imp';
  const body = new T.MeshStandardMaterial({ color: imp ? '#8b3c33' : '#d5c9a6', roughness: .83, vertexColors: true });
  const dark = new T.MeshStandardMaterial({ color: imp ? '#382329' : '#29281f', roughness: .93, side: T.DoubleSide });
  const eyes = enableSpellBloom(new T.MeshStandardMaterial({ color: imp ? '#ffaf24' : '#b6ed7a', emissive: imp ? '#ff6d08' : '#76d634', emissiveIntensity: 2.5 }));
  const buckets = new Map<Part, Map<T.Material, T.BufferGeometry[]>>();
  const rotation = new T.Quaternion(), matrix = new T.Matrix4(), center = new T.Vector3(), scale = new T.Vector3();
  function add(part: Part, geometry: T.BufferGeometry, material: T.Material = body) {
    if (!buckets.has(part)) buckets.set(part, new Map());
    const materials = buckets.get(part)!;
    if (!materials.has(material)) materials.set(material, []);
    materials.get(material)!.push(geometry);
  }
  function oval(part: Part, x: number, y: number, z: number, sx: number, sy: number, sz: number, material = body) {
    const geometry = new T.SphereGeometry(1, 16, 12);
    geometry.scale(sx, sy, sz).translate(x, y, z); add(part, geometry, material);
  }
  function rod(part: Part, a: number[], b: number[], radius: number, radiusEnd = radius, material = body) {
    const start = new T.Vector3(...a as [number, number, number]), end = new T.Vector3(...b as [number, number, number]);
    const length = start.distanceTo(end);
    rotation.setFromUnitVectors(DOWN, end.clone().sub(start).normalize());
    center.copy(start).add(end).multiplyScalar(.5); scale.set(1, 1, 1);
    matrix.compose(center, rotation, scale);
    add(part, new T.CylinderGeometry(radius, radiusEnd, length, 10).applyMatrix4(matrix), material);
  }
  function curve(part: Part, points: number[][], radius: number, material = body) {
    const path = new T.CatmullRomCurve3(points.map(p => new T.Vector3(p[0], p[1], p[2])));
    add(part, new T.TubeGeometry(path, 24, radius, 7, false), material);
  }

  if (imp) {
    oval(pelvis, 0, .045, 0, .18, .16, .13);
    oval(chest, 0, -.03, 0, .23, .25, .15);
    oval(chest, 0, -.12, .09, .13, .16, .08, dark);
    oval(head, 0, .065, .015, .16, .20, .14);
    oval(head, 0, -.06, .14, .105, .065, .07);
    for (const side of [-1, 1]) {
      curve(head, [[side*.105,.19,0],[side*.19,.29,-.045],[side*.20,.39,-.13]], .032, dark);
      rod(head, [side*.20,.36,-.11], [side*.16,.43,-.17], .024, .001, dark);
      rod(head, [side*.13,.07,0], [side*.29,.17,-.045], .06, .003);
      oval(head, side*.074, .074, .131, .052, .031, .024, dark);
      oval(head, side*.076, .077, .151, .031, .016, .008, eyes);
      rod(head, [side*.045,.107,.151], [side*.125,.133,.111], .023, .032);
      rod(head, [side*.055,-.026,.195], [side*.051,-.084,.209], .014, .001);
    }
    curve(pelvis, [[0,-.045,-.09],[0,-.14,-.3],[.17,-.16,-.48],[.34,.03,-.51],[.32,.12,-.45]], .023);
    rod(pelvis, [.32,.08,-.47], [.31,.19,-.4], .048, .001, dark);
    // Small folded bat wings, with scalloped membranes between rigid spars.
    for (const side of [-1, 1]) {
      const outline = [[.11,.14,-.10],[.25,.27,-.2],[.52,.30,-.33],[.40,.07,-.28],[.47,-.21,-.28],[.26,-.16,-.21],[.12,-.24,-.12]];
      const positions: number[] = [];
      for (let i = 1; i < outline.length-1; i++) for (const p of [outline[0]!, outline[i]!, outline[i+1]!]) positions.push(side*p[0]!, p[1]!, p[2]!);
      const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); geometry.computeVertexNormals();
      add(chest, geometry, dark);
      for (const i of [2,4,6]) curve(chest, [[side*.11,.14,-.10],[side*.25,.27,-.2], [side*outline[i]![0]!,outline[i]![1]!,outline[i]![2]!]], .014);
    }
  } else {
    // Pelvic arches, separate vertebrae, paired ribs and a sternum leave real open gaps.
    for (const side of [-1, 1]) {
      curve(pelvis, [[0,.1,-.02],[side*.12,.15,-.03],[side*.20,.09,.02],[side*.16,-.07,.07],[side*.04,-.10,.09],[0,-.04,.10]], .027);
      oval(pelvis, side*.12, .095, -.012, .071, .065, .024);
      for (let i = 0; i < 7; i++) {
        const y = .16-i*.040, width = .18-Math.pow((i-2)/8,2)*.15;
        curve(chest, [[side*.025,y,-.075],[side*width,y+.015,-.025],[side*(width+.015),y-.008,.085],[side*.075,y-.045,.14],[side*.017,y-.033,.125]], .0095);
      }
      curve(chest, [[0,.19,.08],[side*.10,.22,.04],[side*.21,.19,0]], .017);
      oval(chest, side*.13, .12, -.095, .069, .090, .018);
    }
    for (let i=0;i<5;i++) oval(pelvis, 0, .07+i*.041, -.055, .030, .019, .029);
    for (let i=0;i<8;i++) oval(chest, 0, -.08+i*.041, -.060, .027, .018, .027);
    rod(chest,[0,.21,-.06],[0,.28,-.015],.025,.020);
    rod(chest, [0,.17,.13], [0,-.07,.13], .016, .010);
    oval(head, 0, .085, -.015, .122, .148, .105);
    oval(head, 0, -.016, .055, .088, .070, .061);
    for (const side of [-1,1]) {
      // Recessed dark sockets under brow and cheek bones, not painted round eyes.
      oval(head, side*.052, .042, .088, .042, .046, .027, dark);
      oval(head, side*.054, .040, .112, .012, .013, .008, eyes);
      curve(head, [[side*.014,.092,.105],[side*.056,.108,.103],[side*.102,.07,.072]], .019);
      rod(head, [side*.093,.01,.071], [side*.071,-.029,.106], .019, .014);
    }
    oval(head, 0, -.017, .112, .015, .025, .008, dark);
    curve(head, [[-.079,-.026,.054],[-.070,-.092,.098],[0,-.107,.119],[.070,-.092,.098],[.079,-.026,.054]], .017);
    for (let i=0;i<8;i++) {
      oval(head, (i-3.5)*.014, -.053, .119-Math.abs(i-3.5)*.002, .006, .012, .007);
      oval(head, (i-3.5)*.014, -.079, .128-Math.abs(i-3.5)*.003, .006, .009, .006);
    }
  }

  function limb(name: string, parent: Part, x: number, y: number, upperLength: number, lowerLength: number, leg: boolean) {
    const upper = new T.Group(), lower = new T.Group(), end = new T.Group();
    upper.name = name; lower.name = `${name}Joint`; end.name = `${name}Contact`;
    parent.add(upper); upper.position.set(x,y,0); upper.add(lower); lower.position.y=-upperLength; lower.add(end); end.position.y=-lowerLength;
    const radius = leg ? .027 : .018;
    for (const [part,length] of [[upper,upperLength],[lower,lowerLength]] as const) {
      if (imp) {
        oval(part, 0, -length*.44, 0, leg ? .076 : .052, length*.58, leg ? .072 : .053);
      } else {
        const double = part === lower;
        rod(part, [0,-.015,0], [double ? -.011 : 0,-length+.018,0], radius, radius*.70);
        if (double) rod(part, [.025,-.015,-.013], [.018,-length+.018,-.009], radius*.5);
        for(const y of [0,-length]) oval(part,0,y,0,radius*1.35,radius*1.1,radius*1.35);
      }
    }
    if (leg) {
      oval(end,0,.002,.038,imp ? .064 : .035,.029,.085);
      for(let i=0;i<(imp?3:5);i++) rod(end, [(i-(imp?1:2))*.019,0,.072], [(i-(imp?1:2))*.025,-.016,.145-Math.abs(i-2)*.009], .008, imp ? .001 : .006);
    } else {
      if(imp) oval(end,0,-.036,0,.043,.055,.024);
      for(let i=0;i<4;i++) {
        const x=(i-1.5)*.020, length=.085-Math.abs(i-1)*.010;
        rod(end,[x,0,0],[x,-.054,0],.008);
        curve(end, [[x,-.054,0],[x,-.054-length*.5,.007],[x,-.054-length,.035],[x,-.047-length,.051]], imp ? .009 : .006);
      }
      curve(end, [[.026,-.017,0],[.060,-.047,.005],[.064,-.084,.025],[.053,-.093,.04]], imp ? .012 : .008);
    }
    return { upper, lower, end, solver: createLimbTargetSolver(upper,lower,end) };
  }
  const leftArm = limb('LeftArm',chest,.22,.19,.30,.29,false), rightArm = limb('RightArm',chest,-.22,.19,.30,.29,false);
  const leftLeg = limb('LeftLeg',pelvis,.13,0,.39,.38,true), rightLeg = limb('RightLeg',pelvis,-.13,0,.39,.38,true);

  // Merge static anatomy within each joint, keeping the rig small and independently poseable.
  for (const [part, materials] of buckets) for (const [material, geometries] of materials) {
    const plain = geometries.map(g => {
      const geometry = g.index ? g.toNonIndexed() : g.clone(); geometry.deleteAttribute('uv');
      if(material===body) {
        const attribute=geometry.getAttribute('position'), colors=new Float32Array(attribute.count*3);
        for(let i=0;i<attribute.count;i++) {
          const shade=.82+.18*Math.sin(attribute.getX(i)*119+attribute.getY(i)*73+attribute.getZ(i)*97)**2;
          colors.set([shade,shade,shade],i*3);
        }
        geometry.setAttribute('color',new T.BufferAttribute(colors,3));
      }
      return geometry;
    });
    const mesh=new T.Mesh(mergeGeometries(plain)!, material); mesh.castShadow=true; mesh.receiveShadow=true; part.add(mesh);
    for(const geometry of [...geometries,...plain]) geometry.dispose();
  }
  const limbs = [leftArm,rightArm,leftLeg,rightLeg] as const;
  return { root, pelvis, chest, head, leftArm, rightArm, leftLeg, rightLeg, limbs,
    dispose() { disposeTree(root); },
  };
}

export type SummonFigure = ReturnType<typeof createSummonFigure>;
