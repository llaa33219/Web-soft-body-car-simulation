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
        const wheelPositions = [
            { x: this.length * 0.3, y: -this.height / 2 + this.wheelRadius, z: -this.width / 2 - this.wheelWidth / 2 },  // Front left
            { x: this.length * 0.3, y: -this.height / 2 + this.wheelRadius, z: this.width / 2 + this.wheelWidth / 2 },   // Front right
            { x: -this.length * 0.3, y: -this.height / 2 + this.wheelRadius, z: -this.width / 2 - this.wheelWidth / 2 }, // Rear left
            { x: -this.length * 0.3, y: -this.height / 2 + this.wheelRadius, z: this.width / 2 + this.wheelWidth / 2 }   // Rear right
        ];
        
        // Create wheel meshes and bodies
        this.wheelMeshes = [];
        this.wheelBodies = [];
        
        const wheelGeometry = new THREE.CylinderGeometry(this.wheelRadius, this.wheelRadius, this.wheelWidth, 24);
        const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        
        wheelGeometry.rotateZ(Math.PI / 2); // Rotate to align with car
        
        for (let i = 0; i < 4; i++) {
            // Create wheel mesh
            const wheelMesh = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheelMesh.castShadow = true;
            wheelMesh.receiveShadow = true;
            this.scene.add(wheelMesh);
            this.wheelMeshes.push(wheelMesh);
            
            // Create wheel physics body - using Sphere to avoid Cylinder normal issues
            const wheelShape = new CANNON.Sphere(this.wheelRadius);
            const wheelBody = new CANNON.Body({
                mass: 50, // Wheel mass in kg
                material: this.physicsWorld.wheelMaterial,
                position: new CANNON.Vec3(
                    this.position.x + wheelPositions[i].x,
                    this.position.y + wheelPositions[i].y,
                    this.position.z + wheelPositions[i].z
                ),
                shape: wheelShape // Directly assign sphere shape
            });
            
            // Removed Cylinder specific rotation and addShape:
            // const quaternion = new CANNON.Quaternion();
            // quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI / 2);
            // wheelBody.addShape(wheelShape, new CANNON.Vec3(), quaternion);
            
            // Add wheel body to physics world
            this.physicsWorld.addBody(wheelBody, wheelMesh);
            this.wheelBodies.push(wheelBody);
        }
    }
    
    connectWheels() {
        // Create vehicle dynamics
        // In Cannon.js 0.6.2, we need to use a different approach for the vehicle
        
        // First, let's set up constraints for the wheels
        this.constraints = [];
        this.wheelBodies = this.wheelBodies || [];
        
        // Wheel positions (relative to the chassis center)
        const wheelPositions = [
            new CANNON.Vec3(this.length * 0.3, -this.height / 3, -this.width / 2),   // Front left
            new CANNON.Vec3(this.length * 0.3, -this.height / 3, this.width / 2),    // Front right
            new CANNON.Vec3(-this.length * 0.3, -this.height / 3, -this.width / 2),  // Rear left
            new CANNON.Vec3(-this.length * 0.3, -this.height / 3, this.width / 2)    // Rear right
        ];
        
        // Create a simple vehicle using constraints
        for (let i = 0; i < 4; i++) {
            const wheelBody = this.wheelBodies[i];
            
            // Position the wheel at the right spot
            wheelBody.position.set(
                this.chassisBody.position.x + wheelPositions[i].x,
                this.chassisBody.position.y + wheelPositions[i].y,
                this.chassisBody.position.z + wheelPositions[i].z
            );
            
            // Create a hinge constraint (axis of rotation for wheels)
            const constraint = new CANNON.HingeConstraint(this.chassisBody, wheelBody, {
                pivotA: wheelPositions[i],
                axisA: new CANNON.Vec3(0, 0, 1), // Rotate around Z axis for steering
                pivotB: new CANNON.Vec3(0, 0, 0),
                axisB: new CANNON.Vec3(0, 0, 1)
            });
            
            this.constraints.push(constraint);
            this.physicsWorld.world.addConstraint(constraint);
        }
        
        // Create a simple vehicle object to store properties
        this.vehicle = {
            wheelBodies: this.wheelBodies,
            constraints: this.constraints,
            wheelInfos: wheelPositions.map((pos, i) => {
                return {
                    index: i,
                    position: pos,
                    isFront: i < 2,
                    worldTransform: {
                        position: this.wheelBodies[i].position,
                        quaternion: this.wheelBodies[i].quaternion
                    }
                };
            }),
            // Add methods needed
            setSteeringValue: (value, wheelIndex) => {
                if (wheelIndex < 2) { // Front wheels only
                    const constraint = this.constraints[wheelIndex];
                    // Set the hinge axis for steering
                    const axis = new CANNON.Vec3(Math.sin(value), 0, Math.cos(value));
                    constraint.axisA.copy(axis);
                }
            },
            applyEngineForce: (force, wheelIndex) => {
                const wheelBody = this.wheelBodies[wheelIndex];
                // Apply force in the wheel's forward direction
                const worldForward = new CANNON.Vec3(1, 0, 0);
                const forceVector = new CANNON.Vec3();
                wheelBody.quaternion.vmult(worldForward, forceVector);
                forceVector.scale(force, forceVector);
                wheelBody.applyForce(forceVector, wheelBody.position);
            },
            setBrake: (brakeForce, wheelIndex) => {
                const wheelBody = this.wheelBodies[wheelIndex];
                // Apply damping to simulate braking
                wheelBody.angularDamping = brakeForce > 0 ? 0.9 : 0.0;
            },
            updateWheelTransform: (wheelIndex) => {
                // Update wheel transform (position/rotation) for visualization
                const wheelInfo = this.vehicle.wheelInfos[wheelIndex];
                wheelInfo.worldTransform.position = this.wheelBodies[wheelIndex].position;
                wheelInfo.worldTransform.quaternion = this.wheelBodies[wheelIndex].quaternion;
            }
        };
        
        // We've already set up wheels and constraints in the previous step
        // The this.wheelBodies array was populated in createWheels()
        this.wheelInfos = this.vehicle.wheelInfos;
        this.wheels = this.wheelBodies;
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
        
        // Apply steering to front wheels
        this.vehicle.setSteeringValue(this.steering, 0);
        this.vehicle.setSteeringValue(this.steering, 1);
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
        
        // Braking
        if (this.controls.brake) {
            brakingForce = this.brakingForce;
            engineForce = 0;
        }
        
        // Apply forces to wheels
        // Rear-wheel drive
        this.vehicle.applyEngineForce(engineForce, 2);
        this.vehicle.applyEngineForce(engineForce, 3);
        
        // Apply brakes to all wheels
        for (let i = 0; i < 4; i++) {
            this.vehicle.setBrake(brakingForce, i);
        }
        
        // Calculate current speed (approximate)
        this.speed = this.chassisBody.velocity.length();
    }
    
    updateWheelVisuals() {
        // Update wheel positions and rotations based on wheel bodies
        for (let i = 0; i < this.wheelBodies.length; i++) {
            const wheelBody = this.wheelBodies[i];
            
            // Update wheel transform info for other functions
            if (this.vehicle && this.vehicle.updateWheelTransform) {
                this.vehicle.updateWheelTransform(i);
            }
            
            // Position
            this.wheelMeshes[i].position.copy(
                cannonToThreeVector(wheelBody.position)
            );
            
            // Rotation
            this.wheelMeshes[i].quaternion.copy(
                new THREE.Quaternion(
                    wheelBody.quaternion.x,
                    wheelBody.quaternion.y,
                    wheelBody.quaternion.z,
                    wheelBody.quaternion.w
                )
            );
        }
    }
    
    reset() {
        // Reset car position and rotation
        this.chassisBody.position.set(this.position.x, this.position.y, this.position.z);
        this.chassisBody.quaternion.set(0, 0, 0, 1);
        this.chassisBody.velocity.set(0, 0, 0);
        this.chassisBody.angularVelocity.set(0, 0, 0);
        
        // Reset wheel positions
        for (let i = 0; i < this.wheelBodies.length; i++) {
            const wheelBody = this.wheelBodies[i];
            wheelBody.position.copy(this.chassisBody.position);
            wheelBody.quaternion.set(0, 0, 0, 1);
            wheelBody.velocity.set(0, 0, 0);
            wheelBody.angularVelocity.set(0, 0, 0);
        }
        
        // Reset soft-body components
        for (let i = 0; i < this.frontBumper.bodies.length; i++) {
            const body = this.frontBumper.bodies[i];
            body.position.set(
                this.position.x + this.length / 2 + 0.1,
                this.position.y - this.height / 3,
                this.position.z - this.width / 2 + (this.width / (this.frontBumper.bodies.length - 1)) * i
            );
            body.velocity.set(0, 0, 0);
            body.angularVelocity.set(0, 0, 0);
        }
        
        // Reset controls and state
        this.controls = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            brake: false
        };
        
        this.speed = 0;
        this.steering = 0;
    }
} 