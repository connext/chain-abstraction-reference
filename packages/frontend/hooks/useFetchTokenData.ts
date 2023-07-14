import { useState, useEffect } from "react";
import mainnetChains from "../config/mainnet/chains.json";
import mainnetAssets from "../config/mainnet/assets.json";
import { chainIdToChainName } from "../utils/utils";
import { AssetType } from "../components/Asset";
import { ethers } from "ethers";


export default function useFetchTokenData(address: string | undefined) {
  const [assets, setAssets] = useState<AssetType[]>([]);
  const [filteredAsset, setFilteredAsset] = useState<AssetType[]>([]);

  useEffect(() => {
    const handleTokenFetcher = async () => {
      const chainMap = new Map(
        mainnetChains.map((chain) => [chain.chain_id, chain.image])
      );

      const tokenSymbolMap = new Map(
        mainnetAssets.map((asset) => [asset.symbol, asset.image])
      );

      const newAssets = mainnetAssets.flatMap((mainnetAsset) => {
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

      console.log("before calling");

      // fetch token Prices here for all chains.
      const supportedChains = mainnetChains.map((chain) => {
        if (chainIdToChainName(chain.chain_id)) {
          return chainIdToChainName(chain.chain_id);
        }
      });

      const assetWithBalance: {
        symbol: string;
        chain_id: number;
        decimals: number;
        contract_address: string;
        image: string;
        chain_logo: string | undefined;
        balance: number;
        tokenBalance: number;
      }[] = [];

      for (let i = 0; i < supportedChains.length; i++) {
        if (supportedChains[i] && address) {
          // api call here.

          let headers = new Headers();
          headers.set(
            "Authorization",
            "Bearer cqt_rQftkJjKvJqfTPKGGdKwqvXFvbr7"
          );

          await fetch(
            `https://api.covalenthq.com/v1/${supportedChains[i]}/address/${address}/balances_v2/`,
            { method: "GET", headers: headers }
          )
            .then((resp) => resp.json())
            .then(({ data }) => {
              if (data) {
                data.items.forEach((token: any) => {
                  if (token.balance !== "0")
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
                            .formatUnits(token.balance, token.contract_decimals)
                            .toString()
                        ) * token.quote_rate,
                      tokenBalance: parseFloat(
                        ethers.utils
                          .formatUnits(token.balance, token.contract_decimals)
                          .toString()
                      ),
                    });
                });
              }
            });
        }
      }

      assetWithBalance.sort((a, b) => {
        if (a.balance > b.balance) {
          return -1;
        }
        if (a.balance < b.balance) {
          return 1;
        }
        return 0;
      });

      setAssets([...assetWithBalance.slice(0, 5), ...assets, ...newAssets]);
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
