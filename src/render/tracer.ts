import objs from "./objects";
import { canvasPresenter } from "./path_trace/canvas_present";
import { pathTracer } from "./path_trace/path_tracing"

// a singleton to hold the data :3
class tracer {
    private static instance: tracer;
    static get(): tracer { return tracer.instance; }
    
    static async create() {
        const pathTracingCanvas = document.getElementById("path-tracing-canvas") as HTMLCanvasElement;
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) throw new Error("WebGPU not supported");
        const device = await adapter.requestDevice();
        const context = pathTracingCanvas.getContext("webgpu") as GPUCanvasContext;

        const format = navigator.gpu.getPreferredCanvasFormat();
        context.configure({ device, format, alphaMode: "opaque" });

        tracer.instance = new tracer(device, context, pathTracingCanvas, format); 

        objs.create();
        
        await tracer.get().init();
    }
    constructor(device:GPUDevice, webgpuContext:GPUCanvasContext, canvas: HTMLCanvasElement, format: GPUTextureFormat) {
        tracer.instance = this;

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
        await this.path.initPathtracer(objs.get().circles.length, objs.get().planes.length);
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
            await tracer.get().frame();
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

export default tracer;