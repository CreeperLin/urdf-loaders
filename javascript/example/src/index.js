/* globals */
import * as THREE from 'three';
import { registerDragEvents } from './dragAndDrop.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import URDFManipulator from '../../src/urdf-manipulator-element.js';

customElements.define('urdf-viewer', URDFManipulator);

// declare these globally for the sake of the example.
// Hack to make the build work with webpack for now.
// TODO: Remove this once modules or parcel is being used
const viewer = document.querySelector('urdf-viewer');

const limitsToggle = document.getElementById('ignore-joint-limits');
const collisionToggle = document.getElementById('collision-toggle');
const visualToggle = document.getElementById('visual-toggle');
const axisToggle = document.getElementById('axis-toggle');
const resetJointsButton = document.getElementById('reset-joints');
const radiansToggle = document.getElementById('radians-toggle');
const autocenterToggle = document.getElementById('autocenter-toggle');
const upSelect = document.getElementById('up-select');
const sliderList = document.querySelector('#controls ul');
const linkSliderList = document.querySelector('#controls2 ul');
const controlsel = document.getElementById('controls');
const control2sel = document.getElementById('controls2');
const controlsToggle = document.getElementById('toggle-controls');
const animToggle = document.getElementById('do-animate');
const hideFixedToggle = document.getElementById('hide-fixed');
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 1 / DEG2RAD;
let sliders = {};
let linkSliders = {};

// Global Functions
const setColor = color => {

    document.body.style.backgroundColor = color;
    viewer.highlightColor = '#' + (new THREE.Color(0xffffff)).lerp(new THREE.Color(color), 0.35).getHexString();

};

// Events
// toggle checkbox
limitsToggle.addEventListener('click', () => {
    limitsToggle.classList.toggle('checked');
    viewer.ignoreLimits = limitsToggle.classList.contains('checked');
});

radiansToggle.addEventListener('click', () => {
    radiansToggle.classList.toggle('checked');
    Object
        .values(sliders)
        .forEach(sl => sl.update());
});

collisionToggle.addEventListener('click', () => {
    collisionToggle.classList.toggle('checked');
    viewer.showCollision = collisionToggle.classList.contains('checked');
});
visualToggle.addEventListener('click', () => {
    visualToggle.classList.toggle('checked');
    viewer.showVisual = visualToggle.classList.contains('checked');
});
axisToggle.addEventListener('click', () => {
    axisToggle.classList.toggle('checked');
    viewer.showAxis = axisToggle.classList.contains('checked');
});
resetJointsButton.addEventListener('click', () => {
    const resetJointValues = viewer.angles;
    for (const name in resetJointValues) resetJointValues[name] = 0;
    viewer.setJointValues(resetJointValues);
});

autocenterToggle.addEventListener('click', () => {
    autocenterToggle.classList.toggle('checked');
    viewer.noAutoRecenter = !autocenterToggle.classList.contains('checked');
});

hideFixedToggle.addEventListener('click', () => {
    hideFixedToggle.classList.toggle('checked');

    const hideFixed = hideFixedToggle.classList.contains('checked');
    if (hideFixed) controlsel.classList.add('hide-fixed');
    else controlsel.classList.remove('hide-fixed');

});

upSelect.addEventListener('change', () => viewer.up = upSelect.value);

controlsToggle.addEventListener('click', () => {
    controlsel.classList.toggle('hidden');
    control2sel.classList.toggle('hidden');
});


function updateSliders() {

    Object
        .values(sliders)
        .forEach(sl => sl.update());
    Object
        .values(linkSliders)
        .forEach(sl => sl.update());

}

// watch for urdf changes
viewer.addEventListener('urdf-change', () => {

    Object
        .values(sliders)
        .forEach(sl => sl.remove());
    sliders = {};
    Object
        .values(linkSliders)
        .forEach(sl => sl.remove());
    linkSliders = {};

});

viewer.addEventListener('ignore-limits-change', () => {

    updateSliders();

});

viewer.addEventListener('angle-change', e => {

    // if (sliders[e.detail]) sliders[e.detail].update();
    updateSliders();

});

viewer.addEventListener('joint-mouseover', e => {
    const jointName = e.detail;
    const joint = viewer.robot.joints[jointName];
    const child = joint.children[0];
    const parent = joint.parent;

    // highlight the joint
    const j = document.querySelector(`li[joint-name="${ jointName }"]`);
    if (j) j.setAttribute('robot-hovered', true);
    // highlight the link
    const l = document.querySelector(`li[link-name="${ child.name }"]`);
    if (l) l.setAttribute('robot-hovered', true);
    // highlight the parent link
    const pl = document.querySelector(`li[link-name="${ parent.name }"]`);
    if (pl) pl.setAttribute('robot-hovered', true);
});

viewer.addEventListener('joint-mouseout', e => {
    const jointName = e.detail;
    const joint = viewer.robot.joints[jointName];
    const child = joint.children[0];
    const parent = joint.parent;

    // highlight the joint
    const j = document.querySelector(`li[joint-name="${ jointName }"]`);
    if (j) j.removeAttribute('robot-hovered');
    // highlight the link
    const l = document.querySelector(`li[link-name="${ child.name }"]`);
    if (l) l.removeAttribute('robot-hovered');
    // highlight the parent link
    const pl = document.querySelector(`li[link-name="${ parent.name }"]`);
    if (pl) pl.removeAttribute('robot-hovered');

});

let originalNoAutoRecenter;
viewer.addEventListener('manipulate-start', e => {

    const j = document.querySelector(`li[joint-name="${ e.detail }"]`);
    if (j) {
        j.scrollIntoView({ block: 'nearest' });
        window.scrollTo(0, 0);
    }

    originalNoAutoRecenter = viewer.noAutoRecenter;
    viewer.noAutoRecenter = true;

});

viewer.addEventListener('manipulate-end', e => {

    viewer.noAutoRecenter = originalNoAutoRecenter;

});

function getFloatCtrl(o) { return(parseFloat(o.value)); }
function getIntCtrl(o) { return(parseInt(o.value)); }
function mouseCtrl(ctrl) {
    var getCtrl = getFloatCtrl;
    var setCtrl = scaledFloatCtrl;
    var startpos; // starting mouse position
    var startval; // starting input control value
    // find the input element to allow mouse control on
    // on mousedown start tracking mouse relative position
    var min = ctrl.min;
    var max = ctrl.max;
    ctrl.onmousedown = function(e) {
      startpos = e.clientX;
      startval = getCtrl(ctrl);
      if (isNaN(startval)) startval = 0;
      document.onmousemove = function(e) {
        var delta = Math.ceil(e.clientX - startpos);      
        setCtrl(ctrl, startval, delta, min, max);
      };
      document.onmouseup = function() {
        document.onmousemove = null; // remove mousemove to stop tracking
      };
    };
  /*
  ctrl.addEventListener('touchstart', function(e) {
    e.preventDefault();
    startpos = e.touches[0].pageX;
    startval = getCtrl(ctrl);
  }, false);
  ctrl.addEventListener('touchmove', function(e) {
    e.preventDefault();
    var delta = Math.ceil(e.touches[0].clientX - startpos);        
    setCtrl(ctrl, startval, delta);
  }, false);
  */
}

// takes current value and relative mouse coordinate as arguments
function scaledFloatCtrl(o, i, x, min, max) {
    console.log('scaledFloatCtrl', o, i, x, min, max);
    var incVal = Math.sign(x) * Math.pow(Math.abs(x) * 0.01, 1.6);
    if (isNaN(incVal)) incVal = 0;
    var newVal = i + incVal;
    let dz = 0.01 * (max - min);
    if (min !== undefined && newVal < min) newVal = min;
    if (max !== undefined && newVal > max) newVal = max;
    if (Math.abs(incVal)>dz) o.value = newVal; // allow small deadzone
}

// create the sliders
viewer.addEventListener('urdf-processed', () => {
    const resetJointValues = viewer.angles;
    for (const name in resetJointValues) resetJointValues[name] = 0;
    viewer.setJointValues(resetJointValues);
    const r = viewer.robot;
    const world = viewer.world;
    world.updateMatrixWorld();
    Object
        .keys(r.links)
        .map(key => r.links[key])
        .forEach(link => {
            const li = document.createElement('li');
            li.innerHTML =
            `
            <span title="${ link.name }">${ link.name }</span>
            <input class="link_x" type="number" step="0.01" />
            <input class="link_y" type="number" step="0.01" />
            <input class="link_z" type="number" step="0.01" />
            <input class="link_rx" type="number" step="0.01" />
            <input class="link_ry" type="number" step="0.01" />
            <input class="link_rz" type="number" step="0.01" />
            `;
            li.setAttribute('link-name', link.name);
            linkSliderList.appendChild(li);
            // update the joint display
            // const slider = li.querySelector('input[type="range"]');
            // const input = li.querySelector('input[type="number"]');
            const inputX = li.querySelector('input.link_x[type="number"]');
            const inputY = li.querySelector('input.link_y[type="number"]');
            const inputZ = li.querySelector('input.link_z[type="number"]');
            const inputRX = li.querySelector('input.link_rx[type="number"]');
            const inputRY = li.querySelector('input.link_ry[type="number"]');
            const inputRZ = li.querySelector('input.link_rz[type="number"]');
            let max_v = 2;
            let min_v = -2;
            inputX.min = min_v;
            inputX.max = max_v;
            inputY.min = min_v;
            inputY.max = max_v;
            inputZ.min = min_v;
            inputZ.max = max_v;
            inputRX.min = -Math.PI;
            inputRX.max = Math.PI;
            inputRY.min = -Math.PI;
            inputRY.max = Math.PI;
            inputRZ.min = -Math.PI;
            inputRZ.max = Math.PI;
            mouseCtrl(inputX);
            mouseCtrl(inputY);
            mouseCtrl(inputZ);
            li.update = () => {
                let mat = link.matrixWorld.elements;
                let pos = [mat[12], mat[14], mat[13]];
                inputX.value = pos[0].toFixed(4);
                inputY.value = pos[1].toFixed(4);
                inputZ.value = pos[2].toFixed(4);
                let euler = new THREE.Euler();
                euler.setFromRotationMatrix(link.matrixWorld, 'XYZ');
                let worldRot = world.rotation;
                // let rot2 = [euler.x, euler.y, euler.z];
                let rot2 = [euler.x - worldRot.x, euler.y - worldRot.y, euler.z - worldRot.z];
                inputRX.value = rot2[0].toFixed(4);
                inputRY.value = rot2[1].toFixed(4);
                inputRZ.value = rot2[2].toFixed(4);
            };
            inputX.addEventListener('change', () => {
                li.update();
            });
            inputY.addEventListener('change', () => {
                li.update();
            });
            inputZ.addEventListener('change', () => {
                li.update();
            });
            li.update();
            linkSliders[link.name] = li;
        });
    // create the joint sliders
    Object
        .keys(r.joints)
        // .sort((a, b) => {

        //     const da = a.split(/[^\d]+/g).filter(v => !!v).pop();
        //     const db = b.split(/[^\d]+/g).filter(v => !!v).pop();

        //     if (da !== undefined && db !== undefined) {
        //         const delta = parseFloat(da) - parseFloat(db);
        //         if (delta !== 0) return delta;
        //     }

        //     if (a > b) return 1;
        //     if (b > a) return -1;
        //     return 0;

        // })
        .map(key => r.joints[key])
        .forEach(joint => {

            const li = document.createElement('li');
            li.innerHTML =
            `
            <span title="${ joint.name }">${ joint.name }</span>
            <input type="range" value="0" step="0.0001"/>
            <input type="number" step="0.1" />
            `;
            li.setAttribute('joint-type', joint.jointType);
            li.setAttribute('joint-name', joint.name);

            sliderList.appendChild(li);

            // update the joint display
            const slider = li.querySelector('input[type="range"]');
            const input = li.querySelector('input[type="number"]');
            li.update = () => {
                const degMultiplier = radiansToggle.classList.contains('checked') ? 1.0 : RAD2DEG;
                let angle = joint.angle;

                if (joint.jointType === 'revolute' || joint.jointType === 'continuous') {
                    angle *= degMultiplier;
                }

                if (Math.abs(angle) > 1) {
                    angle = angle.toFixed(1);
                } else {
                    angle = angle.toPrecision(2);
                }

                input.value = parseFloat(angle);

                // directly input the value
                slider.value = joint.angle;

                if (viewer.ignoreLimits || joint.jointType === 'continuous') {
                    slider.min = -6.28;
                    slider.max = 6.28;

                    input.min = -6.28 * degMultiplier;
                    input.max = 6.28 * degMultiplier;
                } else {
                    slider.min = joint.limit.lower;
                    slider.max = joint.limit.upper;

                    input.min = joint.limit.lower * degMultiplier;
                    input.max = joint.limit.upper * degMultiplier;
                }
            };

            switch (joint.jointType) {

                case 'continuous':
                case 'prismatic':
                case 'revolute':
                    break;
                default:
                    li.update = () => {};
                    input.remove();
                    slider.remove();

            }

            slider.addEventListener('input', () => {
                viewer.setJointValue(joint.name, slider.value);
                li.update();
            });

            input.addEventListener('change', () => {
                const degMultiplier = radiansToggle.classList.contains('checked') ? 1.0 : DEG2RAD;
                viewer.setJointValue(joint.name, input.value * degMultiplier);
                li.update();
            });

            li.update();

            sliders[joint.name] = li;

        });

});

document.addEventListener('WebComponentsReady', () => {

    viewer.loadMeshFunc = (path, manager, done) => {

        const ext = path.split(/\./g).pop().toLowerCase();
        switch (ext) {

            case 'gltf':
            case 'glb':
                new GLTFLoader(manager).load(
                    path,
                    result => done(result.scene),
                    null,
                    err => done(null, err),
                );
                break;
            case 'obj':
                new OBJLoader(manager).load(
                    path,
                    result => done(result),
                    null,
                    err => done(null, err),
                );
                break;
            case 'dae':
                new ColladaLoader(manager).load(
                    path,
                    result => done(result.scene),
                    null,
                    err => done(null, err),
                );
                break;
            case 'stl':
                new STLLoader(manager).load(
                    path,
                    result => {
                        const material = new THREE.MeshPhongMaterial();
                        const mesh = new THREE.Mesh(result, material);
                        done(mesh);
                    },
                    null,
                    err => done(null, err),
                );
                break;

        }

    };

    document.querySelector('li[urdf]').dispatchEvent(new Event('click'));

    if (/javascript\/example\/bundle/i.test(window.location)) {
        viewer.package = '../../../urdf';
    }

    registerDragEvents(viewer, () => {
        setColor('#263238');
        animToggle.classList.remove('checked');
        updateList();
    });

});

// init 2D UI and animation
const updateAngles = () => {

    if (!viewer.setJointValue) return;

    // reset everything to 0 first
    const resetJointValues = viewer.angles;
    for (const name in resetJointValues) resetJointValues[name] = 0;
    viewer.setJointValues(resetJointValues);
    let names = Object.keys(resetJointValues);
    names = names.filter(name => {
        const joint = viewer.robot.joints[name];
        return joint.jointType === 'revolute' || joint.jointType === 'continuous';
    });

    const time = Date.now() / 300;
    let cur_names = [names[Math.floor(((time * (1 / (Math.PI * 2))) % names.length))]];

    const ratio = Math.max(0, Math.sin(time % (Math.PI) * 2));
    for (const name of cur_names) {
        viewer.setJointValue(name, THREE.MathUtils.lerp(-30, 30, ratio) * DEG2RAD);
    }

};

const updateLoop = () => {

    if (animToggle.classList.contains('checked')) {
        updateAngles();
    }

    requestAnimationFrame(updateLoop);

};

const updateList = () => {

    document.querySelectorAll('#urdf-options li[urdf]').forEach(el => {

        el.addEventListener('click', e => {

            const urdf = e.target.getAttribute('urdf');
            const color = e.target.getAttribute('color') || '#263238';

            viewer.up = '+Z';
            document.getElementById('up-select').value = viewer.up;
            viewer.urdf = urdf;
            // animToggle.classList.add('checked');
            setColor(color);

        });

    });

};

updateList();

document.addEventListener('WebComponentsReady', () => {

    animToggle.addEventListener('click', () => animToggle.classList.toggle('checked'));

    // stop the animation if user tried to manipulate the model
    viewer.addEventListener('manipulate-start', e => animToggle.classList.remove('checked'));
    // viewer.addEventListener('urdf-processed', e => updateAngles());
    updateLoop();
    viewer.camera.position.set(-5.5, 3.5, 5.5);

});
