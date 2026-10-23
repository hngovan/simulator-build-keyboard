import * as THREE from 'three'

// Lò xo switch (dùng ở bàn lube)
class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(
    private r: number,
    private h: number,
    private turns: number,
  ) {
    super()
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const a = t * Math.PI * 2 * this.turns
    return target.set(Math.cos(a) * this.r, t * this.h, Math.sin(a) * this.r)
  }
}
export const springGeometry = (r: number, h: number, turns: number, wire: number) =>
  new THREE.TubeGeometry(new Helix(r, h, turns), turns * 24, wire, 6, false)
