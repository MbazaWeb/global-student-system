// UI simulation only. Production PIN/OTP checks must be handled by the bank server.
export type DemoBank = { bank:string; name:string; number:string; phone:string };
type Challenge = { userId:string; payload:string; expires:number; attempts:number };
const linked=new Map<string,DemoBank>();
const challenges=new Map<string,Challenge>();
const grants=new Map<string,Challenge>();
export const DEMO_PIN="1234";
export const DEMO_OTP="123456";
export const getDemoBank=(userId:string)=>linked.get(userId)??null;
export const bankPayload=(bank:string,number:string,amount:number,purpose:string,merchantCode?:string)=>JSON.stringify([bank.trim(),number,amount,purpose,merchantCode??""]);
export function startBankOtp(userId:string,payload:string){
 const id=crypto.randomUUID();
 challenges.set(id,{userId,payload,expires:Date.now()+300000,attempts:0});
 return id;
}
export function confirmBankOtp(id:string,userId:string,code:string){
 const challenge=challenges.get(id);
 if(!challenge||challenge.userId!==userId||Date.now()>challenge.expires||challenge.attempts>=5){challenges.delete(id);throw new Error("Code expired or attempt limit reached. Start again.");}
 challenge.attempts++;
 if(code!==DEMO_OTP)throw new Error(`Incorrect demo code. ${5-challenge.attempts} attempts remaining.`);
 challenges.delete(id);
 const token=crypto.randomUUID();grants.set(token,challenge);return token;
}
export function consumeBankOtp(token:string|undefined,userId:string,payload:string){
 const grant=token?grants.get(token):undefined;
 if(!grant||grant.userId!==userId||grant.payload!==payload||Date.now()>grant.expires)throw new Error("Confirm a fresh OTP for this bank transaction.");
 grants.delete(token!);
}
export function linkDemoBank(userId:string,bank:DemoBank,token:string){
 consumeBankOtp(token,userId,JSON.stringify(bank));linked.set(userId,{...bank});
}
