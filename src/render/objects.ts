
export class circle{
    constructor(pos_x : number, pos_y : number, pos_z : number, radius : number){
        this.position = [pos_x, pos_y, pos_z];
        this.radius = radius;
    }
    position: [number, number, number];
    radius: number;
}

// a singleton to hold objects like circles and simplify the data exchange between path tracer and rasterizer
class phyobj {
    private static instance: phyobj;
    static get(): phyobj { return phyobj.instance; }
    
    static create() {
        phyobj.instance = new phyobj();
    }
    constructor() {
        phyobj.instance = this;

        this.circles = new Array<circle>;

        this.addCenteredCircles(3);
    }
    addCenteredCircles(circleCount:number){
        var circle_radius = 8.0;
        var dist = 0.0;
        var x = ((circleCount - 1) * (circle_radius)) * -0.5;
        var y = 0;
        var z = 20;
        this.circles = new Array<circle>(circleCount); 
        for (var i = 0;i<circleCount;i++){
            this.circles[i] = new circle(x, y, z, circle_radius);
            x += (dist + (circle_radius * 1.6));
        }
    }

    addCircle(pos_x : number, pos_y : number, pos_z : number, radius : number){
        this.circles.push(new circle(pos_x, pos_y, pos_z, radius));
    }

    circles: Array<circle>;
}

export default phyobj;