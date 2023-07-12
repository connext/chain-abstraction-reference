import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState, useRef } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import ConnextService from "../services/connextService";
import { SdkConfig } from "@connext/sdk";
import {
  useAccount,
  useWalletClient,
  usePublicClient,
  useBalance,
  useNetwork,
} from "wagmi";
import { parseAbiItem } from "viem";

import useWindowSize from "react-use/lib/useWindowSize";
import Confetti from "react-confetti";

import { Id, ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { BigNumberish, utils } from "ethers";

import { handleGreetHelper } from "../utils/handleGreetHelper";
import { chainIdToRPC, domainToChainID, chainToDomainId } from "../utils/utils";

import GreeterABI from "../abis/GreeterABI.json";

import ConnextLOGO from "../assets/CONNEXT_LOGO_PRIMARY_LIGHT 1.png";
import DownArrow from "../assets/chevron_down.png";
import ETH_LOGO from "../assets/ETH.png";
import POLYGON_LOGO from "../assets/POLYGON.png";
import Modal from "../components/modal";

const ARBITRUM_USDT = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
const POLYGON_CHAIN_ID = 137;
const POLYGON_DOMAIN_ID = 1886350457;
const POLYGON_WETH = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
const POLYGON_TARGET_CONTRACT = "0xb5Ed372Bb3413D5A3d384F73e44EB85618f41455";
const MAX_NUM_GREETINGS = 10;
const BLOCKS_LOOKBACK = BigInt(100000);

const HomePage: NextPage = (pageProps) => {
  const initialRender = useRef(true);
  const { width, height } = useWindowSize();

  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const polygonClient = usePublicClient({ chainId: POLYGON_CHAIN_ID });
  const publicClient = usePublicClient();
  const { chain } = useNetwork();

  const [relayerFee, setRelayerFee] = useState<string | undefined>(undefined);
  const [quotedAmountOut, setQuotedAmountOut] = useState<string | null>(null);
  const [connextService, setConnextService] = useState<
    ConnextService | undefined
  >(undefined);

  const [chainId, setChainID] = useState<number>(0);
  const [amountIn, setAmountIn] = useState<BigNumberish>("0");

  const [greeting, setGreeting] = useState<string>("");
  const [pendingGreeting, setPendingGreeting] = useState<string | null>(null);
  const [greetingList, setGreetingList] = useState<string[]>([]);
  const [isLoadingGreetings, setIsLoadingGreetings] = useState<boolean>(false);
  const [triggerRead, setTriggerRead] = useState(false);

  const [txHash, setTxHash] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [numConfetti, setNumConfetti] = useState(0);
  const [balance, setBalance] = useState<string | undefined>(undefined);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const [selectedAsset, setSelectedAsset] = useState<{
    symbol: string;
    chain_id: number;
    decimals: number;
    contract_address: string;
    image: string;
    chain_logo: string | undefined;
  } | null>(null);

  const { data: balanceData } = useBalance({
    address,
    token: selectedAsset?.contract_address as `0x${string}`,
    chainId: selectedAsset?.chain_id,
  });

  useEffect(() => {
    const initServices = async () => {
      if (walletClient && address) {
        const chainId = await walletClient.getChainId();
        setChainID(chainId);

        const sdkConfig: SdkConfig = {
          signerAddress: address,
          network: "mainnet" as const,
          chains: {
            1869640809: {
              providers: [chainIdToRPC(domainToChainID("1869640809"))],
            },
            1886350457: {
              providers: [chainIdToRPC(domainToChainID("1886350457"))],
            },
            1634886255: {
              providers: [chainIdToRPC(domainToChainID("1634886255"))],
            },
            6450786: {
              providers: [chainIdToRPC(domainToChainID("6450786"))],
            },
            // TODO: get chains
          },
        };
        const connextServiceInstance = new ConnextService(sdkConfig);
        setConnextService(connextServiceInstance);
      }
    };

    initServices();
  }, [walletClient]);

  // Will trigger on token change
  useEffect(() => {
    if (balanceData && selectedAsset) {
      setBalance(`${balanceData.formatted} ${balanceData.symbol}`);
    } else {
      setBalance(undefined);
    }
    if (!address) {
      setChainID(0);
    }
  }, [address, balanceData]);

  useEffect(() => {
    const getTargetContractLogs = async () => {
      setIsLoadingGreetings(true);

      const maxBlocksPerCall = BigInt(3000);
      const currentBlock = await polygonClient.getBlockNumber();

      let fromBlock = currentBlock - BLOCKS_LOOKBACK;
      if (fromBlock < BigInt(0)) {
        fromBlock = BigInt(0);
      }
      let toBlock = fromBlock + maxBlocksPerCall;
      if (toBlock > currentBlock) {
        toBlock = currentBlock;
      }

      let allGreetings: string[] = [];

      // Get events from earliest to latest
      while (fromBlock <= toBlock && fromBlock <= currentBlock) {
        const logs = await polygonClient.getLogs({
          address: POLYGON_TARGET_CONTRACT,
          event: parseAbiItem("event GreetingUpdated(string greeting)"),
          fromBlock: fromBlock,
          toBlock: toBlock,
        });

        if (logs && logs.length > 0) {
          const greetings = logs.map((log: any) => log.args.greeting);
          allGreetings = [...allGreetings, ...greetings];
        }

        fromBlock = toBlock + BigInt(1);
        toBlock = fromBlock + maxBlocksPerCall;
        if (toBlock > currentBlock) {
          toBlock = currentBlock;
        }
      }

      if (allGreetings.length > MAX_NUM_GREETINGS) {
        allGreetings = allGreetings.slice(-MAX_NUM_GREETINGS);
      }

      setGreetingList(allGreetings.reverse());
      setIsLoadingGreetings(false);
    };

    getTargetContractLogs();
  }, []);

  // Need a hook for token change for triggering the function
  // to get the balance

  useEffect(() => {
    const readTargetContract = async () => {
      const data = await polygonClient.readContract({
        address: POLYGON_TARGET_CONTRACT,
        abi: GreeterABI,
        functionName: "greeting",
      });

      if (data === pendingGreeting) {
        setPendingGreeting(null);
        setGreetingList((prevGreetingList) => [
          data as string,
          ...prevGreetingList,
        ]);
        setSuccess(true);
        toast.success("The greeting was updated!");
      }
    };

    // Skip initial render to prevent duplicate current greeting
    if (initialRender.current) {
      initialRender.current = false;
    } else {
      readTargetContract();
    }
  }, [triggerRead]);

  useEffect(() => {
    let unwatch: any;
    const watchTargetContract = async () => {
      unwatch = polygonClient.watchContractEvent({
        address: POLYGON_TARGET_CONTRACT,
        abi: GreeterABI,
        eventName: "GreetingUpdated",
        onLogs: (logs) => {
          setTriggerRead((prevState) => !prevState);
        },
      });
    };

    watchTargetContract();

    return () => {
      unwatch();
    };
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (connextService) {
        const originRpc = walletClient?.chain.rpcUrls.default.http[0] ?? "";
        const originTransactingAsset = ARBITRUM_USDT;
        const destinationRpc =
          polygonClient.chain.rpcUrls.default.http[0] ?? "";
        const destinationDesiredAsset = POLYGON_WETH;
        handleFees(
          chainToDomainId(chainId),
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

  const handleModalHelper = (open: boolean) => {
    setIsModalOpen(open);
  };

  let toastNotifier: Id | null = null;

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

  const handleSelectedAssetHelper = (asset: {
    symbol: string;
    chain_id: number;
    decimals: number;
    contract_address: string;
    image: string;
    chain_logo: string | undefined;
  }) => {
    setSelectedAsset(asset);
  };

  const handleGreet = async (
    originDomain: string,
    destinationDomain: string,
    originTransactingAsset: string,
    destinationDesiredAsset: string,
    originRpc: string,
    destinationRpc: string,
    amountIn: BigNumberish
  ) => {
    if (!relayerFee || !connextService || !address) {
      toast.info("Services not intitialised", { autoClose: 1000 });
      return;
    }
    const toastGreeting = toast.loading("Submitting Greeting");
    const { err, hash } = await handleGreetHelper(
      connextService as ConnextService,
      originDomain,
      destinationDomain,
      originTransactingAsset,
      destinationDesiredAsset,
      destinationRpc,
      amountIn,
      relayerFee,
      address as `0x${string}`,
      greeting,
      walletClient,
      publicClient
    );

    if (hash) {
      toast.update(toastGreeting, {
        type: "info",
        render:
          "Greeting submitted! Waiting for xcall to finalize on Polygon...",
        autoClose: 5000,
        isLoading: false,
      });
      setPendingGreeting(greeting);
      setTxHash(hash);
      setSuccess(false);
    }
    if (err) {
      toast.dismiss(toastGreeting);
      toast.error("Failed to submit greeting", { autoClose: 1000 });
    }
  };

  useEffect(() => {
    if (success) {
      setNumConfetti(200);

      setTimeout(() => {
        setNumConfetti(0);
      }, 3000);
    }
  }, [success]);

  return (
    <div className="bg-[#07080a] flex flex-col justify-center items-center">
      <Head>
        <title>Connext Next JS</title>
        <meta content="Generated by @connext/sdk" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>
      {success && (
        <Confetti width={width} height={height} numberOfPieces={numConfetti} />
      )}

      <ToastContainer position="top-center" />
      {toastNotifier}
      <Modal
        handleSelectedAssetHelper={handleSelectedAssetHelper}
        isModalOpen={isModalOpen}
        handleModalHelper={handleModalHelper}
      />
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
            Chain Abstraction Examples
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
                Greeter on Polygon
              </p>
              <Image src={DownArrow} alt="DownArrow" width={10} height={10} />
            </div>
          </div>
          <div className="flex flex-row justify-between mt-12">
            <div className="w-[407px] h-[472px] bg-[#292929] box-border rounded-sm box-border p-6">
              <p className="text-xl text-white font-semibold">
                Pay to update the Greeter contract
              </p>
              <div className="flex justify-between mt-12">
                <p className="text-[#A5A5A5] text-xs font-semibold">
                  Your Payment
                </p>
                {/* using chainID for logic
                MM connected ? chainID : no chainID */}
                {selectedAsset && (
                  <p className="text-[#A5A5A5] text-xs font-semibold">
                    Balance :{" "}
                    {balance
                      ? balance
                      : chainId !== 0
                      ? "loading"
                      : "Wallet not connected"}
                  </p>
                )}
              </div>
              <div className="border-2 box-border px-2 border-[#3E3E3E] rounded-sm my-3 flex justify-between mb-3">
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => setIsModalOpen(true)}
                >
                  {selectedAsset && (
                    <div className="relative">
                      <Image
                        src={selectedAsset.image}
                        alt={selectedAsset.symbol}
                        width={25}
                        height={25}
                      />
                      <Image
                        className="m-0 absolute right-0 top-5"
                        src={selectedAsset.chain_logo as string}
                        width={10}
                        height={10}
                        alt="Down arrow"
                      />
                    </div>
                  )}

                  <div className="box-border py-1">
                    {selectedAsset ? (
                      <p className="text-white mx-2 my-0 flex items-center">
                        {selectedAsset.symbol}{" "}
                        <span>
                          <Image
                            className="h-[8px] w-[10px] mx-2"
                            src={DownArrow}
                            alt="Down arrow"
                          />
                        </span>
                      </p>
                    ) : (
                      <p className="text-white text-xs mx-2 my-0 flex items-center">
                        Select Token{" "}
                        <span>
                          <Image
                            className="h-[8px] w-[10px] mx-2"
                            src={DownArrow}
                            alt="Down arrow"
                          />
                        </span>
                      </p>
                    )}
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
                    {utils.formatEther(relayerFee).toString().slice(0, 8)} ETH
                  </p>
                </div>
              )}

              {quotedAmountOut && (
                <div className="flex flex-row justify-between my-2">
                  <p className="text-white text-xs text-[#A5A5A5]">
                    Estimate Amount Out:{" "}
                  </p>
                  <p className="text-white text-xs text-[#A5A5A5]">
                    {utils
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
                    const originRpc =
                      walletClient?.chain.rpcUrls.default.http[0] ?? "";
                    const destinationRpc =
                      polygonClient.chain.rpcUrls.default.http[0] ?? "";
                    handleGreet(
                      chainToDomainId(chainId),
                      POLYGON_DOMAIN_ID.toString(),
                      ARBITRUM_USDT,
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

              <p className="text-[#21C1FC] mt-5">Greeting: {greetingList[0]}</p>

              <div className="mb-5">
                {pendingGreeting ? (
                  <p className="text-stone-400 animate-pulse">
                    (pending): {pendingGreeting}
                  </p>
                ) : (
                  <p className="text-transparent">
                    (pending): {pendingGreeting}
                  </p>
                )}
              </div>

              <p className="mt-5 mb-2">Greetings history:</p>

              <div className="border border-[#3E3E3E] h-[280px] box-border p-6">
                <div className="ml-5 overflow-scroll h-full">
                  {isLoadingGreetings ? (
                    <p>Loading greetings...</p>
                  ) : greetingList && greetingList.length ? (
                    <div>
                      <ul>
                        {greetingList.slice(1).map((greeting, index) => {
                          return <p key={index}>{greeting}</p>;
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

          <div className="flex flex-col justify-center items-center mt-10">
            {txHash && (
              <p className="text-white italic animate-bounce">
                You can check the transaction status on connextscan by clicking{" "}
                <a
                  className="text-blue-800"
                  href={`https://connextscan.io/tx/${txHash}?src=search`}
                >
                  here.
                </a>
              </p>
            )}
          </div>
        </main>

        <footer className="text-sm text-white italic mb-5">
          For more information refer to the official{" "}
          <a
            className="text-blue-500"
            href="https://docs.connext.network/"
            target="_blank"
            rel="noreferrer"
          >
            Connext documentation
          </a>
          .
        </footer>
      </div>
    </div>
  );
};

export default HomePage;
