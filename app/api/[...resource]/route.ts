import { NextResponse } from 'next/server'
import { readDatabase, transaction } from '@/lib/online-db'
import { apiError } from '@/lib/ai-server'
export const dynamic='force-dynamic'
export async function GET(_:Request,{params}:{params:Promise<{resource:string[]}>}){
 try{const {resource}=await params;const db=await transaction(c=>readDatabase(c));const map:Record<string,unknown>={products:db.products,customers:db.customers,suppliers:db.suppliers,purchases:db.purchases,invoices:db.invoices,expenses:db.expenses,'raw-materials':db.rawMaterials,'cash-bank':db.accounts,production:db.productionRuns,dashboard:db,settings:db.companyProfile};return resource[0] in map?NextResponse.json({data:map[resource[0]],meta:{mode:'online'}},{headers:{'Cache-Control':'no-store'}}):NextResponse.json({error:'Unknown resource'},{status:404})}catch(e){return apiError(e)}
}
