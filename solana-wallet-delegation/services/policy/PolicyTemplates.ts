import type { PolicyTemplate, Policy } from '@/lib/types';
import { POLICY_EFFECTS, SOLANA_PROGRAMS } from '@/lib/constants';

export class PolicyTemplateService {
  /**
   * Applies a policy template with provided parameters
   */
  applyTemplate(template: PolicyTemplate, params: Record<string, any>): {
    name: string;
    effect: 'EFFECT_ALLOW' | 'EFFECT_DENY';
    consensus: string;
    condition: string;
  } {
    // Validate all required params are provided
    for (const param of template.requiredParams) {
      if (!(param in params)) {
        throw new Error(`Missing required parameter: ${param}`);
      }
    }

    // Replace template variables with actual values
    let consensus = template.consensusTemplate;
    let condition = template.conditionTemplate;

    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{{${key}}}`;
      consensus = consensus.replace(new RegExp(placeholder, 'g'), String(value));
      condition = condition.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return {
      name: template.name,
      effect: template.effect,
      consensus,
      condition,
    };
  }

  /**
   * Get all available policy templates
   */
  getAllTemplates(): PolicyTemplate[] {
    return [
      // Trading templates
      {
        name: 'Basic Trading',
        description: 'Allows basic trading operations on a trading account',
        effect: POLICY_EFFECTS.ALLOW,
        consensusTemplate: "approvers.any(user, user.tags.contains('{{traderTag}}'))",
        conditionTemplate: `
          solana.tx.instructions.count() <= 5 &&
          solana.tx.spl_transfers.all(transfer,
            transfer.from == '{{tradingAccount}}' &&
            transfer.amount <= {{maxPerTx}}
          )
        `,
        requiredParams: ['traderTag', 'tradingAccount', 'maxPerTx'],
      },
      {
        name: 'DEX Swap',
        description: 'Allows swapping tokens on decentralized exchanges',
        effect: POLICY_EFFECTS.ALLOW,
        consensusTemplate: "approvers.any(user, user.id == '{{userId}}')",
        conditionTemplate: `
          solana.tx.instructions.any(instruction,
            instruction.program_id in ['{{dexProgramId}}'] &&
            instruction.accounts.contains('{{userAccount}}')
          ) &&
          solana.tx.value <= {{maxSwapAmount}}
        `,
        requiredParams: ['userId', 'dexProgramId', 'userAccount', 'maxSwapAmount'],
      },
      {
        name: 'Arbitrage Bot',
        description: 'Allows high-frequency trading for arbitrage',
        effect: POLICY_EFFECTS.ALLOW,
        consensusTemplate: "approvers.any(user, user.tags.contains('{{botTag}}'))",
        conditionTemplate: `
          solana.tx.instructions.count() <= 10 &&
          solana.tx.instructions.all(instruction,
            instruction.program_id in [{{allowedDexes}}]
          ) &&
          solana.tx.compute_units <= {{maxComputeUnits}}
        `,
        requiredParams: ['botTag', 'allowedDexes', 'maxComputeUnits'],
      },

      // Asset management templates
      {
        name: 'Deposit Only',
        description: 'Only allows deposits to a specific account',
        effect: POLICY_EFFECTS.ALLOW,
        consensusTemplate: "approvers.any(user, user.tags.contains('{{userTag}}'))",
        conditionTemplate: `
          solana.tx.instructions.count() == 1 &&
          solana.tx.spl_transfers.all(transfer,
            transfer.to == '{{destinationAccount}}'
          )
        `,
        requiredParams: ['userTag', 'destinationAccount'],
      },
      {
        name: 'Withdrawal Limit',
        description: 'Allows withdrawals up to a daily limit',
        effect: POLICY_EFFECTS.ALLOW,
        consensusTemplate: "approvers.any(user, user.tags.contains('{{userTag}}'))",
        conditionTemplate: `
          solana.tx.spl_transfers.all(transfer,
            transfer.from == '{{sourceAccount}}' &&
            transfer.amount <= {{dailyLimit}}
          )
        `,
        requiredParams: ['userTag', 'sourceAccount', 'dailyLimit'],
      },
      {
        name: 'Treasury Management',
        description: 'Multi-sig treasury operations',
        effect: POLICY_EFFECTS.ALLOW,
        consensusTemplate: "approvers.count() >= {{threshold}}",
        conditionTemplate: `
          solana.tx.spl_transfers.all(transfer,
            transfer.from == '{{treasuryAccount}}' &&
            transfer.to in [{{approvedRecipients}}]
          )
        `,
        requiredParams: ['threshold', 'treasuryAccount', 'approvedRecipients'],
      },

      // DeFi templates
      {
        name: 'Staking',
        description: 'Allows staking tokens in specific validators',
        effect: POLICY_EFFECTS.ALLOW,
        consensusTemplate: "approvers.any(user, user.tags.contains('{{stakerTag}}'))",
        conditionTemplate: `
          solana.tx.instructions.any(instruction,
            instruction.program_id == 'Stake11111111111111111111111111111111111111' &&
            instruction.accounts.contains('{{validatorAccount}}')
          )
        `,
        requiredParams: ['stakerTag', 'validatorAccount'],
      },
      {
        name: 'Yield Farming',
        description: 'Allows interaction with yield farming protocols',
        effect: POLICY_EFFECTS.ALLOW,
        consensusTemplate: "approvers.any(user, user.id == '{{farmerId}}')",
        conditionTemplate: `
          solana.tx.instructions.any(instruction,
            instruction.program_id == '{{farmProgramId}}' &&
            (instruction.data[0] == 0x1 || instruction.data[0] == 0x2)
          ) &&
          solana.tx.value <= {{maxDeposit}}
        `,
        requiredParams: ['farmerId', 'farmProgramId', 'maxDeposit'],
      },
      {
        name: 'Lending Protocol',
        description: 'Allows lending and borrowing operations',
        effect: POLICY_EFFECTS.ALLOW,
        consensusTemplate: "approvers.any(user, user.tags.contains('{{lenderTag}}'))",
        conditionTemplate: `
          solana.tx.instructions.all(instruction,
            instruction.program_id == '{{lendingProgram}}' &&
            instruction.accounts[0] == '{{userLendingAccount}}'
          ) &&
          solana.tx.value <= {{maxLendAmount}}
        `,
        requiredParams: ['lenderTag', 'lendingProgram', 'userLendingAccount', 'maxLendAmount'],
      },

      // NFT templates
      {
        name: 'NFT Minting',
        description: 'Allows minting NFTs from specific collections',
        effect: POLICY_EFFECTS.ALLOW,
        consensusTemplate: "approvers.any(user, user.id == '{{minterId}}')",
        conditionTemplate: `
          solana.tx.instructions.any(instruction,
            instruction.program_id == '${SOLANA_PROGRAMS.TOKEN_PROGRAM}' &&
            instruction.data[0] == 0x0 &&
            instruction.accounts.contains('{{collectionMint}}')
          ) &&
          solana.tx.instructions.count() <= {{maxMints}}
        `,
        requiredParams: ['minterId', 'collectionMint', 'maxMints'],
      },
      {
        name: 'NFT Transfer',
        description: 'Allows transferring NFTs to approved addresses',
        effect: POLICY_EFFECTS.ALLOW,
        consensusTemplate: "approvers.any(user, user.tags.contains('{{nftHolderTag}}'))",
        conditionTemplate: `
          solana.tx.instructions.any(instruction,
            instruction.program_id == '${SOLANA_PROGRAMS.TOKEN_PROGRAM}' &&
            instruction.data[0] == 0x3 &&
            instruction.accounts[1] in [{{approvedRecipients}}]
          )
        `,
        requiredParams: ['nftHolderTag', 'approvedRecipients'],
      },
      {
        name: 'NFT Marketplace',
        description: 'Allows listing and buying NFTs on marketplaces',
        effect: POLICY_EFFECTS.ALLOW,
        consensusTemplate: "approvers.any(user, user.id == '{{traderId}}')",
        conditionTemplate: `
          solana.tx.instructions.any(instruction,
            instruction.program_id in [{{marketplaceProgramIds}}]
          ) &&
          solana.tx.value <= {{maxPrice}}
        `,
        requiredParams: ['traderId', 'marketplaceProgramIds', 'maxPrice'],
      },

      // Security templates
      {
        name: 'Emergency Pause',
        description: 'Denies all transactions during emergency',
        effect: POLICY_EFFECTS.DENY,
        consensusTemplate: "true",
        conditionTemplate: "true",
        requiredParams: [],
      },
      {
        name: 'Blacklist Address',
        description: 'Denies transactions to/from blacklisted addresses',
        effect: POLICY_EFFECTS.DENY,
        consensusTemplate: "true",
        conditionTemplate: `
          solana.tx.spl_transfers.any(transfer,
            transfer.to in [{{blacklistedAddresses}}] ||
            transfer.from in [{{blacklistedAddresses}}]
          )
        `,
        requiredParams: ['blacklistedAddresses'],
      },
      {
        name: 'Whitelist Only',
        description: 'Only allows transactions to whitelisted addresses',
        effect: POLICY_EFFECTS.ALLOW,
        consensusTemplate: "approvers.any(user, user.tags.contains('{{userTag}}'))",
        conditionTemplate: `
          solana.tx.spl_transfers.all(transfer,
            transfer.to in [{{whitelistedAddresses}}]
          )
        `,
        requiredParams: ['userTag', 'whitelistedAddresses'],
      },

      // Time-based templates
      {
        name: 'Business Hours Only',
        description: 'Only allows transactions during business hours',
        effect: POLICY_EFFECTS.ALLOW,
        consensusTemplate: "approvers.any(user, user.tags.contains('{{employeeTag}}'))",
        conditionTemplate: `
          hour() >= {{startHour}} &&
          hour() <= {{endHour}} &&
          weekday() >= 1 &&
          weekday() <= 5
        `,
        requiredParams: ['employeeTag', 'startHour', 'endHour'],
      },
      {
        name: 'Time-Limited Access',
        description: 'Grants access for a specific time period',
        effect: POLICY_EFFECTS.ALLOW,
        consensusTemplate: "approvers.any(user, user.id == '{{tempUserId}}')",
        conditionTemplate: `
          now() >= {{startTimestamp}} &&
          now() <= {{endTimestamp}}
        `,
        requiredParams: ['tempUserId', 'startTimestamp', 'endTimestamp'],
      },

      // Multi-signature templates
      {
        name: 'Multi-Sig Transfer',
        description: 'Requires multiple signatures for transfers',
        effect: POLICY_EFFECTS.ALLOW,
        consensusTemplate: "approvers.count() >= {{requiredSignatures}}",
        conditionTemplate: `
          solana.tx.spl_transfers.all(transfer,
            transfer.amount >= {{thresholdAmount}}
          )
        `,
        requiredParams: ['requiredSignatures', 'thresholdAmount'],
      },
      {
        name: 'Admin Override',
        description: 'Allows admins to override other policies',
        effect: POLICY_EFFECTS.ALLOW,
        consensusTemplate: "approvers.any(user, user.tags.contains('{{adminTag}}'))",
        conditionTemplate: "true",
        requiredParams: ['adminTag'],
      },
    ];
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): PolicyTemplate[] {
    const categoryMap: Record<string, string[]> = {
      trading: ['Basic Trading', 'DEX Swap', 'Arbitrage Bot'],
      assets: ['Deposit Only', 'Withdrawal Limit', 'Treasury Management'],
      defi: ['Staking', 'Yield Farming', 'Lending Protocol'],
      nft: ['NFT Minting', 'NFT Transfer', 'NFT Marketplace'],
      security: ['Emergency Pause', 'Blacklist Address', 'Whitelist Only'],
      time: ['Business Hours Only', 'Time-Limited Access'],
      multisig: ['Multi-Sig Transfer', 'Admin Override'],
    };

    const templateNames = categoryMap[category.toLowerCase()] || [];
    const allTemplates = this.getAllTemplates();

    return allTemplates.filter(t => templateNames.includes(t.name));
  }

  /**
   * Validates template parameters
   */
  validateTemplateParams(
    template: PolicyTemplate,
    params: Record<string, any>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for missing params
    for (const required of template.requiredParams) {
      if (!(required in params)) {
        errors.push(`Missing required parameter: ${required}`);
      }
    }

    // Type validation based on param name patterns
    for (const [key, value] of Object.entries(params)) {
      if (key.includes('Amount') || key.includes('Limit') || key.includes('Units')) {
        if (typeof value !== 'number' || value < 0) {
          errors.push(`${key} must be a positive number`);
        }
      }

      if (key.includes('Account') || key.includes('Address')) {
        if (typeof value !== 'string' || !value.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
          errors.push(`${key} must be a valid Solana address`);
        }
      }

      if (key.includes('Timestamp')) {
        if (typeof value !== 'number' || value < Date.now() / 1000) {
          errors.push(`${key} must be a future timestamp`);
        }
      }

      if (key.includes('Tag') || key.includes('Id')) {
        if (typeof value !== 'string' || value.length === 0) {
          errors.push(`${key} must be a non-empty string`);
        }
      }

      if (Array.isArray(value) && value.length === 0) {
        errors.push(`${key} must not be an empty array`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}