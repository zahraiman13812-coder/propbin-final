"use client";
import {useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
export default function ChangePasswordPage(){
 const router=useRouter();const [current,setCurrent]=useState("");const [next,setNext]=useState("");const [confirm,setConfirm]=useState("");const [status,setStatus]=useState("");const [busy,setBusy]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();setStatus("");if(next!==confirm){setStatus("تکرار رمز جدید یکسان نیست.");return;}
 if(next.length<12){setStatus("رمز جدید باید حداقل ۱۲ کاراکتر باشد.");return;}
 setBusy(true);
 try{const response=await fetch("/api/admin/change-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({currentPassword:current,newPassword:next})});const body=await response.json();if(!response.ok){setStatus(body.error||"خطا در تغییر رمز");return;}
 setCurrent("");setNext("");setConfirm("");setStatus("رمز با موفقیت تغییر کرد. برای ورود مجدد هدایت می‌شوید.");router.replace("/admin-login");router.refresh();}
 catch{setStatus("ارتباط با سرور برقرار نشد.");}finally{setBusy(false);}}
 return <main dir="rtl" style={{maxWidth:560,margin:"3rem auto",padding:"1.5rem",border:"1px solid #475569",borderRadius:14}}><h1>تغییر رمز عبور مدیر</h1><p>پس از تغییر رمز، نشست‌های مدیریت قبلی نامعتبر می‌شوند.</p>
 <form onSubmit={submit} style={{display:"grid",gap:16}}>
 <label>رمز فعلی<input required type="password" autoComplete="current-password" value={current} onChange={e=>setCurrent(e.target.value)} style={{width:"100%",padding:10}} /></label>
 <label>رمز جدید (حداقل ۱۲ کاراکتر)<input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={next} onChange={e=>setNext(e.target.value)} style={{width:"100%",padding:10}} /></label>
 <label>تکرار رمز جدید<input required type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} style={{width:"100%",padding:10}} /></label>
 <button type="submit" disabled={busy} style={{padding:12,background:"#2563eb",color:"white",border:0,borderRadius:10,cursor:"pointer"}}>{busy?"در حال ذخیره...":"تغییر رمز عبور"}</button>
 {status&&<p role="status">{status}</p>}</form></main>;
}
