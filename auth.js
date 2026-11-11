import {initializeApp} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,sendPasswordResetEmail,sendEmailVerification,updateProfile,signOut,GoogleAuthProvider,signInWithPopup} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
const cfg=window.ROUTEFLOW_CONFIG||{},fb=cfg.firebase||{},base=(cfg.apiBaseUrl||"").replace(/\/$/,"");
const configured=!!(fb.apiKey&&fb.projectId&&fb.appId&&!fb.apiKey.startsWith("REPLACE_")&&!fb.projectId.startsWith("REPLACE_")&&base&&!base.includes("REPLACE_"));
let auth=null,user=null,profile=null,resolveReady;
const ready=new Promise(resolve=>resolveReady=resolve);
function notify(target,message,type){const el=typeof target==="string"?document.querySelector(target):target;if(el){el.textContent=message;el.className="account-notice "+(type||"info");el.hidden=false;}}
async function api(path,options){
 if(!user)throw new Error("Please sign in to continue.");
 const token=await user.getIdToken();
 const response=await fetch(base+path,{...(options||{}),headers:{"Content-Type":"application/json","Authorization":"Bearer "+token,...((options||{}).headers||{})}});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error||"Request failed ("+response.status+")");
 return data;
}
function updateAccountLinks(){
 document.querySelectorAll("[data-auth-link]").forEach(el=>{el.href=user?"dashboard.html":"login.html";el.textContent=user?"My account":"Sign in";});
 document.querySelectorAll("[data-user-name]").forEach(el=>el.textContent=user?(user.displayName||user.email||"traveller"):"traveller");
 document.querySelectorAll("[data-signed-in-only]").forEach(el=>el.hidden=!user);
 document.querySelectorAll("[data-signed-out-only]").forEach(el=>el.hidden=!!user);
}
if(configured){
 auth=getAuth(initializeApp(fb));
 onAuthStateChanged(auth,async next=>{
  user=next;profile=null;updateAccountLinks();resolveReady(user);
  if(user){try{const result=await api("/api/me");profile=result.profile;window.RouteFlowAuth.profile=profile;}catch(e){console.warn("RouteFlow profile sync failed:",e.message);}}
 });
}else{
 resolveReady(null);
 document.querySelectorAll("[data-config-warning]").forEach(el=>notify(el,"Accounts are not connected yet. Add your Firebase web-app settings and deployed Worker URL in firebase-config.js."));
}
window.RouteFlowAuth={
 get user(){return user;},get profile(){return profile;},set profile(value){profile=value;},get configured(){return configured;},ready,
 async signIn(email,password){if(!configured)throw new Error("Account service is not configured yet.");return signInWithEmailAndPassword(auth,email,password);},
 async register(email,password,name){if(!configured)throw new Error("Account service is not configured yet.");const credential=await createUserWithEmailAndPassword(auth,email,password);if(name)await updateProfile(credential.user,{displayName:name});await sendEmailVerification(credential.user);user=auth.currentUser;updateAccountLinks();await api("/api/me",{method:"PATCH",body:JSON.stringify({displayName:name||email.split("@")[0]})});return credential;},
 async google(){if(!configured)throw new Error("Account service is not configured yet.");return signInWithPopup(auth,new GoogleAuthProvider());},
 async resetPassword(email){if(!configured)throw new Error("Account service is not configured yet.");return sendPasswordResetEmail(auth,email);},
 async logout(){if(auth)await signOut(auth);location.href="index.html";},
 api,
 saveRoute(routeNumber){return api("/api/me/saved-routes",{method:"POST",body:JSON.stringify({routeNumber})});},
 removeRoute(routeNumber){return api("/api/me/saved-routes?routeNumber="+encodeURIComponent(routeNumber),{method:"DELETE"});},
 saveStop(stopId,stopName){return api("/api/me/saved-stops",{method:"POST",body:JSON.stringify({stopId,stopName})});},
 removeStop(stopId){return api("/api/me/saved-stops?stopId="+encodeURIComponent(stopId),{method:"DELETE"});},
 saveJourney(journey){return api("/api/me/saved-journeys",{method:"POST",body:JSON.stringify(journey)});},
 removeJourney(id){return api("/api/me/saved-journeys?id="+encodeURIComponent(id),{method:"DELETE"});}
};
document.addEventListener("click",async event=>{const button=event.target.closest("[data-signout]");if(button){event.preventDefault();window.RouteFlowAuth.logout();}});
