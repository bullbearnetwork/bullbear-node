import * as bs58check from 'bs58check';
import * as ByteBuffer from 'bytebuffer';
import * as crypto from 'crypto';
import * as filterObject from 'filter-object';
import { inject, injectable } from 'inversify';
import * as RIPEMD160 from 'ripemd160';
import z_schema from 'z-schema';
import { BigNum, constants, Ed, IKeypair } from '../helpers/';
import {IAccountLogic, IBlockLogic, ITransactionLogic} from '../ioc/interfaces/logic/';
import { Symbols } from '../ioc/symbols';
import { BlocksModel } from '../models';
import logicBlockSchema from '../schema/logic/block';
import { DBOp } from '../types/genericTypes';
import { RawFullBlockListType } from '../types/rawDBTypes';
import { BlockRewardLogic } from './blockReward';
import { IBaseTransaction, IBytesTransaction, IConfirmedTransaction, ITransportTransaction } from './transactions/';

// import * as OldImplementation from './_block.js';

// tslint:disable-next-line interface-over-type-literal
export type BlockType<T = Buffer> = {
  height?: number;
  version: number;
  totalAmount: number;
  totalFee: number;
  reward: number;
  payloadHash: T;
  timestamp: number;
  numberOfTransactions: number;
  payloadLength: number;
  previousBlock: string;
  generatorPublicKey: T;
  transactions?: Array<IBaseTransaction<any>>;
};

export type SignedBlockType<T = Buffer> = BlockType<T> & {
  id: string;
  blockSignature: T;
  transactions?: Array<IConfirmedTransaction<any>>;
};

export type SignedAndChainedBlockType = SignedBlockType<Buffer> & {
  height: number
};

export type SignedAndChainedTransportBlockType = SignedBlockType<string> & {
  height: number;
  transactions?: Array<ITransportTransaction<any>>
};

export interface IBytesBlock {
  bytes: Buffer;
  transactions: IBytesTransaction[];
  height?: number;
  relays: number;
}

@injectable()
export class BlockLogic implements IBlockLogic {

  public table    = 'blocks';
  public dbFields = [
    'id',
    'version',
    'timestamp',
    'height',
    'previousBlock',
    'numberOfTransactions',
    'totalAmount',
    'totalFee',
    'reward',
    'payloadLength',
    'payloadHash',
    'generatorPublicKey',
    'blockSignature',
  ];
  @inject(Symbols.generic.zschema)
  public zschema: z_schema;

  @inject(Symbols.logic.account)
  private accountLogic: IAccountLogic;
  @inject(Symbols.logic.blockReward)
  private blockReward: BlockRewardLogic;
  @inject(Symbols.helpers.ed)
  private ed: Ed;
  @inject(Symbols.logic.transaction)
  private transaction: ITransactionLogic;

  @inject(Symbols.models.blocks)
  private BlocksModel: typeof BlocksModel;

  /**
   * the schema for logic block
   */
  get schema(): typeof logicBlockSchema {
    return logicBlockSchema;
  }

  public create(data: {
    keypair: IKeypair, timestamp: number,
    transactions: Array<IBaseTransaction<any>>,
    previousBlock?: SignedAndChainedBlockType
  }): SignedAndChainedBlockType {
    const transactions = data.transactions;
    transactions.sort((a, b) => {
      if (a.type < b.type) {
        return -1;
      }
      if (a.type > b.type) {
        return 1;
      }
      if (a.amount < b.amount) {
        return -1;
      }
      if (a.amount > b.amount) {
        return 1;
      }
      return 0;
    });

    const nextHeight = (data.previousBlock) ? data.previousBlock.height + 1 : 1;

    const reward    = this.blockReward.calcReward(nextHeight);
    let totalFee    = 0;
    let totalAmount = 0;
    let size        = 0;

    const blockTransactions = [];
    const payloadHash       = crypto.createHash('sha256');

    for (const transaction of transactions) {
      const bytes: Buffer = this.transaction.getBytes(transaction);

      if (size + bytes.length > constants.maxPayloadLength) {
        break;
      }

      size += bytes.length;

      totalFee += transaction.fee;
      totalAmount += transaction.amount;

      blockTransactions.push(transaction);
      payloadHash.update(bytes);
    }

    const block: SignedAndChainedBlockType = {
      blockSignature      : undefined,
      generatorPublicKey  : data.keypair.publicKey,
      height              : data.previousBlock.height + 1,
      id                  : undefined,
      numberOfTransactions: blockTransactions.length,
      payloadHash         : payloadHash.digest(),
      payloadLength       : size,
      previousBlock       : data.previousBlock.id,
      reward,
      timestamp           : data.timestamp,
      totalAmount,
      totalFee,
      transactions        : blockTransactions,
      version             : 0,
    };

    block.blockSignature = this.sign(block, data.keypair);
    block.id = this.getId(block);
    return this.objectNormalize(block);
  }

  /**
   * Sign the block
   * @param {BlockType} block
   * @param {IKeypair} key
   * @returns {string}
   */
  public sign(block: BlockType, key: IKeypair): Buffer {
    return this.ed.sign(
      this.getHash(block, false),
      key
    );
  }

  /**
   * Verifies block hash, generator block public key and block signature
   * @param {BlockType} block
   */
  public verifySignature(block: SignedBlockType): boolean {
    // console.log(block);
    // const res = new OldImplementation(this.ed, this.zschema, this.transaction, null)
    //  .verifySignature(block);
    // console.log(res);
    return this.ed.verify(
      this.getHash(block, false),
      block.blockSignature,
      block.generatorPublicKey
    );
  }

  /**
   * Creates db object transaction to `blocks` table.
   * @param {BlockType} block
   * TODO: Change method name to something more meaningful as this does NOT save
   */
  public dbSave(block: SignedBlockType): DBOp<BlocksModel & { id: string }> {
    const values = {...filterObject(block, this.dbFields) };
    return {
      model : this.BlocksModel,
      type  : 'create',
      values,
    };
  }

  /**
   * Normalize block object and eventually throw if something is not valid
   * Does NOT perform signature validation but just content validation.
   * @param {BlockType} block
   * @returns {BlockType}
   */
  public objectNormalize<T extends BlockType<Buffer | string>>(block: T | SignedAndChainedTransportBlockType): T | SignedAndChainedBlockType {
    // Delete null or undefined elements in block obj
    for (const key in block) {
      if (block[key] === null || typeof(block[key]) === 'undefined') {
        delete block[key];
      }
    }

    ['generatorPublicKey', 'payloadHash', 'blockSignature'].forEach((bufKey) => {
      if (!Buffer.isBuffer(block[bufKey])) {
        block[bufKey] = Buffer.from(block[bufKey], 'hex');
      }
    });

    const report = this.zschema.validate(
      block,
      this.schema
    );
    if (!report) {
      throw new Error(`Failed to validate block schema: ${this.zschema
        .getLastErrors().map((err) => err.message).join(', ')}`
      );
    }

    for (let i = 0; i < block.transactions.length; i++) {
      block.transactions[i] = this.transaction.objectNormalize(block.transactions[i]);
    }
    // cast to any is correct as we transform non-buffer items to
    return block as any;
  }

  public dbRead(rawBlock: RawFullBlockListType): SignedBlockType & { totalForged: string, readonly generatorId: string} {
    if (!rawBlock.b_id) {
      return null;
    } else {
      const self = this;
      const block       = {
        blockSignature      : Buffer.from(rawBlock.b_blockSignature, 'hex'),
        get generatorId() {
          return self.accountLogic.generateAddressByPublicKey(rawBlock.b_generatorPublicKey);
        },
        generatorPublicKey  : Buffer.from(rawBlock.b_generatorPublicKey, 'hex'),
        height              : parseInt(`${rawBlock.b_height}`, 10),
        id                  : rawBlock.b_id,
        numberOfTransactions: parseInt(`${rawBlock.b_numberOfTransactions}`, 10),
        payloadHash         : Buffer.from(rawBlock.b_payloadHash, 'hex'),
        payloadLength       : parseInt(`${rawBlock.b_payloadLength}`, 10),
        previousBlock       : rawBlock.b_previousBlock,
        reward              : parseInt(`${rawBlock.b_reward}`, 10),
        timestamp           : parseInt(`${rawBlock.b_timestamp}`, 10),
        totalAmount         : parseInt(`${rawBlock.b_totalAmount}`, 10),
        totalFee            : parseInt(`${rawBlock.b_totalFee}`, 10),
        totalForged         : '',
        version             : parseInt(`${rawBlock.b_version}`, 10),
      };
      block.totalForged = new BigNum(block.totalFee).plus(new BigNum(block.reward)).toString();
      return block;
    }
  }

  /**
   * Calculates block id.
   * @param {BlockType} block
   * @returns {string}
   */
  public getId(block: BlockType): string {
    return this.getIdFromBytes(this.getBytes(block));
  }

  public getHash(block: BlockType, includeSignature: boolean = true) {
    return crypto.createHash('sha256')
      .update(this.getBytes(block, includeSignature))
      .digest();
  }

  public getBytes(block: BlockType | SignedBlockType, includeSignature: boolean = true): Buffer {
    const size = 4 + 4 + 8 + 4 + 4 + 8 + 8 + 4 + 4 + 4 + 32 + 32 + 64;
    const bb   = new ByteBuffer(size, true /* little endian */);
    bb.writeInt(block.version);
    bb.writeInt(block.timestamp);

    if (block.previousBlock) {
      bb.append(bs58check.decode(block.previousBlock));
    } else {
      bb.append(new Buffer(20).fill(0));
    }

    bb.writeInt(block.numberOfTransactions);

    // tslint:disable no-string-literal
    bb['writeLong'](block.totalAmount);
    bb['writeLong'](block.totalFee);
    bb['writeLong'](block.reward);
    // tslint:enable no-string-literal

    bb.writeInt(block.payloadLength);

    const payloadHashBuffer = block.payloadHash;
    // tslint:disable-next-line
    for (let i = 0; i < payloadHashBuffer.length; i++) {
      bb.writeByte(payloadHashBuffer[i]);
    }

    const generatorPublicKeyBuffer = block.generatorPublicKey;
    // tslint:disable-next-line
    for (let i = 0; i < generatorPublicKeyBuffer.length; i++) {
      bb.writeByte(generatorPublicKeyBuffer[i]);
    }

    if (typeof((block as SignedBlockType).blockSignature) !== 'undefined' && includeSignature) {
      const blockSignatureBuffer = (block as SignedBlockType).blockSignature;
      // tslint:disable-next-line
      for (let i = 0; i < blockSignatureBuffer.length; i++) {
        bb.writeByte(blockSignatureBuffer[i]);
      }
    }

    bb.flip();

    return bb.toBuffer() as any;
  }

  /**
   * Restores a block from its bytes
   */
  public fromBytes(blk: IBytesBlock): SignedAndChainedBlockType & {relays: number} {
    if (blk === null || typeof blk === 'undefined') {
      return null;
    }
    const bb = ByteBuffer.wrap(blk.bytes, 'binary', true);
    const version = bb.readInt(0);
    const timestamp = bb.readInt(4);

    const previousBlock = bs58check.encode(blk.bytes.slice(8, 28));

    const numberOfTransactions = bb.readInt(28);
    const totalAmount = bb.readLong(32).toNumber();
    const totalFee = bb.readLong(40).toNumber();
    const reward = bb.readLong(48).toNumber();
    const payloadLength = bb.readInt(56);
    const payloadHash = blk.bytes.slice(60, 60 + 32 /*92*/);
    const generatorPublicKey = blk.bytes.slice(92, 92 + 32 /*124*/);
    const blockSignature = blk.bytes.slice(124, 124 + 64);
    const id = this.getIdFromBytes(blk.bytes);
    const transactions = blk.transactions.map((tx) => {
      const baseTx = this.transaction.fromBytes(tx);
      return {
        ...baseTx,
        blockId: id,
        height: blk.height,
        senderId: this.accountLogic.generateAddressByPublicKey(baseTx.senderPublicKey),
      };
    });

    // tslint:disable object-literal-sort-keys
    return {
      id,
      version,
      timestamp,
      previousBlock,
      numberOfTransactions,
      totalAmount,
      totalFee,
      reward,
      payloadLength,
      payloadHash,
      generatorPublicKey,
      blockSignature,
      transactions,
      height: blk.height,
      relays: blk.relays,
    };
  }

  public getMinBytesSize(): number {
    let size = 4 + 4 + 8 + 4 + 4 + 8 + 8 + 4 + 4 + 4 + 32 + 32 + 64; // Block's bytes
    size += 4; // height
    return size;
  }

  public getMaxBytesSize(): number {
    let size = this.getMinBytesSize();
    const maxTxSize = this.transaction.getMaxBytesSize();
    size += constants.maxTxsPerBlock * maxTxSize; // transactions
    return size;
  }

  private getIdFromBytes(bytes: Buffer): string {
    const hash = crypto.createHash('sha256').update(bytes).digest();
    return bs58check.encode(new RIPEMD160().update(hash).digest());
  }

}
