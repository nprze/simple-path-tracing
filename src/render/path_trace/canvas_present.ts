import tracer from "../tracer";
import { createRenderPipeline } from "./pipeline";

export class canvasPresenter{
    constructor(){}

    async initCanvasPresenter() {
        let device = tracer.get().device;
        let textureView = tracer.get().imageView;

        this.pipeline = await createRenderPipeline(device, "src/shader/path_trace_display.wgsl", tracer.get().preferedCanvasTextureFormat);

        const sampler = device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
        });


        this.bindGroup = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: textureView },
                { binding: 1, resource: sampler },
            ],
        });

    }

    recordCommandBuffer() : GPUCommandBuffer {
        let device = tracer.get().device;
        let context = tracer.get().webgpuContext;

        const renderEncoder = device.createCommandEncoder();
        const pass = renderEncoder.beginRenderPass({
            colorAttachments: [{
                view: context.getCurrentTexture().createView(),
                loadOp: "clear",
                storeOp: "store",
                clearValue: { r: 0, g: 0, b: 0, a: 1 }
            }],
        });

        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.bindGroup);
        pass.draw(4);
        pass.end();

        return renderEncoder.finish();
    }
    
    private pipeline!: GPURenderPipeline;
    private bindGroup!: GPUBindGroup;
}