/* eslint-disable */
// OYSTER & CO. — Procedural watch engine (ported 1:1 from the fixed v1 experience).
// Client-only. Consumed via static import inside client components (three/gsap are
// ESM-safe in client bundles). No localStorage, no DOM globals beyond the canvas.
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export {};

const REDUCED =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const IS_TOUCH =
  typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

/* ── Catalog data (mirrors src/data/catalog.json — engine-side colors) ── */
const DIAL_HEX = {
  black: '#101316', champagne: '#c7ad72', blue: '#173c63',
  green: '#075739', white: '#dedbd2', grey: '#777b7e',
};
const MODELS = {
  submariner: { stockDial: 'black', stockBezel: 'ceramic', stockBracelet: 'steel' },
  daytona: { stockDial: 'white', stockBezel: 'tachymeter', stockBracelet: 'steel' },
  datejust: { stockDial: 'champagne', stockBezel: 'fluted', stockBracelet: 'steel' },
  gmt: { stockDial: 'black', stockBezel: 'pepsi', stockBracelet: 'steel' },
};

function caseHex(state) { return state.bracelet === 'gold' ? '#c4a15b' : '#b9bdc1'; }
function handHex(state) { return state.bracelet === 'gold' ? '#e1c77f' : '#e6dfcb'; }
function bezelHex(state) {
  switch (state.bezel) {
    case 'pepsi': return '#123f78';
    case 'fluted': case 'gold': return '#c6a252';
    case 'ceramic': return '#111315';
    case 'tachymeter': return '#17191a';
    default: return '#90969a';
  }
}
function braceletMatFor(parts, state, side) {
  if (state.bracelet === 'gold') return parts.goldMaterial;
  if (state.bracelet === 'two' && side) return parts.goldMaterial;
  return parts.steelMaterial;
}

export function createEngine(canvas, getState) {
  gsap.registerPlugin(ScrollTrigger);

  let renderer, scene, camera, watchRoot, watchParts, envTarget, storyTimeline;
  let webglReady = false;
  let renderVisible = true;
  let pointerDown = false;
  let pointerStart = { x: 0, y: 0, rx: 0, ry: 0 };
  const pointer = { x: 0, y: 0 };
  const mouse = { x: 0, y: 0 };
  let userZoom = 1;
  let touchPinchDistance = 0;
  let pinchStage = false;
  let dust;
  const clock = new THREE.Clock();
  const state = getState;

  /* ── Materials & geometry helpers ─────────────────────────────── */
  function studioMaterial(color, roughness, metalness, extra) {
    return new THREE.MeshPhysicalMaterial(Object.assign(
      { color, roughness, metalness, clearcoat: .8, clearcoatRoughness: .2, envMapIntensity: 1.15 },
      extra || {},
    ));
  }
  function disposeTree(object) {
    object.traverse(node => {
      if (node.geometry) node.geometry.dispose();
      if (node.material) (Array.isArray(node.material) ? node.material : [node.material]).forEach(material => {
        if (material.map) material.map.dispose();
        material.dispose();
      });
    });
  }
  function makeTextTexture(lines, background = '#101316', foreground = '#eee8d6') {
    const face = document.createElement('canvas'); face.width = 512; face.height = 512;
    const context = face.getContext('2d');
    const center = 256;
    context.strokeStyle = 'rgba(255,255,255,.08)'; context.lineWidth = 2;
    context.beginPath(); context.arc(center, center, 237, 0, Math.PI * 2); context.stroke();
    context.fillStyle = foreground; context.textAlign = 'center'; context.textBaseline = 'middle';
    context.font = '600 22px Inter, Arial, sans-serif'; context.fillText(lines[0], center, 168);
    context.font = '500 12px Inter, Arial, sans-serif'; context.fillText(lines[1], center, 350);
    context.font = '500 10px Inter, Arial, sans-serif'; context.fillText(lines[2], center, 371);
    context.font = '600 13px Inter, Arial, sans-serif'; context.fillText('AUTOMATIC', center, 402);
    const texture = new THREE.CanvasTexture(face); texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
  function makeHand(color, length, width, type) {
    const pivot = new THREE.Group();
    const material = studioMaterial(color, .24, .76);
    const shape = new THREE.Shape();
    shape.moveTo(-width * .5, -.16); shape.lineTo(-width * .35, length * .68);
    if (type === 'hour') {
      shape.lineTo(-width * .7, length * .75); shape.lineTo(0, length); shape.lineTo(width * .7, length * .75);
    } else shape.lineTo(0, length);
    shape.lineTo(width * .35, length * .68); shape.lineTo(width * .5, -.16); shape.closePath();
    const hand = new THREE.Mesh(new THREE.ShapeGeometry(shape), material); hand.position.z = .265;
    pivot.add(hand);
    if (type === 'hour') {
      const circle = new THREE.Mesh(new THREE.TorusGeometry(width * .42, .012, 6, 24), material);
      circle.position.set(0, length * .72, .268); pivot.add(circle);
      const mercedes = new THREE.Mesh(new THREE.BoxGeometry(width * .62, .055, .012), material);
      mercedes.position.set(0, length * .72, .27); pivot.add(mercedes);
    }
    return pivot;
  }
  function addBracelet(root, parts, jubilee, currentState) {
    const group = new THREE.Group(); group.position.z = -.075; root.add(group);
    const linkGeometry = new THREE.BoxGeometry(jubilee ? .07 : .105, .095, .075);
    const centerGeometry = new THREE.BoxGeometry(jubilee ? .075 : .115, .105, .105);
    const columns = jubilee ? 5 : 3;
    const rows = 15;
    const meshes = [];
    for (const direction of [-1, 1]) {
      const matrices = Array.from({ length: columns }, () => []);
      for (let i = 0; i < rows; i++) {
        const distance = .57 + i * .095;
        const y = direction * distance;
        const curveZ = -Math.max(0, distance - .82) * .24;
        for (let column = 0; column < columns; column++) {
          const x = (column - (columns - 1) / 2) * (jubilee ? .075 : .115);
          const object = new THREE.Object3D(); object.position.set(x, y, curveZ);
          object.rotation.x = direction * (distance > .82 ? .13 : 0); object.updateMatrix(); matrices[column].push(object.matrix.clone());
        }
      }
      Array.from({ length: columns }, (_, index) => index).forEach(column => {
        const center = column === Math.floor(columns / 2);
        const mesh = new THREE.InstancedMesh(center ? centerGeometry : linkGeometry, braceletMatFor(parts, currentState, !center), rows);
        mesh.userData.side = !center; meshes.push(mesh);
        matrices[column].forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
        mesh.instanceMatrix.needsUpdate = true; group.add(mesh);
      });
    }
    return { group, meshes };
  }

  /* ── The watch itself (verbatim geometry from the fixed v1) ───── */
  function buildWatch() {
    if (!webglReady) return;
    if (watchRoot) { scene.remove(watchRoot); disposeTree(watchRoot); }
    const s = state();
    const root = new THREE.Group();
    const parts = { root, hands: {}, dial: null, bezel: null, bracelet: null, movement: null, handMaterials: [] };
    const caseMaterial = studioMaterial(caseHex(s), .2, .92);
    const goldMaterial = studioMaterial('#c5a35e', .19, .9);
    const blackMaterial = studioMaterial('#101214', .27, .2);
    const bezelMaterial = studioMaterial(bezelHex(s), .18, .88, { clearcoat: 1 });
    const dialMaterial = studioMaterial(DIAL_HEX[s.dial] || DIAL_HEX[MODELS[s.model]?.stockDial || 'black'], .32, .25);
    parts.bezelMaterial = bezelMaterial; parts.dialMaterial = dialMaterial; parts.caseMaterial = caseMaterial;
    parts.steelMaterial = caseMaterial; parts.goldMaterial = goldMaterial;

    const bracelet = addBracelet(root, parts, s.model === 'datejust', s);
    parts.bracelet = bracelet.group; parts.braceletMeshes = bracelet.meshes;

    const caseGroup = new THREE.Group(); root.add(caseGroup); parts.caseGroup = caseGroup;
    const caseProfile = [new THREE.Vector2(0, -.12), new THREE.Vector2(.69, -.12), new THREE.Vector2(.77, -.09), new THREE.Vector2(.81, -.035), new THREE.Vector2(.81, .045), new THREE.Vector2(.76, .09), new THREE.Vector2(.68, .105), new THREE.Vector2(0, .105)];
    const caseBody = new THREE.Mesh(new THREE.LatheGeometry(caseProfile, 96), caseMaterial);
    caseBody.rotation.x = Math.PI / 2; caseBody.position.z = .005; caseGroup.add(caseBody);
    const caseBack = new THREE.Mesh(new THREE.CylinderGeometry(.72, .72, .055, 80), studioMaterial('#777e83', .26, .9));
    caseBack.rotation.x = Math.PI / 2; caseBack.position.z = -.125; caseGroup.add(caseBack);
    const sideBand = new THREE.Mesh(new THREE.TorusGeometry(.79, .055, 12, 96), caseMaterial); sideBand.position.z = .025; caseGroup.add(sideBand);
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(.7, .09, 16, 96), bezelMaterial); bezel.position.z = .14; caseGroup.add(bezel); parts.bezel = bezel;
    const bezelFace = new THREE.Mesh(new THREE.CylinderGeometry(.72, .72, .065, 96), bezelMaterial);
    bezelFace.rotation.x = Math.PI / 2; bezelFace.position.z = .12; caseGroup.add(bezelFace);
    const minuteRing = new THREE.Mesh(new THREE.TorusGeometry(.635, .008, 4, 96), goldMaterial); minuteRing.position.z = .162; caseGroup.add(minuteRing);

    /* Bezel variant groups built once and toggled by visibility (instant swaps). */
    const bezelMarks = new THREE.Group(); bezelMarks.position.z = .171; caseGroup.add(bezelMarks);
    const flutes = new THREE.Group(); flutes.position.z = .171; caseGroup.add(flutes); parts.flutes = flutes;
    for (let i = 0; i < 60; i++) {
      const angle = i * Math.PI / 30;
      const flute = new THREE.Mesh(new THREE.BoxGeometry(.018, .12, .025), goldMaterial);
      flute.position.set(Math.sin(angle) * .72, Math.cos(angle) * .72, 0); flute.rotation.z = -angle; flutes.add(flute);
      if (i % 5 === 0) {
        const mark = new THREE.Mesh(new THREE.BoxGeometry(.018, .055, .009), goldMaterial);
        mark.position.set(Math.sin(angle) * .65, Math.cos(angle) * .65, 0); mark.rotation.z = -angle; bezelMarks.add(mark);
      }
    }
    const tachyGroup = new THREE.Group(); caseGroup.add(tachyGroup); parts.tachyGroup = tachyGroup;
    for (let i = 0; i < 24; i++) {
      const mark = new THREE.Mesh(new THREE.BoxGeometry(.014, .08, .012), goldMaterial);
      const a = i * Math.PI / 12; mark.position.set(Math.sin(a) * .72, Math.cos(a) * .72, .18); mark.rotation.z = -a; tachyGroup.add(mark);
    }
    const pepsiGroup = new THREE.Group(); caseGroup.add(pepsiGroup); parts.pepsiGroup = pepsiGroup;
    const red = new THREE.Mesh(new THREE.TorusGeometry(.72, .091, 12, 48, Math.PI), studioMaterial('#a52632', .2, .78));
    red.position.z = .145; red.rotation.z = Math.PI; pepsiGroup.add(red);

    const crystal = new THREE.Mesh(new THREE.CylinderGeometry(.635, .635, .022, 96), studioMaterial('#d9e4e8', .08, .05, { transparent: true, opacity: .15, transmission: .72, thickness: .08, ior: 1.45, depthWrite: false }));
    crystal.rotation.x = Math.PI / 2; crystal.position.z = .185; caseGroup.add(crystal);

    const dialGroup = new THREE.Group(); dialGroup.position.z = .18; root.add(dialGroup); parts.dial = dialGroup;
    const dial = new THREE.Mesh(new THREE.CircleGeometry(.628, 96), dialMaterial); dial.position.z = .008; dialGroup.add(dial);
    const labelTexture = makeTextTexture(['OYSTER  &  CO.', 'HAUTE HORLOGERIE', '— GENEVA —']);
    const labelDisk = new THREE.Mesh(new THREE.CircleGeometry(.63, 96), new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true, opacity: .95, depthWrite: false }));
    labelDisk.position.z = .011; dialGroup.add(labelDisk);
    for (let i = 0; i < 60; i++) {
      const a = i * Math.PI / 30, major = i % 5 === 0;
      const index = new THREE.Mesh(new THREE.BoxGeometry(major ? .035 : .012, major ? .09 : .035, .014), major ? goldMaterial : studioMaterial('#eee8d6', .3, .65));
      index.position.set(Math.sin(a) * .535, Math.cos(a) * .535, .021); index.rotation.z = -a; dialGroup.add(index);
    }
    parts.hands.hour = makeHand(handHex(s), .34, .052, 'hour');
    parts.hands.minute = makeHand(handHex(s), .48, .034, 'minute');
    parts.hands.second = makeHand('#bd3540', .56, .009, 'second');
    parts.handMaterials = [parts.hands.hour.children[0].material, parts.hands.minute.children[0].material];
    dialGroup.add(parts.hands.hour, parts.hands.minute, parts.hands.second);
    const pin = new THREE.Mesh(new THREE.SphereGeometry(.035, 16, 12), goldMaterial); pin.position.z = .3; dialGroup.add(pin);
    const dateWindow = new THREE.Mesh(new THREE.PlaneGeometry(.105, .115), studioMaterial('#eee9d9', .4, .05));
    dateWindow.position.set(.43, 0, .027); dialGroup.add(dateWindow);
    const dateCanvas = document.createElement('canvas'); dateCanvas.width = 128; dateCanvas.height = 128;
    const dateContext = dateCanvas.getContext('2d'); dateContext.fillStyle = '#eee9d9'; dateContext.fillRect(0, 0, 128, 128);
    dateContext.fillStyle = '#161616'; dateContext.font = 'bold 74px Georgia'; dateContext.textAlign = 'center'; dateContext.textBaseline = 'middle'; dateContext.fillText(String(new Date().getDate()), 64, 67);
    const dateTexture = new THREE.CanvasTexture(dateCanvas); dateTexture.colorSpace = THREE.SRGBColorSpace;
    const dateNumber = new THREE.Mesh(new THREE.PlaneGeometry(.09, .1), new THREE.MeshBasicMaterial({ map: dateTexture })); dateNumber.position.set(.43, 0, .032); dialGroup.add(dateNumber);
    const cyclops = new THREE.Mesh(new THREE.SphereGeometry(.105, 24, 16), studioMaterial('#eff7f8', .08, .05, { transparent: true, opacity: .34, transmission: .7, thickness: .04, depthWrite: false }));
    cyclops.scale.set(1, 1, .22); cyclops.position.set(.43, 0, .07); dialGroup.add(cyclops);
    if (s.model === 'daytona') {
      [[-.28, -.18], [.28, -.18], [0, .31]].forEach(([x, y], index) => {
        const sub = new THREE.Mesh(new THREE.CircleGeometry(.105, 32), studioMaterial('#252729', .4, .35));
        sub.position.set(x, y, .024); dialGroup.add(sub);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(.106, .009, 5, 32), goldMaterial); rim.position.set(x, y, .027); dialGroup.add(rim);
        for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; const tick = new THREE.Mesh(new THREE.BoxGeometry(.006, .018, .004), studioMaterial('#eee8d6', .3, .5)); tick.position.set(x + Math.sin(a) * .082, y + Math.cos(a) * .082, .03); tick.rotation.z = -a; dialGroup.add(tick); }
        const hand = new THREE.Mesh(new THREE.BoxGeometry(.006, .06, .006), goldMaterial); hand.position.set(x, y + .025, .034); hand.rotation.z = index * .5; dialGroup.add(hand);
      });
    }
    const movement = new THREE.Group(); movement.position.z = -.17; root.add(movement); parts.movement = movement;
    const movementFace = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .025, 64), studioMaterial('#252722', .3, .78)); movementFace.rotation.x = Math.PI / 2; movement.add(movementFace);
    for (let i = 0; i < 5; i++) {
      const gear = new THREE.Mesh(new THREE.TorusGeometry(.12 + i * .045, .009, 6, 40), goldMaterial);
      gear.position.set(Math.cos(i * 1.2) * .19, Math.sin(i * 1.2) * .19, .03); movement.add(gear);
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .03, 12), caseMaterial); axle.position.copy(gear.position); axle.rotation.x = Math.PI / 2; movement.add(axle);
    }
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(.105, .105, .18, 32), caseMaterial); crown.rotation.z = Math.PI / 2; crown.position.set(.88, 0, .015); caseGroup.add(crown);
    for (let i = 0; i < 7; i++) { const groove = new THREE.Mesh(new THREE.TorusGeometry(.105, .009, 5, 32), goldMaterial); groove.rotation.y = Math.PI / 2; groove.position.set(.83 + i * .025, 0, .015); caseGroup.add(groove); }
    [-1, 1].forEach(side => { const guard = new THREE.Mesh(new THREE.BoxGeometry(.15, .16, .1), caseMaterial); guard.position.set(.78, side * .16, .025); caseGroup.add(guard); });
    watchRoot = root; watchParts = parts; scene.add(root);
    root.traverse(node => { if (node.isMesh || node.isInstancedMesh) { node.castShadow = true; node.receiveShadow = true; } });
    root.rotation.set(-.16, .18, .08);
    if (!REDUCED) gsap.to(root.rotation, { z: 0, duration: .75, ease: 'power3.out' });
    updateTimeHands();
    applyVariants(s);
  }

  function applyVariants(s) {
    if (!watchParts) return;
    if (watchParts.flutes) watchParts.flutes.visible = s.bezel === 'fluted';
    if (watchParts.tachyGroup) watchParts.tachyGroup.visible = s.bezel === 'tachymeter';
    if (watchParts.pepsiGroup) watchParts.pepsiGroup.visible = s.bezel === 'pepsi';
  }

  /* ── Studio environment & lights ──────────────────────────────── */
  function initScene() {
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !IS_TOUCH, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(innerWidth, innerHeight, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.18;
      renderer.shadowMap.enabled = !IS_TOUCH; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, .1, 80); camera.position.set(0, 0, 6.8);
      const envCanvas = document.createElement('canvas'); envCanvas.width = 512; envCanvas.height = 256;
      const envContext = envCanvas.getContext('2d');
      const envGradient = envContext.createLinearGradient(0, 0, 0, 256); envGradient.addColorStop(0, '#9ca4aa'); envGradient.addColorStop(.45, '#252a2d'); envGradient.addColorStop(1, '#050607');
      envContext.fillStyle = envGradient; envContext.fillRect(0, 0, 512, 256);
      [[45, 35, 85, 35], [190, 0, 230, 90], [390, 20, 470, 62]].forEach(([x, y, w, h]) => { envContext.fillStyle = 'rgba(245,241,232,.55)'; envContext.fillRect(x, y, w, h); });
      const envTexture = new THREE.CanvasTexture(envCanvas); envTexture.mapping = THREE.EquirectangularReflectionMapping;
      const pmrem = new THREE.PMREMGenerator(renderer); envTarget = pmrem.fromEquirectangular(envTexture);
      scene.environment = envTarget.texture; envTexture.dispose(); pmrem.dispose();
      const key = new THREE.DirectionalLight('#fff1d2', 3.1); key.position.set(-3, 4, 6); key.castShadow = true; scene.add(key);
      const fill = new THREE.DirectionalLight('#c7d9e8', 2.2); fill.position.set(4, 1, 4); scene.add(fill);
      const rim = new THREE.DirectionalLight('#c9a961', 3.4); rim.position.set(1, 4, -3); scene.add(rim);
      scene.add(new THREE.AmbientLight('#d5d8dc', .55));
      const dustGeometry = new THREE.BufferGeometry(); const points = [];
      const count = IS_TOUCH ? 260 : 650;
      for (let i = 0; i < count; i++) points.push((Math.random() - .5) * 9, (Math.random() - .5) * 7, (Math.random() - .5) * 4);
      dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
      dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: '#c9a961', size: .012, transparent: true, opacity: .48, depthWrite: false })); scene.add(dust);
      webglReady = true;
      buildWatch();
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => observedMap.set(entry.target, entry.isIntersecting));
        renderVisible = isAnySectionVisible();
      }, { threshold: 0 });
      const seen = new Set();
      ['hero', 'story', 'collection', 'configurator', 'pd-stage'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !seen.has(id)) { observer.observe(el); seen.add(id); }
      });
      document.querySelectorAll('.stage-col').forEach(el => { if (!seen.has(el)) { observer.observe(el); seen.add(el); } });
      window.addEventListener('resize', resizeThree, { passive: true, signal });
      document.addEventListener('visibilitychange', onVisChange, { signal });
      renderVisible = true;
      requestAnimationFrame(renderThree);
    } catch (error) {
      console.warn('3D renderer unavailable; falling back gracefully.', error);
      document.documentElement.classList.add('no-webgl');
    }
  }
  const controller = new AbortController();
  const signal = controller.signal;
  const observedMap = new Map();
  function isAnySectionVisible() { return Array.from(observedMap.values()).some(Boolean); }

  function onVisChange() {
    if (!document.hidden) renderVisible = isAnySectionVisible();
  }
  function resizeThree() {
    if (!renderer || !camera) return;
    camera.aspect = innerWidth / innerHeight; camera.fov = innerWidth < 700 ? 39 : 34; camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(innerWidth, innerHeight, false);
  }
  function updateTimeHands() {
    if (!watchParts) return;
    const now = new Date();
    const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
    const minutes = now.getMinutes() + seconds / 60;
    const hours = (now.getHours() % 12) + minutes / 60;
    watchParts.hands.second.rotation.z = -seconds * Math.PI / 30;
    watchParts.hands.minute.rotation.z = -minutes * Math.PI / 30;
    watchParts.hands.hour.rotation.z = -hours * Math.PI / 6;
  }
  function updateStageTarget() {
    const sections = ['hero', 'story', 'collection', 'configurator', 'pd-stage'].map(id => document.getElementById(id)).filter(Boolean);
    document.querySelectorAll('.stage-col').forEach(el => { if (!sections.includes(el)) sections.push(el); });
    if (!sections.length) { scrollTarget.x = scrollTarget.y = 0; scrollTarget.scale = userZoom; scrollTarget.cameraX = 0; scrollTarget.cameraZ = 6.8; return; }
    const center = innerHeight * .5;
    let nearest = sections[0], distance = Infinity;
    sections.forEach(section => { const rect = section.getBoundingClientRect(); const d = Math.abs((rect.top + Math.min(rect.height, innerHeight)) / 2 - center); if (d < distance) { distance = d; nearest = section; } });
    const story = document.getElementById('story');
    const storyRange = story ? Math.max(1, story.offsetHeight - innerHeight) : 1;
    const storyProgress = story ? Math.max(0, Math.min(1, -story.getBoundingClientRect().top / storyRange)) : 0;
    const isStory = nearest && nearest.id === 'story';
    const isSide = nearest && nearest.classList.contains('stage-col') || (nearest && (nearest.id === 'collection' || nearest.id === 'configurator' || nearest.id === 'pd-stage'));
    const s = state();
    const mobile = innerWidth < 900;
    scrollTarget.x = mobile ? 0 : (isStory ? .0 : (isSide ? 1.35 : 0));
    scrollTarget.y = mobile ? .38 : 0;
    scrollTarget.scale = (mobile ? .62 : 1) * userZoom;
    scrollTarget.cameraX = isStory ? Math.sin(storyProgress * Math.PI * 2) * .55 : 0;
    scrollTarget.cameraZ = 6.8 - (isStory ? Math.sin(storyProgress * Math.PI) * .6 : 0);
  }
  const scrollTarget = { x: 0, y: 0, scale: 1, cameraX: 0, cameraZ: 6.8 };
  function renderThree() {
    requestAnimationFrame(renderThree);
    if (!webglReady || !renderVisible || document.hidden) return;
    const elapsed = clock.getElapsedTime();
    updateTimeHands();
    updateStageTarget();
    if (watchRoot) {
      watchRoot.position.x += (scrollTarget.x - watchRoot.position.x) * .055;
      watchRoot.position.y += (scrollTarget.y - watchRoot.position.y) * .055;
      const targetScale = scrollTarget.scale * (pointerDown ? 1.02 : 1);
      const scale = watchRoot.scale.x + (targetScale - watchRoot.scale.x) * .06; watchRoot.scale.setScalar(scale);
      watchRoot.rotation.y += (mouse.x * .14 + .12 + Math.sin(elapsed * .32) * .08 - watchRoot.rotation.y) * .025;
      watchRoot.rotation.x += (-.14 + mouse.y * .08 - watchRoot.rotation.x) * .025;
    }
    camera.position.x += (scrollTarget.cameraX - camera.position.x) * .035;
    camera.position.z += (scrollTarget.cameraZ - camera.position.z) * .035;
    camera.lookAt(watchRoot ? watchRoot.position.x * .32 : 0, watchRoot ? watchRoot.position.y * .25 : 0, 0);
    if (dust) { dust.rotation.y = elapsed * .018; dust.rotation.x = Math.sin(elapsed * .1) * .025; }
    renderer.render(scene, camera);
  }

  /* ── Interaction: stage-gated drag / zoom (port of the fixed v1) ── */
  function isStageZone(target) {
    return !!(target && target.closest && target.closest('#hero,#story,.stage-col,#pd-stage'));
  }
  function onPointerDown(event) {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('a,button,input,select,textarea')) return;
    if (!isStageZone(event.target)) return;
    pointerDown = true;
    pointerStart = { x: event.clientX, y: event.clientY, rx: watchRoot ? watchRoot.rotation.x : 0, ry: watchRoot ? watchRoot.rotation.y : 0 };
  }
  function onPointerMove(event) {
    pointer.x = event.clientX; pointer.y = event.clientY;
    mouse.x = (event.clientX / innerWidth - .5) * 2;
    mouse.y = (event.clientY / innerHeight - .5) * 2;
    if (!pointerDown || !watchRoot) return;
    watchRoot.rotation.y = pointerStart.ry + (event.clientX - pointerStart.x) * .006;
    watchRoot.rotation.x = Math.max(-.8, Math.min(.8, pointerStart.rx + (event.clientY - pointerStart.y) * .006));
  }
  function onPointerUp() { pointerDown = false; }
  function onWheel(event) {
    if (!isStageZone(event.target)) return;
    userZoom = Math.max(.78, Math.min(1.24, userZoom - Math.sign(event.deltaY) * .025));
  }
  function onTouchStart(event) {
    if (event.touches.length === 2) { pinchStage = isStageZone(event.target); touchPinchDistance = Math.hypot(event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY); }
  }
  function onTouchMove(event) {
    if (event.touches.length !== 2 || !pinchStage) return;
    event.preventDefault();
    const distance = Math.hypot(event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY);
    userZoom = Math.max(.78, Math.min(1.24, userZoom + (distance - touchPinchDistance) * .003));
    touchPinchDistance = distance;
  }

  /* ── Public API ───────────────────────────────────────────────── */
  function start() {
    if (!window.WebGLRenderingContext) { document.documentElement.classList.add('no-webgl'); return; }
    initScene();
    window.addEventListener('pointerdown', onPointerDown, { signal });
    window.addEventListener('pointermove', onPointerMove, { signal });
    window.addEventListener('pointerup', onPointerUp, { signal });
    window.addEventListener('pointercancel', onPointerUp, { signal });
    window.addEventListener('wheel', onWheel, { signal, passive: true });
    window.addEventListener('touchstart', onTouchStart, { signal, passive: true });
    window.addEventListener('touchmove', onTouchMove, { signal, passive: false });
  }

  /** Material-swap only — no scene rebuild (dial/bezel/bracelet). */
  function applyConfig(kind, s) {
    if (!watchParts || !watchParts.dialMaterial) { buildWatch(); return; }
    if (kind === 'dial') watchParts.dialMaterial.color.set(DIAL_HEX[s.dial]);
    if (kind === 'bezel') {
      watchParts.bezelMaterial.color.set(bezelHex(s));
      if (watchParts.flutes) watchParts.flutes.visible = s.bezel === 'fluted';
      if (watchParts.tachyGroup) watchParts.tachyGroup.visible = s.bezel === 'tachymeter';
      if (watchParts.pepsiGroup) watchParts.pepsiGroup.visible = s.bezel === 'pepsi';
    }
    if (kind === 'bracelet') {
      (watchParts.braceletMeshes || []).forEach(mesh => { mesh.material = braceletMatFor(watchParts, s, !!mesh.userData.side); });
      watchParts.caseMaterial.color.set(caseHex(s));
      (watchParts.handMaterials || []).forEach(mat => mat.color.set(handHex(s)));
    }
  }

  /** Full rebuild — model change / first build. */
  function rebuild() { buildWatch(); }

  /** Story exploded-view choreography — call once mounted if #story exists. */
  function buildStoryTimeline() {
    if (!watchParts || webglReady !== true) return;
    const story = document.getElementById('story');
    if (!story) return;
    if (!gsap || !ScrollTrigger) return;
    if (storyTimeline) { try { storyTimeline.scrollTrigger?.kill(); storyTimeline.kill(); } catch { /* noop */ } }
    storyTimeline = gsap.timeline({ scrollTrigger: { trigger: '#story', start: 'top top', end: 'bottom bottom', scrub: 1 } });
    storyTimeline.to(watchParts.movement.position, { z: -.72, duration: .25 }, .2)
      .to(watchParts.dial.position, { z: .34, duration: .25 }, .28)
      .to(watchParts.bezel.position, { z: .44, duration: .25 }, .34)
      .to(watchParts.bracelet.position, { z: -.42, duration: .25 }, .38)
      .to(watchParts.caseGroup.position, { z: .24, duration: .25 }, .4)
      .to(watchParts.movement.position, { z: -.17, duration: .25 }, .7)
      .to(watchParts.dial.position, { z: .18, duration: .25 }, .74)
      .to(watchParts.bezel.position, { z: .14, duration: .25 }, .78)
      .to(watchParts.bracelet.position, { z: -.075, duration: .25 }, .82)
      .to(watchParts.caseGroup.position, { z: 0, duration: .25 }, .84);
  }

  function dispose() {
    controller.abort();
    if (envTarget) envTarget.dispose();
    if (renderer) renderer.dispose();
    webglReady = false;
  }

  return {
    start, applyConfig, rebuild, buildStoryTimeline, dispose,
    get ready() { return webglReady; },
  };
}
