import { useState, useEffect } from "react";
import mainnetChains from "../config/mainnet/chains.json";
import mainnetAssets from "../config/mainnet/assets.json";
import { chainIdToChainName } from "../utils/utils";
import { AssetType } from "../components/Asset";
import { ethers } from "ethers";
import hardCodedAssets from "../config/mainnet/hardCodedAssets.json";

interface Token {
  balance: string;
  contract_ticker_symbol: string;
  contract_decimals: number;
  contract_address: string;
  logo_url: string;
  quote_rate: number;
  native_token: boolean;
  // add any other properties that you know will be in the response
}

interface HardCodedAssetsInterface {
  [key: string]: {
    native_token: boolean;
    contract_address?: {
      symbol: string;
      address: string;
      chain_id: number;
    }[];
  };
}

export default function useFetchTokenData(address: string | undefined) {
  const [assets, setAssets] = useState<AssetType[]>([]);
  const [filteredAsset, setFilteredAsset] = useState<AssetType[]>([]);

  useEffect(() => {
    const handleTokenFetcher = async () => {
      const chainMap = new Map(
        mainnetChains.map((chain) => [chain.chain_id, chain.image]),
      );

      const tokenSymbolMap = new Map(
        mainnetAssets.map((asset) => [asset.symbol, asset.image]),
      );

      const newAssets: AssetType[] = mainnetAssets.flatMap((mainnetAsset) => {
        const { symbol, image } = mainnetAsset;

        return mainnetAsset.contracts.map((contract) => {
          const { chain_id, decimals, contract_address } = contract;

          return {
            symbol,
            chain_id,
            decimals,
            contract_address,
            image,
            chain_logo: chainMap.get(chain_id),
            balance: null,
            tokenBalance: null,
          };
        });
      });

      // fetch token Prices here for all chains.
      const supportedChains = mainnetChains.map((chain) => {
        if (chainIdToChainName(chain.chain_id)) {
          return chainIdToChainName(chain.chain_id);
        }
      });

      const assetWithBalance: AssetType[] = [];

      for (let i = 0; i < supportedChains.length; i++) {
        if (supportedChains[i] && address) {
          // api call here.

          const headers = new Headers();
          headers.set(
            "Authorization",
            "Bearer cqt_rQftkJjKvJqfTPKGGdKwqvXFvbr7",
          );

          await fetch(
            `https://api.covalenthq.com/v1/${supportedChains[i]}/address/${address}/balances_v2/`,
            { method: "GET", headers: headers },
          )
            .then((resp) => resp.json())
            .then(({ data }) => {
              if (data) {
                const temp: HardCodedAssetsInterface = hardCodedAssets;
                data.items.forEach((token: Token) => {
                  if (token.balance === "0") {
                    return;
                  }
                  if (!token.native_token) {
                    if (temp[token.contract_ticker_symbol]) {
                      assetWithBalance.push({
                        symbol: token.contract_ticker_symbol,
                        chain_id: data.chain_id,
                        decimals: token.contract_decimals,
                        contract_address: token.contract_address,
                        image: tokenSymbolMap.get(token.contract_ticker_symbol)
                          ? tokenSymbolMap.get(token.contract_ticker_symbol)
                          : token.logo_url,
                        chain_logo: chainMap.get(data.chain_id),
                        balance:
                          parseFloat(
                            ethers.utils
                              .formatUnits(
                                token.balance,
                                token.contract_decimals,
                              )
                              .toString(),
                          ) * token.quote_rate,
                        tokenBalance: parseFloat(
                          ethers.utils
                            .formatUnits(token.balance, token.contract_decimals)
                            .toString(),
                        ),
                      });
                    }
                  } else {
                    temp.native_token.contract_address?.forEach((ele) => {
                      if (
                        ele.symbol === token.contract_ticker_symbol &&
                        ele.address === token.contract_address &&
                        chainIdToChainName(ele.chain_id) === supportedChains[i]
                      ) {
                        assetWithBalance.push({
                          symbol: token.contract_ticker_symbol,
                          chain_id: data.chain_id,
                          decimals: token.contract_decimals,
                          contract_address: token.contract_address,
                          image: tokenSymbolMap.get(
                            token.contract_ticker_symbol,
                          )
                            ? tokenSymbolMap.get(token.contract_ticker_symbol)
                            : token.logo_url,
                          chain_logo: chainMap.get(data.chain_id),
                          balance:
                            parseFloat(
                              ethers.utils
                                .formatUnits(
                                  token.balance,
                                  token.contract_decimals,
                                )
                                .toString(),
                            ) * token.quote_rate,
                          tokenBalance: parseFloat(
                            ethers.utils
                              .formatUnits(
                                token.balance,
                                token.contract_decimals,
                              )
                              .toString(),
                          ),
                        });
                      }
                    });
                  }
                });
              }
            });
        }
      }

      assetWithBalance.sort((a, b) => {
        if (a.balance !== null && b.balance !== null) {
          if (a.balance > b.balance) {
            return -1;
          }
          if (a.balance < b.balance) {
            return 1;
          }
        }
        return 0;
      });

      if (assetWithBalance.length >= 5) {
        setAssets([...assetWithBalance.slice(0, 5), ...assets, ...newAssets]);
      } else {
        setAssets([...assetWithBalance, ...assets, ...newAssets]);
      }

      setFilteredAsset([
        ...assetWithBalance.slice(0, 5),
        ...assets,
        ...newAssets,
      ]);
    };

    if (address) {
      handleTokenFetcher();
    } else {
      return;
    }
  }, [address]);

  return { assets, setAssets, filteredAsset, setFilteredAsset };
}
