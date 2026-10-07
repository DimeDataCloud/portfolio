// Scene, camera, renderer, and a minimal manual post pass
// (scene -> render target -> fullscreen grain/vignette composite).

import * as THREE from 'three';
import { postVertex, postFragment } from '../shaders/postShader.js';

export class Stage {
  constructor(canvas, viewport) {
    this.viewport = viewport;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(this.fov(), viewport.w / viewport.h, 0.1, 60);
    this.camera.position.set(0, 0, 8.6);
    this.cameraBase = this.camera.position.clone();

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x0a0a0a, 1);

    // post pass
    this.target = new THREE.WebGLRenderTarget(1, 1, { samples: 2 });
    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postMaterial = new THREE.ShaderMaterial({
      vertexShader: postVertex,
      fragmentShader: postFragment,
      uniforms: {
        uScene: { value: this.target.texture },
        uTime: { value: 0 },
        uGrain: { value: 0.045 },
        uRes: { value: new THREE.Vector2(1, 1) },
      },
    });
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMaterial));

    this.resize();
  }

  fov() {
    return this.viewport.w < 700 ? 46 : 35;
  }

  resize() {
    const { w, h } = this.viewport;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.camera.aspect = w / h;
    this.camera.fov = this.fov();
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.target.setSize(w * dpr, h * dpr);
    this.postMaterial.uniforms.uRes.value.set(w * dpr, h * dpr);
  }

  /** Parallax: camera leans toward the pointer. */
  updateCamera(pointer, dt) {
    const ease = 1 - Math.pow(0.01, dt);
    const tx = this.cameraBase.x + pointer.x * 0.35;
    const ty = this.cameraBase.y + pointer.y * 0.22;
    this.camera.position.x += (tx - this.camera.position.x) * ease;
    this.camera.position.y += (ty - this.camera.position.y) * ease;
    this.camera.lookAt(0, -0.5, 0);
  }

  render(elapsed) {
    this.postMaterial.uniforms.uTime.value = elapsed;
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCamera);
  }

  dispose() {
    this.target.dispose();
    this.postMaterial.dispose();
    this.renderer.dispose();
  }
}
