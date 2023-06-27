import * as THREE from 'three';

const HARMONIC = 0
const LENNARD_JONES = 1
const MORSE = 2

// Potential constants
const A = 1
const B = 1
const c = 1
const r_e = 1
const D_e = 1
const a = 1

const neighborMatrix = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [0, 1, 1], [1, 0, 1], [1, 1, 1], [1, 0, -1], [0, 1, -1], [-1, 1, 0], [1, 1, -1], [1, -1, 1], [-1, 1, 1]]



function minimumImageDistance(ri, rj, L) {
    let differenceVector = new THREE.Vector3().subVectors(ri, rj)
    return differenceVector.sub(differenceVector.clone().divideScalar(L).round().multiplyScalar(L))
}

function periodic(n, N) {
    return ((n % N) + N) % N
}













function initState(n) {
    let positions = new Array(n)
}




function potential() {
    console.log(new THREE.Vector3(0, 0, 0))
}

function gradPotential(r) {
    return gradLennardJonesPotential(r)
}

function force(ri, rj, l) {
    let r_ij = rij(ri, rj, l)
    let abs_rij = r_ij.length()
    return r_ij.divideScalar(abs_rij).multiplyScalar(-gradPotential(abs_rij))
}

function rij(ri, rj, l) {
    let r_ij = new THREE.Vector3().subVectors(ri, rj)
    r_ij.sub(r_ij.clone().divideScalar(l).round().multiplyScalar(l))
    return r_ij;
}

export function totalForce(r, l,ff) {
    ff.forEach(e => e.set(0,0,0))
    for (let i = 0; i < r.length - 1; i++) {
        for (let j = i + 1; j < r.length; j++) {
            let f = force(r[i], r[j], l)
            ff[i].add(f)
            ff[j].sub(f)
        }
    }
    return ff
}

export function verletStep(r, v, T, l, dt, ff,old_ff) {
    let tau = 1
    for (let i = 0; i < r.length; i++) {
        r[i].add(v[i].clone().multiplyScalar(dt))
        r[i].add(ff[i].clone().multiplyScalar(dt * dt / 2))
    }
    let lambda = Math.sqrt(1 + 2 * dt / tau * (T / temperature(v) - 1)) 
    for (let i = 0; i < ff.length; i++) {  
        old_ff[i].copy(ff[i])   
    }
    ff = totalForce(r, l,ff)
    for (let i = 0; i < r.length; i++) {
        v[i].add(old_ff[i].add(ff[i]).multiplyScalar(dt / 2))
        if (lambda != NaN && lambda != Infinity) {
            v[i].multiplyScalar(lambda)
        }
    }
    return ff
}

function temperature(v) {
    let sum = 0
    for (let i = 0; i < v.length; i++) {
        sum += v[i].lengthSq()
    }
    return sum / (3 * v.length - 1)
}







function lennardJonesPotential(r) {
    return A / Math.pow(r, 12) - B / Math.pow(r, 6)
}

function gradLennardJonesPotential(r) {
    return 6 * B / Math.pow(r, 7) - 12 * A / Math.pow(r, 13)
}

function harmonicPotential(r) {
    return 1 / 2 * c * Math.pow(r - r_e, 2)
}

function gradHarmonicPotential(r) {
    return c * (r - r_e)
}

function morsePotential(r) {
    return D_e * Math.pow(1 - Math.exp(-a * (r - r_e)), 2)
}

function gradMorsePotential(r) {
    let exp = Math.exp(-a * (r - r_e))
    return 2 * D_e * (1 - exp) * exp * a
}
