import { BasePeerType, Peer, PeerState, PeerType, SignedBlockType } from '../../../logic';
import { IBaseTransaction } from '../../../logic/transactions';
import { PeerRequestOptions } from '../../../modules';
import { IModule } from './IModule';

export interface ITransportModule extends IModule {
  readonly consensus: number;
  readonly poorConsensus: boolean;

  /**
   * Use broadcaster getPeers
   * @deprecated
   */
  getPeers(params: { limit?: number, broadhash?: string }): Promise<PeerType[]>;

  getFromPeer<T>(peer: BasePeerType, options: PeerRequestOptions): Promise<{ body: T, peer: Peer }>;

  getFromRandomPeer<T>(config: { limit?: number, broadhash?: string, allowedStates?: PeerState[] },
                       options: PeerRequestOptions): Promise<{ body: any; peer: Peer }>;

  /**
   * Calls enqueue signatures and emits a signature change socket message
   */
  onSignature(signature: { transaction: string, signature: string, relays?: number }, broadcast: boolean): void;

  /**
   * Calls enqueue if broadcast is true and did not exhaust relays
   * Be aware that the transaction object is modified by adding relays: number
   */
  onUnconfirmedTransaction(transaction: IBaseTransaction<any> & { relays?: number }, broadcast: boolean): void;

  /**
   * On new block get current broadhash, update system (to calc new broadhash) and broadcast block to all
   * peers on old broadhash.
   * Be aware that original block will be modified by adding relays if not there.
   */
  onNewBlock(block: SignedBlockType & { relays?: number }, broadcast: boolean): Promise<void>;

  receiveSignatures(// tslint:disable-next-line max-line-length
    query: { signatures: Array<{ transaction: string, signature: string }> }): Promise<void>;

  /**
   * Validate signature with schema and calls processSignature from module multisignautre
   */
  receiveSignature(signature: { transaction: string, signature: string }): Promise<void>;

  receiveTransactions(query: { transactions: any[] },
                      peer: Peer,
                      extraLogMessage: string): Promise<void>;

  /**
   * Checks tx is ok by normalizing it and eventually remove peer if tx is not valid
   * calls processUnconfirmedTransaction over it.
   * @returns {Promise<void>}
   */
  // tslint:disable-next-line max-line-length
  receiveTransaction(transaction: IBaseTransaction<any>, peer: Peer, bundled: boolean, extraLogMessage: string): Promise<string>;
}
