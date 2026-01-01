struct Input {
    plane_dist: f32,
    aspect_ratio: f32,
    one_over_texture_width: f32,
    one_over_texture_height: f32,
    camera_position: vec3<f32>,
    camera_direction: vec3<f32>,
    camera_perpendicular: vec3<f32>,
    circles: array<vec4<f32>, circles_num>, // circle xyz are coords, w is radius
    planes: array<vec4<f32>, planes_num> // plane xyz is normal, w is offset from 0
};

struct Hit {
    did_hit: bool,
    normal: vec3<f32>,
    distToHit: f32,
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
    hit.color = vec3<f32>(0.0, 0.5, 0.5);
    hit.hit_pos = i;
    hit.normal = normalize(i - circle.xyz);
    hit.distToHit = t;
    return hit;
}

fn hit_plane(base_position:vec3<f32>, plane:vec4<f32>, ray_dir:vec3<f32>)->Hit {
    var hit:Hit;
    let denom = dot(ray_dir, plane.xyz);
    if (abs(denom) > 1e-4) {
        let t = -(dot(base_position, plane.xyz) + plane.w) / denom;
        if (t > 0.0) {
            // hit
            hit.did_hit = true;
            hit.normal = plane.xyz;
            hit.color = vec3<f32>(0.15,0.4,0.025);
            hit.hit_pos = base_position + (t*ray_dir);
            hit.distToHit = t;
            return hit;    
        }
        hit.did_hit = false;
        return hit;
    }
    hit.did_hit = false;
    return hit;
}

fn color_multiplier(bounce_index: i32, max_bounces: i32) -> f32 {
    let r = 0.75;

    let nf = f32(max_bounces);
    let ifl = f32(bounce_index);

    let denom = 1.0 - pow(r, nf);
    let a = 0.98 * (1.0 - r) / denom;

    return a * pow(r, ifl);
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
        let multiplier = color_multiplier(n, max_ray_bounces);

        var smallest_hit: Hit;
        smallest_hit.did_hit = false;
        smallest_hit.hit_pos = vec3<f32>(F32_MAX, F32_MAX, F32_MAX);
        smallest_hit.distToHit = F32_MAX;
        var corcle_num: i32 = 0;

        for (var i: i32 = 0; i < planes_num; i = i + 1) {
            let hitPlane: Hit = hit_plane(current_pos, input.planes[i], current_dir);
            if (hitPlane.did_hit && (smallest_hit.distToHit > hitPlane.distToHit)) {
                smallest_hit = hitPlane;
                corcle_num = -1;
            }
        }
        for (var i: i32 = 0; i < circles_num; i = i + 1) {
            let hit: Hit = hit_circle(current_pos, input.circles[i], current_dir);
            if (hit.did_hit && (smallest_hit.distToHit > hit.distToHit)) {
                smallest_hit = hit;
                corcle_num = i;
            }
        }

        if (!smallest_hit.did_hit) {
            let dotDirUp = dot(vec3<f32>(0,-1,0), current_dir) * 0.5 + 0.5;
            let intensity = clamp(0.5 * dotDirUp, 0.0, 1.0);
            if (remaining_bounces == max_ray_bounces){
                accumulated_color = accumulated_color + f32(1/n) * 0.9 * vec3<f32>(intensity * 0.5 + 0.2, intensity * 0.7 + 0.2, intensity*0.5 + 0.4); 
            }else{
                accumulated_color = accumulated_color + multiplier * 3 * vec3<f32>(intensity, intensity, intensity); 
            }
            break;
        }else{
            accumulated_color = accumulated_color + smallest_hit.color * multiplier;
        }

        // reflect 
        let normal = smallest_hit.normal;
        let reflected = normalize(current_dir - (2.0 * dot(current_dir, normal) * normal));

        let roughness = 0.05;
        let rand = vec3<f32>(0,0,0);//random_in_hemisphere(reflected, smallest_hit.hit_pos);
        current_dir = normalize(reflected + roughness * rand);
        current_pos = smallest_hit.hit_pos + normal * 0.001;
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

    // calculate ray direction
    let dir = input.camera_direction;//vec3<f32>(0,0,1);
    let right_left = input.camera_perpendicular;
    let top_bottom = -normalize(cross(dir, right_left));

    let ray_dir = normalize(vec3<f32>((dir * input.plane_dist)+(right_left *nx)+(top_bottom*ny)));

    //let ray_dir = normalize(vec3<f32>(nx, ny, input.plane_dist));

    var color :vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
    
    color = trace_ray(input.camera_position, ray_dir);

    textureStore(outputTex, vec2<i32>(id.xy), vec4<f32>(color, 1.0));
}