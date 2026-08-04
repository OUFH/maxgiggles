import { Contract, JsonRpcProvider, formatEther } from 'ethers';

const TOKEN='0xe9Bc5C6A86caA44fD7b469bf3cc7c563E4F77777';
const RPC='https://bsc-dataseed.binance.org';
const ABI=['function taxProcessor() view returns (address)'];

async function history(processor){
  const key=process.env.BSCSCAN_API_KEY || 'D6HAR2N5FBVBHXWDRSEUHWYPFATCHPZSKQ';
  if(!key) return {configured:false,rows:[]};
  const url=new URL('https://api.etherscan.io/v2/api');
  url.searchParams.set('chainid','56');
  url.searchParams.set('module','account');
  url.searchParams.set('action','txlistinternal');
  url.searchParams.set('address',processor);
  url.searchParams.set('startblock','0');
  url.searchParams.set('endblock','99999999');
  url.searchParams.set('sort','desc');
  url.searchParams.set('apikey',key);
  const response=await fetch(url);
  const json=await response.json();
  if(!Array.isArray(json.result)) return {configured:true,rows:[]};
  const p=processor.toLowerCase();
  return {
    configured:true,
    rows:json.result
      .filter(x=>String(x.from).toLowerCase()===p && BigInt(x.value||'0')>0n && x.isError!=='1')
      .map(x=>({hash:x.hash,valueBNB:Number(formatEther(x.value)),timestamp:Number(x.timeStamp),to:x.to}))
  };
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','s-maxage=30, stale-while-revalidate=120');
  try{
    const provider=new JsonRpcProvider(RPC,56,{staticNetwork:true});
    const token=new Contract(TOKEN,ABI,provider);
    const processor=await token.taxProcessor();
    const balance=await provider.getBalance(processor);
    const h=await history(processor);
    const total=h.rows.reduce((sum,row)=>sum+row.valueBNB,0);
    res.status(200).json({
      ok:true,
      token:TOKEN,
      processor,
      pendingBNB:Number(formatEther(balance)),
      totalDeliveredBNB:total,
      transferCount:h.rows.length,
      latestTimestamp:h.rows[0]?.timestamp||null,
      transactions:h.rows.slice(0,10),
      historyConfigured:h.configured
    });
  }catch(error){
    res.status(500).json({ok:false,error:error.message});
  }
}
