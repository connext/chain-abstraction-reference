import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useEffect, useState, useRef } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import Image from "next/image";
import styles from '../styles/Home.module.css';
import ConnextService from '../services/connextService';
import { SdkConfig } from "@connext/sdk";
import { useAccount, useWalletClient, usePublicClient, erc20ABI } from "wagmi";
import { Hex, hexToBigInt, parseAbiItem } from 'viem';
import {
  DestinationCallDataParams,
  SwapAndXCallParams,
  Asset,
} from "@connext/chain-abstraction/dist/types";

import useWindowSize from "react-use/lib/useWindowSize";
import Confetti from "react-confetti";

import { Id, ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { BigNumberish, ethers, utils } from "ethers";
import TokenList from "../components/tokenList";

import GreeterABI from "../abis/GreeterABI.json";

import ConnextLOGO from "../assets/CONNEXT_LOGO_PRIMARY_LIGHT 1.png";
import DownArrow from "../assets/chevron_down.png";
import ETH_LOGO from "../assets/ETH.png";
import POLYGON_LOGO from "../assets/POLYGON.png";

const ARBITRUM_PROTOCOL_TOKEN_ADDRESS =
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const ARBITRUM_USDC = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";
const POLYGON_CHAIN_ID = 137;
const POLYGON_DOMAIN_ID = 1886350457;
const POLYGON_WETH = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
const POLYGON_TARGET_CONTRACT = "0xb5Ed372Bb3413D5A3d384F73e44EB85618f41455";
const POLYGON_ADAPTER_CONTRACT = "0xbb54825eB3623daAB431061542d62Fd09Cc20087";

const ChainMapping = [
  {
    chainId: 137,
    name: "POLYGON",
  },
  { chainId: 10, name: "OPTIMSIM" },
  { chainId: 56, name: "BINANCE" },
  { chainId: 42161, name: "ARBITRUM" },
];

const HomePage: NextPage = (pageProps) => {
  const initialRender = useRef(true);
  const { width, height } = useWindowSize();

  const { address } = useAccount();
  const { data: client } = useWalletClient()
  const polygonClient = usePublicClient({
    chainId: POLYGON_CHAIN_ID,
  });

  const [relayerFee, setRelayerFee] = useState<string | undefined>(undefined);
  const [quotedAmountOut, setQuotedAmountOut] = useState<string | null>(null);
  const [connextService, setConnextService] = useState<
    ConnextService | undefined
  >(undefined);

  const [chainId, setChainID] = useState<number>(0);
  const [selectedToken, setSelectedToken] = useState<Asset | null>(null);
  const [amountIn, setAmountIn] = useState<BigNumberish>("0");

  const [greeting, setGreeting] = useState<string>("");
  const [currentGreeting, setCurrentGreeting] = useState<string>("");
  const [greetingList, setGreetingList] = useState<string[]>([]);
  const [triggerRead, setTriggerRead] = useState(false);
  const MAX_NUM_GREETINGS = 10;
  const BLOCKS_LOOKBACK = BigInt(100000);

  const [hash, setHash] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    const initServices = async () => {
      if (client && address) {
        const chainId = await client.getChainId();
        setChainID(chainId);

        const sdkConfig: SdkConfig = {
          signerAddress: address,
          network: "mainnet" as const,
          chains: {
            1869640809: {
              providers: ["https://rpc.ankr.com/optimism"],
            },
            1886350457: {
              providers: ["https://polygon.llamarpc.com"],
            },
            1634886255: {
              providers: ["https://arb-mainnet-public.unifra.io"],
            },
            6450786: {
              providers: ["https://bsc.rpc.blxrbdn.com"],
            },
            // TODO: get chains
          },
        };
        const connextServiceInstance = new ConnextService(
          sdkConfig
        );
        setConnextService(connextServiceInstance);
      }
    };

    initServices();
  }, [client]);

  useEffect(() => {
    if (greetingList.length > 0) {
      setCurrentGreeting(greetingList[0]);
    }
  }, [greetingList]);

  useEffect(() => { 
    const getTargetContractLogs = async () => {
      const maxBlocksPerCall = BigInt(3000);
      const currentBlock = await polygonClient?.getBlockNumber();
  
      let toBlock = currentBlock;
      let fromBlock = toBlock - maxBlocksPerCall;

      if (fromBlock < currentBlock - BLOCKS_LOOKBACK) {
        fromBlock = currentBlock - BLOCKS_LOOKBACK;
      }
      if(fromBlock < BigInt(0)) {
        fromBlock = BigInt(0);
      }
  
      let allGreetings: string[] = [];
  
      // Get events from latest to oldest
      while(toBlock >= fromBlock && toBlock > BigInt(0)) {
        const logs = await polygonClient?.getLogs({
          address: POLYGON_TARGET_CONTRACT,
          event: parseAbiItem("event GreetingUpdated(string greeting)"),
          fromBlock: fromBlock,
          toBlock: toBlock
        });
  
        if (logs && logs.length > 0) {
          const greetings = logs.map((log: any) => log.args.greeting);
          allGreetings = [...allGreetings, ...greetings.reverse()];
        }
  
        toBlock = fromBlock - BigInt(1);
        fromBlock = toBlock - maxBlocksPerCall;
        if(fromBlock < BigInt(0)) {
          fromBlock = BigInt(0);
        }
      }
  
      if (allGreetings.length > MAX_NUM_GREETINGS) {
        allGreetings = allGreetings.slice(-MAX_NUM_GREETINGS);
      }
  
      setGreetingList(allGreetings);
    }

    getTargetContractLogs();
  }, []);

  useEffect(() => { 
    const readTargetContract = async () => {
      const data = await polygonClient?.readContract({
        address: POLYGON_TARGET_CONTRACT,
        abi: GreeterABI,
        functionName: "greeting",
      })
      setCurrentGreeting(data as string);
      setGreetingList(prevGreetingList => [
        ...prevGreetingList, 
        data as string
      ]);
    }

    // Skip initial render to prevent duplicate current greeting
    if (initialRender.current) {
      initialRender.current = false;
    } else {
      readTargetContract();
    }
  }, [triggerRead]);

  useEffect(() => { 
    const watchTargetContract = async () => {
      polygonClient?.watchContractEvent({
        address: POLYGON_TARGET_CONTRACT,
        abi: GreeterABI,
        onLogs: logs => {
          setTriggerRead(prevState => !prevState);
        }
      })
    }

    watchTargetContract();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (connextService) {
        const originRpc = client?.chain.rpcUrls.default.http[0] ?? "";
        const originTransactingAsset = ARBITRUM_USDC;
        const destinationRpc = polygonClient.chain.rpcUrls.default.http[0] ?? "";
        const destinationDesiredAsset = POLYGON_WETH;
        handleFees(
          connextService.chainToDomainId(chainId),
          POLYGON_DOMAIN_ID.toString(),
          originTransactingAsset,
          destinationDesiredAsset,
          originRpc,
          destinationRpc,
          amountIn
        );
      }
    }, 1000);

    return () => clearTimeout(delayDebounceFn);
  }, [amountIn]);

  let toastNotifier: Id | null = null;

  const handleSelectedToken = (token: Asset) => {
    console.log("selected token:", token);
    setSelectedToken(token);
  };

  const handleFees = async (
    originDomain: string,
    destinationDomain: string,
    originTransactingAsset: string,
    destinationDesiredAsset: string,
    originRpc: string,
    destinationRpc: string,
    amountIn: BigNumberish
  ) => {
    try {
      if (connextService && amountIn.toString().length > 0) {
        let toastNotifier = toast.loading("Calculating fees");
        const fee = await connextService.estimateRelayerFee(
          originDomain,
          destinationDomain
        );
        const quoteAmount =
          await connextService.getEstimateAmountReceivedHelper({
            originDomain: +originDomain,
            destinationDomain: +destinationDomain,
            amountIn: amountIn.toString(),
            originRpc,
            destinationRpc,
            fromAsset: originTransactingAsset,
            toAsset: destinationDesiredAsset,
            signerAddress: address as `0x${string}`,
            originDecimals: 6,
            destinationDecimals: 18,
          });

        console.log("amount in: ", amountIn);
        console.log("relayer fee: ", fee);
        console.log("amount received: ", quoteAmount);
        if (quoteAmount) {
          setQuotedAmountOut(quoteAmount);
        }

        setRelayerFee(fee);
        toast.update(toastNotifier, {
          render: "Calculating Fees Done",
          type: "success",
          isLoading: false,
          autoClose: 2000,
        });
      } else {
        console.log("Connext Service not found");
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleGreet = (
    originDomain: string,
    destinationDomain: string,
    originTransactingAsset: string,
    destinationDesiredAsset: string,
    originRpc: string,
    destinationRpc: string,
    amountIn: BigNumberish
  ) => {
    (async () => {
      if (connextService && relayerFee) {
        try {
          toastNotifier = toast.loading("Submitting Greeting");
          const originChain = connextService.domainToChainID(originDomain);
          const destinationChain =
            connextService.domainToChainID(destinationDomain);

          const originUSDC = connextService.getNativeUSDCAddress(originChain);
          console.log(
            `originDomain: ${originDomain}, originUSDC: ${originUSDC}`
          );
          const destinationUSDC =
            connextService.getNativeUSDCAddress(destinationChain);
          console.log(
            `destinationDomain: ${destinationDomain}, destinationUSDC: ${destinationUSDC}`
          );

          toast.update(toastNotifier, {
            render: "Calculating Pool Fees",
            type: "success",
            isLoading: true,
          });

          const poolFee = await connextService.getPoolFeeForUniV3(
            destinationDomain,
            destinationUSDC, // destination USDC
            destinationDesiredAsset, // destination Token
            destinationRpc
          );

          toast.update(toastNotifier, {
            render: "Pool Fees Calculation Done",
            type: "success",
            isLoading: false,
          });

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

          toast.update(toastNotifier, {
            render: "Preparing Transaction",
            type: "info",
            isLoading: true,
          });

          const forwardCallData = utils.defaultAbiCoder.encode(
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
            const xcallTxHash = await client.sendTransaction({
              account: from,
              to: to,
              data: data,
              value: value
            });

            setHash(xcallTxHash);
            setSuccess(true);
            toast.update(toastNotifier, {
              render: "Greeting Submitted",
              type: "success",
              isLoading: false,
            });
          }
        } catch (error) {
          toast.update(toastNotifier as Id, {
            render: "Failed to submit greeting",
            type: "error",
            isLoading: false,
          });
          console.error("Failed to fetch relayer fee", error);
        }
      } else {
        toastNotifier = toast.info("Failed to calculate relayer fee", {autoClose: 1000});
        console.log("Connext service not initialized");
      }
    })();
  };

  let selectedNetwork = "Choose a network";
  ChainMapping.forEach((chainMap) => {
    if (chainMap.chainId === chainId) {
      selectedNetwork = chainMap.name;
    }
  });

  return (
    <div className="bg-[#07080a] flex flex-col justify-center items-center">
      <Head>
        <title>Connext Next JS</title>
        <meta content="Generated by @connext/sdk" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>
      {success && <Confetti width={width} height={height} />}

      <ToastContainer position="top-center" />
      {toastNotifier}

      <div className="w-9/12">
        <main className="min-h-screen">
          <div className="flex justify-between w-full py-4">
            <Image
              src={ConnextLOGO}
              alt="Connext Logo"
              width={180}
              height={180}
            />
            <ConnectButton />
          </div>

          <h2 className="text-6xl text-white py-6">
            Chain Abstraction Reference
          </h2>
          <p className="text-gray-500 text-xl">
            Call contracts from anywhere with any asset!
          </p>

          <div>
            <p className="text-xs text-gray-400 mt-6 mb-2">
              Choose a contract{" "}
            </p>
            <div className="w-72 border border-gray-600 h-10 rounded flex justify-between items-center box-border px-4 cursor-pointer mb-4">
              <p className="text-white text-xs font-semibold">
                Crosschain Greeting
              </p>
              <Image src={DownArrow} alt="DownArrow" width={10} height={10} />
            </div>
          </div>
          <div className="flex flex-row justify-between mt-12">
            <div className="w-[407px] h-[472px] bg-[#292929] box-border rounded-sm box-border p-6">
              <p className="text-xl text-white font-semibold">
                Pay to update your greeting
              </p>
              <div className="flex justify-between mt-12">
                <p className="text-[#A5A5A5] text-xs font-semibold">
                  Your Payment
                </p>
                <p className="text-[#A5A5A5] text-xs font-semibold">
                  Balance: <span className="text-white">200,000 USDC</span>
                </p>
              </div>
              <div className="border-2 box-border px-2 border-[#3E3E3E] rounded-sm my-3 flex justify-between mb-3">
                <div className="flex items-center">
                  <Image src={ETH_LOGO} alt="ETH Logo" width={20} height={20} />
                  <div className="box-border py-1">
                    <p className="text-white mx-2 my-0 flex items-center">
                      USDC{" "}
                      <span>
                        <Image
                          className="h-[8px] w-[10px] mx-2"
                          src={DownArrow}
                          alt="Down arrow"
                        />
                      </span>
                    </p>
                    <p className="text-xs text-[#A5A5A5] mx-2 my-0">
                      On Arbitrum
                    </p>
                  </div>
                </div>
                <input
                  className="bg-transparent text-right text-white box-border p-3 outline-none"
                  onChange={(e) => {
                    setAmountIn(e.target.value);
                  }}
                />
              </div>
              <div className="flex justify-between mt-6">
                <p className="text-[#A5A5A5] text-xs font-semibold">
                  Your Greeting
                </p>
              </div>
              <div className="border-2 box-border px-2 border-[#3E3E3E] rounded-sm my-3 flex justify-between mb-8">
                <div className="flex items-center">
                  <input
                    placeholder="Type your greeting"
                    className="bg-transparent  text-white box-border p-3 outline-none w-100"
                    onChange={(e) => {
                      setGreeting(e.target.value);
                    }}
                  />
                </div>
              </div>

              {relayerFee && (
                <div className="flex flex-row justify-between my-2">
                  <p className="text-white text-xs text-[#A5A5A5]">
                    Relayer Fee:{" "}
                  </p>
                  <p className="text-white text-xs text-[#A5A5A5]">
                    {ethers.utils
                      .formatEther(relayerFee)
                      .toString()
                      .slice(0, 8)}{" "}
                    ETH
                  </p>
                </div>
              )}

              {quotedAmountOut && (
                <div className="flex flex-row justify-between my-2">
                  <p className="text-white text-xs text-[#A5A5A5]">
                    Estimate Amount Out:{" "}
                  </p>
                  <p className="text-white text-xs text-[#A5A5A5]">
                    {ethers.utils
                      .formatUnits(quotedAmountOut, 18)
                      .toString()
                      .slice(0, 8)}{" "}
                    WETH
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  if (connextService) {
                    const originRpc = client?.chain.rpcUrls.default.http[0] ?? "";
                    const destinationRpc = polygonClient.chain.rpcUrls.default.http[0] ?? "";
                    handleGreet(
                      connextService.chainToDomainId(chainId) as string,
                      POLYGON_DOMAIN_ID.toString(),
                      ARBITRUM_USDC,
                      POLYGON_WETH,
                      originRpc,
                      destinationRpc,
                      amountIn
                    );
                  } else {
                    console.log("Connext Service not inited");
                  }
                }}
                className="bg-gradient-to-r from-red-400 to-purple-500 hover:from-pink-500 hover:to-yellow-500 w-full text-white px-2 py-4 cursor-pointer mt-2 rounded"
              >
                Send
              </button>
            </div>
            <div className="w-[407px] h-[472px] bg-[#292929] box-border rounded-sm text-white p-6">
              <div className="flex justify-between items-center">
                <p className="text-xl">Greeter Contract</p>
                <Image
                  src={POLYGON_LOGO}
                  alt="ETH_LOGO"
                  width={30}
                  height={30}
                />
              </div>

              <p className="text-lg mt-10">
                Greetings
              </p>
              <div className="border border-[#3E3E3E] h-2/3 box-border p-6">  
                <div className="ml-5">
                  {greetingList && greetingList.length ? (
                    <div style={{ width: "100%" }}>
                      <ul>
                        {greetingList.map((greeting) => {
                          return <p>{greeting}</p>;
                        })}
                      </ul>
                    </div>
                  ) : (
                    <p>No greetings found</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div
              style={{
                display: "flex",
                width: "500px",
                marginTop: "100px",
                // justifyContent: "space-around",
                // alignItems: "center",
              }}
            >
              <TokenList
                chainId={chainId}
                setSelectedToken={handleSelectedToken}
                selectedToken={selectedToken}
              />

              <div style={{ marginLeft: "10px" }}>
                <input
                  className={styles.inputAmount}
                  onChange={(e) => {
                    setAmountIn(e.target.value);
                  }}
                  placeholder="Amount"
                />
              </div>
              <div style={{ marginLeft: "10px" }}>
                <input
                  className={styles.inputGreeting}
                  onChange={(e) => {
                    setGreeting(e.target.value);
                  }}
                  placeholder="Enter your Greeting"
                />
              </div>
            </div>
            <div
              style={{
                width: "500px",
                display: "flex",
                alignItems: "center",
                flexFlow: "column",
              }}
            >
              <h2 style={{ alignSelf: "flex-start" }}>Greetings: </h2>
              {currentGreeting}
            </div>
          </div> */}

          <div className="flex flex-col justify-center items-center mt-10">
            {hash && (
              <p className="text-sm text-white italic">
                You can check the transaction status on connextscan by clicking{" "}
                <a
                  className="text-blue-800"
                  href={`https://connextscan.io/tx/${hash}?src=search`}
                >
                  here.
                </a>
              </p>
            )}

            <p className="text-sm text-white mt-10">
              Pay to update a greeter contract on destination using any asset
              from any chain
            </p>
          </div>
        </main>

        <footer className="text-sm text-white italic">
          For more information refer to the official Connext documentation{" "}
          <a
            className="text-blue-800"
            href="https://docs.connext.network/"
            target="_blank"
            rel="noreferrer"
          >
            here
          </a>
          .
        </footer>
      </div>
    </div>
  );
};


export default HomePage;
