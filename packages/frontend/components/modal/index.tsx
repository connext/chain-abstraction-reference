import { FiSearch } from "react-icons/fi";
import Asset from "../Asset";
import { useState } from "react";
import mainnetAssets from "../../config/mainnet/chains.json";
import { chainIdToChainName } from "../../utils/utils";
import Image from "next/image";
import { AssetType } from "../Asset";

const Modal = ({
  address,
  isModalOpen,
  handleModalHelper,
  handleSelectedAssetHelper,
  assets,
  filteredAsset,
  setFilteredAsset
}: {
  address: `0x${string}` | undefined;
  isModalOpen: boolean;
  handleModalHelper: (open: boolean) => void;
  handleSelectedAssetHelper: (asset: AssetType) => void;
  assets: AssetType[];
  filteredAsset: AssetType[];
  setFilteredAsset: React.Dispatch<React.SetStateAction<AssetType[]>>;
}) => {
  const [search, setSearch] = useState<string>("");

  const [chainFilter, setChainFilter] = useState<number | null>(null);

  const handleBackdropClick = () => {
    handleModalHelper(false);
  };

  const handleModalClick = (e: any) => {
    e.stopPropagation();
  };

  const chainsContainer = mainnetAssets.map((chains) => {
    if (chainIdToChainName(chains.chain_id) && chains.chain_id !== 100) {
      return (
        <div
          className="flex items-center justify-center border rounded border-gray-700 p-2 m-2 cursor-pointer hover:bg-blue-700"
          onClick={() => setChainFilter(chains.chain_id)}
        >
          <Image
            className="h-[20px]"
            src={chains.image}
            width={20}
            height={20}
            alt={chains.name}
          />
          <p className="text-white ml-2 text-xs">{chains.name}</p>
        </div>
      );
    } else {
      return null;
    }
  });

  return (
    <>
      {isModalOpen && (
        <div
          className="flex w-screen h-screen bg-opacity-50 bg-gray-800 justify-center items-center fixed top-0"
          onClick={handleBackdropClick}
        >
          <div
            id="modal"
            className=" inset-1/4 w-[400px] h-[500px] z-50 bg-slate-900 outline-none rounded shadow-lg border-0 flex flex-col "
            onClick={handleModalClick}
          >
            <div className="relative flex-auto p-4">
              <div className="flex items-start justify-start space-x-4 p-2">
                {/* {icon && <div className="w-12 flex-shrink-0">{icon}</div>} */}
                <div className="w-full flex flex-col">
                  <div className="flex justify-between">
                    <div className="uppercase text-base font-bold mb-2 text-white">
                      Select Token
                    </div>

                    <div
                      className="uppercase text-base font-bold mb-2 text-white cursor-pointer"
                      onClick={() => handleModalHelper(false)}
                    >
                      x
                    </div>
                  </div>

                  <div className="navbar-search mt-1">
                    <div className="relative">
                      <input
                        // value={}
                        onChange={(e) => setSearch(e.target.value)}
                        type="search"
                        placeholder="Search"
                        className="w-full h-10 bg-transparent appearance-none rounded border border-slate-200 border-slate-800 text-sm pl-10 pr-5 outline-none text-white"
                      />
                      <div className="absolute top-0 left-0 mt-3 ml-4 text-white">
                        <FiSearch className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    {/* {body} */}
                  </div>
                  <div className="w-full mx-auto pt-4 pb-2 h-[350px] overflow-scroll">
                    <div className="flex w-full flex-wrap">
                      {chainsContainer}
                    </div>
                    <div className="flex w-full flex-wrap items-center mt-1 mb-4  ">
                      <Asset
                        chainFilter={chainFilter}
                        address={address}
                        handleSelectedAssetHelper={handleSelectedAssetHelper}
                        search={search}
                        handleModalHelper={handleModalHelper}
                        assets={assets}
                        filteredAsset={filteredAsset}
                        setFilteredAsset={setFilteredAsset}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Modal;
