import { useEffect, useState } from "react";
import mainnetChains from "../../config/mainnet/chains.json";
import mainnetAssets from "../../config/mainnet/assets.json";
import Image from "next/image";
import { chainIdToChainName } from "../../utils/utils";
import { ethers } from "ethers";

export type AssetType = {
  symbol: string;
  chain_id: number;
  decimals: number;
  contract_address: string;
  image: string;
  chain_logo: string | undefined;
  balance: number | null;
  tokenBalance: number | null;
}

const Asset = ({
  chainFilter,
  address,
  search,
  handleSelectedAssetHelper,
  handleModalHelper,
}: {
  chainFilter: number | null;
  address: `0x${string}` | undefined;
  search: string;
  handleSelectedAssetHelper: (asset: {
    symbol: string;
    chain_id: number;
    decimals: number;
    contract_address: string;
    image: string;
    chain_logo: string | undefined;
    balance: number | null;
    tokenBalance: number | null;
  }) => void;
  handleModalHelper: (open: boolean) => void;
}) => {
  const [assets, setAssets] = useState<AssetType[]>([]);

  const [filteredAsset, setFilteredAsset] = useState<
    {
      symbol: string;
      chain_id: number;
      decimals: number;
      contract_address: string;
      image: string;
      chain_logo: string | undefined;
      balance: number | null;
      tokenBalance: number | null;
    }[]
  >(assets);

  useEffect(() => {
    const updatedList = [...assets];
    const filteredList = updatedList.filter((item) => {
      if (item.symbol.toLowerCase().includes(search.toLowerCase())) {
        return item;
      }
    });
    if (filteredList.length) {
      setFilteredAsset(filteredList);
    } else {
      setFilteredAsset(assets);
    }
  }, [search]);

  useEffect(() => {
    if (!chainFilter) {
      return;
    }
    const updatedList = [...assets];
    const filteredList = updatedList.filter((item) => {
      if (item.chain_id === chainFilter) {
        return item;
      }
    });
    if (filteredList.length) {
      setFilteredAsset(filteredList);
    } else {
      setFilteredAsset(assets);
    }
  }, [chainFilter]);

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

    handleTokenFetcher();
  }, []);

  const myLoader = ({ src }: { src: string }) => {
    return src;
  };

  return (
    <div className="w-full">
      {filteredAsset.length ? (
        filteredAsset.map((token) => {
          return (
            <div
              className="mb-3 relative hover:bg-slate-100 w-full text-white hover:bg-slate-800 border border-slate-300 border-slate-600 rounded cursor-pointer flex items-center hover:font-semibold space-x-1 mr-1.5 py-2 px-2"
              onClick={() => {
                handleSelectedAssetHelper(token);
                handleModalHelper(false);
              }}
            >
              <div className="flex relative">
                <Image
                  loader={myLoader}
                  src={token.image}
                  width={30}
                  height={30}
                  className="rounded-full mr-2"
                  alt="Hey"
                />
                <Image
                  className="absolute bottom-0 right-1"
                  src={token.chain_logo as string}
                  alt="hey"
                  width={15}
                  height={15}
                />
              </div>
              <div className={`whitespace-nowrap flex flex-col`}>
                <p className="font-bold text-white">{token.symbol}</p>
                <p className="text-xs text-white">
                  {chainIdToChainName(token.chain_id).split("-")[0]}
                </p>
              </div>
              {token.balance && token.tokenBalance && (
                <span className={`whitespace-nowrap absolute right-4 mr-2.5`}>
                  {token.tokenBalance.toFixed(4)}
                  {" ($"}
                  {token.balance.toFixed(2)}
                  {")"}
                </span>
              )}
            </div>
          );
        })
      ) : (
        <div className="font-bold text-white">Loading...</div>
      )}
    </div>
  );
};

export default Asset;
