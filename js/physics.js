/**
 * Physics system for the soft-body car simulation
 */

class PhysicsWorld {
    constructor() {
        // Initialize physics world
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0); // Earth gravity
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);
        this.world.solver.iterations = 10;
        this.world.defaultContactMaterial.friction = 0.3;
        
        // Create ground material
        this.groundMaterial = new CANNON.Material('ground');
        this.groundMaterial.friction = 0.3;
        this.groundMaterial.restitution = 0.3;
        
        // Create wheel material
        this.wheelMaterial = new CANNON.Material('wheel');
        this.wheelMaterial.friction = 0.8;
        this.wheelMaterial.restitution = 0.1;
        
        // Create contact material between wheel and ground
        const wheelGroundContactMaterial = new CANNON.ContactMaterial(
            this.wheelMaterial,
            this.groundMaterial,
            {
                friction: 0.8,
                restitution: 0.2,
                contactEquationStiffness: 1000
            }
        );
        
        this.world.addContactMaterial(wheelGroundContactMaterial);
        
        // Store all physics bodies
        this.bodies = [];
        
        // Debug visualization
        this.debugBodies = [];
    }
    
    update(deltaTime) {
        // Update physics world
        this.world.step(deltaTime);
        
        // Update all debug visualizations
        for (let i = 0; i < this.bodies.length; i++) {
            if (this.bodies[i].userData && this.bodies[i].userData.mesh) {
                const mesh = this.bodies[i].userData.mesh;
                const body = this.bodies[i];
                
                // Update position
                mesh.position.copy(cannonToThreeVector(body.position));
                
                // Update rotation
                mesh.quaternion.copy(new THREE.Quaternion(
                    body.quaternion.x,
                    body.quaternion.y,
                    body.quaternion.z,
                    body.quaternion.w
                ));
            }
        }
    }
    
    addBody(body, mesh = null) {
        this.world.addBody(body);
        this.bodies.push(body);
        
        // Associate mesh with body for synchronization
        if (mesh) {
            body.userData = { mesh };
        }
        
        return body;
    }
    
    // Helper to add a constraint to the world
    addConstraint(constraint) {
        this.world.addConstraint(constraint);
        return constraint;
    }
    
    createGround(size = 100, divisions = 10) {
        // Create ground body
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({
            mass: 0,
            shape: groundShape,
            material: this.groundMaterial
        });
        
        // Rotate the ground to be horizontal
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        
        return this.addBody(groundBody);
    }
    
    // Create a terrain body from a heightmap
    createTerrainBody(heightData, width, depth, minHeight, maxHeight) {
        const matrix = [];
        const sizeX = width;
        const sizeZ = depth;
        
        // Convert heightData to the format needed by Cannon.js
        for (let i = 0; i < sizeX; i++) {
            matrix.push([]);
            for (let j = 0; j < sizeZ; j++) {
                const height = heightData[i * sizeZ + j];
                matrix[i].push(height);
            }
        }
        
        // Create heightfield shape
        const heightfieldShape = new CANNON.Heightfield(matrix, {
            elementSize: 1
        });
        
        // Create terrain body
        const terrainBody = new CANNON.Body({
            mass: 0,
            shape: heightfieldShape,
            material: this.groundMaterial
        });
        
        // Position the terrain
        terrainBody.position.set(
            -sizeX / 2,
            (minHeight + maxHeight) / 2,
            -sizeZ / 2
        );
        
        return this.addBody(terrainBody);
    }
    
    // Create a soft body using a point-to-point constraint system
    createSoftBody(positions, mass, stiffness = 100, damping = 0.1, segments = 10) {
        const bodies = [];
        const constraints = [];
        const particleRadius = 0.1;
        
        // Create particles
        for (let i = 0; i < positions.length; i++) {
            const pos = positions[i];
            const shape = new CANNON.Sphere(particleRadius);
            const body = new CANNON.Body({
                mass: mass / positions.length,
                position: new CANNON.Vec3(pos.x, pos.y, pos.z),
                shape: shape
            });
            
            bodies.push(body);
            this.addBody(body);
        }
        
        // Create constraints between particles
        for (let i = 0; i < bodies.length; i++) {
            for (let j = i + 1; j < bodies.length; j++) {
                // Calculate rest length (initial distance between particles)
                const bodyA = bodies[i];
                const bodyB = bodies[j];
                const restLength = bodyA.position.distanceTo(bodyB.position);
                
                // Create spring constraint
                const constraint = new CANNON.Spring(bodyA, bodyB, {
                    restLength: restLength,
                    stiffness: stiffness,
                    damping: damping
                });
                
                constraints.push(constraint);
                
                // Register the constraint for the simulation
                this.world.addEventListener('postStep', () => {
                    constraint.applyForce();
                });
            }
        }
        
        return { bodies, constraints };
    }
} 