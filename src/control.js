import * as THREE from "three";
class MeshControl {
    constructor(camera, controls,scene) {

        this.camera = camera;

        this.controls = controls;
        this.scene = scene;

        this.controlObj = null;

        this.dt = 0;

        this.control = {
            top: false,
            bottom: false,
            left: false,
            right: false
        }
 
        var material = new THREE.LineBasicMaterial({
            color: 0x0000ff
        });

        var points = [];

        var geometry = new THREE.BufferGeometry().setFromPoints(points);

        // this.line = new THREE.LineSegments(geometry, material);
        // this.scene.add(this.line);
    }
    /**
     * [addObject 添加需要操控的对象]
     */
    addObject(obj) {
        this.controlObj = new THREE.Group();


        // this.controlObj.position.z += 52;
        this.controlObj.add(obj);

        var box = new THREE.Box3();
        box.expandByObject(this.controlObj);
        const v3 = new THREE.Vector3()
        const size = box.getSize(v3); 

        

        this.controlObj._size = size;
        this.controlObj._box = box;

        const around = this.getAroundVec(this.controlObj.position, this.camera);
        this.controlObj._around = around;
        this.controlObj._history = around.bottom;
        this.controlObj._len = 0;

        return this.controlObj;
    }

    update(opts, dt) {
        // console.log(this.controlObj);
        const keyNum = Object.values(opts).filter((elem) => elem).length; // 按键数量
        if (keyNum === 0) return false;
        if (!this.controlObj) return false;
        // 平面朝向
        const current = this.controlObj.position;

        const center = new THREE.Vector3();
        this.controlObj._box.getCenter(center);  

        // 只有一种按键时
        const _history = this.controlObj._history.clone();
        const len = current.distanceTo(_history);
        let vec = current.clone();
        if (keyNum === 1) {

            if (opts.top) {
                vec = current.clone().lerp(_history, - 0.2 / len);
                this.controlObj.rotation.y = 0;
            }

            if (opts.bottom) {
                const history = current.clone().lerp(_history, 0.2 / len + 1);
                vec = current.clone().lerp(_history, 0.2/ len);
                this.controlObj._history = history.clone();
                // this.controlObj.rotation.y = THREE.MathUtils.degToRad(90)
            }

            if (opts.left || opts.right) {
                const rad = opts.left ? 90 : 270;
                vec = this.updatePosition(rad, current, _history); 
                // this.controlObj.rotation.y = THREE.MathUtils.degToRad(-rad + 90);
            }

        }
        if (keyNum > 1) {

            if ((opts.top && opts.left)
                || (opts.top && opts.right)
                || (opts.bottom && opts.left)
                || (opts.bottom && opts.right)
            ) {
                const rad = this.getRad(opts);
                vec = this.updatePosition(rad, current, _history); 
                this.controlObj.rotation.y = THREE.MathUtils.degToRad(-rad + 180)
            } 
        }
 
        this.controlObj.position.copy(vec); 

        this.updateCamera(vec, this.controls);
    }

    getAroundVec(current, camera) {
        const currentV2 = new THREE.Vector2(current.x, current.z);

        const lineLen = Math.max.apply(null, Object.values(this.controlObj._size));
        // 前
        let lookVec = new THREE.Vector3(camera.position.x, current.y, camera.position.z);

        const totalLen = lookVec.distanceTo(current);
        // 后
        const lookDst = current.clone().lerp(lookVec, - lineLen / totalLen);

        lookVec = current.clone().lerp(lookDst, - 1)
        // 右侧
        const lookRight = (new THREE.Vector2(lookDst.x, lookDst.z)).clone().rotateAround(currentV2, Math.PI / 2);
        const lookRightVec = new THREE.Vector3(lookRight.x, current.y, lookRight.y);
        // 左侧
        const lookLeftVec = current.clone().lerp(lookRightVec, -1);

        return {
            top: lookDst, // 前
            bottom: lookVec, // 后
            left: lookLeftVec, // 坐
            right: lookRightVec, // 右
            length: totalLen // 距离中心店长度
        }
    }

    getRad(opts) {
        let rad = 0;
        if (opts.top && opts.left) rad = 135;
        if (opts.top && opts.right) rad = 225;
        if (opts.bottom && opts.left) rad = 45;
        if (opts.bottom && opts.right) rad = 315;
        return rad;
    }

    updatePosition(rad, current, history) {

        const _c = new THREE.Vector2(current.x, current.z);
        const _h = new THREE.Vector2(history.x, history.z);
        const _d = _h.clone().rotateAround(_c, THREE.MathUtils.degToRad(rad));
        const _ds = new THREE.Vector3(_d.x, current.y, _d.y);
        const tl = current.distanceTo(_ds);
        const vec = current.clone().lerp(_ds, 0.2 / tl);
        const _x1 = vec.clone().sub(current);
        this.controlObj._history.add(_x1)

        return vec;
    }

    updateCamera(p, controls) {

        controls.target.copy(p);
    }
}
export { MeshControl }