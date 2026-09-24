import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase-admin";
import { activatePendingInvitations } from "@/lib/invitations";

export async function POST(req:Request){
  try{
    const{idToken}=await req.json();
    if(typeof idToken!=="string")return NextResponse.json({error:"Missing ID token"},{status:400});
    const{auth,db}=getAdmin();
    const decoded=await auth.verifyIdToken(idToken);
    const token=await auth.createSessionCookie(idToken,{expiresIn:60*60*24*5*1000});
    await db.doc(`users/${decoded.uid}`).set({email:decoded.email??null,displayName:decoded.name??null,photoURL:decoded.picture??null,updatedAt:new Date(),createdAt:new Date()},{merge:true});
    const activatedInvitations=await activatePendingInvitations(decoded.uid,decoded.email,decoded.email_verified===true).catch(()=>0);
    const res=NextResponse.json({ok:true,activatedInvitations,emailVerificationRequired:Boolean(decoded.email&&!decoded.email_verified)});
    res.cookies.set("toro_session",token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*5});
    return res;
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Invalid credentials"},{status:401})}
}
export async function DELETE(){const res=NextResponse.json({ok:true});res.cookies.set("toro_session","",{httpOnly:true,expires:new Date(0),path:"/"});return res}
