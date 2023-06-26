import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';
import { potential } from './simulation.js'

let clock = new THREE.Clock();
let delta = 0;
// 30 fps
let interval = 1 / 30;



potential()

const canvas = document.querySelector('canvas.webgl')

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

const count = 1000;

var camera, scene, renderer, controls

var mesh;

var stats;

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
    setInitialPositions(mesh, count)
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

function animate() {
    requestAnimationFrame(animate);
    delta += clock.getDelta();

    if (delta > interval) {
        // The draw or time dependent code are here
        controls.update();

        mesh.instanceMatrix.needsUpdate = false

        render();

        stats.update();

        delta = delta % interval;
    }

}

function render() {

    renderer.render(scene, camera);

}

function setInitialPositions(mesh, count) {
    const matrix = new THREE.Matrix4();
    
    for (let i = 0; i < count; i++) {
        let x = i / count;
        let y = i / count;
        let z = i / count;
        matrix.setPosition(x, y, z);
        mesh.setMatrixAt(i, matrix);
    }
}