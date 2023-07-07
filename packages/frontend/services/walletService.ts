import { ethers, BigNumber, Signer } from 'ethers';
import { Provider } from '@ethersproject/providers';
import { Interface } from '@ethersproject/abi';
import ERC20ABI from '../abis/ERC20.json';
import ContractService from './contractService';

export default class WalletService {
  contractService: ContractService;
  provider: Provider | undefined;
  signer: Signer | undefined;

  constructor(contractService: ContractService, provider?: Provider, signer?: Signer) {
    this.contractService = contractService;
    this.provider = provider ?? undefined;
    this.signer = signer ?? undefined;
  }

  getProvider() {
    return this.provider;
  }

  getSigner() {
    return this.signer;
  }

  // async connect(suppliedProvider?: Web3Provider, connector?: Connector<Web3Provider>, chainId?: number) {
  //   const connectorProvider = await connector?.getProvider();

  //   if (!suppliedProvider && !connectorProvider) {
  //     return;
  //   }

  //   const provider: Web3Provider = (suppliedProvider || connectorProvider) as Web3Provider;

  //   this.setProvider(provider);
  //   // A Web3Provider wraps a standard Web3 provider, which is
  //   // what Metamask injects as window.ethereum into each page
  //   const ethersProvider = new Web3Provider(provider as ExternalProvider, 'any');

  //   // The Metamask plugin also allows signing transactions to
  //   // send ether and pay to change state within the blockchain.
  //   // For this, you need the account signer...
  //   const signer = this.getSigner();

  //   this.setProvider(ethersProvider);
  //   this.setSigner(signer);

  //   const account = await this.signer.getAddress();

  // }

  async getBalance(address: string): Promise<BigNumber> {
    if (this.provider) {
      const connectedAccount = this.provider.getBalance(address);

      if (!address || !connectedAccount) return Promise.resolve(BigNumber.from(0));

      const ERC20Interface = new Interface(ERC20ABI);
      const erc20 = new ethers.Contract(address, ERC20Interface, this.provider);

      return erc20.balanceOf(connectedAccount);
    } else {
      return BigNumber.from(0);
    }
  }
}
