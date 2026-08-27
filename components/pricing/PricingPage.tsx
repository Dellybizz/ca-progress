"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, Check, Crown, ShieldCheck } from "lucide-react";
import { useProgress } from "@/context/ProgressContext";

type Plan = { id: string; slug: string; name: string; rank: number; price_monthly: number; active: boolean };
type CheckoutResponse = { razorpay_order_id:string; razorpay_payment_id:string; razorpay_signature:string };
type RazorpayConstructor = new (options: Record<string, unknown>) => { open(): void };

declare global { interface Window { Razorpay?: RazorpayConstructor } }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const publicSupabase = url && key ? createClient(url,key) : null;

function loadCheckout() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PricingPage() {
  const { session, planSlug, authLoading, requireAuth } = useProgress();
  const [plans,setPlans] = useState<Plan[]>([]);
  const [busy,setBusy] = useState("");
  const [notice,setNotice] = useState("");

  useEffect(()=>{ publicSupabase?.from("subscription_plans").select("*").eq("active",true).order("rank").then(({data})=>setPlans((data||[]) as Plan[])); },[]);

  const purchase = async(plan:Plan) => {
    if(!session){ requireAuth(); return; }
    if(plan.slug==="free"){ window.location.href="/dashboard"; return; }
    setBusy(plan.id); setNotice("");
    try {
      const loaded=await loadCheckout();
      if(!loaded || !window.Razorpay) throw new Error("Payment window could not be loaded");
      const response=await fetch("/api/payments/create-order",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({planId:plan.id})});
      const order=await response.json() as {error?:string;orderId?:string;amount?:number;currency?:string;planName?:string;keyId?:string};
      if(!response.ok||!order.orderId) throw new Error(order.error||"Could not start payment");
      const checkout=new window.Razorpay({
        key:order.keyId,amount:order.amount,currency:order.currency,name:"CA Progress",description:`${order.planName} monthly subscription`,order_id:order.orderId,
        prefill:{name:session.user.user_metadata?.full_name||session.user.user_metadata?.name||"",email:session.user.email||"",contact:session.user.phone||""},
        theme:{color:"#2863c7"},
        handler:async(result:CheckoutResponse)=>{
          const verify=await fetch("/api/payments/verify",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(result)});
          const verified=await verify.json() as {error?:string};
          if(!verify.ok) { setNotice(verified.error||"Payment verification failed"); return; }
          setNotice("Payment verified. Your subscription is now active.");
          window.setTimeout(()=>window.location.href="/dashboard",1600);
        },
        modal:{ondismiss:()=>setBusy("")}
      });
      checkout.open();
    } catch(error) { setNotice(error instanceof Error?error.message:"Could not start payment"); }
    finally { setBusy(""); }
  };

  return <main className="pricing-shell"><header><a href="/dashboard"><ArrowLeft size={17}/>Dashboard</a><span>CA Progress</span><button onClick={()=>session?window.location.href="/settings":requireAuth()}>{session?"Settings":"Sign in"}</button></header>
    <section className="pricing-hero"><span className="pricing-kicker"><Crown size={15}/>Membership plans</span><h1>Choose the tools that match your preparation</h1><p>Upgrade securely and unlock eligible sections immediately. Plans renew manually each month.</p></section>
    {authLoading?<p className="pricing-loading">Loading account…</p>:<section className="pricing-grid">{plans.map(plan=><article key={plan.id} className={plan.slug==="pro"?"featured":""}>{plan.slug==="pro"&&<span className="popular">Most popular</span>}<h2>{plan.name}</h2><div className="price">{Number(plan.price_monthly)===0?"Free":<>₹{Number(plan.price_monthly).toLocaleString("en-IN")}<small>/month</small></>}</div><ul><li><Check/>Course-specific dashboard</li><li><Check/>Progress and study tools</li><li><Check/>{plan.rank>0?"Premium sections based on plan":"Core free sections"}</li><li><ShieldCheck/>Secure account sync</li></ul><button disabled={busy===plan.id||planSlug===plan.slug} onClick={()=>purchase(plan)}>{planSlug===plan.slug?"Current plan":busy===plan.id?"Starting checkout…":plan.slug==="free"?"Continue free":`Choose ${plan.name}`}</button></article>)}</section>}
    {notice&&<div className="pricing-notice">{notice}</div>}<style>{styles}</style></main>;
}

const styles=`*{box-sizing:border-box}.pricing-shell{min-height:100dvh;background:radial-gradient(circle at top,#edf4ff 0,#f6f8fc 38%,#f6f8fc 100%);color:#17263d;font-family:Inter,system-ui,sans-serif;padding-bottom:60px}.pricing-shell>header{height:70px;max-width:1120px;margin:auto;display:flex;align-items:center;justify-content:space-between;padding:0 24px}.pricing-shell>header a{display:flex;align-items:center;gap:7px;color:#617087;text-decoration:none;font-size:13px}.pricing-shell>header span{font-weight:850;color:#2863c7}.pricing-shell>header button{border:1px solid #d9e1ed;background:#fff;border-radius:9px;padding:9px 14px;color:#33465f}.pricing-hero{text-align:center;max-width:700px;margin:55px auto 35px;padding:0 20px}.pricing-kicker{display:inline-flex;align-items:center;gap:7px;color:#2863c7;font-weight:750;font-size:12px}.pricing-hero h1{font-size:42px;line-height:1.08;margin:14px 0}.pricing-hero p{color:#708098;line-height:1.7}.pricing-grid{max-width:1000px;margin:auto;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;padding:0 20px}.pricing-grid article{position:relative;background:#fff;border:1px solid #dfe6ef;border-radius:18px;padding:25px;box-shadow:0 15px 50px rgba(39,61,95,.07)}.pricing-grid article.featured{border:2px solid #3a73d8;transform:translateY(-7px)}.popular{position:absolute;right:17px;top:17px;background:#eaf1ff;color:#2863c7;border-radius:999px;padding:5px 8px;font-size:9px;font-weight:800}.pricing-grid h2{margin:0 0 16px}.price{font-size:32px;font-weight:850}.price small{font-size:11px;color:#7c899b;font-weight:500}.pricing-grid ul{list-style:none;padding:15px 0;margin:12px 0;border-top:1px solid #edf0f4;display:grid;gap:11px}.pricing-grid li{display:flex;align-items:center;gap:8px;color:#5c6b80;font-size:12px}.pricing-grid li svg{width:15px;color:#3471d5}.pricing-grid article>button{width:100%;height:42px;border:0;border-radius:10px;background:#2863c7;color:#fff;font-weight:750}.pricing-grid article>button:disabled{background:#d9e1ed;color:#718096}.pricing-notice{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);padding:12px 17px;border-radius:10px;background:#172c4c;color:#fff;font-size:12px;box-shadow:0 10px 30px #0002}.pricing-loading{text-align:center}@media(max-width:760px){.pricing-hero{margin-top:30px}.pricing-hero h1{font-size:32px}.pricing-grid{grid-template-columns:1fr;max-width:430px}.pricing-grid article.featured{transform:none}.pricing-shell>header{height:60px;padding:0 15px}}`;

