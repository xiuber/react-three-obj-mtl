import React, { Component } from "react";
import ReactDOM from "react-dom";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
const style = { height: window.innerHeight - 50, width: window.innerWidth };
let windowHalfX = window.innerWidth;
let windowHalfY = window.innerHeight;
let ObjectElement = null;
class App extends Component {
  componentDidMount() {
    this.sceneSetup(); //init
    this.animate();
    window.addEventListener("resize", this.onWindowResize);
  }
  componentWillUnmount() {
    window.removeEventListener("resize", this.onWindowResize);
    window.cancelAnimationFrame(this.requestID);
    this.controls.dispose();
  }
  sceneSetup = () => {
    let _this = this;
    this.camera = new THREE.PerspectiveCamera(
      75,
      windowHalfX / windowHalfY,
      0.1,
      1000
    );
    this.camera.position.set(300, 2, 10);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(255, 255, 255, 0.4);
    const ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
    this.scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    this.camera.add(pointLight);
    this.scene.add(this.camera);
    const onProgress = function (xhr) {
      if (xhr.lengthComputable) {
        _this.percentComplete = Math.ceil((xhr.loaded / xhr.total) * 100);
        console.log(_this.percentComplete + "% loaded");
        _this.props.onProgress(_this.percentComplete);
      }
    };
    new MTLLoader().setPath("/").load("Plate.mtl", function (materials) {
      materials.preload();
      new OBJLoader()
        .setMaterials(materials)
        .setPath("/")
        .load(
          "Plate.obj",
          (object) => {
            _this.scene.add(object);
            ObjectElement = object;
          },
          onProgress
        );
    });
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(windowHalfX, windowHalfY);
    this.mount.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.update();
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
  };
  onWindowResize = () => {
    windowHalfX = windowHalfX / 2;
    windowHalfY = windowHalfY / 2;
    this.camera.aspect = windowHalfX / windowHalfY;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(windowHalfX, windowHalfY);
  };
  animate = () => {
    if (ObjectElement !== null) {
      ObjectElement.rotation.y += 0.006;
    }
    this.renderer.render(this.scene, this.camera);
    this.requestID = window.requestAnimationFrame(this.animate);
  };
  render() {
    return <div style={style} ref={(ref) => (this.mount = ref)} />;
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
            onProgress={(percentComplete) => this.setState({ percentComplete })}
          />
        }
        {percentComplete === 100 && <div>success!</div>}
        {percentComplete !== 100 && (
          <div>Loading Model: {percentComplete}%</div>
        )}
      </>
    );
  }
}
const rootElement = document.getElementById("root");
ReactDOM.render(<Container />, rootElement);
