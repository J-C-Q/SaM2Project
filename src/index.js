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
const amount = 3
const count = Math.pow(amount,3);

var camera, scene, renderer, controls

var mesh;

var caps;

var stats;

const box_size = 10
const R = 0.5

const simulationBoxClipPlanes = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), box_size/2),
    new THREE.Plane(new THREE.Vector3(0, 1, 0), box_size/2),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), box_size/2),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), box_size/2),
    new THREE.Plane(new THREE.Vector3(0, -1, 0), box_size/2),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), box_size/2)
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

    const light = new THREE.HemisphereLight(0xffffff, 0x888888);
    light.position.set(0, 1, 0);
    scene.add(light);

    const geometry = new THREE.IcosahedronGeometry(R, 10);
    const material = new THREE.MeshPhongMaterial({ color: 0xff0000, wireframe: false, clippingPlanes: simulationBoxClipPlanes, side: THREE.DoubleSide, shadowSide: THREE.DoubleSide });
    // material.onBeforeCompile = function (shader) {
    //     shader.fragmentShader = shader.fragmentShader.replace(
    //         `#include <output_fragment>`,
    //         `gl_FragColor = ( gl_FrontFacing ) ? vec4( outgoingLight, diffuseColor.a ) : vec4( diffuse, 0.5 );
    //         `
    //     );
    // };

    mesh = new THREE.InstancedMesh(geometry, material, 27 * count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    


    const cap_geometry = new THREE.CircleGeometry(R, 32);
    const cap_material = new THREE.MeshPhongMaterial({ color: 0xff0000, side: THREE.DoubleSide, clippingPlanes: simulationBoxClipPlanes });
    caps = new THREE.InstancedMesh(cap_geometry, cap_material, 3*27*count);
    caps.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    adjustMeshToPositions(mesh, r,caps)
    scene.add(caps);
    scene.add(mesh);

    const plane_geometry = new THREE.PlaneGeometry(box_size, R);
    const plane_material = new THREE.MeshPhongMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const plane = new THREE.InstancedMesh(plane_geometry, plane_material, 24);
    plane.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    positionBoxEdges(plane)
    //  scene.add(plane);

    
    

    renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.localClippingEnabled = true;

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
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
        f = verletStep(r, v, 0.5, box_size, 0.05, f, last_f)
        // for (let i = 0; i < count; i++) {
        //     r[i].add(new THREE.Vector3(0.001,0.001,0.001))
        // }
        // totalForce(r, box_size,f)
        // console.log(f[0].clone())
        adjustMeshToPositions(mesh, r,caps)
        mesh.instanceMatrix.needsUpdate = true
        caps.instanceMatrix.needsUpdate = true
        render();

        // console.log(r[0].clone())


        stats.update();

        delta = delta % interval;
    }

}

function render() {

    renderer.render(scene, camera);

}

function adjustMeshToPositions(mesh,r,caps) {
    const matrix = new THREE.Matrix4();
    const rotationX = new THREE.Matrix4().makeRotationX(Math.PI / 2);
    const rotationY = new THREE.Matrix4().makeRotationY(Math.PI / 2);
    const rotationZ = new THREE.Matrix4().makeRotationZ(Math.PI / 2);
    const scaleMatrix = new THREE.Matrix4().makeScale(1, 1, 1);
    const positionSphere = new THREE.Vector3();
    const eps = 0.001;
    var scale
    const Rsquared = R * R;
    for (let x = -1; x < 2; x++) {
        for (let y = -1; y < 2; y++) {
            for (let z = -1; z < 2; z++) {
                for (let i = 0; i < count; i++) {
                    matrix.identity();
                    positionSphere.set(modulus(r[i].x, box_size) + x * box_size-box_size/2, modulus(r[i].y, box_size) + y * box_size-box_size/2, modulus(r[i].z, box_size) + z * box_size-box_size/2) 
                    matrix.setPosition(positionSphere);
                    mesh.setMatrixAt((x + 1 + (y + 1) * 3 + (z + 1) * 9) * count + i, matrix);



                    matrix.identity();
                    scaleMatrix.makeScale(1, 1, 1);
                    if (Math.abs(positionSphere.x+box_size/2) < R) {
                        matrix.setPosition(-box_size/2+eps, positionSphere.y, positionSphere.z);
                        scale = Math.sqrt(Rsquared-Math.pow(positionSphere.x+box_size/2,2))/R
                        scaleMatrix.makeScale(scale,scale,scale);
                        caps.setMatrixAt((x + 1 + (y + 1) * 3 + (z + 1) * 9) * count + i, matrix.multiply(rotationY).multiply(scaleMatrix));
                    } else if (Math.abs(positionSphere.x-box_size/2) < R) {
                        matrix.setPosition(box_size/2-eps, positionSphere.y, positionSphere.z);
                        scale = Math.sqrt(Rsquared-Math.pow(positionSphere.x-box_size/2,2))/R
                        scaleMatrix.makeScale(scale,scale,scale);
                        caps.setMatrixAt((x + 1 + (y + 1) * 3 + (z + 1) * 9) * count + i, matrix.multiply(rotationY).multiply(scaleMatrix));
                    } else {
                        matrix.setPosition(-box_size, -box_size, -box_size);
                        caps.setMatrixAt((x + 1 + (y + 1) * 3 + (z + 1) * 9) * count + i, matrix);
                    }

                    matrix.identity();
                    if (Math.abs(positionSphere.y+box_size/2) < R) {
                        matrix.setPosition(positionSphere.x, -box_size/2+eps, positionSphere.z);
                        scale = Math.sqrt(Rsquared-Math.pow(positionSphere.y+box_size/2,2))/R
                        scaleMatrix.makeScale(scale,scale,scale);
                        caps.setMatrixAt((x + 1 + (y + 1) * 3 + (z + 1) * 9) * count + i + 27*count, matrix.multiply(rotationX).multiply(scaleMatrix));
                    } else if (Math.abs(positionSphere.y-box_size/2) < R) {
                        matrix.setPosition(positionSphere.x, box_size/2-eps, positionSphere.z);
                        scale = Math.sqrt(Rsquared-Math.pow(positionSphere.y-box_size/2,2))/R
                        scaleMatrix.makeScale(scale,scale,scale);
                        caps.setMatrixAt((x + 1 + (y + 1) * 3 + (z + 1) * 9) * count + i + 27*count, matrix.multiply(rotationX).multiply(scaleMatrix));
                    } else {
                        matrix.setPosition(-box_size, -box_size, -box_size);
                        caps.setMatrixAt((x + 1 + (y + 1) * 3 + (z + 1) * 9) * count + i + 27*count, matrix);
                    }

                    matrix.identity();
                    if (Math.abs(positionSphere.z+box_size/2) < R) {
                        matrix.setPosition(positionSphere.x, positionSphere.y, -box_size/2+eps);
                        scale = Math.sqrt(Rsquared-Math.pow(positionSphere.z+box_size/2,2))/R
                        scaleMatrix.makeScale(scale,scale,scale);
                        caps.setMatrixAt((x + 1 + (y + 1) * 3 + (z + 1) * 9) * count + i + 2*27*count, matrix.multiply(rotationZ).multiply(scaleMatrix));
                    } else if (Math.abs(positionSphere.z-box_size/2) < R) {
                        matrix.setPosition(positionSphere.x, positionSphere.y, box_size/2-eps);
                        scale = Math.sqrt(Rsquared-Math.pow(positionSphere.z-box_size/2,2))/R
                        scaleMatrix.makeScale(scale,scale,scale);
                        caps.setMatrixAt((x + 1 + (y + 1) * 3 + (z + 1) * 9) * count + i + 2*27*count, matrix.multiply(rotationZ).multiply(scaleMatrix));
                    } else {
                        matrix.setPosition(-box_size, -box_size, -box_size);
                        caps.setMatrixAt((x + 1 + (y + 1) * 3 + (z + 1) * 9) * count + i + 2*27*count, matrix);
                    }
                }
            }
        }
    }

}


function setInitialPositions(r) {
    let i = 0;
    const spacing = box_size / amount;
    
    const offset = (amount - 1) / 2 + box_size / (2 * spacing);
    for (let x = 0; x < amount; x++) {

        for (let y = 0; y < amount; y++) {

            for (let z = 0; z < amount; z++) {
                r[i].set(spacing * (offset - x)-box_size/2, spacing * (offset - y)-box_size/2, spacing * (offset - z)-box_size/2)
                i++
            }

        }

    }
}

function modulus(a, b) {
    return ((a % b) + b) % b;
}

function positionBoxEdges(plane) {
    const matrix = new THREE.Matrix4();
    const matrix2 = new THREE.Matrix4();
    matrix.setPosition(box_size / 2, R / 2, 0);
    plane.setMatrixAt(0, matrix);

    matrix.setPosition(box_size / 2, R / 2, box_size);
    plane.setMatrixAt(1, matrix);

    matrix.setPosition(box_size / 2, box_size - R / 2, box_size);
    plane.setMatrixAt(2, matrix);

    matrix.setPosition(box_size / 2, box_size - R / 2, 0);
    plane.setMatrixAt(3, matrix);

    matrix.setPosition(R / 2, box_size / 2, 0);
    matrix2.makeRotationFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
    plane.setMatrixAt(4, matrix.multiply(matrix2));

    matrix.setPosition(R / 2, box_size / 2, box_size);
    plane.setMatrixAt(5, matrix);

    matrix.setPosition(box_size - R / 2, box_size / 2, box_size);
    plane.setMatrixAt(6, matrix);

    matrix.setPosition(box_size - R / 2, box_size / 2, 0);
    plane.setMatrixAt(7, matrix);

    matrix.setPosition(0, box_size / 2, R / 2);
    matrix2.makeRotationFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    plane.setMatrixAt(8, matrix.multiply(matrix2));

    matrix.setPosition(0, box_size / 2, box_size - R / 2);
    plane.setMatrixAt(9, matrix);

    matrix.setPosition(box_size, box_size / 2, box_size - R / 2);
    plane.setMatrixAt(10, matrix);

    matrix.setPosition(box_size, box_size / 2, R / 2);
    plane.setMatrixAt(11, matrix);

    matrix.identity();
    matrix.setPosition(0, R / 2, box_size / 2);
    matrix2.makeRotationFromEuler(new THREE.Euler(0, Math.PI / 2, 0));
    plane.setMatrixAt(12, matrix.multiply(matrix2));

    matrix.setPosition(0, box_size - R / 2, box_size / 2);
    plane.setMatrixAt(13, matrix);

    matrix.setPosition(box_size, box_size - R / 2, box_size / 2);
    plane.setMatrixAt(14, matrix);

    matrix.setPosition(box_size, R / 2, box_size / 2);
    plane.setMatrixAt(15, matrix);

    matrix.identity();
    matrix.setPosition(R / 2, 0, box_size / 2);
    matrix2.makeRotationFromEuler(new THREE.Euler(Math.PI / 2, Math.PI / 2, 0, 'YXZ'));
    plane.setMatrixAt(16, matrix.multiply(matrix2));

    matrix.setPosition(R / 2, box_size, box_size / 2);
    plane.setMatrixAt(17, matrix);

    matrix.setPosition(box_size - R / 2, box_size, box_size / 2);
    plane.setMatrixAt(18, matrix);

    matrix.setPosition(box_size - R / 2, 0, box_size / 2);
    plane.setMatrixAt(19, matrix);

    matrix.identity();
    matrix.setPosition(box_size / 2, box_size, R / 2);
    matrix2.makeRotationFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    plane.setMatrixAt(20, matrix.multiply(matrix2));

    matrix.setPosition(box_size / 2, box_size, box_size - R / 2);
    plane.setMatrixAt(21, matrix);

    matrix.setPosition(box_size / 2, 0, box_size - R / 2);
    plane.setMatrixAt(22, matrix);

    matrix.setPosition(box_size / 2, 0, R / 2);
    plane.setMatrixAt(23, matrix);
}