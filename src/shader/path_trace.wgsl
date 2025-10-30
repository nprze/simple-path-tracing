struct Input {
    plane_dist: f32,
    aspect_ratio: f32,
    one_over_texture_width: f32,
    one_over_texture_height: f32,
    camera_position: vec3<f32>,
    camera_orientation: vec3<f32>,
    camera_up: vec3<f32>,
    circles: array<vec4<f32>, circles_num> // circle xyz are coords, w is radius
};

struct Hit {
    did_hit: bool,
    normal: vec3<f32>,
    color: vec3<f32>,
    hit_pos: vec3<f32>
};

const F32_MAX: f32 = 3.4028234e38;
const max_ray_bounces:i32 = 4;

@group(0) @binding(0) var outputTex: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var<storage, read> input: Input;

fn hit_circle(base_position:vec3<f32>, circle:vec4<f32>, ray_dir:vec3<f32>)->Hit {
    let cam_pos_minus_circle_middle:vec3<f32> = base_position-circle.xyz;
    let b : f32 = 2 * dot(ray_dir, cam_pos_minus_circle_middle);
    let c : f32 = dot(cam_pos_minus_circle_middle, cam_pos_minus_circle_middle) - (circle.w * circle.w);
    let delta : f32 = (b*b) - (4*c);
    if (delta<0) {
        var hit : Hit;
        hit.did_hit = false;
        hit.color = vec3<f32>(0.0,0.0,0.0);
        return hit;
    }
    let delta_squared = sqrt(delta);
    // let x1 = (-b - delta_squared) * 0.5;
    // let x2 = (-b + delta_squared) * 0.5;
    // let smaller = select(x2, x1, x1<x2);
    // let i = base_position + (ray_dir * smaller);
    // var hit : Hit;
    // hit.did_hit = true;
    // hit.hit_pos = i;
    // hit.normal = normalize(i - circle.xyz);
    // return hit;
    let t1 = (-b - delta_squared) * 0.5;
    let t2 = (-b + delta_squared) * 0.5;

    var t = F32_MAX;
    if (t1 > 0.0) {
        t = t1;
    }
    if (t2 > 0.0 && t2 < t) {
        t = t2;
    }

    if (t == F32_MAX) {
        var hit: Hit;
        hit.did_hit = false;
        hit.color = vec3<f32>(0.0, 0.0, 0.0);
        return hit;
    }

    let i = base_position + (ray_dir * t);
    var hit: Hit;
    hit.did_hit = true;
    hit.hit_pos = i;
    hit.normal = normalize(i - circle.xyz);
    return hit;
}

fn trace_ray(base_position: vec3<f32>, ray_dir: vec3<f32>) -> vec3<f32> {
    var current_pos = base_position;
    var current_dir = ray_dir;
    var accumulated_color = vec3<f32>(0.0, 0.0, 0.0);

    var remaining_bounces = max_ray_bounces;

    loop {
        if (remaining_bounces == 0) {
            break;
        }
        let n = max_ray_bounces - remaining_bounces;
        let multiplier = pow(0.5, f32(n)); 

        var smallest_hit: Hit;
        smallest_hit.did_hit = false;
        smallest_hit.hit_pos = vec3<f32>(F32_MAX, F32_MAX, F32_MAX);
        var corcle_num: i32 = 0;

        for (var i: i32 = 0; i < circles_num; i = i + 1) {
            let hit: Hit = hit_circle(current_pos, input.circles[i], current_dir);
            if (hit.did_hit && (length(current_pos - smallest_hit.hit_pos) > length(current_pos - hit.hit_pos))) {
                smallest_hit = hit;
                corcle_num = i;
            }
        }

        if (!smallest_hit.did_hit) {
            accumulated_color = accumulated_color + multiplier * vec3<f32>(0., 0., 0.); 
            break;
        }

        var circle_color = smallest_hit.normal;
        if (corcle_num % 2 == 0){
            circle_color =  smallest_hit.normal;
        }
        accumulated_color = accumulated_color + circle_color * multiplier;

        // reflect 
        let normal = smallest_hit.normal;
        current_dir = normalize(current_dir - (2.0 * dot(current_dir, normal) * normal));
        current_pos = smallest_hit.hit_pos + (0.01 * normal);

        remaining_bounces -= 1;
    }
    return accumulated_color;
}

@compute @workgroup_size(16,16)
fn main(
    @builtin(global_invocation_id) id: vec3<u32>
) {
    let nx = (((f32(id.x) + 0.5) * input.one_over_texture_width) * 2.0 - 1.0) * input.aspect_ratio;
    let ny = (((f32(id.y) + 0.5) * input.one_over_texture_height)) * 2.0 - 1.0;
    let ray_dir = normalize(vec3<f32>(nx, ny, input.plane_dist));


    var color :vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
    
    
    color = trace_ray(input.camera_position, ray_dir);

    textureStore(outputTex, vec2<i32>(id.xy), vec4<f32>(color, 1.0));
}