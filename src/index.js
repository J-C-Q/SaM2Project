import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';
import { verletStep, totalForce } from './simulation.js'

let clock = new THREE.Clock();
let delta = 0;
// 30 fps
let interval = 1 / 30;

const canvas = document.querySelector('canvas.webgl')

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}
const amount = 4 // should be odd (otheriwse there is a bug when moving the canera to some angles)
const count = Math.pow(amount, 3);

var camera, scene, renderer, controls

var mesh;

var caps,caps_x,caps_y,caps_z;

var stats;

const box_size = 10
const R = 0.5

const simulationBoxClipPlanes = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), box_size / 2),
    new THREE.Plane(new THREE.Vector3(0, 1, 0), box_size / 2),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), box_size / 2),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), box_size / 2),
    new THREE.Plane(new THREE.Vector3(0, -1, 0), box_size / 2),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), box_size / 2)
]

const notXClipPlanes = [
    new THREE.Plane(new THREE.Vector3(0, 1, 0), box_size / 2),
    new THREE.Plane(new THREE.Vector3(0, -1, 0), box_size / 2),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), box_size / 2),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), box_size / 2),
]
const notYClipPlanes = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), box_size / 2),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), box_size / 2),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), box_size / 2),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), box_size / 2),
]
const notZClipPlanes = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), box_size / 2),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), box_size / 2),
    new THREE.Plane(new THREE.Vector3(0, 1, 0), box_size / 2),
    new THREE.Plane(new THREE.Vector3(0, -1, 0), box_size / 2),
]

// simulationm variables
let r = new Array(count).fill().map(() => new THREE.Vector3())
let v = new Array(count).fill().map(() => new THREE.Vector3())
let f = new Array(count).fill().map(() => new THREE.Vector3())
let last_f = new Array(count).fill().map(() => new THREE.Vector3())
setInitialPositions(r)

init();
animate();

function init() {

    camera = new THREE.PerspectiveCamera(65, sizes.width / sizes.height, 0.1, 100);
    camera.position.set(box_size, box_size, box_size);
    camera.lookAt(0, 0, 0);

    scene = new THREE.Scene();
    // scene.add( new THREE.AmbientLight( 0xffffff, 0.5 ) );
    // const light = new THREE.DirectionalLight(0xffffff, 1);
    // light.position.set(0, 3*box_size, 0);
    // light.castShadow = true;
    const light = new THREE.HemisphereLight(0xffffff, 0xaaaaaa, 1);
    scene.add(light);

    //Set up shadow properties for the light
    // light.shadow.mapSize.width = 16; // default
    // light.shadow.mapSize.height = 16; // default
    // light.shadow.camera.near = 0.5; // default
    // light.shadow.camera.far = 500; // default


    const geometry = new THREE.IcosahedronGeometry(R, 8);
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000, wireframe: false, clippingPlanes: simulationBoxClipPlanes, side: THREE.DoubleSide});
    material.onBeforeCompile = function (shader) {
        shader.fragmentShader = shader.fragmentShader.replace(
            `#include <output_fragment>`,
            `gl_FragColor = ( gl_FrontFacing ) ? vec4( outgoingLight, diffuseColor.a ) : vec4( diffuse, 1 );
            `
        );
    };

    mesh = new THREE.InstancedMesh(geometry, material, 27 * count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);



    const cap_geometry = new THREE.CircleGeometry(R, 64);

    const cap_material_x = new THREE.MeshStandardMaterial({ color: 0xff0000, side: THREE.DoubleSide, clippingPlanes: notXClipPlanes, clipShadows:true});
    const cap_material_y = new THREE.MeshStandardMaterial({ color: 0xff0000, side: THREE.DoubleSide, clippingPlanes: notYClipPlanes, clipShadows:true});
    const cap_material_z = new THREE.MeshStandardMaterial({ color: 0xff0000, side: THREE.DoubleSide, clippingPlanes: notZClipPlanes, clipShadows:true});

    caps_x = new THREE.InstancedMesh(cap_geometry, cap_material_x, 27 * count);
    caps_x.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    caps_y = new THREE.InstancedMesh(cap_geometry, cap_material_y, 27 * count);
    caps_y.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    caps_z = new THREE.InstancedMesh(cap_geometry, cap_material_z, 27 * count);
    caps_z.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    adjustMeshToPositions(mesh, r,caps_x,caps_y,caps_z)
    scene.add(mesh);
    scene.add(caps_x);
    scene.add(caps_y);
    scene.add(caps_z);

    const plane_geometry = new THREE.CircleGeometry(1000, 16);
    plane_geometry.rotateX(-Math.PI / 2);
    plane_geometry.translate(0, -box_size / 2, 0);
    const plane_material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const plane = new THREE.Mesh(plane_geometry, plane_material);
    // positionBoxEdges(plane)
    plane.receiveShadow = true;
    // scene.add(plane);




    renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    renderer.setClearColor(0xffffff);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI / 2;

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
        f = verletStep(r, v, 0.5, box_size, 0.01, f, last_f)
        // for (let i = 0; i < count; i++) {
        //     r[i].add(new THREE.Vector3(0.001,0.001,0.001))
        // }
        // totalForce(r, box_size,f)
        // console.log(f[0].clone())
        adjustMeshToPositions(mesh, r,caps_x,caps_y,caps_z)
        mesh.instanceMatrix.needsUpdate = true
        caps_x.instanceMatrix.needsUpdate = true
        caps_y.instanceMatrix.needsUpdate = true
        caps_z.instanceMatrix.needsUpdate = true
        render();

        // console.log(r[0].clone())


        stats.update();

        delta = delta % interval;
    }

}

function render() {

    renderer.render(scene, camera);

}

function adjustMeshToPositions(mesh, r,caps_x,caps_y,caps_z) {
    const matrix = new THREE.Matrix4();
    const rotationX = new THREE.Matrix4().makeRotationX(Math.PI / 2);
    const rotationY = new THREE.Matrix4().makeRotationY(Math.PI / 2);
    const rotationZ = new THREE.Matrix4().makeRotationZ(Math.PI / 2);
    const scaleMatrix = new THREE.Matrix4().makeScale(1, 1, 1);
    const positionSphere = new THREE.Vector3();
    const eps = 0.0;
    var scale
    const Rsquared = R * R;
    for (let x = -1; x < 2; x++) {
        for (let y = -1; y < 2; y++) {
            for (let z = -1; z < 2; z++) {
                for (let i = 0; i < count; i++) {
                    matrix.identity();
                    positionSphere.set(modulus(r[i].x, box_size) + x * box_size - box_size / 2, modulus(r[i].y, box_size) + y * box_size - box_size / 2, modulus(r[i].z, box_size) + z * box_size - box_size / 2)
                    matrix.setPosition(positionSphere);
                    mesh.setMatrixAt((x + 1 + (y + 1) * 3 + (z + 1) * 9) * count + i, matrix);



                    matrix.identity();
                    scaleMatrix.makeScale(1, 1, 1);
                    if (Math.abs(positionSphere.x + box_size / 2) < R) {
                        matrix.setPosition(-box_size / 2, positionSphere.y, positionSphere.z);
                        scale = Math.sqrt(Rsquared - Math.pow(positionSphere.x + box_size / 2, 2)) / R
                        scaleMatrix.makeScale(scale, scale, scale);
                        

                        caps_x.setMatrixAt((x + 1 + (y + 1) * 3 + (z + 1) * 9) * count + i, matrix.multiply(rotationY).multiply(scaleMatrix));
                    } else if (Math.abs(positionSphere.x - box_size / 2) < R) {
                        matrix.setPosition(box_size / 2, positionSphere.y, positionSphere.z);
                        scale = Math.sqrt(Rsquared - Math.pow(positionSphere.x - box_size / 2, 2)) / R
                        scaleMatrix.makeScale(scale, scale, scale);
                    

                        caps_x.setMatrixAt((x + 1 + (y + 1) * 3 + (z + 1) * 9) * count + i, matrix.multiply(rotationY).multiply(scaleMatrix));
                    } else {
                        matrix.setPosition(-box_size, -box_size, -box_size);

                        caps_x.setMatrixAt((x + 1 + (y + 1) * 3 + (z + 1) * 9) * count + i, matrix);
                    }

                    matrix.identity();
                    if (Math.abs(positionSphere.y + box_size / 2) < R) {
                        matrix.setPosition(positionSphere.x, -box_size / 2, positionSphere.z);
                        scale = Math.sqrt(Rsquared - Math.pow(positionSphere.y + box_size / 2, 2)) / R
                        scaleMatrix.makeScale(scale, scale, scale);
                        

                        caps_y.setMatrixAt((x + 1 + (y + 1) * 3 + (z + 1) * 9) * count + i, matrix.multiply(rotationX).multiply(scaleMatrix));
                    } else if (Math.abs(positionSphere.y - box_size / 2) < R) {
                        matrix.setPosition(positionSphere.x, box_size / 2, positionSphere.z);
                        scale = Math.sqrt(Rsquared - Math.pow(positionSphere.y - box_size / 2, 2)) / R
                        scaleMatrix.makeScale(scale, scale, scale);
                       

                        caps_y.setMatrixAt((x + 1 + (y + 1) * 3 + (z + 1) * 9) * count + i, matrix.multiply(rotationX).multiply(scaleMatrix));
                    } else {
                        matrix.setPosition(-box_size, -box_size, -box_size);

                        caps_y.setMatrixAt((x + 1 + (y + 1) * 3 + (z + 1) * 9) * count + i, matrix);
                    }

                    matrix.identity();
                    if (Math.abs(positionSphere.z + box_size / 2) < R) {
                        matrix.setPosition(positionSphere.x, positionSphere.y, -box_size / 2);
                        scale = Math.sqrt(Rsquared - Math.pow(positionSphere.z + box_size / 2, 2)) / R
                        scaleMatrix.makeScale(scale, scale, scale);
                        

                        caps_z.setMatrixAt((x + 1 + (y + 1) * 3 + (z + 1) * 9) * count + i, matrix.multiply(rotationZ).multiply(scaleMatrix));
                    } else if (Math.abs(positionSphere.z - box_size / 2) < R) {
                        matrix.setPosition(positionSphere.x, positionSphere.y, box_size / 2);
                        scale = Math.sqrt(Rsquared - Math.pow(positionSphere.z - box_size / 2, 2)) / R
                        scaleMatrix.makeScale(scale, scale, scale);
                        

                        caps_z.setMatrixAt((x + 1 + (y + 1) * 3 + (z + 1) * 9) * count + i, matrix.multiply(rotationZ).multiply(scaleMatrix));
                    } else {
                        matrix.setPosition(-box_size, -box_size, -box_size);
                        

                        caps_z.setMatrixAt((x + 1 + (y + 1) * 3 + (z + 1) * 9) * count + i, matrix);
                    }
                }
            }
        }
    }

}


function setInitialPositions(r) {
    let i = 0;
    const spacing = box_size / (amount);

    const offset = 0//(amount - 1) / 2 + box_size / (2 * spacing);
    for (let x = 0; x < amount; x++) {

        for (let y = 0; y < amount; y++) {

            for (let z = 0; z < amount; z++) {
                r[i].set(spacing * x, spacing * y, spacing * z)
                i++
            }

        }

    }
}

function modulus(a, b) {
    return ((a % b) + b) % b;
}

