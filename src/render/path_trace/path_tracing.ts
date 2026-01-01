import { createComputePipeline } from "./pipeline";
import tracer from "../tracer";
import objs from "../objects";
import { vec3, type vec4 } from "gl-matrix";

function writeCircle(array:Float32Array, startIndex:number, c:vec4) : void{
        array[startIndex + 0] = c[0];
        array[startIndex + 1] = c[1];
        array[startIndex + 2] = c[2];
        array[startIndex + 3] = c[3];
}
const speed:number = 0.005;
const move_speed:number = 0.1;
class camera{
    constructor (plane_distance:number,  pos_x:number, pos_y:number, pos_z:number, dir_x:number, dir_y:number, dir_z:number,){
        this.position = [pos_x,pos_y,pos_z];
        this.direction = [dir_x,dir_y,dir_z];
        this.perpendicular = vec3.create();
        this.plane_distance = plane_distance;
        this.isClicked = false;
        this.lastPos = [-1, -1]
        this.plane_distance = plane_distance;
        this.cameraYawPitchRoll = vec3.create();
        this.keysPressed = {
            w: false,
            a: false,
            s: false,
            d: false,
            space: false,
            shift: false
        };

        tracer.get().canvas.addEventListener("mousedown", (e: MouseEvent) => {
            this.isClicked = true;
            this.lastPos = [e.clientX, e.clientY];
            e.preventDefault();
        });
        tracer.get().canvas.addEventListener("mousemove", (e: MouseEvent) => {
            if (!this.isClicked) return;
            e.preventDefault();

            let deltaX = e.clientX - this.lastPos[0];
            let deltaY = (e.clientY - this.lastPos[1]) * (-1.0);

            this.updateCameraDirection(deltaX, deltaY);

            this.lastPos = [e.clientX, e.clientY];
        });
        tracer.get().canvas.addEventListener("mouseup", (e: MouseEvent) => {
            this.isClicked = false;
            e.preventDefault();
        });
        window.addEventListener("keydown", (e: KeyboardEvent) => {
            var key = e.key.toLowerCase();
            if (key == ' ') key = "space";
            if (this.keysPressed.hasOwnProperty(key)) this.keysPressed[key] = true;
        });

        window.addEventListener("keyup", (e: KeyboardEvent) => {
            var key = e.key.toLowerCase();
            if (key == ' ') key = "space";
            if (this.keysPressed.hasOwnProperty(key)) this.keysPressed[key] = false;
        });

        this.updateCameraDirection(0,0);
    }
    isClicked: boolean;
    lastPos: [number, number];
    cameraYawPitchRoll: vec3;
    position: vec3;
    direction: vec3;
    perpendicular: vec3;
    plane_distance: number;
    keysPressed: Record<string, boolean>;

    write(array:Float32Array, startIndex:number){
        array[startIndex + 0] = this.position[0];
        array[startIndex + 1] = this.position[1];
        array[startIndex + 2] = this.position[2];
        array[startIndex + 3] = 0; // padding
        array[startIndex + 4] = this.direction[0];
        array[startIndex + 5] = this.direction[1];
        array[startIndex + 6] = this.direction[2];
        array[startIndex + 7] = 0; // padding
        array[startIndex + 8] = this.perpendicular[0];
        array[startIndex + 9] = this.perpendicular[1];
        array[startIndex + 10] = this.perpendicular[2];
        array[startIndex + 11] = 0; // padding
    }

    updateCameraDirection(deltaX:number, deltaY:number){
        this.cameraYawPitchRoll[0] -= deltaX * speed; // yaw
        this.cameraYawPitchRoll[1] -= deltaY * speed; // pitch

        const yaw = this.cameraYawPitchRoll[0];
        const pitch = this.cameraYawPitchRoll[1];

        this.direction = vec3.fromValues(
            Math.cos(pitch) * Math.sin(yaw), // x
            Math.sin(pitch),                 // y
            Math.cos(pitch) * Math.cos(yaw)  // z
        );

        vec3.normalize(this.direction, this.direction);

        vec3.normalize(this.perpendicular, vec3.cross(vec3.create(), this.direction, vec3.fromValues(0,1,0)))
    }

    updateCameraMovement() {
        const moveVector = vec3.create();

        if (this.keysPressed.w) {
            vec3.scaleAndAdd(moveVector, moveVector, this.direction, move_speed);
        }
        if (this.keysPressed.s) {
            vec3.scaleAndAdd(moveVector, moveVector, this.direction, -move_speed);
        }
        if (this.keysPressed.d) {
            vec3.scaleAndAdd(moveVector, moveVector, this.perpendicular, move_speed);
        }
        if (this.keysPressed.a) {
            vec3.scaleAndAdd(moveVector, moveVector, this.perpendicular, -move_speed);
        }
        if (this.keysPressed.space) {
            vec3.scaleAndAdd(moveVector, moveVector, vec3.fromValues(0, 1, 0), -move_speed);
        }
        if (this.keysPressed.shift) {
            vec3.scaleAndAdd(moveVector, moveVector, vec3.fromValues(0, 1, 0), move_speed);
        }

        vec3.add(this.position, this.position, moveVector);
    }
}

class pathTracerInputData{
    constructor(texWidth:number, texHeight:number) {
        this.oneOverTexWidth = 1 / texWidth;
        this.oneOverTexHeight = 1 / texHeight;
        this.cam = new camera(3, 0,0,-20, 0,0,1);
    }
    create(circle_count:number, planes_count:number){
        this.data = new Float32Array(
            4 + // first data
            3 + // camera position
            1 + // padding
            3 + // camera orientation
            1 + // padding
            1 + // padding
            3 + // camera up
            1 + // padding
            (4 * circle_count) + // circles
            (4 * planes_count) // planes
        );
        this.buffer = tracer.get().device.createBuffer({
            size: this.data.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.update();
    }
    updateBuffer(){
        this.data[0] = 2;
        this.data[1] = this.oneOverTexHeight / this.oneOverTexWidth;
        this.data[2] = this.oneOverTexWidth;
        this.data[3] = this.oneOverTexHeight;
        this.cam.write(this.data, 4);
        var offset = 16;
        for (var i = 0;i<objs.get().circles.length;i++){
            writeCircle(this.data, offset, objs.get().circles[i]);
            offset+=4;
        }
        for (var i = 0;i<objs.get().planes.length;i++){
            writeCircle(this.data, offset, objs.get().planes[i]);
            offset+=4;
        }
        tracer.get().device.queue.writeBuffer(this.buffer, 0, this.data.buffer, 0, this.data.byteLength);
    }
    update(){
        this.updateBuffer();
        this.cam.updateCameraMovement();
    }
    getBuffer(): GPUBuffer{
        return this.buffer;
    }
    oneOverTexWidth:number;
    oneOverTexHeight:number;
    cam:camera;
    private buffer!: GPUBuffer;
    private data!: Float32Array;
}

export class pathTracer{


    async initPathtracer(circle_count:number, plane_count:number) {
        
        let device = tracer.get().device;
        let textureView = tracer.get().imageView;

        this.pipeline = await createComputePipeline(device, "src/shader/path_trace.wgsl", circle_count, plane_count);
        this.inputData = new pathTracerInputData(tracer.get().imageWidth, tracer.get().imageHeight);
        this.inputData.create(circle_count, plane_count);

        this.bindGroup = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: textureView },
                { binding: 1, resource: { buffer:this.inputData.getBuffer() } }
            ],
        });
    }
    recordCommandBuffer() : GPUCommandBuffer{
        const commandEncoder = tracer.get().device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(this.pipeline);
        passEncoder.setBindGroup(0, this.bindGroup);
        passEncoder.dispatchWorkgroups(Math.ceil(tracer.get().imageWidth / 16), Math.ceil(tracer.get().imageHeight / 16));
        passEncoder.end();

        return commandEncoder.finish();
    }

    async update(){
        const currentTime = performance.now();
        const dt = (currentTime - this.lastTime)/1000; // in sec
        this.lastTime = currentTime;
        dt;
        await this.inputData.update();
    }

    constructor(){
        this.lastTime = performance.now();
    }
    
    lastTime: number;
    private pipeline!: GPUComputePipeline;
    private bindGroup!: GPUBindGroup;
    private inputData!: pathTracerInputData;
}

export default pathTracer;