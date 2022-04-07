import React, { Component } from "react";
import ReactDOM from "react-dom";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { MeshControl } from "./control.js"
import './index.css'
const style = { height: window.innerHeight - 50, width: window.innerWidth };
let windowHalfX = window.innerWidth;
let windowHalfY = window.innerHeight;
let ObjectElement = null;
class App extends Component {
  componentDidMount() {
    this.sceneSetup(); //init
    this.animate();
    window.addEventListener("resize", this.onWindowResize);
    window.addEventListener("keydown", this.keyDownWalk);
    window.addEventListener("keyup",this.keyUpWalkStop);
  }
  componentWillUnmount() {
    window.removeEventListener("resize", this.onWindowResize);
    window.removeEventListener("keydown", this.keyDownWalk);
    window.removeEventListener("keyup",this.keyUpWalkStop);
    window.cancelAnimationFrame(this.requestID);
    this.controls.dispose();
  }
  sceneSetup = () => {
    let _this = this;
    _this.scene = new THREE.Scene();
    _this.scene.background = new THREE.Color(0xcccccc);
    _this.scene.fog = new THREE.FogExp2(0xcccccc, 0.002);
    _this.renderer = new THREE.WebGLRenderer({
      antialias: true
    });
    _this.renderer.setPixelRatio(window.devicePixelRatio);
    _this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.mount.appendChild(_this.renderer.domElement);
    //镜头
    _this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    _this.camera.position.set(50, 250, 320);

    // controls  控制
    _this.control={
      top: false,
      bottom: false,
      left: false,
      right: false
    }
    _this.controls = new OrbitControls(_this.camera, _this.renderer.domElement);
    _this.controls.enableDamping =true; // an animation loop is required when either damping or auto-rotation are enabled
    _this.controls.dampingFactor = 0.05;
    _this.controls.screenSpacePanning = true;
    _this.controls.minDistance = 0;
    _this.controls.maxDistance = 100;
    _this.controls.maxPolarAngle = Math.PI ;
    _this.controls.rotateSpeed=0.5;
    
    var size = 10000;
    var divisions = 100;
    var gridHelper = new THREE.GridHelper(size, divisions);
    _this.scene.add(gridHelper);

    //
    _this.clock = new THREE.Clock();
    _this.controlsMesh = new MeshControl(_this.camera, _this.controls,_this.scene);

    // // //load fbx
    // new FBXLoader().setPath("/").load("taxi.fbx", function (object) {
    //   var  material=new THREE.MeshNormalMaterial();
    //   object.traverse(function (mesh) {
    //     if (!mesh.material) return;
    //     mesh.material = material;
    //   })
    //   object.position.set(300, 0, 350);
    //   _this.model=_this.controlsMesh.addObject(object);
    //   _this.model.scale.set(0.1, 0.1, 0.1);
    //   _this.scene.add(_this.model);
    // });
    //城市
    new MTLLoader().setPath("/").load("city.mtl", function (materials) {
      materials.preload();
      new OBJLoader()
        .setMaterials(materials)
        .setPath("/")
        .load(
          "city.obj",
          (object) => {
            object.position.set(50, 0, 3);
            _this.scene.add(object);
          },
         
        );
    });
    //小丑
    new MTLLoader().setPath("/").load("clown.mtl", function (materials) {
      materials.preload();
      new OBJLoader()
        .setMaterials(materials)
        .setPath("/")
        .load(
          "clown.obj",
          (object) => {
            ObjectElement=object;
            _this.camera.lookAt(object.position);
            _this.model=_this.controlsMesh.addObject(object);
            _this.model.scale.set(1, 1, 1);
            _this.scene.add(_this.model);
          },
         
        );
    });
    


    //灯光
    var light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1, 1, 1);
    _this.scene.add(light);

    var light = new THREE.DirectionalLight(0xffffff);
    light.position.set(-1, -1, -1);
    _this.scene.add(light);

    var light = new THREE.AmbientLight(0xffffff);
    _this.scene.add(light);
  };


  //按下键盘
  keyDownWalk=(event)=>{
    this.toKeyControl(event.keyCode, true);
  }
  //松开键盘
  keyUpWalkStop=(event)=>{
    this.toKeyControl(event.keyCode, false);
  }
  //键盘控制
  toKeyControl=(code, state = false)=>{
    var _this=this;
    var isUpdate = true;
    switch (code) {
        case 87:
          _this.control.top = state;
            break;
        case 83:
          _this.control.bottom = state;
            break;
        case 65:
          _this.control.left = state;
            break;
        case 68:
          _this.control.right = state;
            break;
        default:
            isUpdate = false;
    };
    if (!isUpdate) return false;
  }

  //按键控制
  toKeyControl_move=(code, state = false)=>{
    var _this=this;
    var isUpdate = true;
    switch (code) {
        case 87:
          _this.control.top = state;

          _this.control.left = false;
          _this.control.bottom = false;
          _this.control.right = false;
            break;
        case 83:
          _this.control.bottom = state;

          _this.control.left = false;
          _this.control.top = false;
          _this.control.right = false;
            break;
        case 65:
          _this.control.left = state;

          _this.control.bottom = false;
          _this.control.top = false;
          _this.control.right = false;
            break;
        case 68:
          _this.control.right = state;

          _this.control.bottom = false;
          _this.control.top = false;
          _this.control.left = false;
            break;
        case 123:
          _this.control.right = false;
          _this.control.bottom = false;
          _this.control.top = false;
          _this.control.left = false;
            break;
        default:
            isUpdate = false;
    };
    if (!isUpdate) return false;
  }








  onWindowResize = () => {
    windowHalfX = windowHalfX / 2;
    windowHalfY = windowHalfY / 2;
    this.camera.aspect = windowHalfX / windowHalfY;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(windowHalfX, windowHalfY);
  };
  updateAnimate=(dt)=>{
    if (this.controlsMesh) this.controlsMesh.update(this.control); 
  }

  animate = () => {
    this.requestID = window.requestAnimationFrame(this.animate);
    this.controls.update();
    var delta = this.clock.getDelta();
    this.updateAnimate(delta);
    this.renderer.render(this.scene, this.camera);
  };

  //拖动移动
  /*手接触屏幕*/
  handleTouchStart=(e)=>{
    this.startY = e.touches[0].clientY;
    this.startX = e.touches[0].clientX;
    console.log(this.startY,this.startX);
  }
  /*手在屏幕上移动*/
  handleTouchMove = (e) => {
    this.endY = e.touches[0].clientY;
    this.endX = e.touches[0].clientX;
    this.endPx = e.touches[0].radiusX;
    this.endPy = e.touches[0].radiusY;
    console.log(e);
    let atan=Math.atan2(this.endY-this.startY,this.endX-this.startX)*(180/Math.PI)
    let elementId=this.refs.triangle;
    
    if(atan>=-135 && atan<=-45){//向上移动
      this.toKeyControl_move(87,true);
      elementId.style.bottom="10px"
      elementId.style.removeProperty("left");
      elementId.style.removeProperty("top");
      elementId.style.removeProperty("right");
    }
    if(atan>=45 && atan<=135){
      this.toKeyControl_move(83,true);
      elementId.style.top="10px"
      elementId.style.removeProperty("left");
      elementId.style.removeProperty("bottom");
      elementId.style.removeProperty("right");
    }
    if((atan>135&&atan<=180) || (atan<=-180 && atan<-135)){
      this.toKeyControl_move(65,true);
      elementId.style.right="10px"
      elementId.style.removeProperty("top");
      elementId.style.removeProperty("bottom");
      elementId.style.removeProperty("left");
    }
    if((atan>-45&& atan<0)||(atan>0 && atan<45)){
      this.toKeyControl_move(68,true);
      elementId.style.left="10px"
      elementId.style.removeProperty("top");
      elementId.style.removeProperty("bottom");
      elementId.style.removeProperty("right");
    }
  };
  /*手离开屏幕*/
  handleTouchEnd = (e) => {
    this.toKeyControl_move(123,false);
    let elementId=this.refs.triangle;
    elementId.style.removeProperty("left");
    elementId.style.removeProperty("top");
    elementId.style.removeProperty("bottom");
    elementId.style.removeProperty("right");
  };
  render() {
    return(
    <>
        <div className="triangle">
          <div className="triangle_center">
            <div className="triangle_border_center_father">
              <div ref='triangle' className="triangle_border_center" onTouchStart={this.handleTouchStart} onTouchMove={this.handleTouchMove} onTouchEnd={this.handleTouchEnd}></div>
            </div> 
          </div> 
        </div>
      <div style={style} ref={(ref) => (this.mount = ref)} />
    </>
    )
    
  }
}

class Container extends React.Component {
  state = {};
  render() {
    const { percentComplete = 0 } = this.state;
    return (
      <>
        {
          <App
            
          />
        }
        
      </>
    );
  }
}
const rootElement = document.getElementById("root");
ReactDOM.render(<Container />, rootElement);
