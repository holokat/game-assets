import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

export const background = '#ded9d0';
const cameraViews = Object.freeze({
  front: [0, -18.5, 6.2], side: [-18.5, 0, 6.2], back: [0, 18.5, 6.2],
  three: [6.2, -17.4, 9], face: [2, -6, 7.7], top: [0, -0.001, 23],
});

function createContactShadow() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.scale(1, 0.5);
  const gradient = context.createRadialGradient(128, 128, 5, 128, 128, 120);
  gradient.addColorStop(0, 'rgba(47,37,22,.43)');
  gradient.addColorStop(0.5, 'rgba(47,37,22,.20)');
  gradient.addColorStop(1, 'rgba(47,37,22,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 2.2), new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false, opacity: 0.28,
  }));
  contact.position.set(-0.1, 0.15, 0.01);
  return contact;
}

/** Owns only the stage's renderer, camera, lighting and ground resources. */
export function createStage(canvas) {
  THREE.Object3D.DEFAULT_UP.set(0, 0, 1);
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: false, preserveDrawingBuffer: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.13;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(background);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  scene.environmentIntensity = 0.65;
  scene.fog = new THREE.Fog(background, 45, 100);

  const camera = new THREE.PerspectiveCamera(29, 1, 0.15, 100);
  camera.up.set(0, 0, 1);
  camera.position.set(...cameraViews.three);
  camera.lookAt(0, 0, 4);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0, 4.1);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 5;
  controls.maxDistance = 38;
  controls.maxPolarAngle = Math.PI * 0.58;

  const sky = new THREE.HemisphereLight('#fff5e7', '#5e6070', 0.75);
  const key = new THREE.DirectionalLight('#fff4df', 3.1);
  key.position.set(-5, -8, 14);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, {left: -22, right: 22, top: 24, bottom: -20, near: 0.2, far: 65});
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.035;
  key.shadow.radius = 4;
  const fill = new THREE.DirectionalLight('#d9e7ff', 1.1);
  fill.position.set(6, -1, 9);
  const rim = new THREE.DirectionalLight('#fff0cb', 2);
  rim.position.set(1, 6, 10);
  scene.add(sky, key, fill, rim);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({color: '#b7b1a4', roughness: 1, metalness: 0}));
  ground.name = 'Studio ground';
  ground.position.z = -0.015;
  ground.receiveShadow = true;
  const contact = createContactShadow();
  const grid = new THREE.GridHelper(20, 20, '#998d7c', '#b9ad9c');
  grid.rotation.x = Math.PI / 2;
  grid.position.z = 0.01;
  grid.material.transparent = true;
  grid.material.opacity = 0.18;
  grid.visible = false;
  const target = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.025, 6, 48), new THREE.MeshStandardMaterial({color: '#928570', roughness: 1}));
  ring.rotation.x = Math.PI / 2;
  target.add(ring);
  target.position.set(4.8, -1.6, 2.4);
  target.visible = false;
  scene.add(ground, contact, grid, target);

  let invalidate = () => {};
  let disposed = false;
  const resize = () => {
    if (disposed) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
    camera.aspect = Math.max(1, rect.width) / Math.max(1, rect.height);
    camera.updateProjectionMatrix();
    invalidate();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas.parentElement);
  resize();
  return {
    renderer, scene, camera, controls, grid, target, contact, ground, resize,
    setInvalidate(callback) { invalidate = callback; },
    view(name) {
      const position = cameraViews[name];
      if (!position) throw new Error(`Unknown camera view: ${name}`);
      const height = this.characterHeight || 8.18;
      controls.target.set(0, 0, name === 'face' ? (this.characterFaceHeight || 7.25) : height * 0.50);
      camera.position.set(...position);
      if (name === 'face') camera.position.z += (this.characterFaceHeight || 7.25) - 7.25;
      if (name !== 'face') {
        const fit = Math.max(.72, height / 8.18);
        camera.position.x *= fit;
        camera.position.y *= fit;
        camera.position.z *= fit;
      }
      controls.update();
      invalidate();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      observer.disconnect();
      controls.dispose();
      for (const mesh of [ground, contact, grid, ring]) {
        mesh.geometry.dispose();
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          material.map?.dispose();
          material.dispose();
        }
      }
      environment.dispose();
      key.shadow.dispose();
      renderer.dispose();
    },
  };
}
