// @flow

import artifact from 'polymath-core/build/contracts/SecurityToken.json'
import BigNumber from 'bignumber.js'

import Contract from './Contract'
import PermissionManager from './PermissionManager'
import TransferManager from './TransferManager'
import { PolyToken, CappedSTOFactory, PercentageTransferManagerFactory } from '../'
import STO, { FUNDRAISE_ETH, FUNDRAISE_POLY } from './STO'

import type { Address, Web3Receipt } from '../../types'
import PercentageTransferManager from './PercentageTransferManager'

const MODULE_PERMISSION_MANAGER = 1
const MODULE_TRANSFER_MANAGER = 2
const MODULE_STO = 3

export default class SecurityToken extends Contract {

  decimals: number = 18

  name: () => Promise<string>
  tokenDetails: () => Promise<string>
  freeze: () => Promise<boolean>
  granularity: () => Promise<number | BigNumber>

  setTokenBurner: (address: Address) => Promise<Web3Receipt>
  freezeTransfers: () => Promise<Web3Receipt>
  unfreezeTransfers: () => Promise<Web3Receipt>
  updateTokenDetails: (newTokenDetails: string) => Promise<Web3Receipt>

  constructor (at: Address) {
    super(artifact, at)
  }

  async securityTokenVersion (): Promise<string> {
    return this._toAscii(await this._methods.securityTokenVersion().call())
  }

  addDecimals (n: number | BigNumber): Promise<BigNumber> {
    return new BigNumber(10).toPower(this.decimals).times(n)
  }

  removeDecimals (n: number | BigNumber): Promise<BigNumber> {
    return new BigNumber(n).div(new BigNumber(10).toPower(this.decimals))
  }

  async isDivisible (): Promise<boolean> {
    return Number(await this.granularity()) === 1
  }

  async verifyTransfer (from: Address, to: Address, amount: BigNumber): Promise<boolean> {
    return this._methods.verifyTransfer(from, to, this.addDecimals(amount)).call()
  }

  async mint (investor: Address, amount: BigNumber): Promise<Web3Receipt> {
    return this._tx(
      this._methods.mint(
        investor,
        this.addDecimals(amount)
      )
    )
  }

  async burn (amount: BigNumber): Promise<Web3Receipt> {
    return this._tx(
      this._methods.burn(
        this.addDecimals(amount)
      )
    )
  }

  async getModuleByName (type: number, name: string): Promise<Address> {
    const address = this._toArray(
      await this._methods.getModuleByName(type, this._toBytes(name)).call()
    )[1]
    if (this._isEmptyAddress(address)) {
      throw new Error('module not found')
    }
    return address
  }

  async getPermissionManager (): Promise<?PermissionManager> {
    try {
      return new PermissionManager(
        await this.getModuleByName(MODULE_PERMISSION_MANAGER, 'GeneralPermissionManager')
      )
    } catch (e) {
      return null
    }
  }

  async getTransferManager (): Promise<?TransferManager> {
    try {
      return new TransferManager(
        await this.getModuleByName(MODULE_TRANSFER_MANAGER, 'GeneralTransferManager')
      )
    } catch (e) {
      return null
    }
  }

  async getPercentageTM (): Promise<?TransferManager> {
    try {
      return new TransferManager(
        await this.getModuleByName(MODULE_TRANSFER_MANAGER, 'PercentageTransferManager')
      )
    } catch (e) {
      return null
    }
  }

  async getSTO (): Promise<?STO> {
    try {
      return new STO(
        await this.getModuleByName(MODULE_STO, 'CappedSTO'),
        this
      )
    } catch (e) {
      return null
    }
  }

  async withdrawPoly (amount: BigNumber): Promise<Web3Receipt> {
    return this._tx(
      this._methods.withdrawPoly(
        PolyToken.addDecimals(amount)
      )
    )
  }

  async transfer (to: Address, amount: BigNumber): Promise<Web3Receipt> {
    return this._tx(
      this._methods.transfer(
        to,
        this.addDecimals(amount)
      )
    )
  }

  async transferFrom (from: Address, to: Address, amount: BigNumber): Promise<Web3Receipt> {
    return this._tx(
      this._methods.transferFrom(
        from,
        to,
        this.addDecimals(amount)
      )
    )
  }

  async mintMulti (addresses: Array<Address>, amounts: Array<number | BigNumber>): Promise<Web3Receipt> {
    const amountsFinal = []
    for (let amount of amounts) {
      amountsFinal.push(this.addDecimals(amount))
    }
    return this._tx(
      this._methods.mintMulti(addresses, amountsFinal),
    )
  }

  async setCappedSTO (
    start: Date,
    end: Date,
    cap: number,
    rate: number,
    isEth: boolean, // fundraise type, use true for ETH or false for POLY
    fundsReceiver: Address
  ): Promise<Web3Receipt> {
    const setupCost = await CappedSTOFactory.setupCost()
    await PolyToken.transfer(this.address, setupCost)
    const data = Contract._params.web3.eth.abi.encodeFunctionCall({
      name: 'configure', // TODO @bshevchenko: can we grab this ABI from the artifact?
      type: 'function',
      inputs: [{
        type: 'uint256',
        name: '_startTime'
      }, {
        type: 'uint256',
        name: '_endTime'
      }, {
        type: 'uint256',
        name: '_cap'
      }, {
        type: 'uint256',
        name: '_rate'
      }, {
        type: 'uint8',
        name: '_fundRaiseType'
      }, {
        type: 'address',
        name: '_fundsReceiver'
      }]
    }, [
      this._toUnixTS(start),
      this._toUnixTS(end),
      this._toWei(cap),
      rate,
      isEth ? FUNDRAISE_ETH : FUNDRAISE_POLY,
      fundsReceiver
    ])
    return this._tx(
      this._methods.addModule(
        CappedSTOFactory.address,
        data,
        PolyToken.addDecimals(setupCost),
        0
      ),
      null,
      1.05,
    )
  }

  async setPercentageTM (percentage: number): Promise<Web3Receipt> {
    const setupCost = await PercentageTransferManagerFactory.setupCost()
    const data = Contract._params.web3.eth.abi.encodeFunctionCall({
      name: 'configure',
      type: 'function',
      inputs: [{
        type: 'uint256',
        name: '_maxHolderPercentage'
      }]
    }, [
      PercentageTransferManager.addDecimals(percentage)
    ])
    return this._tx(
      this._methods.addModule(
        PercentageTransferManagerFactory.address,
        data,
        PolyToken.addDecimals(setupCost),
        0
      )
    )
  }
}
