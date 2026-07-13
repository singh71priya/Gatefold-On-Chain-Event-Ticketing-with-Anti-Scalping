import { Contract, rpc, TransactionBuilder, BASE_FEE, nativeToScVal, scValToNative } from '@stellar/stellar-sdk';
import { NETWORK, CONTRACTS } from './config';

const server = new rpc.Server(NETWORK.rpcUrl);

/**
 * Thin client around the TicketFactory Soroban contract.
 * Builds, simulates, and (where a signer is supplied) submits transactions.
 */
export class FactoryClient {
  constructor(contractId = CONTRACTS.FACTORY_CONTRACT_ID) {
    this.contract = new Contract(contractId);
  }

  async _buildAndSimulate(method, args, sourceAddress) {
    const account = await server.getAccount(sourceAddress);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK.networkPassphrase,
    })
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(60)
      .build();

    const simulated = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }
    return { tx, simulated };
  }

  async view(method, args = [], sourceAddress) {
    const { simulated } = await this._buildAndSimulate(method, args, sourceAddress);
    if (simulated.result?.retval) {
      return scValToNative(simulated.result.retval);
    }
    return null;
  }

  async invoke(method, args, sourceAddress, signTransaction) {
    const { tx, simulated } = await this._buildAndSimulate(method, args, sourceAddress);
    const prepared = rpc.assembleTransaction(tx, simulated).build();

    const signedXdr = await signTransaction(prepared.toXDR());
    const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK.networkPassphrase);

    const sendResponse = await server.sendTransaction(signedTx);
    if (sendResponse.status === 'ERROR') {
      throw new Error(`Transaction submission failed: ${JSON.stringify(sendResponse.errorResult)}`);
    }

    return this._pollTransaction(sendResponse.hash);
  }

  async _pollTransaction(hash, attempts = 15) {
    for (let i = 0; i < attempts; i++) {
      const result = await server.getTransaction(hash);
      if (result.status === 'SUCCESS') {
        return { hash, status: 'SUCCESS', result };
      }
      if (result.status === 'FAILED') {
        throw new Error(`Transaction failed: ${hash}`);
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    throw new Error(`Transaction ${hash} did not confirm in time`);
  }

  createEvent(organizer, name, token, registry, faceValue, totalTickets, maxResaleBps, royaltyBps, signTransaction) {
    const args = [
      nativeToScVal(organizer, { type: 'address' }),
      nativeToScVal(name, { type: 'string' }),
      nativeToScVal(token, { type: 'address' }),
      nativeToScVal(registry, { type: 'address' }),
      nativeToScVal(BigInt(faceValue), { type: 'i128' }),
      nativeToScVal(Number(totalTickets), { type: 'u32' }),
      nativeToScVal(Number(maxResaleBps), { type: 'u32' }),
      nativeToScVal(Number(royaltyBps), { type: 'u32' }),
    ];
    return this.invoke('create_event', args, organizer, signTransaction);
  }

  mintTicket(eventId, buyer, signTransaction) {
    const args = [nativeToScVal(BigInt(eventId), { type: 'u64' }), nativeToScVal(buyer, { type: 'address' })];
    return this.invoke('mint_ticket', args, buyer, signTransaction);
  }

  resellTicket(eventId, ticketId, buyer, salePrice, signTransaction) {
    const args = [
      nativeToScVal(BigInt(eventId), { type: 'u64' }),
      nativeToScVal(BigInt(ticketId), { type: 'u64' }),
      nativeToScVal(buyer, { type: 'address' }),
      nativeToScVal(BigInt(salePrice), { type: 'i128' }),
    ];
    return this.invoke('resell_ticket', args, buyer, signTransaction);
  }

  verifyEntry(eventId, ticketId, staff, signTransaction) {
    const args = [
      nativeToScVal(BigInt(eventId), { type: 'u64' }),
      nativeToScVal(BigInt(ticketId), { type: 'u64' }),
      nativeToScVal(staff, { type: 'address' }),
    ];
    return this.invoke('verify_entry', args, staff, signTransaction);
  }

  getEvent(eventId, sourceAddress) {
    return this.view('get_event', [nativeToScVal(BigInt(eventId), { type: 'u64' })], sourceAddress);
  }

  getTicket(eventId, ticketId, sourceAddress) {
    return this.view(
      'get_ticket',
      [nativeToScVal(BigInt(eventId), { type: 'u64' }), nativeToScVal(BigInt(ticketId), { type: 'u64' })],
      sourceAddress
    );
  }
}

export const factoryClient = new FactoryClient();
