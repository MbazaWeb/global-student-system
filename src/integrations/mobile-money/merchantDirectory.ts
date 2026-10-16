export const merchantNetworks=[{id:"mpesa",name:"M-Pesa"},{id:"airtel",name:"Airtel Money"},{id:"mixx",name:"Mixx by Yas"},{id:"bank",name:"Bank"}] as const;
export type MerchantNetwork=typeof merchantNetworks[number]["id"];
export type Merchant={network:MerchantNetwork;number:string;name:string;code:string};
const examples:Merchant[]=[
 {network:"mpesa",number:"100001",name:"Campus Mini Market",code:"mpesa:100001"},
 {network:"airtel",number:"100002",name:"Student Cafeteria",code:"airtel:100002"},
 {network:"mixx",number:"100003",name:"University Bookshop",code:"mixx:100003"},
 {network:"bank",number:"100004",name:"Campus Print Centre",code:"bank:100004"},
 {network:"mpesa",number:"100005",name:"Residence Essentials Store",code:"mpesa:100005"},
 {network:"mpesa",number:"100006",name:"Demo Fresh Juice Bar",code:"mpesa:100006"},
 {network:"airtel",number:"100007",name:"Demo Student Laundry",code:"airtel:100007"},
 {network:"mixx",number:"100008",name:"Demo Tech Accessories",code:"mixx:100008"},
 {network:"bank",number:"100009",name:"Demo Campus Pharmacy",code:"bank:100009"},
 {network:"bank",number:"100010",name:"Demo Sports Store",code:"bank:100010"},
];
export function findDemoMerchant(network:string,number:string){return examples.find(item=>item.network===network&&item.number===number)??null;}
export function parseMerchantQr(raw:string):{network:MerchantNetwork;number:string}{
 let data:{network?:unknown;merchantNumber?:unknown};
 try{
  if(raw.trim().startsWith("{"))data=JSON.parse(raw);
  else {const url=new URL(raw);if(url.protocol!=="swallet:"||url.hostname!=="merchant")throw new Error();data={network:url.searchParams.get("network"),merchantNumber:url.searchParams.get("number")};}
 }catch{throw new Error("Unsupported QR. Scan an S Wallet merchant QR code.");}
 if(!data||!merchantNetworks.some(item=>item.id===data.network)||typeof data.merchantNumber!=="string"||!/^\d{4,20}$/.test(data.merchantNumber))throw new Error("QR must contain a supported network and merchant number.");
 return {network:data.network as MerchantNetwork,number:data.merchantNumber};
}
