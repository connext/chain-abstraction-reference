import { ethers } from 'ethers';
import { Provider } from '@ethersproject/providers';
import ERC20ABI from '../abis/ERC20.json';
import GreeterABI from '../abis/Greeter.json';

export default class ContractService {
  provider: Provider;

  constructor(provider: Provider) {
    this.provider = provider;
  }

  async getTokenContractInstance(tokenAddress: string): Promise<ethers.Contract> {
    return new ethers.Contract(tokenAddress, ERC20ABI, this.provider);
  }

  async getGreeterContractInstance(contractAddress: string): Promise<ethers.Contract> {
    return new ethers.Contract(contractAddress, GreeterABI, this.provider);
  }
}
