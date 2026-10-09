"use client";
import { useEffect,useState,useCallback } from "react";
import { SOURCE_CHOICE_STORAGE,validSourceChoice,type SourceChoice } from "./source-selection";
export function useSourceChoice() {
  const [sourceChoice,setSourceChoice]=useState<SourceChoice>("radar");
  useEffect(()=>{try{const saved=localStorage.getItem(SOURCE_CHOICE_STORAGE);if(validSourceChoice(saved))setSourceChoice(saved);}catch{/* Storage can be disabled; in-page selection remains usable. */}},[]);
  const chooseSource=useCallback((choice:SourceChoice)=>{setSourceChoice(choice);try{localStorage.setItem(SOURCE_CHOICE_STORAGE,choice);}catch{/* Use the choice for this opening. */}},[]);
  return {sourceChoice,chooseSource};
}
