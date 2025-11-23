import { type RivetPlugin } from '../../index.js';
import { chatAidonNode } from './nodes/ChatAidonNode.js';

export const aidonPlugin: RivetPlugin = {
	id: 'aidon',
	name: 'Aidon',

  configSpec: {
    aidonURL: {
      type: 'string',
      label: 'Aidon URL',
      description: 'The URL for the Aidon application.',
      helperText: 'Defaults to https://app.aidon.ai. URL for the Aidon application.',
      default: 'https://app.aidon.ai',
    },
    aidonKey: {
      type: 'secret',
      label: 'Aidon API Key',
      description: 'The API Key for the Aidon application.',
      helperText: 'API Key for the Aidon application.',
    },
  },

  register: (register) => {
    register(chatAidonNode());
  },
};
