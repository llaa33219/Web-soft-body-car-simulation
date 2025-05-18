/**
 * Car model and physics for the soft-body car simulation
 */

class Car {
    constructor(scene, physicsWorld, position = { x: 0, y: 1, z: 0 }) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.position = position;
        
        // Car properties
        this.maxSteeringAngle = 0.5; // radians
        this.maxForce = 500;
        this.brakingForce = 1000;
        
        // Car dimensions
        this.width = 1.8;
        this.length = 4.5;
        this.height = 1.4;
        this.wheelRadius = 0.4;
        this.wheelWidth = 0.3;
        
        // Control states
        this.controls = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            brake: false
        };
        
        // Current state
        this.speed = 0;
        this.steering = 0;
        
        // Initialize the car
        this.init();
    }
    
    init() {
        // Create car chassis
        this.createChassis();
        
        // Create wheels
        this.createWheels();
        
        // Connect wheels to chassis using constraints
        this.connectWheels();
        
        // Create soft-body components
        this.createSoftBodyComponents();
        
        // Set up event listeners for keyboard controls
        this.setupControls();
    }
    
    createChassis() {
        // Create chassis mesh (visual representation)
        const geometry = new THREE.BoxGeometry(this.length, this.height, this.width);
        const material = new THREE.MeshPhongMaterial({ color: 0x0066cc });
        this.chassisMesh = new THREE.Mesh(geometry, material);
        this.chassisMesh.castShadow = true;
        this.chassisMesh.receiveShadow = true;
        this.scene.add(this.chassisMesh);
        
        // Create chassis physics body
        const chassisShape = new CANNON.Box(new CANNON.Vec3(
            this.length / 2,
            this.height / 2,
            this.width / 2
        ));
        
        this.chassisBody = new CANNON.Body({
            mass: 1500, // Car mass in kg
            position: new CANNON.Vec3(this.position.x, this.position.y, this.position.z),
            shape: chassisShape,
            material: this.physicsWorld.groundMaterial
        });
        
        // Lower the center of mass
        this.chassisBody.shapeOffsets[0].set(0, -this.height / 4, 0);
        
        // Add chassis to physics world
        this.physicsWorld.addBody(this.chassisBody, this.chassisMesh);
        
        // Create more realistic car body mesh
        this.createRealisticCarBody();
    }
    
    createRealisticCarBody() {
        // This will be a simple but more realistic car body mesh
        const bodyGroup = new THREE.Group();
        
        // Main body (rounded box)
        const bodyGeom = new THREE.BoxGeometry(this.length, this.height * 0.7, this.width);
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0x0066cc });
        const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
        bodyMesh.position.y = this.height * 0.15;
        bodyGroup.add(bodyMesh);
        
        // Cabin/roof
        const cabinWidth = this.width * 0.8;
        const cabinLength = this.length * 0.6;
        const cabinHeight = this.height * 0.4;
        const cabinGeom = new THREE.BoxGeometry(cabinLength, cabinHeight, cabinWidth);
        const cabinMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const cabinMesh = new THREE.Mesh(cabinGeom, cabinMat);
        cabinMesh.position.y = this.height * 0.5;
        cabinMesh.position.z = 0;
        bodyGroup.add(cabinMesh);
        
        // Front hood
        const hoodGeom = new THREE.BoxGeometry(this.length * 0.25, this.height * 0.1, this.width);
        const hoodMat = new THREE.MeshPhongMaterial({ color: 0x0066cc });
        const hoodMesh = new THREE.Mesh(hoodGeom, hoodMat);
        hoodMesh.position.set(this.length * 0.3, this.height * 0.35, 0);
        bodyGroup.add(hoodMesh);
        
        // Trunk
        const trunkGeom = new THREE.BoxGeometry(this.length * 0.2, this.height * 0.2, this.width);
        const trunkMat = new THREE.MeshPhongMaterial({ color: 0x0066cc });
        const trunkMesh = new THREE.Mesh(trunkGeom, trunkMat);
        trunkMesh.position.set(-this.length * 0.35, this.height * 0.25, 0);
        bodyGroup.add(trunkMesh);
        
        // Headlights
        const headlightGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16);
        const headlightMat = new THREE.MeshPhongMaterial({ color: 0xffffcc, emissive: 0xffffcc });
        
        const headlightLeft = new THREE.Mesh(headlightGeom, headlightMat);
        headlightLeft.rotation.z = Math.PI / 2;
        headlightLeft.position.set(this.length / 2, this.height * 0.25, -this.width / 2 + 0.2);
        bodyGroup.add(headlightLeft);
        
        const headlightRight = new THREE.Mesh(headlightGeom, headlightMat);
        headlightRight.rotation.z = Math.PI / 2;
        headlightRight.position.set(this.length / 2, this.height * 0.25, this.width / 2 - 0.2);
        bodyGroup.add(headlightRight);
        
        // Taillights
        const taillightMat = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0x660000 });
        
        const taillightLeft = new THREE.Mesh(headlightGeom, taillightMat);
        taillightLeft.rotation.z = Math.PI / 2;
        taillightLeft.position.set(-this.length / 2, this.height * 0.25, -this.width / 2 + 0.2);
        bodyGroup.add(taillightLeft);
        
        const taillightRight = new THREE.Mesh(headlightGeom, taillightMat);
        taillightRight.rotation.z = Math.PI / 2;
        taillightRight.position.set(-this.length / 2, this.height * 0.25, this.width / 2 - 0.2);
        bodyGroup.add(taillightRight);
        
        // Add shadow
        bodyGroup.traverse(child => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        // Add to the scene
        this.carBody = bodyGroup;
        this.scene.add(bodyGroup);
        
        // Make chassis mesh invisible as we'll use the detailed car body
        this.chassisMesh.visible = false;
    }
    
    createWheels() {
        // Wheel positions relative to the car chassis
        this.wheelPositions = [
            { x: this.length * 0.3, y: -this.height / 2 + this.wheelRadius, z: -this.width / 2 },  // Front left
            { x: this.length * 0.3, y: -this.height / 2 + this.wheelRadius, z: this.width / 2 },   // Front right
            { x: -this.length * 0.3, y: -this.height / 2 + this.wheelRadius, z: -this.width / 2 }, // Rear left
            { x: -this.length * 0.3, y: -this.height / 2 + this.wheelRadius, z: this.width / 2 }   // Rear right
        ];
        
        this.wheelMeshes = [];
        this.wheelBodies = [];

        // Create wheel visuals
        const wheelGeometry = new THREE.CylinderGeometry(this.wheelRadius, this.wheelRadius, this.wheelWidth, 24);
        wheelGeometry.rotateX(Math.PI / 2); // Align cylinder to roll along Z if car moves along X
        const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        
        // Create wheel physics
        for (let i = 0; i < 4; i++) {
            // Visual mesh
            const wheelMesh = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheelMesh.castShadow = true;
            wheelMesh.receiveShadow = true;
            this.scene.add(wheelMesh);
            this.wheelMeshes.push(wheelMesh);
            
            // Physics body - use the helper method to create properly oriented wheel
            const wheelBody = this.physicsWorld.createWheelBody(
                this.wheelRadius,
                this.wheelWidth,
                {
                    x: this.position.x + this.wheelPositions[i].x,
                    y: this.position.y + this.wheelPositions[i].y,
                    z: this.position.z + this.wheelPositions[i].z
                }
            );
            
            this.wheelBodies.push(wheelBody);
            
            // Set initial visual position
            wheelMesh.position.set(
                this.position.x + this.wheelPositions[i].x,
                this.position.y + this.wheelPositions[i].y,
                this.position.z + this.wheelPositions[i].z
            );
        }
    }
    
    connectWheels() {
        // We'll use hinge constraints instead of RaycastVehicle
        this.wheelConstraints = [];
        
        for (let i = 0; i < 4; i++) {
            const wheelBody = this.wheelBodies[i];
            const constraintPivot = new CANNON.Vec3(0, 0, 0); // Pivot at wheel center
            
            // Calculate the connection point on the chassis
            const chassisConnectionPoint = new CANNON.Vec3(
                this.wheelPositions[i].x,
                this.wheelPositions[i].y,
                this.wheelPositions[i].z
            );
            
            // Use the helper method to create a hinge constraint
            const hingeConstraint = this.physicsWorld.addHingeConstraint(
                this.chassisBody,
                wheelBody,
                chassisConnectionPoint,
                constraintPivot,
                new CANNON.Vec3(0, 0, 1), // Wheel rotation axis (local to chassis)
                new CANNON.Vec3(0, 1, 0)  // Wheel rotation axis (local to wheel)
            );
            
            this.wheelConstraints.push(hingeConstraint);
        }
        
        // Front wheel steering constraints
        this.steeringConstraints = [];
        for (let i = 0; i < 2; i++) { // Only front wheels
            const constraint = this.wheelConstraints[i];
            this.steeringConstraints.push(constraint);
        }
    }
    
    createSoftBodyComponents() {
        // Create soft-body components like bumpers, suspension, etc.
        // For simplicity, we'll simulate deformable components with a series of connected particles
        
        // Front bumper soft body
        const frontBumperPositions = [];
        const frontBumperWidth = this.width * 0.9;
        const segments = 8;
        
        for (let i = 0; i < segments; i++) {
            const x = this.length / 2 + 0.1;
            const y = -this.height / 3;
            const z = -frontBumperWidth / 2 + (frontBumperWidth / (segments - 1)) * i;
            
            frontBumperPositions.push({ x, y, z });
        }
        
        // Create soft body for front bumper
        this.frontBumper = this.physicsWorld.createSoftBody(
            frontBumperPositions.map(pos => new CANNON.Vec3(
                this.position.x + pos.x,
                this.position.y + pos.y,
                this.position.z + pos.z
            )),
            100,  // mass
            1000, // stiffness
            0.3   // damping
        );
        
        // Connect soft body to chassis
        for (let i = 0; i < this.frontBumper.bodies.length; i++) {
            const constraint = new CANNON.PointToPointConstraint(
                this.chassisBody,
                new CANNON.Vec3(
                    frontBumperPositions[i].x,
                    frontBumperPositions[i].y,
                    frontBumperPositions[i].z
                ),
                this.frontBumper.bodies[i],
                new CANNON.Vec3(0, 0, 0)
            );
            
            this.physicsWorld.world.addConstraint(constraint);
        }
        
        // Create visual representation of soft body
        this.frontBumperMeshes = [];
        const sphereGeom = new THREE.SphereGeometry(0.05);
        const sphereMat = new THREE.MeshPhongMaterial({ color: 0x0066cc });
        
        for (let i = 0; i < this.frontBumper.bodies.length; i++) {
            const mesh = new THREE.Mesh(sphereGeom, sphereMat);
            mesh.castShadow = true;
            this.scene.add(mesh);
            this.frontBumperMeshes.push(mesh);
            this.frontBumper.bodies[i].userData = { mesh };
        }
    }
    
    setupControls() {
        // Set up event listeners for keyboard controls
        document.addEventListener('keydown', (event) => {
            switch (event.key.toLowerCase()) {
                case 'w':
                    this.controls.forward = true;
                    break;
                case 's':
                    this.controls.backward = true;
                    break;
                case 'a':
                    this.controls.left = true;
                    break;
                case 'd':
                    this.controls.right = true;
                    break;
                case ' ':
                    this.controls.brake = true;
                    break;
                case 'r':
                    this.reset();
                    break;
            }
        });
        
        document.addEventListener('keyup', (event) => {
            switch (event.key.toLowerCase()) {
                case 'w':
                    this.controls.forward = false;
                    break;
                case 's':
                    this.controls.backward = false;
                    break;
                case 'a':
                    this.controls.left = false;
                    break;
                case 'd':
                    this.controls.right = false;
                    break;
                case ' ':
                    this.controls.brake = false;
                    break;
            }
        });
    }
    
    update(deltaTime) {
        // Update steering
        this.updateSteering(deltaTime);
        
        // Update acceleration/braking
        this.updateDriving(deltaTime);
        
        // Update wheel positions and rotations
        this.updateWheelVisuals();
        
        // Update car body position to follow chassis
        if (this.carBody) {
            this.carBody.position.copy(this.chassisMesh.position);
            this.carBody.quaternion.copy(this.chassisMesh.quaternion);
        }
    }
    
    updateSteering(deltaTime) {
        // Define steering characteristics
        const steeringSpeed = 2.0; // Radians per second
        const steeringReturnSpeed = 3.0; // Return to center speed
        
        // Update steering based on controls
        if (this.controls.left) {
            this.steering = Math.min(this.steering + steeringSpeed * deltaTime, this.maxSteeringAngle);
        } else if (this.controls.right) {
            this.steering = Math.max(this.steering - steeringSpeed * deltaTime, -this.maxSteeringAngle);
        } else {
            // Return to center
            if (this.steering > 0) {
                this.steering = Math.max(this.steering - steeringReturnSpeed * deltaTime, 0);
            } else if (this.steering < 0) {
                this.steering = Math.min(this.steering + steeringReturnSpeed * deltaTime, 0);
            }
        }
        
        // Apply steering to front wheels by updating the hinge constraint axis
        for (let i = 0; i < 2; i++) { // Only front wheels
            const wheelBody = this.wheelBodies[i];
            
            // Update wheel orientation for steering
            const steeringQuat = new CANNON.Quaternion();
            steeringQuat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.steering);
            
            // Combine with the default wheel orientation
            const defaultQuat = new CANNON.Quaternion();
            defaultQuat.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI / 2);
            
            wheelBody.quaternion = steeringQuat.mult(defaultQuat);
        }
    }
    
    updateDriving(deltaTime) {
        // Calculate force based on controls
        let engineForce = 0;
        let brakingForce = 0;
        
        // Forward/backward
        if (this.controls.forward) {
            engineForce = this.maxForce;
        } else if (this.controls.backward) {
            engineForce = -this.maxForce;
        }
        
        // Apply forces to the rear wheels (rear-wheel drive)
        for (let i = 2; i < 4; i++) { // Rear wheels
            const wheelBody = this.wheelBodies[i];
            
            // Calculate force direction based on wheel orientation
            const forceDir = new CANNON.Vec3(1, 0, 0); // Local forward direction
            const worldForceDir = wheelBody.quaternion.vmult(forceDir);
            
            // Apply force at the wheel
            if (engineForce !== 0) {
                wheelBody.applyForce(worldForceDir.scale(engineForce), wheelBody.position);
            }
            
            // Apply braking as a damping force if needed
            if (this.controls.brake) {
                wheelBody.angularDamping = 0.9; // High damping for braking
            } else {
                wheelBody.angularDamping = 0.1; // Low damping for normal driving
            }
        }
        
        // Calculate current speed (approximate)
        this.speed = this.chassisBody.velocity.length();
    }
    
    updateWheelVisuals() {
        // Update wheel visuals to match physics bodies
        for (let i = 0; i < this.wheelBodies.length; i++) {
            const wheelBody = this.wheelBodies[i];
            const wheelMesh = this.wheelMeshes[i];
            
            // Update position
            wheelMesh.position.copy(cannonToThreeVector(wheelBody.position));
            
            // Update rotation
            wheelMesh.quaternion.set(
                wheelBody.quaternion.x,
                wheelBody.quaternion.y,
                wheelBody.quaternion.z,
                wheelBody.quaternion.w
            );
        }
    }
    
    reset() {
        // Reset car position and rotation
        this.chassisBody.position.set(this.position.x, this.position.y + this.height / 2, this.position.z); // Ensure it's above ground
        this.chassisBody.quaternion.set(0, 0, 0, 1);
        this.chassisBody.velocity.set(0, 0, 0);
        this.chassisBody.angularVelocity.set(0, 0, 0);
        
        // Reset wheel positions and states
        for (let i = 0; i < this.wheelBodies.length; i++) {
            const wheelBody = this.wheelBodies[i];
            
            // Reset position relative to chassis
            wheelBody.position.set(
                this.chassisBody.position.x + this.wheelPositions[i].x,
                this.chassisBody.position.y + this.wheelPositions[i].y,
                this.chassisBody.position.z + this.wheelPositions[i].z
            );
            
            // Reset rotation (accounting for the default wheel orientation)
            const defaultQuat = new CANNON.Quaternion();
            defaultQuat.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI / 2);
            wheelBody.quaternion.copy(defaultQuat);
            
            // Reset velocities
            wheelBody.velocity.set(0, 0, 0);
            wheelBody.angularVelocity.set(0, 0, 0);
            wheelBody.angularDamping = 0.1;
        }
        
        // Reset soft-body components if they exist
        if (this.frontBumper && this.frontBumper.bodies) {
            for (let i = 0; i < this.frontBumper.bodies.length; i++) {
                const body = this.frontBumper.bodies[i];
                body.position.set(
                    this.chassisBody.position.x + this.length / 2 + 0.1,
                    this.chassisBody.position.y - this.height / 3,
                    this.chassisBody.position.z - (this.width * 0.9 / 2) + ((this.width * 0.9) / (this.frontBumper.bodies.length - 1)) * i
                );
                body.velocity.set(0, 0, 0);
                body.angularVelocity.set(0, 0, 0);
            }
        }
        
        this.controls = {
            forward: false, backward: false, left: false, right: false, brake: false
        };
        this.speed = 0;
        this.steering = 0;
    }
} 