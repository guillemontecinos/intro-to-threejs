# 03 – Intro to Three.js – Multiplayer
## Client
```js
// 03 – Intro to Three.js – Multplayer
// Client code
// by Guillermo Montecinos
// March 2021

import * as THREE from 'https://unpkg.com/three@0.121.1/build/three.module.js'

// Web socket setup (https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
// Retrieve host's address
const url = 'ws://' + location.host
console.log(url)
// Open a new ws connection with the server
const socket = new WebSocket(url);
// Attach listeners to the socket
socket.addEventListener('message', readIncomingMessage)
// Use an array to keep track of users status
let users = new Array()

// Three.js setup
const canvas = document.getElementById('c')
const renderer = new THREE.WebGLRenderer({canvas})
const scene = new THREE.Scene()

// Hemisphere Light
const skyColor = 0xffffff
const groundColor = 0xddc199
const hemisphereLightIntensity = 1.5
const hemisphereLight = new THREE.HemisphereLight(skyColor, groundColor, hemisphereLightIntensity)
scene.add(hemisphereLight)

// Plane
const planeSize = 20
const loader = new THREE.TextureLoader();
const texture = loader.load('https://threejsfundamentals.org/threejs/resources/images/checker.png');
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.magFilter = THREE.NearestFilter;
const repeats = planeSize / 2;
texture.repeat.set(repeats, repeats);

const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize)
const planeMaterial =  new THREE.MeshPhongMaterial({
    map: texture,
    side: THREE.DoubleSide
})
const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial)
scene.add(planeMesh)

// Scenario Guard
const planeGuard = new THREE.Box3().setFromObject(planeMesh)

// Cube setup
// Two kind of cubes can be created: this cube, in which the user sets all their params, and the instances of other users cubes, which are intialized with the params provided by the server.
function newCube(isThis, color, initMatrix){
    // Cube
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1)
    // const cubeMaterial =  new THREE.MeshPhongMaterial({color: 0x873e2d})
    const cubeMaterial =  new THREE.MeshPhongMaterial({color: color})
    const cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial)
    const cubeLookAt = new THREE.Vector3(0, 1, 0)
    cubeMesh.position.set(0, 0, 0)
    cubeMesh.matrixAutoUpdate = false
    cubeMesh.updateMatrix()
    if(isThis) {
        // Cube Camera
        const fov = 70
        const aspect = 2
        const near = 0.01
        const far = 20
        const camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
        cubeMesh.add(camera)
        camera.position.set(0, -1.1, 1)
        camera.lookAt(0, 1, .5)
        
        cubeMesh.matrix.multiply(initMatrix)
        return {mesh: cubeMesh, lookAt: cubeLookAt}
    }
    else {
        cubeMesh.matrix.multiply(initMatrix)
        return cubeMesh
    }
}
// Intialize by default this cube
const posX = THREE.MathUtils.mapLinear(Math.random(), 0, 1, planeGuard.min.x, planeGuard.max.x)
const posY = THREE.MathUtils.mapLinear(Math.random(), 0, 1, planeGuard.min.y, planeGuard.max.y)
const translateMt = new THREE.Matrix4().makeTranslation(posX, posY, .5)
const thisCube = newCube(true, new THREE.Color().setHSL(Math.random(), .67, .4), translateMt)
scene.add(thisCube.mesh)

// Render
function renderFrame(time){
    time *= .0005

    updateCubeTransform()

    if(thisCube) {
        if(resizeRendererToDisplaySize(renderer)){
            // Create a representation of the element where three.js is rendering
            const cnv = renderer.domElement;
            thisCube.mesh.children[0].aspect = cnv.clientWidth / cnv.clientHeight;
            thisCube.mesh.children[0].updateProjectionMatrix();
        }    
    }
    renderer.render(scene, thisCube.mesh.children[0])
    requestAnimationFrame(renderFrame)
}
requestAnimationFrame(renderFrame)

function resizeRendererToDisplaySize(renderer){
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


function updateCubeTransform() {
    
    // For efficiency purposes let's make all calculations and matrix update only when an interaction is detected
    if(moveFront || moveBack || boxZRotSpeed != 0) {
        const transformMatrix = new THREE.Matrix4()

        // Rotation
        const rotationQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), boxZRotSpeed)
        const rotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion(rotationQuat)
        transformMatrix.multiply(rotationMatrix)

        // Position
        let moveDirection = 0
        if(moveFront) {
            moveDirection = 1
        }
        if(moveBack) {
            moveDirection = -1
        }
        const cubeLookAtCopy = new THREE.Vector3().copy(thisCube.lookAt)
        cubeLookAtCopy.multiplyScalar(translateSpeed * moveDirection)
        const translationMatrix = new THREE.Matrix4().makeTranslation(cubeLookAtCopy.x, cubeLookAtCopy.y, cubeLookAtCopy.z)
        transformMatrix.multiply(translationMatrix)
        
        // Test if inside the guard
        const nextTransformMatrix = new THREE.Matrix4().copy(thisCube.mesh.matrix)
        nextTransformMatrix.multiply(transformMatrix)
        const pos = new THREE.Vector3().setFromMatrixPosition(nextTransformMatrix)
        pos.z = 0
        if(planeGuard.containsPoint(pos)) thisCube.mesh.matrix.copy(nextTransformMatrix)

        // Anytime the local cube's transform matrix is updated it has to be notified to the server and updated all over the network
        sendMessage(JSON.stringify({type: 'user-update', matrix: thisCube.mesh.matrix.elements, id: thisCube.id}))
    }
}

// User interaction
const translateSpeed = .04
let moveFront = false, moveBack = false, moveLeft = false, moveRight = false

window.addEventListener('keydown', (e) => {
    if(e.key === 'w' || e.key === 'W'){
        moveFront = true
    }
    else if(e.key === 's' || e.key === 'S'){
        moveBack = true
    }
})

window.addEventListener('keyup', (e) => {
    if(e.key === 'w' || e.key === 'W'){
        moveFront = false
    }
    else if(e.key === 's' || e.key === 'S'){
        moveBack = false
    }
})

let boxZRotSpeed = 0
canvas.addEventListener('mousemove', (e) => {
    if(e.offsetX > renderer.domElement.clientWidth / 2 + 75 || e.offsetX < renderer.domElement.clientWidth / 2 - 75) {
        boxZRotSpeed = THREE.MathUtils.mapLinear(e.offsetX, 0, renderer.domElement.clientWidth, Math.PI / 300, -Math.PI / 300)
    }
    else { 
        boxZRotSpeed = 0
    }
})

// Web socket incoming messages handler callback
function readIncomingMessage(e){ 
    // Parse the indoming data into a json object
    const data = JSON.parse(e.data) 
    // User init means the server has responded to the connection with the id it assigned to the user
    if(data.type === 'user-init') {
        thisCube.id = data.id
        console.log(thisCube)
        // Send to the server the initial attributes of the local cube
        sendMessage(JSON.stringify({type: 'user-setup', matrix: thisCube.mesh.matrix.elements, color: thisCube.mesh.material.color.getHex(), id: thisCube.id}))
    }
    // New user or previous user means a user has connected or there were users in the scene before the client connected.
    else if(data.type === 'new-user' || data.type === 'previous-user') {
        console.log(data.type)
        // Instantiate the cube and store it in the users array
        users.push({mesh: newCube(false, new THREE.Color().setHex(data.color), new THREE.Matrix4().fromArray(data.matrix)), id: data.id})
        // Add the cube to the scene so it can be rendered
        scene.add(users[users.length - 1].mesh)
        console.log(users[users.length - 1].mesh)
    }
    // User move indicates a user in the network has updated their transformation matrix
    else if(data.type == 'user-move') {
        // Find the user that moved in the users array
        const index = users.findIndex(user => user.id == data.id)
        console.log('user ' + users[index].id + ' moved.')
        // Update the cube's matrix with the data received from the server. Note the data was sent as an array.
        users[index].mesh.matrix.fromArray(data.matrix)
    }
    // Delete the user that disconnected from the users array
    else if(data.type == 'user-disconnect') {
        const index = users.findIndex(user => user.id == data.id)
        console.log('user ' + users[index].id + ' disconnected')
        // Remove the cube from the scene
        scene.remove(users[index].mesh)
        // Remove the user form users
        users.splice(index, 1)
    }
}

function sendMessage(data){
    if(socket.readyState === WebSocket.OPEN){
        socket.send(data)
    }
}
```
## Server
```js
// 03 – Intro to Three.js – Multplayer
// Server code
// by Guillermo Montecinos
// March 2021
// WebSocket implementetion based on Tom Igoe's web socket examples: https://tigoe.github.io/websocket-examples/

const express = require('express')
const path = require('path')

// Instantiate express app
const app = express()
// Import and intialize ws server instance on express
const wsServer = require('express-ws')(app)

let users = []
// Use the public folder to load html/js files
app.use(express.static('public'))

// on get '/' send page to the user
app.get('/', function (req, res){
    res.sendFile(path.join(__dirname, '/public/index.html'))
})

// Callback function that get's executed when a new socket is intialized/connects
function handleWs(ws){
    console.log('New user connected: ' + ws)
    // As soon as a new client connects, assign them an id, store it in the users array and send it back to the client
    ws.send(JSON.stringify({type: 'user-init', id: users.length}))
    users.push({socket: ws, id: users.length})

    // When a user disconnects, remove it from the users array and inform all the clients in the network
    function endUser() {
        const index = users.findIndex(user => user.socket == ws)
        users.forEach((user) => {
            if(user.socket != ws) {
                // Let know all users that aren't the one disconnecting from the disconnection
                user.socket.send(JSON.stringify({type: 'user-disconnect', id: users[index].id}))
            }
        })
        console.log('user id: ' + users[index].id + ' disconnected')
        users.splice(index, 1)
    }
    // This callback is triggered everytime a new message is received
    function messageReceived(m){ 
        // Parse de data to json
        const data = JSON.parse(m)
        // Data setup means a new user received their id and sends back all the initialization parameters
        if(data.type == 'user-setup') {
            // Broadcast user setup message called new-user to setup new user in all users except from the originary
            users.forEach((user) => {
                // If the user correpsonds to the one on setup, store its initialization data
                if(user.socket == ws) {
                    user.color = data.color
                    user.matrix = data.matrix
                }
                // If there are users different to the one setting up, it means there were users previously connected. Hence, we have to let the new user know of their existance.
                else {
                    // Send to the new user the previous users data
                    ws.send(JSON.stringify({type: 'previous-user', id: user.id, color: user.color, matrix: user.matrix}))
                    // Send to other users the new user setup
                    data.type = 'new-user'
                    user.socket.send(JSON.stringify(data))
                }
            })
        }
        else if(data.type == 'user-update') {
            // When a user udpates its position, let all other users about it.
            users.forEach((user) => {
                if(user.socket != ws) {
                    user.socket.send(JSON.stringify({type: 'user-move', matrix: data.matrix, id: data.id}))
                }
            })
        }
    }
    // Attach callbacks to the socket as soon it gets connected
    ws.on('message', messageReceived)
    ws.on('close', endUser)
}

// Server init
const port = process.env.PORT || 3000
app.listen(port, function(){
    console.log('Server listening on port ' + port)
})

// Sockets init
app.ws('/', handleWs)
```