import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const

const USDC_ABI = [{
  name: 'balanceOf',
  type: 'function',
  stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ name: '', type: 'uint256' }]
}] as const

export async function getOnChainUsdcBalance(address: string): Promise<number> {
  const client = createPublicClient({
    chain: base,
    transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
  })
  const raw = await client.readContract({
    address: USDC_CONTRACT,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  })
  return Number(raw)
}
