import { getSupportedAssetsForDomain } from "@connext/chain-abstraction";
import { Asset } from "@connext/chain-abstraction/dist/types";

import { useState, useEffect } from "react";
import styles from "../styles/Home.module.css";

const TokenList = (props: any) => {
  const [list, setList] = useState<Asset[]>([]);
  const [filteredList, setFilteredList] = useState<Asset[]>(list);
  const [openList, setOpenList] = useState<boolean>(false);
  // const [selectedToken, setSelectedToken] = useState<any>(null);

  useEffect(() => {
    if (props.chainId) {
      fetchTokenList(props.chainId);
      props.setSelectedToken(null);
    }
  }, [props.chainId]);

  const fetchTokenList = async (chainId: number) => {
    try {
      const tokenList = await getSupportedAssetsForDomain(chainId);
      if (tokenList) {
        setList(tokenList);
        setFilteredList(tokenList);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const filterList = (e: any) => {
    console.log(e.target.value);
    const updatedList = [...list];
    const filteredList = updatedList.filter((item) => {
      if (item.name.toLowerCase().includes(e.target.value.toLowerCase())) {
        return item;
      }
    });
    setFilteredList(filteredList);
  };

  return (
    <div className={styles.tokenList}>
      <button
        onClick={() => {
          setOpenList(!openList);
        }}
      >
        {props.selectedToken ? props.selectedToken.name : "Select Token"}{" "}
        <span className={styles.arrow}>{">"}</span>
      </button>

      {openList && (
        <div>
          <input placeholder="Search Token" onChange={(e) => filterList(e)} />
          <ul className={styles.list}>
            {filteredList.length
              ? filteredList.map((token) => (
                  <li
                    onClick={() => {
                      props.setSelectedToken(token);
                      setOpenList(false);
                    }}
                  >
                    {token.name}
                  </li>
                ))
              : null}
          </ul>
        </div>
      )}

      <div></div>
    </div>
  );
};

export default TokenList;
