let clock, mixer;
let camera, scene, renderer, controls;

let robot, face, actions, expressions, activeAction, previousAction;
const api = { state: 'Running' };
const states = ['Idle', 'Walking', 'Running', 'Dance', 'Death', 'Sitting', 'Standing'];
const emotes = ['Jump', 'Yes', 'No', 'Wave', 'Punch', 'ThumbsUp'];

cellsize =  50
cellnum = 20
scaler = cellsize / cellnum

function loaded() {
    init();
    animate();
}

function init() {
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.25, 100);
    camera.position.set(20, 20, 50);
    camera.lookAt(new THREE.Vector3(0, 1, 0));

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd0d0d0);    

    clock = new THREE.Clock();

    // lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff);
    dirLight.position.set(0, 20, 10);
    scene.add(dirLight);

    // robot
    // https://threejs.org/docs/#examples/en/loaders/GLTFLoader
    const loader = new THREE.GLTFLoader();
    loader.load('/res/RobotExpressive.glb', function (gltf) {
        robot = gltf.scene;
        scene.add(robot);
        queryActions(robot, gltf.animations);

        createGround()
        createTweet()

    }, undefined, function (e) {
        console.error(e);
    });

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.body.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);

    window.addEventListener('resize', onWindowResize);
}

function createGround() {
    // ground
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false }));
    mesh.rotation.x = - Math.PI / 2;
    scene.add(mesh);

    // https://threejs.org/docs/#api/en/helpers/GridHelper
    const grid = new THREE.GridHelper(cellsize, cellnum, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);

    createCube( 9, 0, -6);
    createCube( 3, 0,  3);
    createCube(-7, 0,  6);
}

function createCube(x, y, z) {
    // cube
    let cubeGeo = new THREE.BoxGeometry( 3, 3, 3 );
    let cubeMaterial = new THREE.MeshLambertMaterial( { color: 0xfeb74c, map: new THREE.TextureLoader().load( 'res/square.png' ) } );
    let voxel = new THREE.Mesh( cubeGeo, cubeMaterial );
    voxel.position.set(x*scaler, y*scaler+1.5, z*scaler)
    scene.add( voxel );
}

function queryActions(model, animations) {
    mixer = new THREE.AnimationMixer(model);
    actions = {};
    for (let i = 0; i < animations.length; i++) {
        const clip = animations[i];
        const action = mixer.clipAction(clip);
        actions[clip.name] = action;

        if (emotes.indexOf(clip.name) >= 0 || states.indexOf(clip.name) >= 4) {
            action.clampWhenFinished = true;
            action.loop = THREE.LoopOnce;
        }
    }
    face = model.getObjectByName( 'Head_4' );
    expressions = Object.keys( face.morphTargetDictionary );

    activeAction = actions[api.state];
    activeAction.play();
}

// switch actions
function fadeToAction(name, duration) {
    console.log(name)
    previousAction = activeAction
    activeAction = actions[name]

    if (previousAction !== activeAction) {
        previousAction.fadeOut(duration)
    }

    activeAction
        .reset()
        .setEffectiveTimeScale(1)
        .setEffectiveWeight(1)
        .fadeIn(duration)
        .play()
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(time) {
    const dt = clock.getDelta();
    if (mixer) {
        mixer.update(dt);
    }
    TWEEN.update(time);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// change robot status
var dirs = ['south', 'east','north', 'west'];
var loop = 0;

function randint(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
    
function changeEmotion(){
    function restoreEmotion() {
        mixer.removeEventListener('finished', restoreEmotion)
        fadeToAction(api.state, 0.2)
    }
    emotionID = randint(0, emotes.length-1)
    fadeToAction(emotes[emotionID], 1)
    mixer.addEventListener('finished', restoreEmotion)
}

function changeState(){
    function restoreState() {
        mixer.removeEventListener('finished', restoreState)
        fadeToAction(api.state, 0.5)
    }
    statesID = randint(0, states.length-1)
    fadeToAction(states[statesID], 1)
    mixer.addEventListener('finished', restoreState)
}

function morphFace(){
    let id = randint(0, expressions.length-1)
    let value = randint(0, 10)

    console.log(expressions[id])
    face.morphTargetInfluences[id] = value/10;
}

function createTweet() {
    let steps = 8 * scaler
    let speed = 400
    let denominator = (api.state == 'Walking') ? 1 : 2;
    
    let offset = { step: 0 }                // 起始出發值，之後 onUpdate 會一直改變他 
    let target = { step: steps }             // 起始目標值，之後會一直被改變
    let position = new THREE.Vector3 (0, 0, 0)
    position.copy( robot.position );
    console.log(position)

    let index = loop%4 
    let direction = dirs[index]

    const onUpdate = () => {
        // 移動
        //console.log(offset.step)
        if (direction == 'south') {
            robot.position.z = position.z + offset.step
        } else if (direction == 'north') {
            robot.position.z =  position.z - offset.step
        } else if (direction == 'east') {
            robot.position.x = position.x + offset.step
        } else if (direction == 'west') {
            robot.position.x = position.x - offset.step
        }
    }

    let tween = new TWEEN.Tween(offset)                     // 起點為 offset
        .to(target, speed*steps/denominator)                // 設訂多少ms內移動至 target
        .onUpdate(onUpdate)
        .onComplete(() => {
            tween.stop()
            morphFace()
            changeState()
            //changeEmotion()
            createRotationTweet(Math.PI/2);
            loop++;
        })

    // 開始移動
    tween.start()
}

//radian
function createRotationTweet(angle) {
    let offset = { step: robot.rotation.y }      // 起始出發值，之後 onUpdate 會一直改變他 
    let target = { step: robot.rotation.y + angle }   // 起始目標值，之後會一直被改變

    const onUpdate = () => {
        // 移動
        robot.rotation.y = offset.step
    }

    let tween = new TWEEN.Tween(offset)                     // 起點為 offset
        .to(target, 1000)                // 設訂多少ms內移動至 target
        .onUpdate(onUpdate)
        .onComplete(() => {
            tween.stop()
            morphFace()
            //changeEmotion()
            createTweet()
        })

    // 開始移動
    tween.start()
}