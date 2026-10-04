"use client";
import { useEffect, useState } from "react";
import { getPhotos, listDrafts } from "../drafts/storage";
import { demoSales, toBuyerSale, type BuyerSale } from "./catalogue";
import { readPreferences, type Preferences } from "./preferences";
export function useCatalogue() {
  const [sales, setSales] = useState<BuyerSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(()=>{ let active=true; listDrafts().then(async drafts => {
    const local = await Promise.all(drafts.filter(d=>d.status!=="draft").map(async d=>toBuyerSale(d,await getPhotos(d.id))));
    if(active){setSales([...local,...demoSales()]);setLoading(false);}
  }).catch(()=>{if(active){setSales(demoSales());setError("Local sales couldn’t be opened. Sample sales are still available.");setLoading(false);}});return()=>{active=false;}; },[]);
  return {sales,loading,error};
}
export function usePreferences() {
  const [prefs, setPrefs]=useState<Preferences>({savedSales:[],savedItems:[],treasures:[],name:"",demoSignedIn:false,reports:[]});
  const [error,setError]=useState("");
  useEffect(()=>{ const update=()=>setPrefs(readPreferences()); queueMicrotask(update); window.addEventListener("snab-preferences",update);window.addEventListener("storage",update);return()=>{window.removeEventListener("snab-preferences",update);window.removeEventListener("storage",update);};},[]);
  function act(action:()=>void){try{action();setError("");}catch{setError("Your browser couldn’t save that. Check that local storage is enabled.");}}
  return {prefs,error,act};
}
