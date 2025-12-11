import { vec4 } from "gl-matrix";


// a singleton to hold objects like circles and simplify the data exchange between path tracer and rasterizer
class objs {
    private static instance: objs;
    static get(): objs { return objs.instance; }
    
    static create() {
        objs.instance = new objs();
    }
    constructor() {
        objs.instance = this;

        this.circles = new Array<vec4>;
        this.planes = new Array<vec4>;

        this.addCenteredSpheres(3);

        this.addPlane(vec4.fromValues(0, 1, 0, -10));
    }
    addCenteredSpheres(circleCount:number){
        var circle_radius = 8.0;
        var dist = 0.0;
        var x = ((circleCount - 1) * (circle_radius)) * -0.5;
        var y = 0;
        var z = 20;
        this.circles = new Array<vec4>(circleCount); 
        for (var i = 0;i<circleCount;i++){
            this.circles[i] = vec4.fromValues(x, y, z, circle_radius);
            x += (dist + (circle_radius * 1.6));
        }
    }
    addSphere(pos_x : number, pos_y : number, pos_z : number, radius : number){
        this.circles.push(vec4.fromValues(pos_x, pos_y, pos_z, radius));
    }

    addPlane(planeVals:vec4){
        this.planes.push(planeVals);
    }

    circles: Array<vec4>;
    planes: Array<vec4>;
}

export default objs;