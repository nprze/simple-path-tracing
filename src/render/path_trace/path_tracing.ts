import { createComputePipeline } from "./pipeline";
import physim from "../physim";
import phyobj, { circle } from "../objects";

function writeCircle(array:Float32Array, startIndex:number, c:circle) : void{
        array[startIndex + 0] = c.position[0];
        array[startIndex + 1] = c.position[1];
        array[startIndex + 2] = c.position[2];
        array[startIndex + 3] = c.radius;
}
class camera{
    constructor (plane_distance:number,  pos_x:number, pos_y:number, pos_z:number, dir_x:number, dir_y:number, dir_z:number,){
        this.position = [pos_x,pos_y,pos_z];
        this.direction = [dir_x,dir_y,dir_z];
        this.up = [0,1,0];
        this.plane_distance = plane_distance;
    }
    position: [number, number, number];
    direction: [number, number, number];
    up: [number, number, number];
    plane_distance: number;

    write(array:Float32Array, startIndex:number){
        array[startIndex + 0] = this.position[0];
        array[startIndex + 1] = this.position[1];
        array[startIndex + 2] = this.position[2];
        array[startIndex + 3] = 0; // padding
        array[startIndex + 4] = this.direction[0];
        array[startIndex + 5] = this.direction[1];
        array[startIndex + 6] = this.direction[2];
        array[startIndex + 7] = 0; // padding
        array[startIndex + 8] = this.up[0];
        array[startIndex + 9] = this.up[1];
        array[startIndex + 10] = this.up[2];
        array[startIndex + 11] = 0; // padding
    }
}

class pathTracerInputData{
    constructor(texWidth:number, texHeight:number) {
        this.oneOverTexWidth = 1 / texWidth;
        this.oneOverTexHeight = 1 / texHeight;
        this.cam = new camera(1, 0,0,-20, 0,0,1);

    }
    create(circle_count:number){
        this.data = new Float32Array(
            4 + // first data
            3 + // camera position
            1 + // padding
            3 + // camera orientation
            1 + // padding
            1 + // padding
            3 + // camera up
            1 + // padding
            (4 * circle_count) // circles
        );
        this.buffer = physim.get().device.createBuffer({
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
        for (var i = 0;i<phyobj.get().circles.length;i++){
            writeCircle(this.data, offset, phyobj.get().circles[i]);
            offset+=4;
        }
        physim.get().device.queue.writeBuffer(this.buffer, 0, this.data.buffer, 0, this.data.byteLength);
    }
    update(){
        this.updateBuffer();
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


    async initPathtracer(circle_count:number) {
        
        let device = physim.get().device;
        let textureView = physim.get().imageView;

        this.pipeline = await createComputePipeline(device, "src/shader/path_trace.wgsl", circle_count);
        this.inputData = new pathTracerInputData(physim.get().imageWidth, physim.get().imageHeight);
        this.inputData.create(circle_count);

        this.bindGroup = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: textureView },
                { binding: 1, resource: { buffer:this.inputData.getBuffer() } }
            ],
        });
    }
    recordCommandBuffer() : GPUCommandBuffer{
        const commandEncoder = physim.get().device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(this.pipeline);
        passEncoder.setBindGroup(0, this.bindGroup);
        passEncoder.dispatchWorkgroups(Math.ceil(physim.get().imageWidth / 16), Math.ceil(physim.get().imageHeight / 16));
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