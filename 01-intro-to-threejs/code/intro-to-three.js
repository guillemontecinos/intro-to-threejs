// 01 – Intro to Three.js – From nothing to importing an .obj model
// by Guillermo Montecinos
// Feb 2021

import * as THREE from 'https://unpkg.com/three@0.121.1/build/three.module.js'
import {OrbitControls} from 'https://threejsfundamentals.org/threejs/resources/threejs/r119/examples/jsm/controls/OrbitControls.js'
import {OBJLoader2} from 'https://threejsfundamentals.org/threejs/resources/threejs/r122/examples/jsm/loaders/OBJLoader2.js';
import {MTLLoader} from 'https://threejsfundamentals.org/threejs/resources/threejs/r119/examples/jsm/loaders/MTLLoader.js'
import {MtlObjBridge} from 'https://threejsfundamentals.org/threejs/resources/threejs/r119/examples/jsm/loaders/obj2/bridge/MtlObjBridge.js'

const canvas = document.getElementById('c')
const renderer = new THREE.WebGLRenderer({canvas})

// Declaring camera constants, instantiating camera object, and setting camera position
const fov = 60
const aspect = 2
const near = 0.01
// const far = 10
// For obj model
const far = 50

const camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
// camera.position.set(0, 0, 2)
// For obj model
camera.position.set(12, 12, 5)

// Creating scene, which is the root of the project
const scene = new THREE.Scene()

// For obj model this has to be commented
// Creating cube geometry, material and mesh
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1)
// const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x4d4fc6})
const cubeMaterial = new THREE.MeshPhongMaterial({ color: 0x4d4fc6})
const cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial)
// scene.add(cubeMesh)

// Declaring light paramteres and instantiating a new light object
const lightColor = 0xFFFFFF
const lightIntensity = 1
const light = new THREE.DirectionalLight(lightColor, lightIntensity)
light.position.set(1, 2, 3)
scene.add(light)

// Adding hemisphere light
const skyColor = 0xB1E1FF
const groundColor = 0xB97A20
const hemisphereLightIntensity = 1.5
const hemisphereLight = new THREE.HemisphereLight(skyColor, groundColor, hemisphereLightIntensity)
scene.add(hemisphereLight)

// // Orbit controls
const controls = new OrbitControls(camera, canvas);
// controls.target.set(0, 0, 0);
// For obj model loading
controls.target.set(0, 5, 0);
controls.update();

// Load model material
const materialPath = './roadbike.1.0.mtl'
const mtlLoader = new MTLLoader()
mtlLoader.load(materialPath, (preMaterial) => {
    const material = MtlObjBridge.addMaterialsFromMtlLoader(preMaterial)
    // Load OBJ model
    const modelPath = './roadbike.1.0.obj'
    const objLoader = new OBJLoader2()
    objLoader.addMaterials(material)
    objLoader.load(modelPath, (model) => {
        scene.add(model)
    })
})

function renderFrame(time){
    time *= .0005

    if(resizeRendererToDisplaySize(renderer)){
        // Create a representation of the element where three.js is rendering
        const cnv = renderer.domElement;
        camera.aspect = cnv.clientWidth / cnv.clientHeight;
        camera.updateProjectionMatrix();
    }

    // cubeMesh.rotation.set(time, time, 0)
    renderer.render(scene, camera)
    requestAnimationFrame(renderFrame)
}
requestAnimationFrame(renderFrame)

function resizeRendererToDisplaySize(renderer){
    // console.log(camera.position)
    const canvas = renderer.domElement
    // get the browser window's size
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    const needsResize = width != canvas.width || height != canvas.height
    if (needsResize) {
        renderer.setSize(width, height, false)
    }
    return needsResize
}