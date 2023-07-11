import { ethers } from "ethers";

export const getTokenBalace = async (
  owner: string,
  tokenAddress: string,
  rpc: string
) => {
  try {
    const erc20ABI = ["function balanceOf(address) view returns (uint)"];
    const providers = new ethers.providers.JsonRpcProvider(rpc);
    const contract = new ethers.Contract(tokenAddress, erc20ABI, providers);
    let tokenBalance = await contract.balanceOf(owner);
    let ethBalance = await providers.getBalance(owner);
    console.log("ETH Balance: ", ethers.utils.formatEther(tokenBalance));
    return {
      ethBalance,
      tokenBalance,
    };
  } catch (err) {
    console.log("Failed to get balance" + err);
    return {
      err: "Failed to fetch balance",
    };
  }
};
