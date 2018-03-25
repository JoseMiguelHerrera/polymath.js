// @flow

import BigNumber from 'bignumber.js'

import SecurityTokenContract from './src/contracts/SecurityToken'

export type Web3 = {
  eth: {
    clearSubscriptions: Function,
    abi: {
      encodeFunctionCall: Function
    },
    Contract: Function
  },
  utils: {
    toWei: Function,
    fromWei: Function,
    asciiToHex: Function,
    hexToAscii: Function
  }
}

export type NetworkParams = {
  id: number,
  web3: Web3,
  web3WS: Web3,
  account: string,
  txHashCallback: (hash: string) => void,
  txEndCallback: (receipt: Object) => void,
}

export type Artifact = {
  abi: Object,
  networks: Object,
}

export type Web3Contract = {
  events: Object,
  getPastEvents: Function,
}

export type Web3Event = {
  returnValues: Object,
}

export type SymbolDetails = {
  ticker: string,
  owner: string,
  timestamp: Date,
  contact: string,
  status: boolean,
}

export type SecurityToken = {
  ticker: string,
  owner: string,
  contact: string,
  address?: string,
  name?: string,
  decimals?: number,
  details?: string,
  contract?: SecurityTokenContract,

  // off-chain
  url?: string,
  firstName?: string,
  lastName?: string,
  desc?: string,

  // flags
  isGenerated: boolean,
  isComplete: boolean,
}

export type STODetails = {
  start: Date,
  end: Date,
  cap: BigNumber,
  raised: BigNumber,
}

export type STOPurchase = {
  investor: string,
  txHash: string,
  amount: BigNumber,
  paid: BigNumber,
}

export type Investor = {
  address: string,
  from: Date,
  to: Date,
}
