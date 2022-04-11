import React, { Component } from "react";
import ReactDOM from "react-dom";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";
import { Octree } from "three/examples/jsm/math/Octree";
import { OctreeHelper } from "three/examples/jsm/helpers/OctreeHelper";
import { Capsule } from "three/examples/jsm/math/Capsule";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import Stats from "three/examples/jsm/libs/stats.module";
import nipplejs from 'nipplejs'
import './index.css';
/**
 *
 * 定义全局属性
 * @type {flaot} speed
 * @type {flaot} jump
 * @type {flaot} gravity
 * @type {flaot} maxSpeed
 * @type {string} background
 * @type {flaot} cameraDistance
 * @type {boolean} debug
 * @type {flaot} damping
 */
let sceneAttributes = {
    "speed": 10,                //移动速度
    "runningSpeed": 30,         //跑步速度
    "jump": 10,                 //跳跃高度
    "gravity": 30,              //重力加速度
    "maxSpeed": 0.5,            //最大速度
    "background": 0x88ccee,     //背景颜色
    "cameraDistance": 3,      //镜头距离
    "debug": false,             //是否显示debug信息
    "damping": 4,               //阻尼系数
};
let playerSpeed = sceneAttributes["speed"]; //玩家移动速度
let running = false;            //是否跑步
let playerOnFloor = false;      //是否在地面上
// GUI 参数
var guiParams = {
    debug: false,
    zoom: 1.0,
    jumpHight: 8,
    speed: 1,
    exposure: 1,
};
let clock;                  //计时器
let scene;                  // 创建场景
let stats;                  //性能监视器
let camera;                 // 创建摄像机
let mouseTime = 0;
const mixers = [];
const STEPS_PER_FRAME=5;
const style = { height: window.innerHeight - 50, width: window.innerWidth };
class App extends Component {
  componentDidMount() {
    this.init(); //init
    this.animate();
  }
  componentWillUnmount() {
   
  }
  init(){//初始化
    let _this=this;
    clock = new THREE.Clock(); // 计时器
    scene = new THREE.Scene(); // 场景设置
    // 设置背景颜色和雾化效果
    scene.background = new THREE.Color(0x88ccee);
    scene.fog = new THREE.Fog(0x88ccee, 0, 300);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.mount.appendChild(this.renderer.domElement);
    // 摄像机设置
    camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.rotation.order = 'YXZ'; // 坐标系
    // 加入灯光
    const fillLight1 = new THREE.HemisphereLight(0x4488bb, 0x002244, 0.5);
    fillLight1.position.set(2, 1, 1);
    scene.add(fillLight1);
    // 加入光源
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(-5, 25, -1);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.01;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.radius = 4;
    directionalLight.shadow.bias = -0.00006;
    scene.add(directionalLight);

    // 性能监视器
    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    this.mount.appendChild(stats.domElement);

    this.Soldiers = []; // 人体模型
    // 球的参数
    this.spheres = [];
    let sphereIdx = 0;

    const NUM_SPHERES = 100; // 数量
    this.SPHERE_RADIUS = 0.1; // 大小

    // 外观和贴图
    const sphereGeometry = new THREE.IcosahedronGeometry(_this.SPHERE_RADIUS, 5);
    const sphereMaterial = new THREE.MeshLambertMaterial({
        color: 0xbbbb44
    });

    for (let i = 0; i < NUM_SPHERES; i++) {
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        scene.add(sphere);
        _this.spheres.push({
            mesh: sphere,
            collider: new THREE.Sphere(new THREE.Vector3(0, -100, 0), _this.SPHERE_RADIUS),
            velocity: new THREE.Vector3()
        });
    }

    this.worldOctree = new Octree();
    this.playerCollider = new Capsule(new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(0, 2, 0), 0.35);

    this.playerVelocity = new THREE.Vector3(); // 人物速度
    this.playerDirection = new THREE.Vector3(); // 人物位置

    this.keyStates = {};
    this.joyStates = {};
    this.stateList = {}; //人物姿态

    this.currentAction='';
    this.previousAction='';
    this.vector1 = new THREE.Vector3();
    this.vector2 = new THREE.Vector3();
    this.vector3 = new THREE.Vector3();

    document.addEventListener('keydown', (event) => {
        _this.keyStates[event.code] = true;
        
        if ( _this.keyStates['KeyW'] ||  _this.keyStates['KeyS'] ||  _this.keyStates['KeyA'] ||  _this.keyStates['KeyD']) {
            if (_this.stateList['Standing'] == _this.currentAction) {
                if(running) {
                      this.fadeToAction('Running', 0.4);
                    // currentAction = stateList['Running'];
                } else {
                    this.fadeToAction('Walking', 0.2);
                    // currentAction = stateList['Walking'];
                }
            }
        }else if( _this.keyStates['KeyR'])
        {
            running = !running;
            if(running) {
                playerSpeed = sceneAttributes["runningSpeed"];
            }else {
                playerSpeed = sceneAttributes["speed"];
            }
        }
    });

    document.addEventListener('keyup', (event) => {
      _this.keyStates[event.code] = false;
        if (!( _this.keyStates['KeyW'] ||  _this.keyStates['KeyS'] ||  _this.keyStates['KeyA'] ||  _this.keyStates['KeyD'])) {
            if (_this.stateList['Standing'] !== _this.currentAction) {
                this.fadeToAction('Standing', 0.2);
                _this.playerVelocity.x = 0;;
                _this.playerVelocity.z = 0;;
            }
        }
    });

    document.addEventListener('mousedown', () => {
        document.body.requestPointerLock();
        mouseTime = performance.now();
    });

    // 鼠标转动
    document.addEventListener('mousemove', (event) => {
      if (document.pointerLockElement === document.body) {
          camera.rotation.y -= event.movementX / 500;
          camera.rotation.x -= event.movementY / 500;
      }
    });
    window.addEventListener('resize', this.onWindowResize());

    if (this.isMobile()) {
      // 触控
      let windowHalfX, windowHalfY;
      let istouch = false;
      let toucheNow = 0;
      document.addEventListener('touchstart', (event) => {
          // 阻止窗口滚动行为
          event.preventDefault();

          // 两个手指触摸，主要是左右同时操作的时候
          const n = event.touches.length;

          for (let index = 0; index < n; index++) {
              const elem = event.touches[index];
              if (elem.pageX > window.innerWidth / 2) {
                  istouch = true;
                  windowHalfX = event.touches[index].pageX;
                  windowHalfY = event.touches[index].pageY;
                  toucheNow = index;
                  break;
              }
          }
      }, {
          passive: false
      });
      document.addEventListener('touchmove', (event) => {
          if (istouch) {
              const mousex = event.touches[toucheNow].pageX - windowHalfX;
              const mousey = event.touches[toucheNow].pageY - windowHalfY;
              camera.rotation.y -= mousex / 500;
              camera.rotation.x -= mousey / 500;
              windowHalfX = event.touches[toucheNow].pageX;
              windowHalfY = event.touches[toucheNow].pageY;
          }
      });
      document.addEventListener('touchend', (event) => {
          if (typeof (event.touches[toucheNow]) == "undefined") {
              istouch = false;
              toucheNow = 0;
          }
      });
      const JcoystickL = nipplejs.create({
          zone: document.getElementById("left"),
          mode: "semi",
          position: {
              left: "50%",
              top: "50%"
          },
          color: "white",
          size: 150,
          multitouch: true,
          restJoystick: {
              y: true
          }
      });

      JcoystickL.on('start', function (evt, data) {
        console.log(data);
          if (_this.stateList['Walking'] !== _this.currentAction) {
            _this.fadeToAction('Walking', 0.2);
          }
      });
      JcoystickL.on('end', function (evt, data) {
          if (_this.stateList['Standing'] !== _this.currentAction) {
            _this.fadeToAction('Standing', 0.2);
          }
          _this.setjoyStates("");
      });
      JcoystickL.on('dir:up',
          function (evt, data) {
            _this.joyStates["up"] = true;
              _this.setjoyStates("up");
          }
      );
      JcoystickL.on('dir:down',
          function (evt, data) {
            _this.joyStates["down"] = true;
              _this.setjoyStates("down");
          }
      );
      JcoystickL.on('dir:left',
          function (evt, data) {
            _this.joyStates["left"] = true;
              _this.setjoyStates("left");
          }
      );
      JcoystickL.on('dir:right',
          function (evt, data) {
            _this.joyStates["right"] = true;
              _this.setjoyStates("right");
          }
      );
    }

    // 场景导入
    const loader = new MTLLoader();

    loader.setPath("/").load("city.mtl", (materials) => {
        materials.preload()
        new OBJLoader().setMaterials(materials)
        .setPath("/")
        .load("city.obj",function(object){
            object.position.set(50, 0, 3);
            scene.add(object);
            _this.worldOctree.fromGraphNode(object);
        });
        const helper = new OctreeHelper(_this.worldOctree);
        helper.visible = false;
        scene.add(helper);
        const gui = new GUI({
            width: 200
        });

        gui.add(sceneAttributes, 'debug').onChange(function (value) {
            helper.visible = value;
        });
        gui.add(sceneAttributes,'cameraDistance', 0.5, 10);
        gui.add(sceneAttributes, 'jump', 1, 50);
    });

    // 人物模型导入
    const loader1 = new GLTFLoader();
    loader1.load("/Soldier.glb", function (gltf) {
        gltf.scene.traverse(function (object) {
            if (object.isMesh) object.castShadow = true;
        });

        const model1 = gltf.scene;
        // 设定姿态
        const mixer1 = new THREE.AnimationMixer(model1);
        _this.stateList.Standing = mixer1.clipAction(gltf.animations[0]); // idle
        _this.stateList.Walking = mixer1.clipAction(gltf.animations[3]); // walk
        _this.stateList.Running = mixer1.clipAction(gltf.animations[1]); // run

        // stateList.Standing.loop = THREE.LoopOnce;    //只运动一次 跳跃动作可以用
        // 初始为站立姿态
        _this.currentAction = _this.stateList.Standing;
        _this.currentAction.play();
        mixers.push(mixer1);
        _this.Soldiers.push(model1);
        scene.add(model1);
    });




  }

  setjoyStates(state) {
    let _this=this;
    for (const key in _this.joyStates) {
        if (key === state) {
          _this.joyStates[key] = true;
        } else {
          _this.joyStates[key] = false;
        }
    }
  }
  onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  playerCollisions() {
    let _this=this;
    const result = _this.worldOctree.capsuleIntersect(_this.playerCollider);
    playerOnFloor = false;
    if (result) {
        playerOnFloor = result.normal.y > 0;
        if (!playerOnFloor) {
          _this.playerVelocity.addScaledVector(result.normal, -result.normal.dot(_this.playerVelocity));
        }

        _this.playerCollider.translate(result.normal.multiplyScalar(result.depth));
    }
  }

  updatePlayer(deltaTime) {
    let _this=this;
    let damping = Math.exp(-sceneAttributes["damping"] * deltaTime) - 1;
    if (!playerOnFloor) {
      _this.playerVelocity.y -= sceneAttributes["gravity"] * deltaTime;

        // small air resistance
        damping *= 0.1;
    }

    _this.playerVelocity.addScaledVector(_this.playerVelocity, damping);

    const deltaPosition = _this.playerVelocity.clone().multiplyScalar(deltaTime);
    _this.playerCollider.translate(deltaPosition);

    _this.playerCollisions();
    camera.position.copy(_this.playerCollider.end);
    camera.getWorldDirection(_this.playerDirection);
    _this.playerDirection.normalize();

    //镜头拉远的距离
    camera.position.add(_this.playerDirection.multiplyScalar(-sceneAttributes["cameraDistance"]));

    for (const Soldier of _this.Soldiers) {
        Soldier.position.copy(_this.playerCollider.start);
        Soldier.rotation.z = camera.rotation.z;
        Soldier.rotation.y = camera.rotation.y;
    }
  }

  playerSphereCollision(sphere) {
    let _this=this;
    const center = _this.vector1.addVectors(_this.playerCollider.start, _this.playerCollider.end).multiplyScalar(0.5);
    const sphere_center = sphere.collider.center;
    const r = _this.playerCollider.radius + sphere.collider.radius;
    const r2 = r * r;
    for (const point of [_this.playerCollider.start, _this.playerCollider.end, center]) {
        const d2 = point.distanceToSquared(sphere_center);

        if (d2 < r2) {
            const normal = _this.vector1.subVectors(point, sphere_center).normalize();
            const v1 = _this.vector2.copy(normal).multiplyScalar(normal.dot(_this.playerVelocity));
            const v2 = _this.vector3.copy(normal).multiplyScalar(normal.dot(sphere.velocity));

            _this.playerVelocity.add(v2).sub(v1);
            sphere.velocity.add(v1).sub(v2);

            const d = (r - Math.sqrt(d2)) / 2;
            sphere_center.addScaledVector(normal, -d);
        }
    }
  }
  spheresCollisions() {
    let _this=this;
    for (let i = 0, length = _this.spheres.length; i < length; i++) {

        const s1 = _this.spheres[i];
        for (let j = i + 1; j < length; j++) {
            const s2 = _this.spheres[j];
            const d2 = s1.collider.center.distanceToSquared(s2.collider.center);
            const r = s1.collider.radius + s2.collider.radius;
            const r2 = r * r;

            if (d2 < r2) {
                const normal = _this.vector1.subVectors(s1.collider.center, s2.collider.center).normalize();
                const v1 = _this.vector2.copy(normal).multiplyScalar(normal.dot(s1.velocity));
                const v2 = _this.vector3.copy(normal).multiplyScalar(normal.dot(s2.velocity));

                s1.velocity.add(v2).sub(v1);
                s2.velocity.add(v1).sub(v2);

                const d = (r - Math.sqrt(d2)) / 2;

                s1.collider.center.addScaledVector(normal, d);
                s2.collider.center.addScaledVector(normal, -d);
            }
        }
    }
  }
  updateSpheres(deltaTime) {
    let _this=this;
    _this.spheres.forEach(sphere => {
        sphere.collider.center.addScaledVector(sphere.velocity, deltaTime);
        const result = _this.worldOctree.sphereIntersect(sphere.collider);

        if (result) {
            sphere.velocity.addScaledVector(result.normal, -result.normal.dot(sphere.velocity) * 1.5);
            sphere.collider.center.add(result.normal.multiplyScalar(result.depth));
        } else {
            sphere.velocity.y -= sceneAttributes["gravity"] * deltaTime;
        }

        const damping = Math.exp(-sceneAttributes["damping"] * deltaTime) - 1;
        sphere.velocity.addScaledVector(sphere.velocity, damping);
        _this.playerSphereCollision(sphere);
    });

    _this.spheresCollisions();

    for (const sphere of _this.spheres) {
        sphere.mesh.position.copy(sphere.collider.center);
    }
  }
  getForwardVector() {
    let _this=this;
    camera.getWorldDirection(_this.playerDirection);
    _this.playerDirection.y = 0;
    _this.playerDirection.normalize();
    return _this.playerDirection;
  }
  getSideVector() {
    let _this=this;
    camera.getWorldDirection(_this.playerDirection);
    _this.playerDirection.y = 0;
    _this.playerDirection.normalize();
    _this.playerDirection.cross(camera.up);
    return _this.playerDirection;
  }
  // 键盘操作
  controls=(deltaTime)=> {
    let _this=this;
    // gives a bit of air control
    const speedDelta = deltaTime * (playerOnFloor ? playerSpeed : playerSpeed/4);

    if ( _this.keyStates['KeyW'] || _this.joyStates["up"]) {
      _this.playerVelocity.add(_this.getForwardVector().multiplyScalar(speedDelta));
    }

    if ( _this.keyStates['KeyS'] || _this.joyStates["down"]) {
      _this.playerVelocity.add(_this.getForwardVector().multiplyScalar(-speedDelta));
    }

    if ( _this.keyStates['KeyA'] || _this.joyStates["left"]) {
      _this.playerVelocity.add(_this.getSideVector().multiplyScalar(-speedDelta));
    }

    if ( _this.keyStates['KeyD'] || _this.joyStates["right"]) {
      _this.playerVelocity.add(_this.getSideVector().multiplyScalar(speedDelta));
    }

    if (playerOnFloor) {
        if ( _this.keyStates['Space']) {
          _this.playerVelocity.y = sceneAttributes["jump"];
        }
    }
  }
  // 动画播放 ，不同的动作，播放不同的视频
  fadeToAction(name, duration) {
    let _this=this;
    _this.previousAction = _this.currentAction;
    _this.currentAction = _this.stateList[name];
    if (_this.previousAction !== _this.currentAction) {
      _this.previousAction.fadeOut(duration);
    }
    if (_this.currentAction) {
      _this.currentAction
            .reset()
            .setEffectiveTimeScale(1)
            .setEffectiveWeight(1)
            .fadeIn(duration)
            .play();
    }
  }
  //掉落有传送到初始地
  teleportPlayerIfOob() {
    let _this=this;
    if (camera.position.y <= -25) {
      _this.playerCollider.start.set(0, 0.35, 0);
      _this.playerCollider.end.set(0, 3, 0);
      _this.playerCollider.radius = 0.35;
        camera.position.copy(_this.playerCollider.end);
        camera.rotation.set(0, -10, 0);
    }
  }
  animate=()=>{
    let _this=this;
    const deltaTime = Math.min(0.05, clock.getDelta()) / (STEPS_PER_FRAME);
    for (let i = 0; i < STEPS_PER_FRAME; i++) {
      _this.controls(deltaTime);
      _this.updatePlayer(deltaTime);
      _this.updateSpheres(deltaTime);
      _this.teleportPlayerIfOob();
        for (const mixer of mixers) mixer.update(deltaTime);
    }
    _this.renderer.render(scene, camera);
    stats.update();
    requestAnimationFrame(_this.animate);
  }

  isMobile() {
    if ((navigator.userAgent.match(/(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i))) {
        return true;
    }
    else {
        return false;
    }
  }
  render() {
    return (
      <>
       <div style={style} ref={(ref) => (this.mount = ref)} ></div>
       <div id="left" className="zone"></div>
      </>
     
    );
  }
} 

class Container extends React.Component {
  state = {};
  render() {
    const { percentComplete = 0 } = this.state;
    return (
      <>
        {
          <App/>
        }
        
      </>
    );
  }
}
const rootElement = document.getElementById("root");
ReactDOM.render(<Container />, rootElement);
