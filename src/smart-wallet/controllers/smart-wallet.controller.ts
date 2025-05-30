import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Logger,
  OnModuleInit,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import size from 'lodash/size';
import isNil from 'lodash/isNil';
import isEmpty from 'lodash/isEmpty';
import {
  Contract,
  ContractInterface,
  ContractTransaction,
} from '@ethersproject/contracts';
import { Signer } from '@ethersproject/abstract-signer';
import { Provider, StaticJsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { TransferBodyDto } from '../dto/transfer-body.dto';
import { DynamicDatabaseService } from 'src/utils/dynamic-database-service';
import { Erc1155, Erc721 } from 'src/config/abis/types';
import erc1155 from 'src/config/abis/erc1155.json';
import erc721 from 'src/config/abis/erc721.json';
import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import { BigNumber } from '@ethersproject/bignumber';

@Controller('smart-wallet')
export class SmartWalletController implements OnModuleInit {
  private readonly logger: Logger = new Logger(this.constructor.name);
  // Chain IDs
  private ethChainId: number;
  private baseChainId: number;
  private polygonChainId: number;

  // Nodes
  private nodes: Record<number, string[]> = {};

  private client: SecretClient;
  private smartWalletPK: string;

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    private readonly dynamicDatabaseService: DynamicDatabaseService,
  ) {
    this.ethChainId = this.configService.get<number>('ETH_CHAIN_ID');
    this.baseChainId = this.configService.get<number>('BASE_CHAIN_ID');
    this.polygonChainId = this.configService.get<number>('POLYGON_CHAIN_ID');

    this.nodes[this.ethChainId] = [
      this.configService.get<string>('ETH_NODE_1'),
      this.configService.get<string>('ETH_NODE_2'),
      this.configService.get<string>('ETH_NODE_3'),
    ];
    this.nodes[this.baseChainId] = [
      this.configService.get<string>('BASE_NODE_1'),
      this.configService.get<string>('BASE_NODE_2'),
      this.configService.get<string>('BASE_NODE_3'),
    ];
    this.nodes[this.polygonChainId] = [
      this.configService.get<string>('POLYGON_NODE_1'),
    ];
  }

  async getSecret(secretName: string): Promise<string> {
    try {
      const secret = await this.client.getSecret(secretName);
      return secret.value;
    } catch (err) {
      console.log(err);
    }
  }

  async onModuleInit(): Promise<void> {
    try {
      const vaultName = this.configService.get<string>('VAULT_NAME');
      const url = `https://${vaultName}.vault.azure.net`;

      const credential = new DefaultAzureCredential();

      this.client = new SecretClient(url, credential, {
        disableChallengeResourceVerification: true,
      });

      const vaultSecretName =
        this.configService.get<string>('VAULT_SECRET_NAME');
      this.smartWalletPK = await this.getSecret(vaultSecretName);
    } catch (error) {
      this.logger.error(
        'Error getting smart wallet private key from Azure Key Vault and .env file',
      );
    }
  }

  async createContract<T>({
    node,
    chainId,
    signer,
    walletPrivateKey = '',
    abi,
    contractAddress,
  }: {
    contractAddress: string;
    chainId: number;
    abi: ContractInterface;
    node?: string;
    signer?: Signer | Provider;
    walletPrivateKey: string;
  }): Promise<T> {
    // Check if required properties are missing
    if (isNil(contractAddress) || isNil(chainId) || isNil(abi)) {
      throw new Error('Missing required values for contract creation!');
    }

    // Create a provider instance
    const provider = new StaticJsonRpcProvider(
      node || this.nodes[chainId][0], // Use provided node or default node for the chain ID
      chainId,
    );

    let wallet: Wallet;

    // Create a wallet if walletPrivateKey is provided
    if (!isEmpty(walletPrivateKey)) {
      wallet = new Wallet(walletPrivateKey, provider);
    }

    // Create and return the contract instance
    return new Contract(
      contractAddress,
      abi,
      signer || wallet || provider,
    ) as T;
  }

  createWallet(privateKey?: string): string {
    if (!privateKey) return;
    const wallet: Wallet = new Wallet(privateKey);

    return wallet.address;
  }

  async getWorkingNodeByChainId(chainId: number): Promise<{
    success: boolean;
    workingNode: string;
    retries?: number;
  }> {
    const nodes: string[] = this.nodes[chainId];
    const maxRetryCount = size(nodes); // 3
    let success = false;
    let retry = 0;
    let workingNode: string;

    do {
      for (let i = 0; i < nodes.length; i++) {
        try {
          workingNode = nodes[i];
          // Create a provider instance
          const provider = new StaticJsonRpcProvider(workingNode, chainId);

          // To check rpc interact with provider
          await provider.getBlockNumber();

          success = true;
          break;
        } catch (error) {
          retry++;
        }
      }
    } while (!success && retry < maxRetryCount);

    return { success, retries: retry, workingNode };
  }

  async waitForTransaction(
    transaction: ContractTransaction,
    confirmations?: 12, // Wait for 12 blocks
  ): Promise<void> {
    const transactionReceipt = await transaction.wait(confirmations);

    if (transactionReceipt.status === 0) {
      throw new Error(`Transaction reverted with hash: ${transaction.hash}`);
    }
  }

  @Post('transfer')
  async transfer(
    @Body()
    {
      apiKey,
      projectId,
      contractAddress,
      chainId,
      tokenId,
      amount,
      recipientAddress,
      tokenStandard,
    }: TransferBodyDto,
  ) {
    const db = await this.dynamicDatabaseService.connectToDatabase(
      'smart_wallet',
    );
    const foundApiKey = await db.collection('api_keys').findOne({
      projectId,
      apiKey,
    });

    if (!foundApiKey) {
      throw new UnauthorizedException('Invalid API key or project ID');
    }

    const { success, retries, workingNode } =
      await this.getWorkingNodeByChainId(chainId);

    if (!success) {
      throw new BadRequestException(
        `Failed to resolve a working node for chainId: ${chainId}. Tried ${retries} times.`,
      );
    }

    let tx: ContractTransaction;

    try {
      const senderAddress = this.createWallet(this.smartWalletPK);
      if (tokenStandard === 'ERC721') {
        const Contract = await this.createContract<Erc721>({
          abi: erc721,
          chainId,
          contractAddress,
          walletPrivateKey: this.smartWalletPK,
          node: workingNode,
        });

        tx = await Contract.safeTransferFrom(
          senderAddress,
          recipientAddress,
          BigNumber.from(tokenId),
          '0x00',
        );
      } else {
        if (!amount) {
          throw new Error('Amount is required for ERC1155 transfers');
        }

        const Contract = await this.createContract<Erc1155>({
          abi: erc1155,
          chainId,
          contractAddress,
          walletPrivateKey: this.smartWalletPK,
          node: workingNode,
        });

        tx = await Contract.safeTransferFrom(
          senderAddress,
          recipientAddress,
          BigNumber.from(tokenId),
          BigNumber.from(amount),
          '0x00',
        );
      }

      await this.waitForTransaction(tx);
    } catch (err) {
      throw new BadRequestException(`Transfer failed: ${err.message}`);
    }

    return {
      transactionHash: tx.hash,
    };
  }
}
