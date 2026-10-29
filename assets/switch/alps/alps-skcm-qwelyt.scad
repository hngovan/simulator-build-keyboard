module stem(){
  difference(){
    cube([4,6,4],center=true);
    translate([0,0,1])cube([2,4,4],center=true);
    translate([2,3,0])cube([1,1,4.2],center=true);
    translate([-2,3,0])cube([1,1,4.2],center=true);
    translate([2,-3,0])cube([1,1,4.2],center=true);
    translate([-2,-3,0])cube([1,1,4.2],center=true);
  }
  
  
  translate([1,3,0])cube([1,1,4],center=true);
  translate([-1,3,0])cube([1,1,4],center=true);
  translate([1,-3,0])cube([1,1,4],center=true);
  translate([-1,-3,0])cube([1,1,4],center=true);
}

module top(){
  module d(){
    difference(){
      cube([1.1,2.1,3.1],center=true);
      translate([-0.54,0,0])rotate([0,18.5,0])cube([1,2.2,3.6],center=true);
    }
  }
  
  cube([6,17,1],center=true);
  cube([14,6,1],center=true);

  translate([0,0,3]){
    difference(){
      union(){
        cube([12,11,7],center=true);
        cube([12.5,11,6],center=true);
        difference(){
          cube([6,12,7],center=true);
          translate([0,6,3.7])rotate([45,0,0])cube([7,1,2],center=true);
          translate([0,-6,3.7])rotate([-45,0,0])cube([7,1,2],center=true);
        }
        
      }
      translate([12*0.5-0.299,11*0.5-1,-2.5])d();
      translate([12*0.5-0.299,-11*0.5+1,-2.5])d();
      
      translate([-12*0.5+0.299,11*0.5-1,-2.5])rotate([0,0,180])d();
      translate([-12*0.5+0.299,-11*0.5+1,-2.5])rotate([0,0,180])d();
    }
  }
}

module bottom(){
  
  module f(){
    difference(){
      cube([3,0.2,3],center=true);
      translate([-1.05,0,-1.05])rotate([0,45,0])cube([6,0.5,3],center=true);
    }
  }

  module bSide(){
    difference(){
      cube([10,0.5,4],center=true);
    
      translate([7,0,0])rotate([0,-15,0])cube([5,1,6],center=true);
      translate([-7,0,0])rotate([0,15,0])cube([5,1,6],center=true);
    }
    
    module e(){translate([4,-0.14,0])rotate([-9,45/2,30])f();}
    
    e();
    mirror([1,0,0])e();
  }
  
  cube([12,13.5,4],center=true);
  translate([0,13.5*0.51,0])bSide();
  translate([0,-13.5*0.51,0])rotate([0,0,180])bSide();
}

module legs(){
  module leg(){
    difference(){
      cube([0.3,1,4],center=true);
      
      translate([0,-0.8,-2])rotate([20,0,0])cube([1,1,2],center=true);
      translate([0,-0.75,-2])rotate([30,0,0])cube([1,1,2],center=true);
      translate([0,0.8,-2])rotate([-20,0,0])cube([1,1,2],center=true);
      translate([0,0.75,-2])rotate([-30,0,0])cube([1,1,2],center=true);
    }
  }
  
  translate([0,2.5,0])leg();
  translate([0.254,-2.5,0])leg();
}

union(){
  translate([0,0,11])stem();
  translate([0,0,2.5])top();
  bottom();
  translate([-(13*0.5-2),0,-4])legs();
}

//translate([20,0,0])import("ALPS-switch.stl");