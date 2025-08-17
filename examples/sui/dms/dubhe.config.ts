import { DubheConfig } from '@0xobelisk/sui-common';

export const dubheConfig = {
  name: 'dms',
  description: 'Distributed Messaging',
  schemas: {
    message: 'StorageValue<String>'
  },
  errors: {
    invalid_content_length: 'Content length must be less than 12'
  },
  events: {
    message_sent: {
      sender: 'address',
      content: 'String'
    }
  }
} as DubheConfig;
