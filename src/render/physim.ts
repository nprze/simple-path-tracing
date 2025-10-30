import phyobj from "./objects";
import { canvasPresenter } from "./path_trace/canvas_present";
import { pathTracer } from "./path_trace/path_tracing"

// a singleton to hold the data :3
class physim {
    private static instance: physim;
    static get(): physim { return physim.instance; }
    
    static async create() {
        const pathTracingCanvas = document.getElementById("path-tracing-canvas") as HTMLCanvasElement;
        const rasterizeCanvas = document.getElementById("rasterizer-canvas") as HTMLCanvasElement;
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) throw new Error("WebGPU not supported");
        const device = await adapter.requestDevice();
        const context = pathTracingCanvas.getContext("webgpu") as GPUCanvasContext;
        const rasterizer_context = rasterizeCanvas.getContext("webgpu") as GPUCanvasContext;

        const format = navigator.gpu.getPreferredCanvasFormat();
        context.configure({ device, format, alphaMode: "opaque" });

        phyobj.create();

        physim.instance = new physim(device, context, pathTracingCanvas, format); 

        await physim.get().init();
    }
    constructor(device:GPUDevice, webgpuContext:GPUCanvasContext, canvas: HTMLCanvasElement, format: GPUTextureFormat) {
        physim.instance = this;

        this.device = device;
        this.webgpuContext = webgpuContext;
        this.canvas = canvas;
        this.preferedCanvasTextureFormat = format;

        this.imageWidth = canvas.width = 2048;
        this.imageHeight = canvas.height = 1024;

        this.image = device.createTexture({
                size: [this.imageWidth, this.imageHeight],
                format: "rgba8unorm",
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
            });
        this.imageView = this.image.createView();
        
        this.path = new pathTracer();
        this.present = new canvasPresenter();

        this.frameNum = 0;
    }
    async init(){
        await this.path.initPathtracer(phyobj.get().circles.length);
        await this.present.initCanvasPresenter();
    }

    async frame(){
        await this.path.update();
        let cmdBffer = this.path.recordCommandBuffer();
        this.device.queue.submit([cmdBffer]);

        let presentCmdBffer = this.present.recordCommandBuffer();
        this.device.queue.submit([presentCmdBffer]);

        this.frameNum++;
    }
    run(){
        async function loop() {
            await physim.get().frame();
            requestAnimationFrame(loop);
        }
        loop();
    }


    
    device: GPUDevice;
    webgpuContext:GPUCanvasContext;
    canvas: HTMLCanvasElement;
    preferedCanvasTextureFormat: GPUTextureFormat;

    image:GPUTexture;
    imageView:GPUTextureView;
    imageWidth:number;
    imageHeight:number;

    path: pathTracer;
    present: canvasPresenter;

    frameNum: number;
}

export default physim;