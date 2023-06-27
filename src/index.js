import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';
import { verletStep } from './simulation.js'

let clock = new THREE.Clock();
let delta = 0;
// 30 fps
let interval = 1 / 30;

const canvas = document.querySelector('canvas.webgl')

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

const count = 100;

var camera, scene, renderer, controls

var mesh;

var stats;

// simulationm variables
let r = new Array(count+1)
let v = new Array(count+1)
let f = new Array(count+1)
for (let i = 0; i < count; i++) {
    r[i] = new THREE.Vector3(0, 0, 0)
    v[i] = new THREE.Vector3(0, 0, 0)
    f[i] = new THREE.Vector3(0, 0, 0)
}
setInitialPositions(r)
console.log(r)

init();
animate();

function init() {
    
    camera = new THREE.PerspectiveCamera(60, sizes.width / sizes.height, 0.1, 100);
    camera.position.set(1, 1, 1);
    camera.lookAt(0, 0, 0);

    scene = new THREE.Scene();

    const light = new THREE.HemisphereLight(0xffffff, 0x888888);
    light.position.set(0, 1, 0);
    scene.add(light);

    const geometry = new THREE.IcosahedronGeometry(0.01, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });

    mesh = new THREE.InstancedMesh(geometry, material, count);
    adjustMeshToPositions(mesh, r)
    scene.add(mesh);

    renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableZoom = true;
    controls.enablePan = false;

    stats = new Stats();
    document.body.appendChild(stats.dom)

    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

}
let i = 0
function animate() {
    requestAnimationFrame(animate);
    delta += clock.getDelta();

    if (delta > interval) {
        // The draw or time dependent code are here
        controls.update();
        // f = verletStep(r, v, 0.1, 1, 0.0001, f)
        for (let i = 0; i < count; i++) {
            r[i].add(0.1,0.1,0.1)
        }
        adjustMeshToPositions(mesh, r)
        mesh.instanceMatrix.needsUpdate = true
        if (i==0) {
            console.log(r)
            i++
        }
        render();

        stats.update();

        delta = delta % interval;
    }

}

function render() {

    renderer.render(scene, camera);

}

function adjustMeshToPositions(mesh, r) {
    const matrix = new THREE.Matrix4();
    
    for (let i = 0; i < count; i++) {
        matrix.setPosition(r[i]);
        mesh.setMatrixAt(i, matrix);
    }
}

function setInitialPositions(r) {
    for (let i = 0; i < count; i++) {
        r[i].set(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5)
    }
}

function modulus(a,b) {
    return ((a % b) + b) % b;
}