/**
 * @file Governance
 * @desc These methods facilitate interactions with the Governor smart contract.
 */

import * as eth from './eth';
import { netId } from './helpers';
import { address, abi } from './constants';
import { sign } from './EIP712';
import {
  CallOptions,
  TrxResponse,
  Signature,
  VoteSignatureMessage,
  VoteTypes,
  EIP712Domain
 } from './types';

/**
 * Submit a vote on a Venus Governance proposal.
 *
 * @param {string} proposalId The ID of the proposal to vote on. This is an
 *     auto-incrementing integer in the Governor Alpha contract.
 * @param {boolean} support A boolean of true for 'yes' or false for 'no' on the
 *     proposal vote.
 * @param {CallOptions} [options] Options to set for a transaction and Ethers.js
 *     method overrides.
 *
 * @returns {object} Returns an Ethers.js transaction object of the vote
 *     transaction.
 *
 * @example
 *
 * ```
 * const venus = new Venus(window.ethereum);
 * 
 * (async function() {
 *   const castVoteTx = await venus.castVote(12, true);
 *   console.log('Ethers.js transaction object', castVoteTx);
 * })().catch(console.error);
 * ```
 */
export async function castVote(
  proposalId: number,
  support: boolean,
  options: CallOptions = {}
) : Promise<TrxResponse> {
  await netId(this);

  const errorPrefix = 'Venus [castVote] | ';

  if (typeof proposalId !== 'number') {
    throw Error(errorPrefix + 'Argument `proposalId` must be an integer.');
  }

  if (typeof support !== 'boolean') {
    throw Error(errorPrefix + 'Argument `support` must be a boolean.');
  }

  const governorAddress = address[this._network.name].GovernorAlpha;
  const trxOptions: CallOptions = options;
  trxOptions._compoundProvider =  this._provider;
  trxOptions.abi =  abi.GovernorAlpha;
  const parameters = [ proposalId, support ];
  const method = 'castVote';

  return eth.trx(governorAddress, method, parameters, trxOptions);
}

/**
 * Submit a vote on a Venus Governance proposal using an EIP-712 signature.
 *
 * @param {string} proposalId The ID of the proposal to vote on. This is an
 *     auto-incrementing integer in the Governor Alpha contract.
 * @param {boolean} support A boolean of true for 'yes' or false for 'no' on the
 *     proposal vote.
 * @param {object} signature An object that contains the v, r, and, s values of
 *     an EIP-712 signature.
 * @param {CallOptions} [options] Options to set for a transaction and Ethers.js
 *     method overrides.
 *
 * @returns {object} Returns an Ethers.js transaction object of the vote
 *     transaction.
 *
 * @example
 * ```
 * const venus = new Venus(window.ethereum);
 * 
 * (async function() {
 *   const castVoteTx = await venus.castVoteBySig(
 *     12,
 *     true,
 *     {
 *       v: '0x1b',
 *       r: '0x130dbcd2faca07424c033b4479687cc1deeb65f08509e3ab397988cc4c6f2e78',
 *       s: '0x1debcb8250262f23906b1177161f0c7c9aa3641e6bff5b6f5c88a6bb78d5d8cd'
 *     }
 *   );
 *   console.log('Ethers.js transaction object', castVoteTx);
 * })().catch(console.error);
 * ```
 */
export async function castVoteBySig(
  proposalId: number,
  support: boolean,
  signature: Signature,
  options: CallOptions = {}
) : Promise<TrxResponse> {
  await netId(this);

  const errorPrefix = 'Venus [castVoteBySig] | ';

  if (typeof proposalId !== 'number') {
    throw Error(errorPrefix + 'Argument `proposalId` must be an integer.');
  }

  if (typeof support !== 'boolean') {
    throw Error(errorPrefix + 'Argument `support` must be a boolean.');
  }

  if (
    !Object.isExtensible(signature) ||
    !signature.v ||
    !signature.r ||
    !signature.s
  ) {
    throw Error(errorPrefix + 'Argument `signature` must be an object that ' + 
      'contains the v, r, and s pieces of an EIP-712 signature.');
  }

  const governorAddress = address[this._network.name].GovernorAlpha;
  const trxOptions: CallOptions = options;
  trxOptions._compoundProvider = this._provider;
  trxOptions.abi = abi.GovernorAlpha;
  const { v, r, s } = signature;
  const parameters = [ proposalId, support, v, r, s ];
  const method = 'castVoteBySig';

  return eth.trx(governorAddress, method, parameters, trxOptions);
}

/**
 * Create a vote signature for a Venus Governance proposal using EIP-712.
 *     This can be used to create an 'empty ballot' without burning gas. The 
 *     signature can then be sent to someone else to post to the blockchain. 
 *     The recipient can post one signature using the `castVoteBySig` method.
 *
 * @param {string} proposalId The ID of the proposal to vote on. This is an
 *     auto-incrementing integer in the Governor Alpha contract.
 * @param {boolean} support A boolean of true for 'yes' or false for 'no' on the
 *     proposal vote. To create an 'empty ballot' call this method twice using
 *     `true` and then `false` for this parameter.
 *
 * @returns {object} Returns an object that contains the `v`, `r`, and `s` 
 *     components of an Ethereum signature as hexadecimal strings.
 *
 * @example
 * ```
 * const venus = new Venus(window.ethereum);
 *
 * (async () => {
 *
 *   const voteForSignature = await venus.createVoteSignature(20, true);
 *   console.log('voteForSignature', voteForSignature);
 *
 *   const voteAgainstSignature = await venus.createVoteSignature(20, false);
 *   console.log('voteAgainstSignature', voteAgainstSignature);
 *
 * })().catch(console.error);
 * ```
 */
export async function createVoteSignature(
  proposalId: number,
  support: boolean
) : Promise<Signature> {
  await netId(this);

  const provider = this._provider;
  const governorAddress = address[this._network.name].GovernorAlpha;
  const chainId = this._network.id;

  const domain: EIP712Domain = {
    name: 'Venus Governor Alpha',
    chainId,
    verifyingContract: governorAddress
  };

  const primaryType = 'Ballot';

  const message: VoteSignatureMessage = { proposalId, support };

  const types: VoteTypes = {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    Ballot: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'support', type: 'bool' }
    ]
  };

  const signer = provider.getSigner ? provider.getSigner() : provider;

  const signature = await sign(domain, primaryType, message, types, signer);

  return signature;
}
