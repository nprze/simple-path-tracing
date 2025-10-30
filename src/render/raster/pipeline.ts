async function fetchFileAsString(url: string): Promise<string> {
  const response = await fetch(url);
  return await response.text();
}


export async function createRasterizerRenderPipeline(device:GPUDevice, shaderPath:string, format:GPUTextureFormat, topology:GPUPrimitiveTopology = "triangle-strip"):Promise<GPURenderPipeline>{
  const renderShader: string = await fetchFileAsString(shaderPath);
  const renderModule = device.createShaderModule({ code: renderShader });


    return device.createRenderPipeline({
        layout: "auto",
        vertex: { module: renderModule, entryPoint: "vs_main" },
        fragment: {
            module: renderModule,
            entryPoint: "fs_main",
            targets: [{ format }],
        },
        primitive: { topology },
    });
}