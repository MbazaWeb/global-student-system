import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, ImagePlus, X } from "lucide-react";

export default function MerchantQrScanner({onScan,onClose}:{onScan:(value:string)=>void;onClose:()=>void}){
 const video=useRef<HTMLVideoElement>(null);
 const [camera,setCamera]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{
  if(!camera)return;
  let active=true;let stream:MediaStream|undefined;let frame=0;
  const canvas=document.createElement("canvas");const context=canvas.getContext("2d",{willReadFrequently:true});
  const scan=()=>{
   if(!active)return;
   const element=video.current;
   if(element&&element.readyState>=2&&element.videoWidth&&context){
    const scale=Math.min(1,1000/element.videoWidth);canvas.width=Math.round(element.videoWidth*scale);canvas.height=Math.round(element.videoHeight*scale);
    context.drawImage(element,0,0,canvas.width,canvas.height);
    const pixels=context.getImageData(0,0,canvas.width,canvas.height);const result=jsQR(pixels.data,pixels.width,pixels.height);
    if(result){setCamera(false);onScan(result.data);return;}
   }
   frame=requestAnimationFrame(scan);
  };
  void (async()=>{
   try{
    if(!navigator.mediaDevices?.getUserMedia)throw new Error("Camera unavailable. Upload a QR image instead.");
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
    if(!active){stream.getTracks().forEach(track=>track.stop());return;}
    if(video.current){video.current.srcObject=stream;await video.current.play();}scan();
   }catch(e){if(active){setError(e instanceof Error&&e.name==="NotAllowedError"?"Camera permission was denied. Allow the camera or upload a QR image.":"Unable to open camera. Upload a QR image instead.");setCamera(false);}}
  })();
  return()=>{active=false;cancelAnimationFrame(frame);stream?.getTracks().forEach(track=>track.stop());};
 },[camera,onScan]);
 async function upload(file:File){
  setError("");setCamera(false);
  let bitmap:ImageBitmap|undefined;
  try{
   if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>10485760)throw new Error("Choose a JPG, PNG or WebP QR image under 10 MB.");
   bitmap=await createImageBitmap(file);const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement("canvas");canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
   const context=canvas.getContext("2d");if(!context)throw new Error("Image decoding unavailable.");context.drawImage(bitmap,0,0,canvas.width,canvas.height);const pixels=context.getImageData(0,0,canvas.width,canvas.height);const result=jsQR(pixels.data,pixels.width,pixels.height);if(!result)throw new Error("No QR code found. Use a clearer image or enter the merchant number.");onScan(result.data);
  }catch(e){setError(e instanceof Error?e.message:"Could not read QR image.");}finally{bitmap?.close();}
 }
 return <section aria-label="Scan merchant QR" className="space-y-4 rounded-3xl border border-blue-200 bg-white p-5"><div className="flex items-center justify-between"><h2 className="font-bold">Scan merchant QR</h2><button type="button" onClick={onClose} aria-label="Close QR scanner" className="grid h-11 w-11 place-items-center rounded-full bg-slate-100"><X size={19}/></button></div><p className="text-sm text-slate-500">Scan an S Wallet merchant QR or choose its image. Confirm the merchant before paying.</p>{camera&&<video ref={video} muted playsInline className="max-h-72 w-full rounded-2xl bg-slate-900"/>}{!camera&&<button type="button" onClick={()=>{setError("");setCamera(true);}} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 font-semibold text-white"><Camera size={19}/>Open camera</button>}<label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold"><ImagePlus size={19}/>Upload QR image<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value="";}}/></label>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}</section>;
}
