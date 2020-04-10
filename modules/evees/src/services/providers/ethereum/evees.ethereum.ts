import { Logger } from '@uprtcl/micro-orchestrator';
import {
  EthereumConnection,
  EthereumContractOptions,
  EthereumContract
} from '@uprtcl/ethereum-provider';
import { IpfsStore, sortObject, IpfsConnectionOptions } from '@uprtcl/ipfs-provider';
import { CidConfig, Authority } from '@uprtcl/multiplatform';

import * as UprtclRoot from './contracts-json/UprtclRoot.json';
import * as UprtclDetails from './contracts-json/UprtclDetails.json';
import * as UprtclProposals from './contracts-json/UprtclProposals.json';

import { Secured } from '../../../utils/cid-hash';
import { Commit, Perspective, PerspectiveDetails } from '../../../types';
import { EveesRemote } from '../../evees.remote';
import {
  hashText,
  CREATE_PERSP,
  CREATE_PERSP_BATCH,
  UPDATE_PERSP_DETAILS,
  GET_PERSP_DETAILS,
  INIT_PERSP,
  GET_CONTEXT_HASH,
  cidToHex32,
  GET_PERSP,
  bytes32ToCid,
  GET_PERSP_HASH,
  INIT_PERSP_BATCH,
  UPDATE_OWNER,
  UPDATED_HEAD
} from './common';
import { EveesAccessControlEthereum } from './evees-access-control.ethereum';
import { ProposalsEthereum } from './proposals.ethereum';
import { ProposalsProvider } from '../../proposals.provider';
import { NewPerspectiveData } from '../../evees.provider';

const evees_if = 'evees-v0';
export const ZERO_HEX_32 = '0x' + new Array(32).fill(0).join('');
export const ZERO_ADDRESS = '0x' + new Array(40).fill(0).join('');

export const hashToId = async (uprtclRoot: EthereumContract, perspectiveIdHash: string) => {
  /** check the creation event to reverse map the cid */
  const perspectiveAddedEvents = await uprtclRoot.contractInstance.getPastEvents(
    'PerspectiveCreated',
    {
      filter: { perspectiveIdHash: perspectiveIdHash },
      fromBlock: 0
    }
  );

  /** one event should exist only */
  const perspectiveAddedEvent = perspectiveAddedEvents[0];

  if (!perspectiveAddedEvent) {
    throw new Error(`Perspective with hash ${perspectiveIdHash} not found`);
  }

  return perspectiveAddedEvent.returnValues.perspectiveId;
};

export class EveesEthereum extends IpfsStore implements EveesRemote, Authority {
  logger: Logger = new Logger('EveesEtereum');

  accessControl: EveesAccessControlEthereum;
  proposals: ProposalsProvider;

  protected uprtclRoot: EthereumContract;
  protected uprtclDetails: EthereumContract;
  protected uprtclProposals: EthereumContract;

  constructor(
    protected ethConnection: EthereumConnection,
    protected ipfsOptions: IpfsConnectionOptions,
    cidConfig: CidConfig,
    uprtclRootOptions: EthereumContractOptions = { contract: UprtclRoot as any },
    uprtclDetailsOptions: EthereumContractOptions = { contract: UprtclDetails as any },
    uprtclProposalsOptions: EthereumContractOptions = { contract: UprtclProposals as any }
  ) {
    super(ipfsOptions, cidConfig)
    this.uprtclRoot = new EthereumContract(uprtclRootOptions, ethConnection);
    this.uprtclDetails = new EthereumContract(uprtclDetailsOptions, ethConnection);
    this.uprtclProposals = new EthereumContract(uprtclProposalsOptions, ethConnection);

    this.accessControl = new EveesAccessControlEthereum(this.uprtclRoot);
    this.proposals = new ProposalsEthereum(
      this.uprtclRoot,
      this.uprtclProposals,
      this.accessControl
    );
  }

  get authorityID() {
    return `eth-${this.ethConnection.networkId}:${evees_if}:${
      this.uprtclRoot.contractInstance.options.address
        ? this.uprtclRoot.contractInstance.options.address.toLocaleLowerCase()
        : ''
    }`;
  }

  get userId() {
    return this.ethConnection.getCurrentAccount();
  }

  /**
   * @override
   */
  async ready(): Promise<void> {
    await Promise.all([
      this.uprtclRoot.ready(),
      this.uprtclDetails.ready(),
      this.uprtclProposals.ready(),
      super.ready()
    ]);
  }

  async persistPerspectiveEntity(secured: Secured<Perspective>) {
    const perspectiveId = await this.create(secured.entity);
    this.logger.log(`[ETH] persistPerspectiveEntity - added to IPFS`, perspectiveId);

    if (secured.id && secured.id != perspectiveId) {
      throw new Error(
        `perspective ID computed by IPFS ${perspectiveId} is not the same as the input one ${secured.id}.`
      );
    }

    return perspectiveId;
  }

  async cloneAndInitPerspective(perspectiveData: NewPerspectiveData): Promise<void> {
    const secured = perspectiveData.perspective;
    const details = perspectiveData.details;
    const canWrite = perspectiveData.canWrite;

    /** validate */
    if (!secured.entity.payload.origin) throw new Error('origin cannot be empty');

    /** Store the perspective data in the data layer */
    const perspectiveId = await this.persistPerspectiveEntity(secured);

    const headCidParts = details.headId ? cidToHex32(details.headId) : [ZERO_HEX_32, ZERO_HEX_32];

    const newPerspective = {
      perspectiveId: perspectiveId,
      headCid1: headCidParts[0],
      headCid0: headCidParts[1],
      owner: canWrite ? canWrite : this.ethConnection.getCurrentAccount()
    };

    const newDetails = {
      context: details.context ? details.context : '',
      name: details.name ? details.name : ''
    };

    /** TX is sent, and await to force order (preent head update on an unexisting perspective) */
    await this.uprtclDetails.send(INIT_PERSP, [
      { perspective: newPerspective, details: newDetails },
      this.uprtclDetails.userId
    ]);
  }

  async clonePerspectivesBatch(newPerspectivesData: NewPerspectiveData[]): Promise<void> {
    const persistPromises = newPerspectivesData.map(perspectiveData => {
      return this.persistPerspectiveEntity(perspectiveData.perspective);
    });

    await Promise.all(persistPromises);

    const ethPerspectivesDataPromises = newPerspectivesData.map(
      async (perspectiveData): Promise<any> => {
        const headCidParts = perspectiveData.details.headId
          ? cidToHex32(perspectiveData.details.headId)
          : [ZERO_HEX_32, ZERO_HEX_32];

        const perspective = {
          perspectiveId: perspectiveData.perspective.id,
          headCid1: headCidParts[0],
          headCid0: headCidParts[1],
          owner: perspectiveData.canWrite
            ? perspectiveData.canWrite
            : this.ethConnection.getCurrentAccount()
        };

        const details = {
          context: perspectiveData.details.context,
          name: ''
        };

        return { perspective, details };
      }
    );

    const ethPerspectivesData = await Promise.all(ethPerspectivesDataPromises);

    /** TX is sent, and await to force order (preent head update on an unexisting perspective) */
    await this.uprtclDetails.send(INIT_PERSP_BATCH, [
      ethPerspectivesData,
      this.ethConnection.getCurrentAccount()
    ]);
  }

  /**
   * @override
   */
  async clonePerspective(secured: Secured<Perspective>): Promise<void> {
    let perspective = secured.entity.payload;

    /** validate */
    if (!perspective.origin) throw new Error('origin cannot be empty');

    /** Store the perspective data in the data layer */
    const perspectiveId = await this.create(sortObject(secured.entity));
    this.logger.log(`[ETH] createPerspective - added to IPFS`, perspectiveId);

    if (secured.id && secured.id != perspectiveId) {
      throw new Error(
        `perspective ID computed by IPFS ${perspectiveId} is not the same as the input one ${secured.id}.`
      );
    }

    const newPerspective = {
      perspectiveId: perspectiveId,
      headCid1: ZERO_HEX_32,
      headCid0: ZERO_HEX_32,
      owner: this.ethConnection.getCurrentAccount()
    };

    /** TX is sent, and await to force order (preent head update on an unexisting perspective) */
    await this.uprtclRoot.send(CREATE_PERSP, [
      newPerspective,
      this.ethConnection.getCurrentAccount()
    ]);

    this.logger.log(`[ETH] addPerspective - TX minted`);
  }

  /**
   * @override
   */
  async cloneCommit(secured: Secured<Commit>): Promise<void> {
    const commit = sortObject(secured.entity);
    /** Store the perspective data in the data layer */

    let commitId = await this.create(commit);
    this.logger.log(`[ETH] createCommit - added to IPFS`, commitId, commit);

    if (secured.id && secured.id != commitId) {
      throw new Error('commit ID computed by IPFS is not the same as the input one.');
    }
  }

  /**
   * @override
   */
  async updatePerspectiveDetails(
    perspectiveId: string,
    details: PerspectiveDetails
  ): Promise<void> {
    const perspectiveIdHash = await this.uprtclRoot.call(GET_PERSP_HASH, [perspectiveId]);

    if (details.headId !== undefined || details.name !== undefined) {
      await this.uprtclDetails.send(UPDATE_PERSP_DETAILS, [
        perspectiveIdHash,
        {
          context: details.context ? details.context : '',
          name: details.name ? details.name : ''
        }
      ]);
    }

    if (details.headId !== undefined) {
      const headCidParts = cidToHex32(details.headId);

      await this.uprtclDetails.send(UPDATED_HEAD, [
        perspectiveIdHash,
        headCidParts[0],
        headCidParts[1],
        ZERO_ADDRESS
      ]);
    }
  }

  async hashToId(hash: string) {
    return hashToId(this.uprtclRoot, hash);
  }

  /**
   * @override
   */
  async getContextPerspectives(context: string): Promise<string[]> {
    const contextHash = await this.uprtclDetails.call(GET_CONTEXT_HASH, [context]);

    let perspectiveContextUpdatedEvents = await this.uprtclDetails.contractInstance.getPastEvents(
      'PerspectiveDetailsSet',
      {
        filter: { contextHash: contextHash },
        fromBlock: 0
      }
    );

    let perspectiveIdHashes = perspectiveContextUpdatedEvents.map(
      e => e.returnValues.perspectiveIdHash
    );

    const hashToIdPromises = perspectiveIdHashes.map(idHash => this.hashToId(idHash));
    this.logger.log(`[ETH] getContextPerspectives of ${context}`, perspectiveIdHashes);

    return Promise.all(hashToIdPromises);
  }

  /**
   * @override
   */
  async getPerspectiveDetails(perspectiveId: string): Promise<PerspectiveDetails> {
    const perspectiveIdHash = await this.uprtclRoot.call(GET_PERSP_HASH, [perspectiveId]);

    const details = await this.uprtclDetails.call(GET_PERSP_DETAILS, [perspectiveIdHash]);

    const ethPerspective = await this.uprtclRoot.call(GET_PERSP, [perspectiveIdHash]);

    const headId = bytes32ToCid([ethPerspective.headCid1, ethPerspective.headCid0]);

    return { name: details.name, context: details.context, headId: headId };
  }

  async deletePerspective(perspectiveId: string): Promise<void> {
    const perspectiveIdHash = await this.uprtclRoot.call(GET_PERSP_HASH, [perspectiveId]);
    let contextHash = ZERO_HEX_32;

    /** set null values */
    await this.uprtclDetails.send(UPDATE_PERSP_DETAILS, [
      perspectiveIdHash,
      contextHash,
      '',
      '',
      ''
    ]);

    /** set null owner (cannot be undone) */
    const ZERO_ADD = '0x' + new Array(40).fill(0).join('');
    await this.uprtclRoot.send(UPDATE_OWNER, [perspectiveIdHash, ZERO_ADD]);
  }
}
