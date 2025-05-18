/**
 * Grid map for the soft-body car simulation
 * Inspired by BeamNG.drive's grid map
 */

class GridMap {
    constructor(scene, physicsWorld, size = 100, divisions = 32) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.size = size;
        this.divisions = divisions;
        
        // Initialize map
        this.init();
    }
    
    init() {
        // Create base grid
        this.createBaseGrid();
        
        // Create terrain with some variations
        this.createTerrain();
        
        // Add ramps and obstacles
        this.addObstacles();
        
        // Add lighting
        this.addLighting();
    }
    
    createBaseGrid() {
        // Create a grid helper for visual reference
        const gridHelper = new THREE.GridHelper(this.size, this.divisions, 0x444444, 0x222222);
        gridHelper.receiveShadow = true;
        this.scene.add(gridHelper);
        
        // Create grid texture
        const gridTexture = createGridTexture(32);
        gridTexture.wrapS = THREE.RepeatWrapping;
        gridTexture.wrapT = THREE.RepeatWrapping;
        gridTexture.repeat.set(this.size / 4, this.size / 4);
        
        // Create ground plane
        const groundGeometry = new THREE.PlaneGeometry(this.size, this.size, this.divisions, this.divisions);
        groundGeometry.rotateX(-Math.PI / 2);
        
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            map: gridTexture,
            roughness: 1.0,
            metalness: 0.0
        });
        
        this.groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        this.groundMesh.receiveShadow = true;
        this.scene.add(this.groundMesh);
        
        // Create physics ground body
        this.groundBody = this.physicsWorld.createGround(this.size);
    }
    
    createTerrain() {
        // Create a heightmap for more interesting terrain
        const terrainSize = this.divisions;
        const terrainData = this.generateTerrain(terrainSize);
        
        // Create terrain geometry from heightmap
        const geometry = new THREE.PlaneGeometry(this.size, this.size, terrainSize - 1, terrainSize - 1);
        geometry.rotateX(-Math.PI / 2);
        
        // Apply heightmap to geometry
        const vertices = geometry.attributes.position.array;
        let minHeight = Infinity;
        let maxHeight = -Infinity;
        
        for (let i = 0, j = 0; i < terrainData.length; i++, j += 3) {
            const height = terrainData[i];
            vertices[j + 1] = height; // Y is up in Three.js
            
            minHeight = Math.min(minHeight, height);
            maxHeight = Math.max(maxHeight, height);
        }
        
        // Update geometry
        geometry.computeVertexNormals();
        geometry.attributes.position.needsUpdate = true;
        
        // Create terrain mesh
        const material = new THREE.MeshStandardMaterial({
            color: 0x3D3D3D,
            roughness: 1.0,
            metalness: 0.0,
            wireframe: false
        });
        
        this.terrainMesh = new THREE.Mesh(geometry, material);
        this.terrainMesh.receiveShadow = true;
        this.terrainMesh.castShadow = true;
        
        // Add terrain physics
        this.terrainBody = this.physicsWorld.createTerrainBody(
            terrainData, 
            terrainSize, 
            terrainSize, 
            minHeight, 
            maxHeight
        );
        
        // By default, we'll hide the terrain and use the flat grid
        // User can toggle terrain with a button
        this.terrainMesh.visible = false;
        this.scene.add(this.terrainMesh);
    }
    
    addObstacles() {
        // Add various obstacles like ramps, barriers, jumps
        this.obstacles = [];
        
        // Add ramps
        this.addRamp(20, 0, 0, 0);
        this.addRamp(-20, 0, 180, 0);
        this.addRamp(0, 20, 90, 0);
        this.addRamp(0, -20, 270, 0);
        
        // Add some boxes
        for (let i = 0; i < 10; i++) {
            const size = randomFloat(0.5, 2);
            const x = randomFloat(-this.size / 3, this.size / 3);
            const z = randomFloat(-this.size / 3, this.size / 3);
            this.addBox(x, z, size);
        }
    }
    
    addLighting() {
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);
        
        // Add directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        
        // Set up shadow properties for the light
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        
        this.scene.add(directionalLight);
    }
    
    generateTerrain(size) {
        // Generate heightmap using Perlin noise
        const heightData = new Float32Array(size * size);
        const scale = 30;
        const roughness = 0.5;
        const maxHeight = 3;
        
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                // Ensure the edges are flat (0 height)
                const edgeDistance = Math.min(
                    Math.min(i, size - i - 1),
                    Math.min(j, size - j - 1)
                ) / (size / 8);
                
                const edgeFactor = Math.min(1, edgeDistance);
                
                if (edgeFactor > 0) {
                    // Normal perlin noise terrain
                    // Using a simplified function as a placeholder for actual Perlin noise
                    const nx = i / size - 0.5;
                    const ny = j / size - 0.5;
                    
                    // Simplified Perlin-like noise (replace with better noise function)
                    let height = Math.sin(nx * scale) * Math.cos(ny * scale) * roughness;
                    height += Math.sin(nx * scale * 2) * Math.cos(ny * scale * 2) * roughness / 2;
                    height += Math.sin(nx * scale * 4) * Math.cos(ny * scale * 4) * roughness / 4;
                    
                    height *= maxHeight * edgeFactor;
                    
                    // Make a flat area in the center
                    const distFromCenter = Math.sqrt(nx * nx + ny * ny) * 2.5;
                    if (distFromCenter < 0.25) {
                        height = 0;
                    } else if (distFromCenter < 0.5) {
                        const t = (distFromCenter - 0.25) / 0.25;
                        height *= t;
                    }
                    
                    heightData[i * size + j] = height;
                } else {
                    heightData[i * size + j] = 0; // Flat at edges
                }
            }
        }
        
        // Add some specific features
        this.addTerrainFeatures(heightData, size);
        
        return heightData;
    }
    
    addTerrainFeatures(heightData, size) {
        // Add a hill
        this.addHill(heightData, size, size * 0.7, size * 0.7, size * 0.1, 2);
        
        // Add a crater
        this.addCrater(heightData, size, size * 0.3, size * 0.3, size * 0.1, 1.5);
        
        // Add a ridge
        this.addRidge(heightData, size, size * 0.6, size * 0.2, size * 0.6, size * 0.8, 1);
    }
    
    addHill(heightData, size, centerX, centerZ, radius, height) {
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const dx = (i - centerX) / size;
                const dz = (j - centerZ) / size;
                const dist = Math.sqrt(dx * dx + dz * dz) / (radius / size);
                
                if (dist < 1) {
                    // Use a smooth bell curve for the hill
                    const factor = 1 - dist * dist;
                    heightData[i * size + j] += height * factor;
                }
            }
        }
    }
    
    addCrater(heightData, size, centerX, centerZ, radius, depth) {
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const dx = (i - centerX) / size;
                const dz = (j - centerZ) / size;
                const dist = Math.sqrt(dx * dx + dz * dz) / (radius / size);
                
                if (dist < 1) {
                    // Crater with raised edges
                    const factor = dist < 0.8 ? -1 + dist : (1 - dist) * 5;
                    heightData[i * size + j] += depth * factor;
                }
            }
        }
    }
    
    addRidge(heightData, size, startX, startZ, endX, endZ, height) {
        const length = Math.sqrt((endX - startX) * (endX - startX) + (endZ - startZ) * (endZ - startZ));
        const dx = (endX - startX) / length;
        const dz = (endZ - startZ) / length;
        
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                // Find closest point on line segment
                const t = ((i - startX) * dx + (j - startZ) * dz) / length;
                
                if (t >= 0 && t <= 1) {
                    const closestX = startX + t * (endX - startX);
                    const closestZ = startZ + t * (endZ - startZ);
                    
                    const distance = Math.sqrt((i - closestX) * (i - closestX) + (j - closestZ) * (j - closestZ)) / (size / 20);
                    
                    if (distance < 1) {
                        const factor = 1 - distance * distance;
                        heightData[i * size + j] += height * factor;
                    }
                }
            }
        }
    }
    
    addRamp(x, z, rotation, height = 0) {
        // Create a ramp
        const rampLength = 10;
        const rampWidth = 5;
        const rampHeight = 2;
        
        // Create ramp mesh
        const rampGeometry = new THREE.BoxGeometry(rampLength, rampHeight, rampWidth);
        rampGeometry.translate(0, rampHeight / 2, 0);
        
        // Create a shape for the triangular side of the ramp
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(rampLength, 0);
        shape.lineTo(0, rampHeight);
        shape.lineTo(0, 0);
        
        const extrudeSettings = {
            steps: 1,
            depth: rampWidth,
            bevelEnabled: false
        };
        
        const rampGeometry2 = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        rampGeometry2.rotateY(Math.PI / 2);
        rampGeometry2.translate(-rampLength / 2, 0, -rampWidth / 2);
        
        const rampMaterial = new THREE.MeshStandardMaterial({
            color: 0x999999,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const rampMesh = new THREE.Mesh(rampGeometry2, rampMaterial);
        rampMesh.castShadow = true;
        rampMesh.receiveShadow = true;
        
        rampMesh.position.set(x, height, z);
        rampMesh.rotation.y = degToRad(rotation);
        
        this.scene.add(rampMesh);
        
        // Create ramp physics
        const rampShape = new CANNON.Box(new CANNON.Vec3(rampLength / 2, rampHeight / 2, rampWidth / 2));
        const rampBody = new CANNON.Body({
            mass: 0,
            material: this.physicsWorld.groundMaterial,
            shape: rampShape
        });
        
        rampBody.position.set(x, height + rampHeight / 2, z);
        rampBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), degToRad(rotation));
        
        // Add to physics world
        this.physicsWorld.addBody(rampBody, rampMesh);
        this.obstacles.push({ mesh: rampMesh, body: rampBody });
    }
    
    addBox(x, z, size) {
        // Create box mesh
        const boxGeometry = new THREE.BoxGeometry(size, size, size);
        
        const boxMaterial = new THREE.MeshStandardMaterial({
            color: 0x7777aa,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
        boxMesh.castShadow = true;
        boxMesh.receiveShadow = true;
        boxMesh.position.set(x, size / 2, z);
        
        this.scene.add(boxMesh);
        
        // Create box physics
        const boxShape = new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2));
        const boxBody = new CANNON.Body({
            mass: size * 10, // Mass proportional to size
            material: this.physicsWorld.groundMaterial,
            shape: boxShape
        });
        
        boxBody.position.set(x, size / 2, z);
        
        // Add to physics world
        this.physicsWorld.addBody(boxBody, boxMesh);
        this.obstacles.push({ mesh: boxMesh, body: boxBody });
    }
    
    toggleTerrain() {
        this.terrainMesh.visible = !this.terrainMesh.visible;
        this.groundMesh.visible = !this.terrainMesh.visible;
        
        // Also toggle physics bodies if needed
        // This would require more complex physics setup to fully implement
    }
    
    update(deltaTime) {
        // Update obstacle physics if needed
        for (const obstacle of this.obstacles) {
            if (obstacle.body.mass > 0 && obstacle.mesh) {
                // Update movable obstacles
                obstacle.mesh.position.copy(cannonToThreeVector(obstacle.body.position));
                obstacle.mesh.quaternion.copy(new THREE.Quaternion(
                    obstacle.body.quaternion.x,
                    obstacle.body.quaternion.y,
                    obstacle.body.quaternion.z,
                    obstacle.body.quaternion.w
                ));
            }
        }
    }
} 