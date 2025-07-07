import {
  Extension,
  ExtensionConfig,
  ExtensionContext,
  ExtensionMetadata,
  ExtensionPoint,
  ExtensionPriority,
  ExtensionStatus,
} from '../../core/types';

/**
 * 数据验证拓展
 * 用于在交易处理前验证数据格式和业务规则
 */
export class ValidationExtension implements Extension {
  public metadata: ExtensionMetadata;
  public config: ExtensionConfig;
  public status: ExtensionStatus = ExtensionStatus.UNREGISTERED;
  public error?: Error;

  constructor() {
    this.metadata = {
      id: 'validation-extension',
      name: 'Data Validation Extension',
      version: '1.0.0',
      description:
        'Validates transaction data and business rules before processing',
      author: 'Dubhe Team',
      extensionPoints: [
        ExtensionPoint.BEFORE_TRANSACTION,
        ExtensionPoint.DATA_VALIDATION,
      ],
      priority: ExtensionPriority.HIGH,
      tags: ['validation', 'data', 'security'],
      compatibility: {
        dubhe: '>=1.0.0',
        node: '>=18.0.0',
      },
    };

    this.config = {
      name: this.metadata.name,
      version: this.metadata.version,
      description: this.metadata.description,
      author: this.metadata.author,
      extensionPoints: this.metadata.extensionPoints,
      priority: this.metadata.priority,
      enabled: true,
      options: {
        strictMode: true,
        validateAddress: true,
        validateAmount: true,
        validateSignature: true,
        customRules: [],
        stopOnError: true,
      },
    };
  }

  /**
   * 执行验证逻辑
   */
  async execute(context: ExtensionContext): Promise<any> {
    const { data, logger } = context;

    logger.debug('Validation extension executing...');

    if (!data) {
      throw new Error('No data provided for validation');
    }

    const validationResults = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
      validatedAt: new Date().toISOString(),
    };

    try {
      // 验证交易数据
      if (data.type === 'transaction') {
        await this.validateTransaction(data, validationResults);
      }

      // 验证NFT转移数据
      if (data.type === 'nft_transfer') {
        await this.validateNFTTransfer(data, validationResults);
      }

      // 验证钱包连接数据
      if (data.type === 'wallet_connect') {
        await this.validateWalletConnect(data, validationResults);
      }

      // 执行自定义验证规则
      await this.executeCustomRules(data, validationResults);

      // 检查验证结果
      if (validationResults.errors.length > 0) {
        validationResults.isValid = false;

        if (this.config.options?.stopOnError) {
          throw new Error(
            `Validation failed: ${validationResults.errors.join(', ')}`
          );
        }
      }

      logger.info(
        `Validation completed: ${validationResults.isValid ? 'PASSED' : 'FAILED'}`
      );

      return validationResults;
    } catch (error) {
      logger.error(`Validation error: ${error}`);
      throw error;
    }
  }

  /**
   * 验证交易数据
   */
  private async validateTransaction(data: any, results: any): Promise<void> {
    const { logger } = this.context;

    // 验证必要字段
    const requiredFields = ['from', 'to', 'amount', 'gas'];
    for (const field of requiredFields) {
      if (!data[field]) {
        results.errors.push(`Missing required field: ${field}`);
      }
    }

    // 验证地址格式
    if (this.config.options?.validateAddress) {
      if (data.from && !this.isValidAddress(data.from)) {
        results.errors.push('Invalid sender address format');
      }
      if (data.to && !this.isValidAddress(data.to)) {
        results.errors.push('Invalid recipient address format');
      }
    }

    // 验证金额
    if (this.config.options?.validateAmount) {
      if (data.amount && !this.isValidAmount(data.amount)) {
        results.errors.push('Invalid amount format');
      }
    }

    // 验证签名
    if (this.config.options?.validateSignature) {
      if (data.signature && !this.isValidSignature(data.signature)) {
        results.errors.push('Invalid signature format');
      }
    }

    // 验证Gas限制
    if (data.gas && data.gas > 1000000) {
      results.warnings.push('Gas limit seems high');
    }

    logger.debug(
      `Transaction validation completed with ${results.errors.length} errors`
    );
  }

  /**
   * 验证NFT转移数据
   */
  private async validateNFTTransfer(data: any, results: any): Promise<void> {
    const { logger } = this.context;

    // 验证NFT相关字段
    const requiredFields = ['tokenId', 'from', 'to', 'contract'];
    for (const field of requiredFields) {
      if (!data[field]) {
        results.errors.push(`Missing required NFT field: ${field}`);
      }
    }

    // 验证Token ID格式
    if (data.tokenId && !this.isValidTokenId(data.tokenId)) {
      results.errors.push('Invalid token ID format');
    }

    // 验证合约地址
    if (data.contract && !this.isValidAddress(data.contract)) {
      results.errors.push('Invalid NFT contract address');
    }

    logger.debug(
      `NFT transfer validation completed with ${results.errors.length} errors`
    );
  }

  /**
   * 验证钱包连接数据
   */
  private async validateWalletConnect(data: any, results: any): Promise<void> {
    const { logger } = this.context;

    // 验证钱包地址
    if (data.address && !this.isValidAddress(data.address)) {
      results.errors.push('Invalid wallet address');
    }

    // 验证网络信息
    if (data.network && !this.isValidNetwork(data.network)) {
      results.errors.push('Invalid network configuration');
    }

    logger.debug(
      `Wallet connect validation completed with ${results.errors.length} errors`
    );
  }

  /**
   * 执行自定义验证规则
   */
  private async executeCustomRules(data: any, results: any): Promise<void> {
    const customRules = this.config.options?.customRules || [];

    for (const rule of customRules) {
      try {
        if (typeof rule === 'function') {
          const ruleResult = await rule(data);
          if (!ruleResult.isValid) {
            results.errors.push(
              ruleResult.message || 'Custom validation rule failed'
            );
          }
        } else if (typeof rule === 'object' && rule.validator) {
          const ruleResult = await rule.validator(data);
          if (!ruleResult.isValid) {
            results.errors.push(
              rule.message ||
                ruleResult.message ||
                'Custom validation rule failed'
            );
          }
        }
      } catch (error) {
        results.errors.push(`Custom rule execution error: ${error}`);
      }
    }
  }

  /**
   * 验证地址格式
   */
  private isValidAddress(address: string): boolean {
    // 简单的地址格式验证
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * 验证金额格式
   */
  private isValidAmount(amount: any): boolean {
    // 验证金额是否为有效数字且大于0
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0 && isFinite(num);
  }

  /**
   * 验证签名格式
   */
  private isValidSignature(signature: string): boolean {
    // 简单的签名格式验证
    return /^0x[a-fA-F0-9]{130}$/.test(signature);
  }

  /**
   * 验证Token ID格式
   */
  private isValidTokenId(tokenId: string): boolean {
    // 验证Token ID是否为有效字符串或数字
    return typeof tokenId === 'string' && tokenId.length > 0;
  }

  /**
   * 验证网络配置
   */
  private isValidNetwork(network: any): boolean {
    // 验证网络配置
    const validNetworks = ['mainnet', 'testnet', 'devnet'];
    return typeof network === 'string' && validNetworks.includes(network);
  }

  /**
   * 初始化拓展
   */
  async initialize(context: ExtensionContext): Promise<void> {
    this.context = context;
    const { logger } = context;

    logger.info('Validation extension initializing...');

    // 加载自定义验证规则
    await this.loadCustomRules();

    logger.info('Validation extension initialized successfully');
  }

  /**
   * 清理拓展
   */
  async cleanup(context: ExtensionContext): Promise<void> {
    const { logger } = context;
    logger.info('Validation extension cleaning up...');

    // 清理自定义规则
    this.config.options!.customRules = [];

    logger.info('Validation extension cleaned up successfully');
  }

  /**
   * 加载自定义验证规则
   */
  private async loadCustomRules(): Promise<void> {
    const { logger } = this.context;

    try {
      // 从存储中加载自定义规则
      const customRules = await context.extensionManager
        .getStorage()
        .load(this.metadata.id, 'customRules');

      if (customRules && Array.isArray(customRules)) {
        this.config.options!.customRules = customRules;
        logger.info(`Loaded ${customRules.length} custom validation rules`);
      }
    } catch (error) {
      logger.warn('No custom validation rules found');
    }
  }

  /**
   * 添加自定义验证规则
   */
  async addCustomRule(rule: any): Promise<void> {
    const { logger } = this.context;

    if (!this.config.options!.customRules) {
      this.config.options!.customRules = [];
    }

    this.config.options!.customRules.push(rule);

    // 保存到存储
    await this.context.extensionManager
      .getStorage()
      .save(this.metadata.id, 'customRules', this.config.options!.customRules);

    logger.info('Custom validation rule added successfully');
  }

  /**
   * 移除自定义验证规则
   */
  async removeCustomRule(index: number): Promise<void> {
    const { logger } = this.context;

    if (
      this.config.options!.customRules &&
      this.config.options!.customRules[index]
    ) {
      this.config.options!.customRules.splice(index, 1);

      // 保存到存储
      await this.context.extensionManager
        .getStorage()
        .save(
          this.metadata.id,
          'customRules',
          this.config.options!.customRules
        );

      logger.info(
        `Custom validation rule at index ${index} removed successfully`
      );
    }
  }

  /**
   * 获取验证统计信息
   */
  async getValidationStats(): Promise<any> {
    const { logger } = this.context;

    try {
      const stats = await this.context.extensionManager
        .getStorage()
        .load(this.metadata.id, 'validationStats');

      return (
        stats || {
          totalValidations: 0,
          successfulValidations: 0,
          failedValidations: 0,
          averageValidationTime: 0,
          lastValidation: null,
        }
      );
    } catch (error) {
      logger.warn('No validation statistics found');
      return {
        totalValidations: 0,
        successfulValidations: 0,
        failedValidations: 0,
        averageValidationTime: 0,
        lastValidation: null,
      };
    }
  }

  /**
   * 更新验证统计信息
   */
  private async updateValidationStats(
    result: any,
    executionTime: number
  ): Promise<void> {
    const stats = await this.getValidationStats();

    stats.totalValidations++;
    stats.lastValidation = new Date().toISOString();

    if (result.isValid) {
      stats.successfulValidations++;
    } else {
      stats.failedValidations++;
    }

    // 更新平均执行时间
    const totalTime =
      stats.averageValidationTime * (stats.totalValidations - 1) +
      executionTime;
    stats.averageValidationTime = totalTime / stats.totalValidations;

    await this.context.extensionManager
      .getStorage()
      .save(this.metadata.id, 'validationStats', stats);
  }
}
