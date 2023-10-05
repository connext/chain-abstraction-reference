import ConnextService from "../services/connextService";
import { BigNumberish, utils, constants } from "ethers";
import {
  DestinationCallDataParams,
  SwapAndXCallParams,
} from "@connext/chain-abstraction/dist/types";
import { Hex, hexToBigInt } from "viem";
import { PublicClient, WalletClient, erc20ABI } from "wagmi";
import { domainToChainID } from "./utils";

const ARBITRUM_PROTOCOL_TOKEN_ADDRESS =
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

const MATIC_ADDRESS = "0x0000000000000000000000000000000000001010";

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
  walletClient: WalletClient,
  publicClient: PublicClient,
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
        `destinationDomain: ${destinationDomain}, destinationUSDC: ${destinationUSDC}`,
      );

      const poolFee = await connextService.getPoolFeeForUniV3(
        destinationDomain,
        destinationUSDC, // destination USDC
        destinationDesiredAsset, // destination Token
        destinationRpc,
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

      const forwardCallData = utils.defaultAbiCoder.encode(
        ["address", "string"],
        [POLYGON_WETH, greeting],
      );
      const xCallData = await connextService.getXCallCallDataHelper(
        destinationDomain,
        forwardCallData,
        params,
      );
      console.log("originTransactingAsset: ", originTransactingAsset);
      const swapAndXCallParams: SwapAndXCallParams = {
        originDomain,
        destinationDomain,
        fromAsset:
          originTransactingAsset === ARBITRUM_PROTOCOL_TOKEN_ADDRESS
            ? constants.AddressZero
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
        address as Hex,
      );
      console.log("txRequest: ", txRequest);

      if (txRequest && walletClient) {
        // Cast the ethers.provider.TransactionRequest types to wagmi-compatible types
        const data = txRequest.data as Hex;
        const from = txRequest.from as Hex;
        const to = txRequest.to as Hex;
        const value = hexToBigInt(txRequest.value.hex as Hex);

        // Approve to SwapAndXCall contract if needed
        const swapAndXCallContract =
          connextService.getSwapAndXcallAddressHelper(originDomain) as Hex;
        let isNativeToken = false;
        if (
          originTransactingAsset === constants.AddressZero ||
          originTransactingAsset === ARBITRUM_PROTOCOL_TOKEN_ADDRESS ||
          originTransactingAsset === MATIC_ADDRESS
        ) {
          isNativeToken = true;
        }
        if (!isNativeToken) {
          const allowance = await publicClient.readContract({
            address: originTransactingAsset as Hex,
            abi: erc20ABI,
            functionName: "allowance",
            args: [from, swapAndXCallContract],
          });

          if (allowance < BigInt(amountIn.toString())) {
            const { request: approveSwapAndXCallRequest } =
              await publicClient.simulateContract({
                address: originTransactingAsset as Hex,
                abi: erc20ABI,
                functionName: "approve",
                args: [swapAndXCallContract, BigInt(amountIn.toString())],
                account: from,
              });

            const approveSwapAndXCallTx = await walletClient.writeContract(
              approveSwapAndXCallRequest,
            );
            console.log("approveSwapAndXCallTx: ", approveSwapAndXCallTx);

            const approveSwapAndXCallReceipt =
              await publicClient.waitForTransactionReceipt({
                hash: approveSwapAndXCallTx,
              });
            console.log(
              "approveSwapAndXCallReceipt: ",
              approveSwapAndXCallReceipt,
            );
          } else {
            console.log("Allowance sufficient");
          }
        }

        // Estimate gas for swapAndXCall
        const gasEstimate = await publicClient.estimateGas({
          account: from,
          to: to,
          data: data,
          value: value,
        });
        console.log("gasEstimate: ", gasEstimate);

        // Send swapAndXcall transaction
        const xcallTxHash = await walletClient.sendTransaction({
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
