import { useEffect } from "react";
import Image from "next/image";
import { chainIdToChainName } from "../../utils/utils";

export type AssetType = {
  symbol: string;
  chain_id: number;
  decimals: number;
  contract_address: string;
  balance: number;
  tokenBalance: number | null;
  chain_logo?: string;
  image?: string;
};

const Asset = ({
  chainFilter,
  search,
  handleSelectedAssetHelper,
  handleModalHelper,
  assets,
  filteredAsset,
  setFilteredAsset,
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
  assets: AssetType[];
  filteredAsset: AssetType[];
  setFilteredAsset: React.Dispatch<React.SetStateAction<AssetType[]>>;
}) => {
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

  const myLoader = ({ src }: { src: string }) => {
    return src;
  };

  return (
    <div className="w-full">
      {filteredAsset && filteredAsset.length ? (
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
