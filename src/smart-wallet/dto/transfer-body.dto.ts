import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsNotEmpty,
  IsString,
  IsAlphanumeric,
  IsInt,
  IsPositive,
  IsIn,
  Length,
  IsUUID,
  IsOptional,
} from 'class-validator';

export class TransferBodyDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @IsDefined()
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @Transform(({ value }) => value?.toLowerCase())
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Length(35, 135)
  @IsAlphanumeric()
  contractAddress: string;

  @IsDefined()
  @IsInt()
  @IsPositive()
  chainId: number;

  @IsDefined()
  @IsInt()
  @IsPositive()
  tokenId: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  amount?: number;

  @Transform(({ value }) => value?.toLowerCase())
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Length(35, 135)
  @IsAlphanumeric()
  recipientAddress: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @IsIn(['ERC1155', 'ERC721'])
  tokenStandard: string;

  @Transform(({ value }) => value?.toLowerCase())
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Length(35, 135)
  @IsAlphanumeric()
  senderAddress: string;
}
