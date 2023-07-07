import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import ContractService from '../services/contractService';
import WalletService from '../services/walletService';
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

const ARBITRUM_PROTOCOL_TOKEN_ADDRESS =
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const POLYGON_WETH = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
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

  let toastNotifier: Id | null = null;

  const handleSelectedToken = (token: Asset) => {
    console.log("selected token:", token);
    setSelectedToken(token);
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
      if (connextService) {
        try {
          console.log(originDomain, "origin domain");
          // Use the RPC url for the origin chain
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
            render: "Calculating Relayer Fees",
            type: "success",
            isLoading: true,
          });

          const fee = await connextService.estimateRelayerFee(
            originDomain,
            destinationDomain
          );

          toast.update(toastNotifier, {
            render: "Relayer Fees calculation done",
            type: "success",
            isLoading: false,
          });

          setRelayerFee(fee);

          // Destination side

          toast.update(toastNotifier, {
            render: "Calculating Estimate Amount Out",
            type: "success",
            isLoading: true,
          });

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

          toast.update(toastNotifier, {
            render: "Estimate Amount Out Calculation Done",
            type: "success",
            isLoading: false,
          });
          setQuotedAmountOut(quoteAmount as string);

          console.log(`quoteAmount: ${quoteAmount}`);
          console.log(
            `destinationDomain: ${destinationDomain}, destinationUSDC: ${destinationUSDC}, originTransactingAsset: ${originTransactingAsset}, destinationDesiredAsset: ${destinationDesiredAsset}, destinationRpc: ${destinationRpc}`
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
            to: POLYGON_ADAPTER_CONTRACT,
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
        toastNotifier = toast.error("Failed to submit greeting");
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
      const initBlockNumber = 44626788;
      const latestBlockNumber = "latest";
      const targetContract = new ethers.Contract(
        POLYGON_ADAPTER_CONTRACT,
        GreeterTargetABI,
        providers
      );

      console.log(latestBlockNumber);

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
    <div className={styles.container}>
      <Head>
        <title>Connext Next JS</title>
        <meta content="Generated by @connext/sdk" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>
      {success && <Confetti width={width} height={height} />}

      <ToastContainer position="top-center" />
      {toastNotifier}
      <main className={styles.main}>
        <div className={styles.flexDisplay}>
          <h2>Connext Chain Abstraction Reference</h2>
          <ConnectButton />
        </div>
        <div className={styles.dropdown}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              border: "1px solid #0d76fc",
              margin: "0",
              padding: "0",
              borderRadius: "5px",
              paddingLeft: "10px",
            }}
          >
            <h3 style={{ margin: "0", padding: "0" }}>{selectedNetwork}</h3>
            <button className={styles.dropbtn}>Select Chain</button>
          </div>

          <div className={styles.dropdownContent}>
            {ChainMapping.map((chainMap, index) => (
              <a key={index} onClick={() => setChainID(chainMap.chainId)}>
                {chainMap.name}
              </a>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
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
            {greetingList && greetingList.length ? (
              <div style={{ width: "100%" }}>
                <ul>
                  {greetingList.map((greeting) => {
                    return <li>{greeting}</li>;
                  })}
                </ul>
              </div>
            ) : (
              <p>No Greetings found</p>
            )}
          </div>
        </div>

        {relayerFee && (
          <div>
            <p>
              Relayer Fees: {ethers.utils.formatEther(relayerFee).toString()}{" "}
              ETH
            </p>
          </div>
        )}

        {quotedAmountOut && (
          <div>
            <p>
              {" "}
              Estimated Amount out:{" "}
              {ethers.utils.formatUnits(quotedAmountOut, 18).toString()} WETH
            </p>
          </div>
        )}

        <div className={styles.center}>
          {selectedToken ? (
            <div>
              <button
                className={styles.button}
                onClick={() => {
                  if (connextService) {
                    handleGreet(
                      connextService.chainToDomainId(chainId) as string, // origin domain dynmic
                      "1886350457",
                      selectedToken.address,
                      POLYGON_WETH,
                      "https://arbitrum.meowrpc.com",
                      "https://polygon.llamarpc.com",
                      amountIn
                    );
                  } else {
                    console.log("Connext Service not inited");
                  }
                }}
              >
                Greet With Tokens
              </button>
              {hash && (
                <p>
                  You can check you transaction on connextscan by clicking{" "}
                  <a href={`https://connextscan.io/tx/${hash}?src=search`}>
                    here.
                  </a>
                </p>
              )}
            </div>
          ) : (
            <p>No token selected</p>
          )}
          <p className={styles.description}>
            Pay to update a greeter contract on destination using any asset from
            any chain
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
        <div></div>
      </main>
      <footer className={styles.footer}>
        For more information refer to the official Connext documentation{" "}
        <a
          href="https://docs.connext.network/"
          target="_blank"
          rel="noreferrer"
        >
          here
        </a>
        .
      </footer>
    </div>
  );
};

export default HomePage;
