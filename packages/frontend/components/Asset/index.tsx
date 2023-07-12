import { useEffect, useState } from "react";
import mainnetChains from "../../config/mainnet/chains.json";
import mainnetAssets from "../../config/mainnet/assets.json";
import Image from "next/image";

const Asset = ({ search }: { search: string }) => {
  const [assets, setAssets] = useState<
    {
      symbol: string;
      chain_id: number;
      decimals: number;
      contract_address: string;
      image: string;
      chain_logo: string | undefined;
    }[]
  >([]);

  const [filteredAsset, setFilteredAsset] = useState<
    {
      symbol: string;
      chain_id: number;
      decimals: number;
      contract_address: string;
      image: string;
      chain_logo: string | undefined;
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
    const chainMap = new Map(
      mainnetChains.map((chain) => [chain.chain_id, chain.image])
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
        };
      });
    });

    setAssets([...assets, ...newAssets]);
    setFilteredAsset([...assets, ...newAssets]);
  }, []);

  return (
    <div className="w-full">
      {filteredAsset.length &&
        filteredAsset.map((token) => {
          return (
            <div className="mb-3 hover:bg-slate-100 w-full text-white dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded cursor-pointer flex items-center hover:font-semibold space-x-1 mr-1.5 py-2 px-2">
              <div className="flex relative">
                <Image
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
              <span className={`whitespace-nowrap font-bold`}>
                {token.symbol}
              </span>
            </div>
          );
        })}
    </div>
  );
};

export default Asset;
