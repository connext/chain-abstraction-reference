import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import Image from "next/image";
import styles from "../styles/Home.module.css";
import ContractService from "../services/contractService";
import WalletService from "../services/walletService";
import ConnextService from "../services/connextService";
import { SdkConfig } from "@connext/sdk";
import { useAccount, useSigner, useProvider } from "wagmi";
import {
  DestinationCallDataParams,
  SwapAndXCallParams,
  Asset,
} from "@connext/chain-abstraction/dist/types";

import useWindowSize from "react-use/lib/useWindowSize";
import Confetti from "react-confetti";

import { Id, ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { BigNumberish, ethers, utils, BigNumber } from "ethers";
import TokenList from "../components/tokenList";

import GreeterTargetABI from "../abis/GreeterTargetABI.json";

//importing assets

import ConnextLOGO from "../assets/CONNEXT_LOGO_PRIMARY_LIGHT 1.png";
import DownArrow from "../assets/chevron_down.png";
import ETH_LOGO from "../assets/ETH.png";
import POLYGON_LOGO from "../assets/POLYGON.png";

const ARBITRUM_PROTOCOL_TOKEN_ADDRESS =
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const POLYGON_WETH = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
const POLYGON_ADAPTER_CONTRACT = "0xbb54825eB3623daAB431061542d62Fd09Cc20087";
const POLYGON_TARGET_CONTRACT = "0xb5Ed372Bb3413D5A3d384F73e44EB85618f41455";

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
  const { address } = useAccount();
  const { data: signer } = useSigner();

  const provider = useProvider();

  const { width, height } = useWindowSize();

  const [relayerFee, setRelayerFee] = useState<string | undefined>(undefined);
  const [quotedAmountOut, setQuotedAmountOut] = useState<string | null>(null);
  const [contractService, setContractService] = useState<
    ContractService | undefined
  >(undefined);
  const [walletService, setWalletService] = useState<WalletService | undefined>(
    undefined
  );
  const [connextService, setConnextService] = useState<
    ConnextService | undefined
  >(undefined);

  const [chainId, setChainID] = useState<number>(0);

  const [selectedToken, setSelectedToken] = useState<Asset | null>(null);

  const [amountIn, setAmountIn] = useState<BigNumberish>("0");

  const [greeting, setGreeting] = useState<string>("");

  const [hash, setHash] = useState<string | null>(null);

  const [success, setSuccess] = useState<boolean>(false);

  const [greetingList, setGreetingList] = useState<any[]>([]);

  useEffect(() => {
    const initServices = async () => {
      if (signer && provider) {
        const chain = (await provider.getNetwork()).chainId;
        setChainID(chain);

        const contractService = new ContractService(provider);
        setContractService(contractService);

        const walletService = new WalletService(
          contractService,
          provider,
          signer
        );
        setWalletService(walletService);

        if (address) {
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
            walletService,
            contractService,
            sdkConfig
          );
          setConnextService(connextServiceInstance);
        }
      }
    };

    initServices();
    fetchGreetingStatusHistory();
  }, [signer, provider]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (connextService) {
        const originRpc = "https://arbitrum.meowrpc.com";
        const originTransactingAsset =
          "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
        const destinationDesiredAsset = POLYGON_WETH;
        // "https://polygon.llamarpc.com",
        const destinationRpc = "https://polygon.llamarpc.com";
        handleFees(
          connextService.chainToDomainId(chainId),
          "1886350457",
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
        console.log(amountIn);
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

        console.log(fee, quoteAmount);
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
    chainId: number,
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
          const originDomain = connextService.chainToDomainId(chainId);
          // Use the RPC url for the origin chain
          toastNotifier = toast.loading("Submitting Greeting");
          const originChain = connextService.domainToChainID(originDomain);
          const destinationChain =
            connextService.domainToChainID(destinationDomain);

          const originUSDC = connextService.getNativeUSDCAddress(originChain);

          const destinationUSDC =
            connextService.getNativeUSDCAddress(destinationChain);

          // Destination side

          const poolFee = await connextService.getPoolFeeForUniV3(
            destinationDomain,
            destinationUSDC, // destination USDC
            destinationDesiredAsset, // destination Token
            destinationRpc
          );

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
            [POLYGON_WETH, greeting]
          );
          const xCallData = await connextService.getXCallCallDataHelper(
            destinationDomain,
            forwardCallData,
            params
          );
          console.log(
            originTransactingAsset,
            ARBITRUM_PROTOCOL_TOKEN_ADDRESS,
            "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
            "token address verifying "
          );
          const swapAndXCallParams: SwapAndXCallParams = {
            originDomain,
            destinationDomain,
            fromAsset:
              originTransactingAsset === ARBITRUM_PROTOCOL_TOKEN_ADDRESS
                ? ethers.constants.AddressZero
                : originTransactingAsset,
            toAsset: originUSDC,
            amountIn: amountIn.toString(),
            to: POLYGON_TARGET_CONTRACT,
            relayerFeeInNativeAsset: relayerFee,
            callData: xCallData,
          };

          const txRequest = await connextService.prepareSwapAndXCallHelper(
            swapAndXCallParams,
            address as `0x${string}`
          );

          if (txRequest && signer) {
            txRequest.gasLimit = BigNumber.from("8000000");
            const xcallTxReceipt = await signer.sendTransaction(txRequest);

            await xcallTxReceipt.wait();
            setHash(xcallTxReceipt.hash);
            setSuccess(true);
            toast.update(toastNotifier, {
              render: "Greeting Submitted",
              type: "success",
              isLoading: false,
            });
            const greetings = [...greetingList];
            greetings.push(greeting);
            setGreetingList(greetings);
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
        toast.info("Relayer fees not calculated", {
          autoClose: 1000,
        });
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

  // Fetching of greeting variable

  const fetchGreetingStatusHistory = async () => {
    try {
      const providers = new ethers.providers.JsonRpcProvider(
        "https://polygon-mainnet.g.alchemy.com/v2/MBVvF6TziZyIXX7_WWVl16lEL6DmIzN-"
      ); // need polygon RPC provider for querying polyscan
      const initBlockNumber = 44743998;
      const latestBlockNumber = "latest";
      const targetContract = new ethers.Contract(
        POLYGON_TARGET_CONTRACT,
        GreeterTargetABI,
        providers
      );

      const filters = targetContract.filters.GreetingUpdated();
      console.log(filters);
      const events = await targetContract.queryFilter(
        filters,
        initBlockNumber,
        latestBlockNumber
      );

      const greetings: any[] = [];

      if (events) {
        events.forEach((event) => {
          const { args } = event;
          if (args) {
            greetings.push(args._greeting);
          }
        });
      }

      setGreetingList(greetings);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="bg-black flex flex-col justify-center items-center">
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
                  Balance: <span className="text-white">124ETH</span>
                </p>
              </div>
              <div className="border-2 box-border px-2 border-[#3E3E3E] rounded-sm my-3 flex justify-between mb-3">
                <div className="flex items-center">
                  <Image src={ETH_LOGO} alt="ETH Logo" width={20} height={20} />
                  <div className="box-border py-1">
                    <p className="text-white mx-2 my-0 flex items-center">
                      ETH{" "}
                      <span>
                        <Image
                          className="h-[8px] w-[10px] mx-2"
                          src={DownArrow}
                          alt="Down arrow"
                        />
                      </span>
                    </p>
                    <p className="text-xs text-[#A5A5A5] mx-2 my-0">
                      On polygon
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

              {/* <div className="flex flex-row justify-between my-2">
                <p className="text-white text-xs text-[#A5A5A5]">Gas: </p>
                <p className="text-white text-xs text-[#A5A5A5]">$0.53</p>
              </div> */}

              <button
                onClick={() => {
                  handleGreet(
                    chainId, // origin domain dynmic
                    "1886350457",
                    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                    POLYGON_WETH,
                    "https://arbitrum.meowrpc.com",
                    "https://polygon.llamarpc.com",
                    amountIn
                  );
                }}
                className="bg-gradient-to-r from-red-400 to-purple-500 hover:from-pink-500 hover:to-yellow-500 w-full text-white px-2 py-4 cursor-pointer mt-2 rounded"
              >
                Send
              </button>
            </div>
            <div className="w-[407px] h-[472px] bg-[#292929] box-border rounded-sm text-white p-6">
              <div className="flex justify-between items-center">
                <p className="text-xl">Greetings</p>
                <Image
                  src={POLYGON_LOGO}
                  alt="ETH_LOGO"
                  width={30}
                  height={30}
                />
              </div>
              <div className="border border-[#3E3E3E] h-4/5 mt-10 box-border p-6">
                {greetingList && greetingList.length ? (
                  <div style={{ width: "100%" }}>
                    <ul>
                      {greetingList.map((greeting) => {
                        return <p>{greeting}</p>;
                      })}
                    </ul>
                  </div>
                ) : (
                  <p>No Greetings found</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center items-center mt-10">
            {hash && (
              <p className="text-sm text-white italic">
                You can check you transaction on connextscan by clicking{" "}
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

            {/* {tracker && (
            <p>
              You can track you xcall{" "}
              <a target="_blank" href={tracker} rel="noreferrer">
                here.
              </a>
            </p>
          )} */}
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
