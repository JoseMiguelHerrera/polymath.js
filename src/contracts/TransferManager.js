// @flow

import artifact from 'polymath-core/build/contracts/GeneralTransferManager.json'

import Contract from './Contract'
import type { Address, Investor, Web3Receipt } from '../../types'

const LOG_MODIFY_WHITELIST = 'LogModifyWhitelist'

export default class TransferManager extends Contract {

  paused: () => Promise<boolean>

  pause: () => Promise<Web3Receipt>
  unpause: () => Promise<Web3Receipt>

  constructor (at: Address) {
    super(artifact, at)
  }

  async modifyWhitelist (investor: Investor, canBuyFromSTO: boolean = true): Promise<Web3Receipt> {
    return this._tx(
      this._methods.modifyWhitelist(
        investor.address, // $FlowFixMe
        this._toUnixTS(investor.from), // $FlowFixMe
        this._toUnixTS(investor.to), // $FlowFixMe
        this._toUnixTS(investor.expiry),
        canBuyFromSTO,
      ),
      null,
      2
    )
  }

  async modifyWhitelistMulti (investors: Array<Investor>, canBuyFromSTO: boolean = true): Promise<Web3Receipt> {
    const addresses: Array<string> = []
    const fromTimes: Array<number> = []
    const toTimes: Array<number> = []
    const expiryTimes: Array<number> = []
    const canBuyFromSTOArr: Array<boolean> = []

    for (let investor of investors) {
      addresses.push(investor.address) // $FlowFixMe
      fromTimes.push(this._toUnixTS(investor.from)) // $FlowFixMe
      toTimes.push(this._toUnixTS(investor.to)) // $FlowFixMe
      expiryTimes.push(this._toUnixTS(investor.expiry))
      canBuyFromSTOArr.push(canBuyFromSTO)
    }

    return this._tx(
      this._methods.modifyWhitelistMulti(addresses, fromTimes, toTimes, expiryTimes, canBuyFromSTOArr),
      null,
      2
    )
  }

  async getWhitelist (): Promise<Array<Investor>> {
    const logs = []
    const events = await this._contractWS.getPastEvents(LOG_MODIFY_WHITELIST, {
      fromBlock: 0,
      toBlock: 'latest'
    })

    for (let event of events) {
      logs.push({
        address: event.returnValues._investor,
        addedBy: event.returnValues._addedBy,
        added: this._toDate(event.returnValues._dateAdded),
        from: this._toDate(event.returnValues._fromTime),
        to: this._toDate(event.returnValues._toTime),
        expiry: this._toDate(event.returnValues._expiryTime),
      })
    }

    const investors = []
    for (let i = 0; i < logs.length; i++) {
      const found = investors.some((el, index, array) => {
        if (el.address === logs[i].address) { // $FlowFixMe
          if (logs[i].added > el.added) {
            array[index] = logs[i]
            return true
          }
          return true
        }
        return false
      })
      if (!found) {
        investors.push(logs[i])
      }
    }
    const removeZeroTimestampArray = []
    for (let j = 0; j < investors.length; j++) { // $FlowFixMe
      if (investors[j].from.getTime() !== 0 && investors[j].to.getTime() !== 0) {
        removeZeroTimestampArray.push(investors[j])
      }
    }

    return removeZeroTimestampArray
  }
}
