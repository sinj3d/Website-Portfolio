const THREE = require('three');

const geo = new THREE.DodecahedronGeometry(2.5, 0);
const posAttr = geo.getAttribute("position");
const idx = geo.getIndex();

function getTriVert(triIndex, vertOffset) {
    const vi = idx ? idx.getX(triIndex + vertOffset) : triIndex + vertOffset;
    return new THREE.Vector3().fromBufferAttribute(posAttr, vi);
}

const triCount = idx ? idx.count / 3 : posAttr.count / 3;
const groups = [];

for (let t = 0; t < triCount; t++) {
    const pa = getTriVert(t * 3, 0);
    const pb = getTriVert(t * 3, 1);
    const pc = getTriVert(t * 3, 2);
    const tn = new THREE.Triangle(pa, pb, pc).getNormal(new THREE.Vector3());

    let matched = false;
    for (const g of groups) {
        if (g.normal.dot(tn) > 0.99) {
            g.verts.push(pa, pb, pc);
            matched = true;
            break;
        }
    }
    if (!matched) {
        groups.push({ verts: [pa, pb, pc], normal: tn.clone() });
    }
}

groups.forEach((g, idx) => {
    const unique = [];
    for (const v of g.verts) {
        if (!unique.some(u => u.distanceTo(v) < 0.001)) {
            unique.push(v);
        }
    }

    const center = new THREE.Vector3();
    unique.forEach(v => center.add(v));
    center.divideScalar(unique.length);

    const up = unique[0].clone().sub(center).normalize();
    const zAxis = g.normal.clone().normalize();
    const xAxis = new THREE.Vector3().crossVectors(up, zAxis).normalize();
    const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();

    const mat = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
    const matInv = mat.clone().invert();

    let isPointUp = false;
    let isPointDown = false;
    unique.forEach((v) => {
        const localV = v.clone().sub(center).applyMatrix4(matInv);
        let angle = Math.atan2(localV.y, localV.x) * 180 / Math.PI;
        if (angle < 0) angle += 360;
        if (Math.abs(angle - 90) < 1 || Math.abs(angle - 270) < 1) {
            // Found a vertical vertex
        }
    });

    const localV = unique[0].clone().sub(center).applyMatrix4(matInv);
    let angle = Math.atan2(localV.y, localV.x) * 180 / Math.PI;
    console.log(`Face ${idx} normal Y: ${g.normal.y.toFixed(2)} -> Vertex 0 Angle: ${angle.toFixed(1)}°`);
});
