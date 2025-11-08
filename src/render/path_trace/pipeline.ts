async function fetchFileAsString(url: string): Promise<string> {
  const response = await fetch(url);
  return await response.text();
}

export async function createComputePipeline(device:GPUDevice, shaderPath:string, circleCount:number=1, planeCount:number=1):Promise<GPUComputePipeline>{
  const computeShader: string = await fetchFileAsString(shaderPath);
  let shaderFirstLine: string = "const circles_num = " +circleCount+";";
  shaderFirstLine += "\nconst planes_num = " +planeCount+";";
  const computeModule = device.createShaderModule({ code: shaderFirstLine+computeShader });
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        storageTexture: {
          access: "write-only",
          format: "rgba8unorm",
          viewDimension: "2d"
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "read-only-storage" }
      }
    ]
  });

 return device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    compute: { module: computeModule, entryPoint: "main" }
  });
}


export async function createRenderPipeline(device:GPUDevice, shaderPath:string, format:GPUTextureFormat, topology:GPUPrimitiveTopology = "triangle-strip"):Promise<GPURenderPipeline>{
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