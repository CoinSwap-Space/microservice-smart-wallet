import Joi from 'joi';

export const validationSchema = Joi.object({
  API_ROOT: Joi.string().allow(''),
  USE_COMPRESSION: Joi.boolean().required(),

  DB_URI: Joi.string().required(),
  NODE_ENV: Joi.string().valid('development', 'production', 'testnet', 'uat'),
  PORT: Joi.number().required(),

  VAULT_NAME: Joi.string().min(1).required(),
  VAULT_SECRET_NAME: Joi.string().min(1).required(),

  ETH_CHAIN_ID: Joi.number().required(),
  BASE_CHAIN_ID: Joi.number().required(),
  POLYGON_CHAIN_ID: Joi.number().required(),
  ARBITRUM_CHAIN_ID: Joi.number().required(),
  BNB_CHAIN_ID: Joi.number().required(),

  ETH_NODE_1: Joi.string().required(),
  ETH_NODE_2: Joi.string().required(),
  ETH_NODE_3: Joi.string().required(),

  BASE_NODE_1: Joi.string().required(),
  BASE_NODE_2: Joi.string().required(),
  BASE_NODE_3: Joi.string().required(),

  POLYGON_NODE_1: Joi.string().required(),
  ARBITRUM_NODE_1: Joi.string().required(),
  BNB_NODE_1: Joi.string().required(),
});
