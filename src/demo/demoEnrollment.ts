// Development walkthrough only. Never use this state for real authentication.
type Enrollment = {phone:string;pin:string;name:string;registration:string;university:string;year:string};
let enrollment:Enrollment|null=null;
let demoSignedIn=false;
export function saveDemoEnrollment(value:Enrollment){enrollment=value;demoSignedIn=false;}
export function signInDemo(phone:string,pin:string){demoSignedIn=!!enrollment&&enrollment.phone===phone&&enrollment.pin===pin;return demoSignedIn;}
export function getDemoStudent(){return demoSignedIn?enrollment:null;}
export function signOutDemo(){demoSignedIn=false;}
