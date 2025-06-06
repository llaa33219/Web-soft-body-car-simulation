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
        // Check for valid deltaTime
        if (isNaN(deltaTime) || deltaTime <= 0) {
            console.warn("Invalid deltaTime in physics update:", deltaTime);
            deltaTime = 1/60; // Use default time step
        }
        
        try {
            // Step the physics simulation
            this.world.step(deltaTime);
            
            // Update body meshes based on physics
            for (const body of this.bodies) {
                if (body.userData && body.userData.mesh) {
                    body.userData.mesh.position.copy(cannonToThreeVector(body.position));
                    body.userData.mesh.quaternion.copy(new THREE.Quaternion(
                        body.quaternion.x,
                        body.quaternion.y,
                        body.quaternion.z,
                        body.quaternion.w
                    ));
                }
            }
            
            // Debug: Check for bodies that have fallen too far
            this.bodies.forEach(body => {
                if (body.position.y < -50) {
                    console.warn("Body has fallen far below ground, position:", body.position);
                }
            });
        } catch (error) {
            console.error("Physics update error:", error);
        }
    }
    
    addBody(body, mesh) {
        try {
            this.world.addBody(body);
            this.bodies.push(body);
            
            if (mesh) {
                body.userData = { mesh };
            }
            
            console.log("Body added to physics world, position:", body.position);
            return body;
        } catch (error) {
            console.error("Error adding body to physics world:", error);
            return body; // Return body anyway to prevent further errors
        }
    }
    
    removeBody(body) {
        const index = this.bodies.indexOf(body);
        if (index !== -1) {
            this.bodies.splice(index, 1);
        }
        this.world.removeBody(body);
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
    
    // Create a wheel cylinder with proper vertex ordering
    createWheelBody(radius, width, position, mass = 30, material = this.wheelMaterial) {
        // Create cylinder shape with properly ordered vertices
        const wheelShape = new CANNON.Cylinder(radius, radius, width, 16);
        
        // Rotate the cylinder to be properly oriented
        const quat = new CANNON.Quaternion();
        quat.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI / 2);
        
        // Create the wheel body
        const wheelBody = new CANNON.Body({
            mass: mass,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            shape: wheelShape,
            material: material,
            quaternion: quat, // Apply the rotation to orient the cylinder correctly
            angularDamping: 0.2 // Add some damping for more realistic wheel rotation
        });
        
        return this.addBody(wheelBody);
    }
    
    // Add a hinge constraint between bodies
    addHingeConstraint(bodyA, bodyB, pivotA, pivotB, axisA, axisB, maxForce = 1e6) {
        const constraint = new CANNON.HingeConstraint(bodyA, bodyB, {
            pivotA: pivotA,
            pivotB: pivotB,
            axisA: axisA,
            axisB: axisB,
            maxForce: maxForce
        });
        
        this.world.addConstraint(constraint);
        return constraint;
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