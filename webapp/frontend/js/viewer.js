/**
 * viewer.js — Three.js-based STL/GLB 3D viewer for generated CAD models.
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";

let renderer, scene, camera, controls, currentMesh;
let animationId = null;

/**
 * Initialize (or re-initialize) the Three.js scene on the given canvas.
 */
export function initViewer(canvas) {
    disposeViewer();

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0d14);

    // Camera
    camera = new THREE.PerspectiveCamera(
        45,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        2000
    );
    camera.position.set(80, 60, 80);

    // Controls
    controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 5;
    controls.maxDistance = 500;
    controls.target.set(0, 0, 0);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xc8c8e0, 0.6);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(50, 80, 60);
    dirLight1.castShadow = false;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x8888ff, 0.4);
    dirLight2.position.set(-40, 20, -50);
    scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0xff88cc, 0.25);
    dirLight3.position.set(0, -30, 40);
    scene.add(dirLight3);

    // Subtle grid
    const gridHelper = new THREE.GridHelper(200, 40, 0x222233, 0x191925);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Resize handler
    const onResize = () => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // Animation loop
    function animate() {
        animationId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
}

/**
 * Load an STL file from a URL and display it in the viewer.
 */
export function loadSTL(url) {
    if (!scene) return;

    // Remove previous mesh
    if (currentMesh) {
        scene.remove(currentMesh);
        currentMesh.geometry.dispose();
        if (currentMesh.material) currentMesh.material.dispose();
        currentMesh = null;
    }

    const loader = new STLLoader();
    loader.load(
        url,
        (geometry) => {
            geometry.computeVertexNormals();

            // Material: sleek metallic look
            const material = new THREE.MeshPhysicalMaterial({
                color: 0x8090b0,
                metalness: 0.3,
                roughness: 0.45,
                clearcoat: 0.15,
                clearcoatRoughness: 0.4,
                side: THREE.DoubleSide,
            });

            const mesh = new THREE.Mesh(geometry, material);
            currentMesh = mesh;

            // Center the model
            geometry.computeBoundingBox();
            const bb = geometry.boundingBox;
            const center = new THREE.Vector3();
            bb.getCenter(center);
            mesh.position.sub(center);

            scene.add(mesh);

            // Fit camera to model
            const size = new THREE.Vector3();
            bb.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            const dist = maxDim * 2;

            camera.position.set(dist * 0.7, dist * 0.5, dist * 0.7);
            controls.target.set(0, 0, 0);
            controls.update();
        },
        undefined,
        (err) => {
            console.error("STL load error:", err);
        }
    );
}

/**
 * Reset the camera to the default view.
 */
export function resetView() {
    if (!camera || !controls) return;
    camera.position.set(80, 60, 80);
    controls.target.set(0, 0, 0);
    controls.update();
}

/**
 * Clean up Three.js resources.
 */
export function disposeViewer() {
    if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    if (currentMesh) {
        currentMesh.geometry?.dispose();
        currentMesh.material?.dispose();
        currentMesh = null;
    }
    if (renderer) {
        renderer.dispose();
        renderer = null;
    }
    scene = null;
    camera = null;
    controls = null;
}
