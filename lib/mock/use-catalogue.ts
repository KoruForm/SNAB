"use client";
import { useEffect, useState } from "react";
import { getPhotos, listDrafts } from "../drafts/storage";
import { fetchListedSales } from "../public/browse";
import { getSupabase } from "../supabase/client";
import { demoSales, toBuyerSale, type BuyerSale } from "./catalogue";
import { readPreferences, type Preferences } from "./preferences";
import { useAccount } from "../supabase/use-account";
export function useCatalogue() {
  const [sales, setSales] = useState<BuyerSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const account = useAccount();
  useEffect(()=>{ if(account.loading) return; let active=true;
    // Your own sales (device or account), everyone's published sales, then the samples. Your own copy wins.
    const own = listDrafts().then(drafts => Promise.all(drafts.filter(d=>d.status!=="draft").map(async d=>toBuyerSale(d,await getPhotos(d.id)))));
    const supabase = getSupabase();
    const listed = supabase ? fetchListedSales(supabase) : Promise.resolve([]);
    Promise.allSettled([own, listed]).then(([mine, others]) => {
      if(!active) return;
      const ownSales = mine.status==="fulfilled" ? mine.value : [];
      const ownIds = new Set(ownSales.map(s=>s.id));
      const listedSales = others.status==="fulfilled" ? others.value.filter(s=>!ownIds.has(s.id)) : [];
      setSales([...ownSales,...listedSales,...demoSales()]);
      setError(mine.status==="rejected" ? "Your own sales couldn’t be opened. Other sales are still available." : others.status==="rejected" ? others.reason instanceof Error ? others.reason.message : "Couldn’t load sales near you." : "");
      setLoading(false);
    });
    return()=>{active=false;}; },[account.loading, account.userId]);
  return {sales,loading,error};
}
export function usePreferences() {
  const [prefs, setPrefs]=useState<Preferences>({savedSales:[],savedItems:[],treasures:[],name:"",demoSignedIn:false});
  const [error,setError]=useState("");
  useEffect(()=>{ const update=()=>setPrefs(readPreferences()); queueMicrotask(update); window.addEventListener("snab-preferences",update);window.addEventListener("storage",update);return()=>{window.removeEventListener("snab-preferences",update);window.removeEventListener("storage",update);};},[]);
  function act(action:()=>void){try{action();setError("");}catch{setError("Your browser couldn’t save that. Check that local storage is enabled.");}}
  return {prefs,error,act};
}
