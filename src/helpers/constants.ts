// tslint:disable object-literal-sort-keys

/**
 * @namespace constants
 * @memberof module:helpers
 * @property {number} activeDelegates - The default number of delegates.
 * @property {number} maxVotesPerTransaction - The maximum number of votes in vote type transaction.
 * @property {number} addressLength - The default address length.
 * @property {number} blockHeaderLength - The default block header length.
 * @property {number} blockReceiptTimeOut
 * @property {number} confirmationLength
 * @property {Date} epochTime
 * @property {object} fees - The default values for fees.
 * @property {number} fees.send
 * @property {number} fees.vote
 * @property {number} fees.secondsignature
 * @property {number} fees.delegate
 * @property {number} fees.multisignature
 * @property {number} feeStart
 * @property {number} feeStartVolume
 * @property {number} fixedPoint
 * @property {number} maxAddressesLength
 * @property {number} maxAmount
 * @property {number} maxConfirmations
 * @property {number} maxPayloadLength
 * @property {number} maxPeers
 * @property {number} maxRequests
 * @property {number} maxSharedTxs
 * @property {number} maxSignaturesLength
 * @property {number} maxTxsPerBlock
 * @property {number} minBroadhashConsensus
 * @property {string[]} nethashes - Mainnet and Testnet.
 * @property {number} numberLength
 * @property {number} requestLength
 * @property {object} rewards
 * @property {number[]} rewards.milestones - Initial 5, and decreasing until 1.
 * @property {number} rewards.offset - Start rewards at block (n).
 * @property {number} rewards.distance - Distance between each milestone
 * @property {number} signatureLength
 * @property {number} totalAmount
 * @property {number} unconfirmedTransactionTimeOut - 1080 blocks
 */
export default {
  activeDelegates              : 41,
  maximumVotes                 : 11,
  maxVotesPerTransaction       : 22,
  addressLength                : 208,
  blockHeaderLength            : 248,
  blockSlotWindow              : 5, // window of which a slot could be accepted.
  blockTime                    : 15,
  blockReceiptTimeOut          : 15 * 2, // 2 blocks
  confirmationLength           : 77,
  addressSuffix                : 'BBN',
  epochTime                    : new Date(Date.UTC(2018, 9, 1, 0, 0, 0, 0)),
  minVersion                   : [
  ],
  fees                         : [
    {
      height: 1,
      fees  : {
        send           :    100000,
        secondsignature:  50000000,
        delegate       : 500000000,
        vote           :  10000000,
      },
    },
  ],
  feeStart                     : 1,
  feeStartVolume               : 10000 * 100000000,
  fixedPoint                   : Math.pow(10, 8),
  maxAddressesLength           : 208 * 128,
  maxAmount                    : 100000000,
  maxConfirmations             : 77 * 100,
  maxPayloadLength             : 1024 * 1024,
  maxPeers                     : 100,
  maxProtoBufPayloadLength     : 100 * 1024, // (100KB) Maximum number of bytes for a Protocol Buffer Request/Response Body
  maxRequests                  : 10000 * 12,
  maxSharedTxs                 : 100,
  maxSignaturesLength          : 196 * 256,
  maxTxsPerBlock               : 25,
  minBroadhashConsensus        : 51,
  nethashes                    : [
    // Mainnet
    'a7594caee74706f85193f1848f099fe3d939e87169437fb506b7a30ebe987565',
    // Testnet
    'e90d39ac200c495b97deb6d9700745177c7fc4aa80a404108ec820cbeced054c',
  ],
  numberLength                 : 100000000,
  requestLength                : 104,
  rewards                      : [
    { height: 1,           reward: 0         },
    { height: 2,           reward: 210000000 }, // 1st year
    { height: 2102400,     reward: 160000000 }, // 2nd year
    { height: 2102400 * 2, reward: 110000000 }, // 3rd year
    { height: 2102400 * 3, reward: 80000000  }, // 4th year
    { height: 2102400 * 4, reward: 70000000  }, // 5th year
    { height: 2102400 * 5, reward: 50000000  }, // 6th year
  ],
  signatureLength              : 196,
  totalAmount                  : 3000000000000000,
  unconfirmedTransactionTimeOut: 10800, // 1080 blocks
  multisigConstraints          : {
    min      : {
      minimum: 1,
      maximum: 15,
    },
    lifetime : {
      minimum: 1,
      maximum: 72,
    },
    keysgroup: {
      minItems: 1,
      maxItems: 15,
    },
  },
};
