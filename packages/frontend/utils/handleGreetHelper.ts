import ConnextService from "../services/connextService";
import { BigNumberish, ethers, utils } from "ethers";
import {
  DestinationCallDataParams,
  SwapAndXCallParams,
} from "@connext/chain-abstraction/dist/types";
import { Hex, hexToBigInt } from "viem";
import { PublicClient } from "wagmi";
import { domainToChainID } from "./utils";

const ARBITRUM_PROTOCOL_TOKEN_ADDRESS =
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const POLYGON_WETH = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
const POLYGON_ADAPTER_CONTRACT = "0xbb54825eB3623daAB431061542d62Fd09Cc20087";

export const handleGreetHelper = async (
  connextService: ConnextService,
  originDomain: string,
  destinationDomain: string,
  originTransactingAsset: string,
  destinationDesiredAsset: string,
  destinationRpc: string,
  amountIn: BigNumberish,
  relayerFee: string,
  address: string,
  greeting: string,
  client: any,
  publicClient: PublicClient
) => {
  if (connextService && relayerFee) {
    try {
      const originChain = domainToChainID(originDomain);
      const destinationChain = domainToChainID(destinationDomain);

      const originUSDC = connextService.getNativeUSDCAddress(originChain);
      console.log(`originDomain: ${originDomain}, originUSDC: ${originUSDC}`);
      const destinationUSDC =
        connextService.getNativeUSDCAddress(destinationChain);
      console.log(
        `destinationDomain: ${destinationDomain}, destinationUSDC: ${destinationUSDC}`
      );

      const poolFee = await connextService.getPoolFeeForUniV3(
        destinationDomain,
        destinationUSDC, // destination USDC
        destinationDesiredAsset, // destination Token
        destinationRpc
      );

      console.log(`poolFee: ${poolFee}`);

      const params: DestinationCallDataParams = {
        fallback: address as `0x${string}`,
        swapForwarderData: {
          toAsset: destinationDesiredAsset,
          swapData: {
            amountOutMin: "0",
            poolFee,
          },
        },
      };

      const forwardCallData = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [POLYGON_WETH, greeting]
      );
      const xCallData = await connextService.getXCallCallDataHelper(
        destinationDomain,
        forwardCallData,
        params
      );
      console.log("originTransactingAsset: ", originTransactingAsset);
      const swapAndXCallParams: SwapAndXCallParams = {
        originDomain,
        destinationDomain,
        fromAsset:
          originTransactingAsset === ARBITRUM_PROTOCOL_TOKEN_ADDRESS
            ? ethers.constants.AddressZero
            : originTransactingAsset,
        toAsset: originUSDC,
        amountIn: amountIn.toString(),
        to: POLYGON_ADAPTER_CONTRACT,
        relayerFeeInNativeAsset: relayerFee,
        callData: xCallData,
      };
      console.log("swapAndXCallParams: ", swapAndXCallParams);

      const txRequest = await connextService.prepareSwapAndXCallHelper(
        swapAndXCallParams,
        address as Hex
      );
      console.log("txRequest: ", txRequest);

      if (txRequest && client) {
        // Cast the ethers.provider.TransactionRequest types to wagmi-compatible types
        const data = txRequest.data as Hex;
        const from = txRequest.from as Hex;
        const to = txRequest.to as Hex;
        const value = hexToBigInt(txRequest.value as Hex);

        // Approve if needed using Connext SDK
        const approveRequest = await connextService.approveIfNeeded(
          originDomain,
          originTransactingAsset,
          amountIn.toString()
        );

        if (approveRequest) {
          const approveTx = await client.sendTransaction({
            account: approveRequest.from as Hex,
            to: approveRequest.to as Hex,
            data: approveRequest.data as Hex,
          });
          console.log("approveTx: ", approveTx);
        } else {
          console.log("Allowance sufficient");
        }

        // Estimate gas for swapAndXCall
        const gasEstimate = await publicClient.estimateGas({
          account: address! as `0x${string}`,
          to: to,
          data: data,
          value: value,
        });
        console.log("gasEstimate: ", gasEstimate);

        // Send swapAndXcall transaction
        const xcallTxHash = await client.sendTransaction({
          account: from,
          to: to,
          data: data,
          value: value,
          gas: gasEstimate,
        });
        return {
          hash: xcallTxHash,
        };
      } else {
        return { err: "TxRequest Failed" };
      }
    } catch (error) {
      console.error("Failed to fetch relayer fee", error);
      return {
        err: "Failed to submit transaction",
      };
    }
  } else {
    return {
      err: "Failed to submit transaction",
    };
  }
};
