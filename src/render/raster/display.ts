
import physim from "../physim";
import { createRasterizerRenderPipeline } from "./pipeline";

class rasCamera {
    
    viewProj : Array<number>; // 4x4 matrix
};

class rasterizer{
    async initRasterizer() {
        let device = physim.get().device;
        let textureView = physim.get().imageView;

        this.pipeline = await createRasterizerRenderPipeline(device, "src/shader/display.wgsl", physim.get().preferedCanvasTextureFormat);

        this.bindGroup = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: textureView }
            ],
        });
    }
    recordCommandBuffer() : GPUCommandBuffer{
        const commandEncoder = physim.get().device.createCommandEncoder();
        const passEncoder = commandEncoder.beginRenderPass();
        passEncoder.setPipeline(this.pipeline);
        passEncoder.setBindGroup(0, this.bindGroup);
        passEncoder.dispatchWorkgroups(Math.ceil(physim.get().imageWidth / 16), Math.ceil(physim.get().imageHeight / 16));
        passEncoder.end();

        return commandEncoder.finish();
    }

    async update(deltaTime:number){
        deltaTime;
    }

    constructor(){
        this.lastTime = performance.now();
    }
    
    lastTime: number;
    private pipeline!: GPURenderPipeline;
    private bindGroup!: GPUBindGroup;
}