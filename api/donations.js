import { Contract, JsonRpcProvider, formatEther } from 'ethers';

const TOKEN = '0xe9Bc5C6A86caA44fD7b469bf3cc7c563E4F77777';
const DEFAULT_NODEREAL_RPC = 'https://bsc-mainnet.nodereal.io/v1/64a9df0874fb4a93b9d0a3849de012d3';
const RPC = process.env.NODEREAL_RPC_URL || DEFAULT_NODEREAL_RPC;
const ABI = ['function taxProcessor() view returns (address)'];
const MAX_PAGES = 12;

async function rpcRequest(method, params) {
  const response = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  });

  if (!response.ok) {
    throw new Error(`NodeReal HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(payload.error.message || 'NodeReal RPC error');
  }
  return payload.result;
}

function parseTransfer(row) {
  const rawValue = row?.value || '0x0';
  let valueWei = 0n;
  try {
    valueWei = BigInt(rawValue);
  } catch {
    return null;
  }

  if (valueWei <= 0n || Number(row?.receiptsStatus ?? 1) !== 1) return null;

  return {
    hash: row.hash,
    from: String(row.from || '').toLowerCase(),
    to: String(row.to || '').toLowerCase(),
    category: row.category || 'internal',
    valueWei,
    valueBNB: Number(formatEther(valueWei)),
    timestamp: Number(row.blockTimeStamp ?? row.blockTimestamp ?? 0),
    blockNumber: row.blockNum ? Number(BigInt(row.blockNum)) : null
  };
}

async function getOutgoingTransfers(processor) {
  const rows = [];
  let pageKey;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const filter = {
      category: ['external', 'internal'],
      fromAddress: processor,
      order: 'desc',
      excludeZeroValue: true,
      maxCount: '0x3e8'
    };
    if (pageKey) filter.pageKey = pageKey;

    const result = await rpcRequest('nr_getAssetTransfers', [filter]);
    const transfers = Array.isArray(result?.transfers) ? result.transfers : [];
    rows.push(...transfers);
    pageKey = result?.pageKey;
    if (!pageKey || transfers.length === 0) break;
  }

  const processorLower = processor.toLowerCase();
  const seen = new Set();
  return rows
    .map(parseTransfer)
    .filter(Boolean)
    .filter(row => row.from === processorLower && row.to && row.to !== processorLower)
    .filter(row => {
      const key = `${row.hash}:${row.to}:${row.valueWei.toString()}:${row.category}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function summarizeRecipient(transfers) {
  const byRecipient = new Map();
  for (const transfer of transfers) {
    const current = byRecipient.get(transfer.to) || { valueWei: 0n, count: 0 };
    current.valueWei += transfer.valueWei;
    current.count += 1;
    byRecipient.set(transfer.to, current);
  }

  const ranked = [...byRecipient.entries()].sort((a, b) => {
    if (a[1].valueWei === b[1].valueWei) return b[1].count - a[1].count;
    return a[1].valueWei > b[1].valueWei ? -1 : 1;
  });

  const recipient = ranked[0]?.[0] || null;
  const recipientTransfers = recipient
    ? transfers.filter(transfer => transfer.to === recipient)
    : [];

  return { recipient, recipientTransfers, recipientCount: ranked.length };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');

  try {
    const provider = new JsonRpcProvider(RPC, 56, { staticNetwork: true });
    const token = new Contract(TOKEN, ABI, provider);
    const processor = await token.taxProcessor();
    const balance = await provider.getBalance(processor);

    let transfers = [];
    let historyAvailable = true;
    let historyError = null;

    try {
      transfers = await getOutgoingTransfers(processor);
    } catch (error) {
      historyAvailable = false;
      historyError = error.message;
    }

    const { recipient, recipientTransfers, recipientCount } = summarizeRecipient(transfers);
    const totalWei = recipientTransfers.reduce((sum, row) => sum + row.valueWei, 0n);

    res.status(200).json({
      ok: true,
      source: 'NodeReal',
      token: TOKEN,
      processor,
      recipient,
      recipientInference: recipient ? 'largest aggregate outgoing BNB destination' : null,
      recipientCount,
      pendingBNB: Number(formatEther(balance)),
      totalDeliveredBNB: Number(formatEther(totalWei)),
      transferCount: recipientTransfers.length,
      latestTimestamp: recipientTransfers[0]?.timestamp || null,
      transactions: recipientTransfers.slice(0, 10).map(({ valueWei, ...row }) => row),
      historyAvailable,
      historyError
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}
