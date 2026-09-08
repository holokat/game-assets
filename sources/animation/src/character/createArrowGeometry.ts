import * as T from 'three';

/** One arrow, pointing along local +Z, reusable by the bow and projectile pool. */
export function createArrow() {
  const root = new T.Group(); root.name = 'Arrow';
  const shaft = new T.Mesh(new T.CylinderGeometry(.006,.006,.66,6), new T.MeshStandardMaterial({ color: '#a2875f', roughness: .72 }));
  shaft.rotation.x = Math.PI / 2; shaft.position.z = -.30;
  const tip = new T.Mesh(new T.ConeGeometry(.022,.09,4), new T.MeshStandardMaterial({ color: '#becbd4', metalness: .8, roughness: .24 }));
  tip.rotation.x = Math.PI / 2; tip.position.z = .06;
  const featherGeo = new T.PlaneGeometry(.06,.12); featherGeo.rotateX(Math.PI/2);
  const featherMat = new T.MeshStandardMaterial({ color:'#d3cbb5', side:T.DoubleSide, roughness:.85 });
  root.add(shaft,tip);
  for (let i=0;i<3;i++) {
    const feather = new T.Mesh(featherGeo,featherMat); feather.position.z = -.56; feather.rotation.z = i*Math.PI*2/3; root.add(feather);
  }
  return root;
}
